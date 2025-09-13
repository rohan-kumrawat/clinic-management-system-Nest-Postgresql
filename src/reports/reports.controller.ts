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


  // Financial summary endpoint
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

    // NEW: Monthly Financial Report API
  @Get('monthly-financial')
  @Roles(UserRole.OWNER)
  getMonthlyFinancialReport(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.reportsService.getMonthlyFinancialReport(year, month);
  }

  // NEW: Yearly Financial Report API
  @Get('yearly-financial')
  @Roles(UserRole.OWNER)
  getYearlyFinancialReport(
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.reportsService.getYearlyFinancialReport(year);
  }

  // NEW: Pending Payment Patients List API
  @Get('pending-payments')
  @Roles(UserRole.OWNER)
  getPendingPaymentPatients() {
    return this.reportsService.getPendingPaymentPatients();
  }
}