import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Patient } from './entity/patient.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd'; // Fixed typo: gaurd -> guard
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  create(@Body() patientData: Partial<Patient>): Promise<Patient> {
    return this.patientsService.create(patientData);
  }

  @Post(':id/upload')
@UseInterceptors(FileInterceptor('file'))
@Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
async uploadFile(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
  @Req() request: AuthenticatedRequest
) {
  const userRole = request.user.role;
  const patient = await this.patientsService.findOne(+id, userRole);
  patient.attachment = file.filename;
  await this.patientsService.update(+id, patient, userRole);
}

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findAll(@Req() request: AuthenticatedRequest): Promise<Patient[]> {
    const userRole = request.user.role;
    return this.patientsService.findAll(userRole);
  }

  @Get('stats')
  @Roles(UserRole.OWNER)
  getStats() {
    return this.patientsService.getStats();
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Patient> {
    const userRole = request.user.role;
    return this.patientsService.findOne(+id, userRole);
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  update(
    @Param('id') id: string, 
    @Body() updateData: Partial<Patient>,
    @Req() request: AuthenticatedRequest
  ): Promise<Patient> {
    const userRole = request.user.role;
    return this.patientsService.update(+id, updateData, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string): Promise<void> {
    return this.patientsService.remove(+id);
  }
}