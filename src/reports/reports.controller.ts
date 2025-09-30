import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, BadRequestException, Res, Header } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import type { Response } from 'express';
import { PdfService } from 'src/pdf/pdf.service';


@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('doctor-wise')
  @Roles(UserRole.OWNER)
  async getDoctorWiseStats() {
    return this.reportsService.getDoctorWiseStats();
}

  // @Get('patient-history/:id')
  // @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  // getPatientHistory(@Param('id', ParseIntPipe) patientId: number) {
  //   return this.reportsService.getPatientHistory(patientId);
  // }


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

  // PDF Download Endpoints
  @Get('dashboard/pdf')
  @Roles(UserRole.OWNER)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="dashboard-report.pdf"')
  async getDashboardPdf(@Res() res: Response) {
    try {
      const data = await this.reportsService.getDashboardStats();
      const pdfBuffer = await this.pdfService.generateDashboardReport(data);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  }

  @Get('doctor-wise/pdf')
    @Roles(UserRole.OWNER)
    @Header('Content-Type', 'application/pdf')
    @Header('Content-Disposition', 'attachment; filename="doctor-performance.pdf"')
    async getDoctorWisePdf(@Res() res: Response) {
        try {
            // ✅ No date parameters needed - simple all-time stats
            const data = await this.reportsService.getDoctorWiseStats();
            const pdfBuffer = await this.pdfService.generateDoctorWiseReport(data);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            res.status(500).json({ 
                message: 'Failed to generate PDF report',
                error: error.message 
            });
        }
    }

  @Get('financial-summary/pdf')
  @Roles(UserRole.OWNER)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="financial-summary.pdf"')
  async getFinancialSummaryPdf(
    @Res() res: Response,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      const data = await this.reportsService.getFinancialSummary(start, end);
      const pdfBuffer = await this.pdfService.generateFinancialReport(data, startDate, endDate);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  }

  @Get('monthly-financial/pdf')
  @Roles(UserRole.OWNER)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="monthly-financial.pdf"')
  async getMonthlyFinancialPdf(
    @Res() res: Response,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    try {
      const data = await this.reportsService.getMonthlyFinancialReport(year, month);
      const pdfBuffer = await this.pdfService.generateMonthlyFinancialReport(data, year, month);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  }

  @Get('yearly-financial/pdf')
  @Roles(UserRole.OWNER)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="yearly-financial.pdf"')
  async getYearlyFinancialPdf(
    @Res() res: Response,
    @Query('year', ParseIntPipe) year: number,
  ) {
    try {
      const data = await this.reportsService.getYearlyFinancialReport(year);
      const pdfBuffer = await this.pdfService.generateYearlyFinancialReport(data, year);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  }

  @Get('pending-payments/pdf')
  @Roles(UserRole.OWNER)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="pending-payments.pdf"')
  async getPendingPaymentsPdf(@Res() res: Response) {
    try {
      const data = await this.reportsService.getPendingPaymentPatients();
      const pdfBuffer = await this.pdfService.generatePendingPaymentsReport(data);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  }


  @Get('verify-doctor/:doctorId')
async verifyDoctorStats(@Param('doctorId') doctorId: number) {
    return this.reportsService.verifyDoctorStats(doctorId);
}


@Get('debug/doctor-stats/:doctorId')
@Roles(UserRole.OWNER)
async debugDoctorStats(@Param('doctorId', ParseIntPipe) doctorId: number) {
  return this.reportsService.verifyDoctorStats(doctorId);
}

@Get('debug/sessions')
@Roles(UserRole.OWNER)
async debugSessions() {
  try {
    const sessions = await this.reportsService.getSessionsDebug();
    return { success: true, data: sessions };
  } catch (error) {
    throw new BadRequestException(error.message);
  }
}

@Get('debug/payments')
@Roles(UserRole.OWNER)  
async debugPayments() {
  try {
    const payments = await this.reportsService.getPaymentsDebug();
    return { success: true, data: payments };
  } catch (error) {
    throw new BadRequestException(error.message);
  }
}
}