import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor, HttpException, HttpStatus } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { Doctor } from './entity/doctor.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';


@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(UserRole.OWNER)
  create(@Body() doctorData: Partial<Doctor>): Promise<Doctor> {
    return this.doctorsService.create(doctorData);
  }

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findAll(): Promise<Doctor[]> {
    return this.doctorsService.findAll();
  }

  @Get('deleted')
  @Roles(UserRole.OWNER)
  findAllDeleted(): Promise<Doctor[]> {
    return this.doctorsService.findAllDeleted();
  }

  @Get('dropdown')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findAllForDropdown(): Promise<{ doctor_id: number; name: string }[]> {
    try {
      return await this.doctorsService.findAllForDropdown();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id') id: string): Promise<Doctor> {
    return this.doctorsService.findOne(+id);
  }

  @Get(':id/statistics')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  getStatistics(@Param('id') id: string): Promise<any> {
    return this.doctorsService.getDoctorStatistics(+id);
  }

  @Put(':id')
  @Roles(UserRole.OWNER)
  update(@Param('id') id: string, @Body() updateData: Partial<Doctor>): Promise<Doctor> {
    return this.doctorsService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.doctorsService.remove(+id);
  }

  @Put(':id/restore')
  @Roles(UserRole.OWNER)
  restore(@Param('id') id: string): Promise<{ message: string }> {
    return this.doctorsService.restore(+id);
  }
}