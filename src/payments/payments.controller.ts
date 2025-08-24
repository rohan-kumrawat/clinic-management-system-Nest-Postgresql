import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMode } from './entity/payment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  create(@Body() paymentData: {
    patient: { patient_id: number };
    session?: { session_id: number };
    amount_paid: number;
    payment_mode?: PaymentMode;
    remarks?: string;
    payment_date: Date;
  }): Promise<Payment> {
    return this.paymentsService.create(paymentData);
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
    return this.paymentsService.findByDateRange(new Date(startDate), new Date(endDate));
  }

  @Get('revenue')
  @Roles(UserRole.OWNER)
  getRevenueStats(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    return this.paymentsService.getRevenueStats(new Date(startDate), new Date(endDate));
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.findOne(+id);
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  update(@Param('id') id: string, @Body() updateData: Partial<Payment>): Promise<Payment> {
    return this.paymentsService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string): Promise<void> {
    return this.paymentsService.remove(+id);
  }
}