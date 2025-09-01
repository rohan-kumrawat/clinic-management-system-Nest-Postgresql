import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { Doctor } from './entity/doctor.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id') id: string): Promise<Doctor> {
    return this.doctorsService.findOne(+id);
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
}