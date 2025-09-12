import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, BadRequestException } from '@nestjs/common';
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
    // Validate and parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Reset time part for consistent filtering
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return this.reportsService.getDoctorWiseStats(start, end);
  }

  @Get('patient-history/:id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  getPatientHistory(@Param('id', ParseIntPipe) patientId: number) {
    return this.reportsService.getPatientHistory(patientId);
  }

  @Get('export')
  @Roles(UserRole.OWNER)
  exportData(
    @Query('type') type: 'patients' | 'sessions' | 'payments',
    @Query('start') startDate?: string,
    @Query('end') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    return this.reportsService.exportData(type, start, end);
  }

  // NEW: Financial summary endpoint
  @Get('financial-summary')
  @Roles(UserRole.OWNER)
  getFinancialSummary(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Both start and end dates are required for financial summary');
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return this.reportsService.getFinancialSummary(start, end);
  }

@Get('referral-analysis')
@Roles(UserRole.OWNER)
getReferralAnalysis(
  @Query('start') startDate?: string,
  @Query('end') endDate?: string,
) {
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  
  return this.reportsService.getReferralAnalysis(start, end);
}

@Get('doctor-referral-performance')
@Roles(UserRole.OWNER)
getDoctorReferralPerformance(
  @Query('start') startDate?: string,
  @Query('end') endDate?: string,
) {
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  
  return this.reportsService.getDoctorReferralPerformance(start, end);
}
}