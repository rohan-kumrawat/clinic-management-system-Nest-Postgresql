import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, UseInterceptors, UploadedFile, HttpException, HttpStatus, NotFoundException, Query, ParseIntPipe } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { PatientsService } from './patients.service';
import { Patient } from './entity/patient.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
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
  constructor(private readonly patientsService: PatientsService) { }

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async create(@Body() patientData: Partial<Patient>): Promise<Patient> {
    try {
      return await this.patientsService.create(patientData);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('name') name?: string,
    @Query('doctorId') doctorId?: number
  ): Promise<{ patients: Patient[], total: number, page: number, limit: number }> {
    try {
      const userRole = request.user.role;
      return await this.patientsService.findAll(userRole, page, limit, name, doctorId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Get('active')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  @UseInterceptors(CacheInterceptor)
  @CacheKey('active_patients')
  @CacheTTL(30000)
  async findAllActive(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('name') name?: string,
    @Query('doctorId') doctorId?: number
  ): Promise<{ patients: Patient[], total: number, page: number, limit: number }> {
    try {
      return await this.patientsService.findAllActive(page, limit, name, doctorId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: AuthenticatedRequest
  ) {
    try {
      const userRole = request.user.role;
      const patient = await this.patientsService.findOne(+id, userRole);
      patient.attachment = file.filename;
      await this.patientsService.update(+id, patient, userRole);
      return { message: 'File uploaded successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Get('stats')
  @Roles(UserRole.OWNER)
  async getStats() {
    try {
      return await this.patientsService.getStats();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Patient> {
    try {
      const userRole = request.user.role;
      return await this.patientsService.findOne(+id, userRole);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<Patient>,
    @Req() request: AuthenticatedRequest
  ): Promise<Patient> {
    try {
      const userRole = request.user.role;
      return await this.patientsService.update(+id, updateData, userRole);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    try {
      return await this.patientsService.remove(+id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}