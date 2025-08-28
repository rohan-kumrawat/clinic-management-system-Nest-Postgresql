import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment, PaymentMode } from './entity/payment.entity';
import { PatientsService } from '../patients/patients.service';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private patientsService: PatientsService,
    private sessionsService: SessionsService,
  ) {}

async create(paymentData: {
  patient: { patient_id: number };
  session?: { session_id: number };
  created_by: { id: number };
  amount_paid: number;
  payment_mode?: PaymentMode;
  remarks?: string;
  payment_date: Date;
}): Promise<Payment> {
  // Verify patient exists
  const patient = await this.patientsService.findOne(paymentData.patient.patient_id);
  
  // If session is provided, verify it exists
  if (paymentData.session) {
    await this.sessionsService.findOne(paymentData.session.session_id);
  }

  // Calculate remaining amount
  const totalPaid = await this.getTotalPaid(patient.patient_id);
  const remainingAmount = patient.total_amount - (totalPaid + paymentData.amount_paid);

  const payment = this.paymentsRepository.create({
    ...paymentData,
    remaining_amount: remainingAmount,
  });
  
  return this.paymentsRepository.save(payment);
}

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['patient', 'session'],
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { payment_id: id },
      relations: ['patient', 'session'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: {
        payment_date: Between(startDate, endDate),
      },
      relations: ['patient', 'session'],
    });
  }

  async getTotalPaid(patientId: number): Promise<number> {
    const payments = await this.paymentsRepository.find({
      where: { patient: { patient_id: patientId } },
    });
    
    return payments.reduce((total, payment) => total + payment.amount_paid, 0);
  }

  async getRevenueStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    revenueByMode: Record<PaymentMode, number>;
    dailyRevenue: { date: string; amount: number }[];
  }> {
    const payments = await this.findByDateRange(startDate, endDate);
    
    const totalRevenue = payments.reduce((total, payment) => total + payment.amount_paid, 0);
    
    const revenueByMode = {} as Record<PaymentMode, number>;
    payments.forEach(payment => {
      const mode = payment.payment_mode || PaymentMode.CASH;
      revenueByMode[mode] = (revenueByMode[mode] || 0) + payment.amount_paid;
    });
    
    // Group by day
    const dailyRevenueMap = new Map<string, number>();
    payments.forEach(payment => {
      const dateStr = payment.payment_date.toISOString().split('T')[0];
      dailyRevenueMap.set(dateStr, (dailyRevenueMap.get(dateStr) || 0) + payment.amount_paid);
    });
    
    const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([date, amount]) => ({ date, amount }));
    
    return { totalRevenue, revenueByMode, dailyRevenue };
  }

  async update(id: number, updateData: Partial<Payment>): Promise<Payment> {
    await this.paymentsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.paymentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }
}