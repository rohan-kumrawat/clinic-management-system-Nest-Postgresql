import { Injectable, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment, PaymentMode } from './entity/payment.entity';
import { PatientsService } from '../patients/patients.service';
import { SessionsService } from '../sessions/sessions.service';
import { Patient } from '../patients/entity/patient.entity';
import { Session } from '../sessions/entity/session.entity';
import { User } from '../auth/entity/user.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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
    try {
      this.logger.debug(`Creating payment for patient ID: ${paymentData.patient.patient_id}`);
      this.logger.debug(`Payment data: ${JSON.stringify(paymentData)}`);
      
      // Verify patient exists
      const patient = await this.patientsService.findOne(paymentData.patient.patient_id);
      if (!patient) {
        throw new NotFoundException(`Patient with ID ${paymentData.patient.patient_id} not found`);
      }
      
      this.logger.debug(`Found patient: ${JSON.stringify(patient)}`);
      
      // Check if patient.total_amount exists
      if (patient.total_amount === undefined || patient.total_amount === null) {
        this.logger.error(`Patient #${patient.patient_id} is missing the 'total_amount' field.`);
        throw new InternalServerErrorException(`Patient data is incomplete. Please check patient records.`);
      }

      // If session is provided, verify it exists
      let sessionEntity: Session | null = null;
      if (paymentData.session && paymentData.session.session_id) {
        try {
          sessionEntity = await this.sessionsService.findOne(paymentData.session.session_id);
          this.logger.debug(`Found session: ${JSON.stringify(sessionEntity)}`);
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new NotFoundException(`Session with ID ${paymentData.session.session_id} not found`);
          }
          this.logger.error(`Error finding session: ${error.message}`, error.stack);
          throw error;
        }
      }

      // Validate amount
      if (paymentData.amount_paid <= 0) {
        throw new BadRequestException('Payment amount must be greater than zero.');
      }

      // Calculate remaining amount with better error handling
      let totalPaid = 0;
      try {
        totalPaid = await this.getTotalPaid(patient.patient_id);
        this.logger.debug(`Total paid for patient ${patient.patient_id}: ${totalPaid}`);
      } catch (error) {
        this.logger.warn(`Could not calculate total paid for patient ${patient.patient_id}, using 0: ${error.message}`);
        totalPaid = 0;
      }

      // Debug logging
      this.logger.debug(`Patient ${patient.patient_id} total_amount: ${patient.total_amount}`);
      this.logger.debug(`Current total paid: ${totalPaid}`);
      this.logger.debug(`New payment amount: ${paymentData.amount_paid}`);

      // Ensure patient.total_amount is a valid number
      const patientTotal = patient.total_amount || 0;
      const remainingAmount = patientTotal - (totalPaid + paymentData.amount_paid);
      this.logger.debug(`Calculated remaining amount: ${remainingAmount}`);

      // Create payment entity using proper TypeORM create method
      const payment = new Payment();
      payment.patient = patient;
      payment.session = sessionEntity;
      payment.created_by = { id: paymentData.created_by.id } as User;
      payment.amount_paid = paymentData.amount_paid;
      payment.payment_mode = paymentData.payment_mode || PaymentMode.CASH;
      payment.remarks = paymentData.remarks ?? '';
      payment.payment_date = paymentData.payment_date;
      payment.remaining_amount = remainingAmount < 0 ? 0 : remainingAmount;

      this.logger.debug(`Attempting to save payment: ${JSON.stringify(payment)}`);
      
      const savedPayment = await this.paymentsRepository.save(payment);
      this.logger.log(`Payment #${savedPayment.payment_id} created successfully for patient #${patient.patient_id}`);
      return savedPayment;

    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);
      
      // Re-throw known exceptions
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      // Wrap any other unexpected error
      throw new InternalServerErrorException('Failed to process payment due to an internal error.');
    }
  }

  async getTotalPaid(patientId: number): Promise<number> {
    try {
      this.logger.debug(`Calculating total paid for patient ID: ${patientId}`);
      
      // Use query builder for more reliable results
      const result = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount_paid)', 'total')
        .where('payment.patient_id = :patientId', { patientId })
        .getRawOne();
      
      this.logger.debug(`Query result: ${JSON.stringify(result)}`);
      
      const total = parseFloat(result.total) || 0;
      this.logger.debug(`Total paid: ${total}`);
      
      return total;
    } catch (error) {
      this.logger.error(`Failed to calculate total paid for patient #${patientId}: ${error.message}`, error.stack);
      // Don't throw an error here, just return 0 to prevent blocking payment creation
      return 0;
    }
  }

  async findAll(): Promise<any[]> {
  try {
    const payments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select([
        'payment.payment_id',
        'payment.amount_paid',
        'payment.payment_mode',
        'payment.remarks',
        'payment.payment_date',
        'payment.remaining_amount',
        'payment.created_at',
      ])
      .leftJoin('payment.patient', 'patient')
      .addSelect(['patient.patient_id', 'patient.name'])
      .leftJoin('payment.session', 'session')
      .addSelect(['session.session_id', 'session.session_date'])
      .leftJoin('payment.created_by', 'created_by')
      .addSelect(['created_by.id', 'created_by.name'])
      .orderBy('payment.payment_date', 'DESC')
      .getMany();

    return payments;
  } catch (error) {
    this.logger.error(`Failed to retrieve payments: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to retrieve payments.');
  }
}

  async findOne(id: number): Promise<any> {
  try {
    const payment = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select([
        'payment.payment_id',
        'payment.amount_paid',
        'payment.payment_mode',
        'payment.remarks',
        'payment.payment_date',
        'payment.remaining_amount',
        'payment.created_at',
      ])
      .leftJoin('payment.patient', 'patient')
      .addSelect(['patient.patient_id', 'patient.name'])
      .leftJoin('payment.session', 'session')
      .addSelect(['session.session_id', 'session.session_date'])
      .leftJoin('payment.created_by', 'created_by')
      .addSelect(['created_by.id', 'created_by.name'])
      .where('payment.payment_id = :id', { id })
      .getOne();

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  } catch (error) {
    this.logger.error(`Failed to retrieve payment #${id}: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to retrieve payment.');
  }
}

 async findByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
  try {
    const payments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select([
        'payment.payment_id',
        'payment.amount_paid',
        'payment.payment_mode',
        'payment.remarks',
        'payment.payment_date',
        'payment.remaining_amount',
        'payment.created_at',
      ])
      .leftJoin('payment.patient', 'patient')
      .addSelect(['patient.patient_id', 'patient.name'])
      .leftJoin('payment.session', 'session')
      .addSelect(['session.session_id', 'session.session_date'])
      .leftJoin('payment.created_by', 'created_by')
      .addSelect(['created_by.id', 'created_by.name'])
      .where('payment.payment_date BETWEEN :start AND :end', { start: startDate, end: endDate })
      .orderBy('payment.payment_date', 'DESC')
      .getMany();

    return payments;
  } catch (error) {
    this.logger.error(`Failed to retrieve payments by date range: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to retrieve payments by date range.');
  }
}

  async getRevenueStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    revenueByMode: Record<PaymentMode, number>;
    dailyRevenue: { date: string; amount: number }[];
  }> {
    try {
      // Validate dates
      if (startDate > endDate) {
        throw new BadRequestException('Start date cannot be after end date.');
      }

      const payments = await this.findByDateRange(startDate, endDate);
      
      const totalRevenue = payments.reduce((total, payment) => total + payment.amount_paid, 0);
      
      const revenueByMode = {} as Record<PaymentMode, number>;
      Object.values(PaymentMode).forEach(mode => {
        revenueByMode[mode] = 0;
      });
      
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
      
      const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([date, amount]) => ({ 
        date, 
        amount: parseFloat(amount.toFixed(2)) 
      }));
      
      // Sort daily revenue by date
      dailyRevenue.sort((a, b) => a.date.localeCompare(b.date));
      
      return { 
        totalRevenue: parseFloat(totalRevenue.toFixed(2)), 
        revenueByMode, 
        dailyRevenue 
      };
    } catch (error) {
      this.logger.error(`Failed to generate revenue stats: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to generate revenue statistics.');
    }
  }

  async update(id: number, updateData: Partial<Payment>): Promise<Payment> {
    try {
      // Check if payment exists first
      await this.findOne(id);
      
      await this.paymentsRepository.update(id, updateData);
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Failed to update payment #${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to update payment.');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      // Check if payment exists first
      await this.findOne(id);
      
      const result = await this.paymentsRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }
      
      this.logger.log(`Payment #${id} deleted successfully.`);
    } catch (error) {
      this.logger.error(`Failed to delete payment #${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to delete payment.');
    }
  }

  // Find Payments by Patient ID with pagination
  
   async findByPatientId(patientId: number, page: number = 1, limit: number = 10): Promise<{ payments: any[], total: number }> {
  try {
    const query = this.paymentsRepository
      .createQueryBuilder('payment')
      .select([
        'payment.payment_id',
        'payment.amount_paid',
        'payment.payment_mode',
        'payment.remarks',
        'payment.payment_date',
        'payment.remaining_amount',
        'payment.created_at',
      ])
      .leftJoin('payment.patient', 'patient')
      .addSelect(['patient.patient_id', 'patient.name'])
      .leftJoin('payment.session', 'session')
      .addSelect(['session.session_id', 'session.session_date'])
      .leftJoin('payment.created_by', 'created_by')
      .addSelect(['created_by.id', 'created_by.name'])
      .where('patient.patient_id = :patientId', { patientId })
      .orderBy('payment.payment_date', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit));

    const [payments, total] = await query.getManyAndCount();

    if (!payments || payments.length === 0) {
      throw new NotFoundException(`No payments found for patient with ID ${patientId}`);
    }

    return { payments, total };
  } catch (error) {
    this.logger.error(`Failed to fetch payments for patient ${patientId}: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to fetch payments.');
  }
}
}