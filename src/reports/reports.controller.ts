import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('doctor-wise')
  @Roles(UserRole.OWNER)
  getDoctorWiseStats(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    return this.reportsService.getDoctorWiseStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('patient-history/:id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  getPatientHistory(@Query('id') patientId: string) {
    return this.reportsService.getPatientHistory(parseInt(patientId));
  }

  @Get('export')
  @Roles(UserRole.OWNER)
  exportData(
    @Query('type') type: 'patients' | 'sessions' | 'payments',
    @Query('start') startDate?: string,
    @Query('end') endDate?: string,
  ) {
    return this.reportsService.exportData(
      type,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
