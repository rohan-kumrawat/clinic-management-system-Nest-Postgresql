import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, UseInterceptors, UploadedFile, HttpException, HttpStatus, NotFoundException, Query, ParseIntPipe, BadRequestException, DefaultValuePipe, ClassSerializerInterceptor } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { PatientsService } from './patients.service';
import { Patient } from './entity/patient.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { PatientStatus, VisitType, PaymentStatus, Gender } from 'src/common/enums';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PackagesService } from 'src/packages/packages.service';
import { CreatePackageDto } from 'src/packages/dto/create-package.dto';
import { ClosePackageDto } from 'src/packages/dto/close-package.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly packagesService: PackagesService,
  ) { }

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  @UseInterceptors(ClassSerializerInterceptor)
  async create(
    @Body() patientData: CreatePatientDto,
    @Req() request: AuthenticatedRequest
  ): Promise<Patient> {
    try {
      const userId = request.user.userId;
      return await this.patientsService.create(patientData, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdatePatientDto,
    @Req() request: AuthenticatedRequest
  ): Promise<Patient> {
    try {
      const userRole = request.user.role;
      const userId = request.user.userId;
      return await this.patientsService.update(+id, updateData, userRole, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ MODIFIED: Remove visitType and doctorId filters
  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('name') name?: string,
    @Query('reg_no') reg_no?: string,
    @Query('status') status?: PatientStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ): Promise<{ patients: Patient[], total: number, page: number, limit: number }> {
    try {
      const userRole = request.user.role;
      return await this.patientsService.findAll(
        userRole, 
        page, 
        limit, 
        name, 
        reg_no,
        status, 
        paymentStatus
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ MODIFIED: Remove visitType and doctorId filters
  @Get('active')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findAllActive(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('name') name?: string,
    @Query('reg_no') reg_no?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ): Promise<{ patients: Patient[]; total: number; page: number; limit: number }> {
    return this.patientsService.findAllActive(
      page,
      limit,
      name,
      reg_no,
      paymentStatus,
    );
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

  // ✅ Package management endpoints
  @Get(':id/packages')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async getPatientPackages(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.patientsService.getPatientPackages(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/active-package')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async getActivePatientPackage(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.patientsService.getActivePatientPackage(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':id/packages')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async addPackageToPatient(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPackageDto: CreatePackageDto,
    @Req() request: AuthenticatedRequest
  ) {
    try {
      const userId = request.user.userId;
      return await this.patientsService.addPackageToPatient(id, createPackageDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('packages/:packageId/close')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async closePatientPackage(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Body() closePackageDto: ClosePackageDto,
    @Req() request: AuthenticatedRequest
  ) {
    try {
      const userId = request.user.userId;
      return await this.patientsService.closePatientPackage(packageId, closePackageDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}