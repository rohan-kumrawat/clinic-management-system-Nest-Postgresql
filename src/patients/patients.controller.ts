import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Patient } from './entity/patient.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from 'src/common/file-upload.service';


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
  ) {
    const patient = await this.patientsService.findOne(+id);
    patient.attachment = file.filename;
    await this.patientsService.update(+id, patient);
  }

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findAll(): Promise<Patient[]> {
    return this.patientsService.findAll();
  }

  @Get('stats')
  @Roles(UserRole.OWNER)
  getStats() {
    return this.patientsService.getStats();
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id') id: string): Promise<Patient> {
    return this.patientsService.findOne(+id);
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  update(@Param('id') id: string, @Body() updateData: Partial<Patient>): Promise<Patient> {
    return this.patientsService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string): Promise<void> {
    return this.patientsService.remove(+id);
  }
}