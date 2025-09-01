// src/payments/payments.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, Req, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMode } from './entity/payment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async create(
    @Body() paymentData: {
      patient: { patient_id: number };
      session?: { session_id: number };
      amount_paid: number;
      payment_mode?: PaymentMode;
      remarks?: string;
      payment_date: string;
    },
    @Req() request: AuthenticatedRequest
  ): Promise<Payment> {
    // Validate and parse the date string
    let paymentDate: Date;
    try {
      paymentDate = new Date(paymentData.payment_date);
      if (isNaN(paymentDate.getTime())) {
        throw new BadRequestException('Invalid payment_date format. Use ISO string (e.g., "2024-01-15").');
      }
    } catch (error) {
      throw new BadRequestException('Invalid payment_date format. Use ISO string (e.g., "2024-01-15").');
    }

    const paymentDataWithCreatedBy = {
      ...paymentData,
      payment_date: paymentDate,
      created_by: { id: request.user.userId }
    };
    
    return this.paymentsService.create(paymentDataWithCreatedBy);
  }

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get('range')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findByDateRange(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<Payment[]> {
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO string (e.g., "2024-01-15").');
    }
    
    return this.paymentsService.findByDateRange(start, end);
  }

  @Get('revenue')
  @Roles(UserRole.OWNER)
  getRevenueStats(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO string (e.g., "2024-01-15").');
    }
    
    return this.paymentsService.getRevenueStats(start, end);
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Payment> {
    return this.paymentsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateData: Partial<Payment>
  ): Promise<Payment> {
    return this.paymentsService.update(id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.paymentsService.remove(id);
  }
}