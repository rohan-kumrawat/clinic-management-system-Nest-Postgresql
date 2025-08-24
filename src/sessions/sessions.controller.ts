import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Session } from './entity/session.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  create(@Body() sessionData: {
    patient: { patient_id: number };
    doctor?: { doctor_id: number };
    session_date: Date;
    remarks?: string;
  }): Promise<Session> {
    return this.sessionsService.create(sessionData);
  }

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findAll(): Promise<Session[]> {
    return this.sessionsService.findAll();
  }

  @Get('range')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findByDateRange(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<Session[]> {
    return this.sessionsService.findByDateRange(new Date(startDate), new Date(endDate));
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id') id: string): Promise<Session> {
    return this.sessionsService.findOne(+id);
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  update(@Param('id') id: string, @Body() updateData: Partial<Session>): Promise<Session> {
    return this.sessionsService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string): Promise<void> {
    return this.sessionsService.remove(+id);
  }
}