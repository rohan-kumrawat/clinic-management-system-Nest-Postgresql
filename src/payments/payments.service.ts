import { Injectable, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment, PaymentMode } from './entity/payment.entity';
import { PatientsService } from '../patients/patients.service';
import { SessionsService } from '../sessions/sessions.service';
import { Patient } from '../patients/entity/patient.entity';
import { Session } from '../sessions/entity/session.entity';
import { User } from '../auth/entity/user.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    private patientsService: PatientsService,
    private sessionsService: SessionsService,
  ) { }

  async create(createPaymentDto: CreatePaymentDto): Promise<any> {
    try {
      this.logger.debug(`Creating payment for patient ID: ${createPaymentDto.patient.patient_id}`);
      
      // Convert DTO to the format expected by your existing logic
      const paymentData = {
        patient: { patient_id: createPaymentDto.patient.patient_id },
        session: createPaymentDto.session ? { session_id: createPaymentDto.session.session_id } : undefined,
        created_by: { id: createPaymentDto.created_by.id },
        amount_paid: createPaymentDto.amount_paid,
        payment_mode: createPaymentDto.payment_mode,
        remarks: createPaymentDto.remarks,
        payment_date: new Date(createPaymentDto.payment_date)
      };

      // Verify patient exists
      const patient = await this.patientsService.findOne(paymentData.patient.patient_id);
      if (!patient) {
        throw new NotFoundException(`Patient with ID ${paymentData.patient.patient_id} not found`);
      }

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
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new NotFoundException(`Session with ID ${paymentData.session.session_id} not found`);
          }
          throw error;
        }
      }

      // Validate amount
      if (paymentData.amount_paid <= 0) {
        throw new BadRequestException('Payment amount must be greater than zero.');
      }

      // Calculate total paid including this payment
      let totalPaid = await this.getTotalPaid(patient.patient_id).catch(() => 0);
      totalPaid += paymentData.amount_paid;

      // Calculate remaining amount
      const patientTotal = patient.total_amount || 0;
      const remainingAmount = patientTotal - totalPaid;

      // Calculate released sessions and carry amount
      const totalAvailableAmount = patient.carry_amount + paymentData.amount_paid;
      const perSessionAmount = patient.per_session_amount || patientTotal / (patient.total_sessions || 1);
      
      const sessionsToRelease = Math.floor(totalAvailableAmount / perSessionAmount);
      const newCarryAmount = totalAvailableAmount % perSessionAmount;
      const newReleasedSessions = patient.released_sessions + sessionsToRelease;

      // Create payment entity
      const payment = new Payment();
      payment.patient = patient;
      payment.session = sessionEntity;
      payment.created_by = { id: paymentData.created_by.id } as User;
      payment.amount_paid = paymentData.amount_paid;
      payment.payment_mode = paymentData.payment_mode || PaymentMode.CASH;
      payment.remarks = paymentData.remarks ?? '';
      payment.payment_date = paymentData.payment_date;
      payment.remaining_amount = remainingAmount < 0 ? 0 : remainingAmount;

      const savedPayment = await this.paymentsRepository.save(payment);

      // Update patient with new released_sessions and carry_amount
      await this.patientsRepository.update(patient.patient_id, {
        released_sessions: newReleasedSessions,
        carry_amount: newCarryAmount
      });

      // ✅ Filtered response
      return {
        payment_id: savedPayment.payment_id,
        patient: {
          patient_id: patient.patient_id,
          name: patient.name,
          released_sessions: newReleasedSessions,
          carry_amount: newCarryAmount
        },
        session: sessionEntity ? {
          session_id: sessionEntity.session_id,
          name: (sessionEntity as any).name || null,
        } : null,
        created_by: {
          id: savedPayment.created_by.id,
          name: (savedPayment.created_by as any).name || null,
        },
        amount_paid: savedPayment.amount_paid,
        payment_mode: savedPayment.payment_mode,
        remarks: savedPayment.remarks,
        payment_date: savedPayment.payment_date,
        remaining_amount: savedPayment.remaining_amount,
        created_at: savedPayment.created_at,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
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

  async update(id: number, updatePaymentDto: UpdatePaymentDto): Promise<any> {
    try {
      // Convert DTO to the format expected by your existing logic
      const updateData: Partial<Payment> = {
        amount_paid: updatePaymentDto.amount_paid,
        payment_mode: updatePaymentDto.payment_mode,
        remarks: updatePaymentDto.remarks,
      };

      if (updatePaymentDto.payment_date) {
        updateData.payment_date = new Date(updatePaymentDto.payment_date);
      }

      if (updatePaymentDto.patient) {
        updateData.patient = { patient_id: updatePaymentDto.patient.patient_id } as any;
      }

      if (updatePaymentDto.session) {
        updateData.session = { session_id: updatePaymentDto.session.session_id } as any;
      }

      // Check if payment exists first
      const existingPayment = await this.findOne(id);

      await this.paymentsRepository.update(id, updateData);
      const updatedPayment = await this.findOne(id);

      // ✅ Filtered response
      return {
        payment_id: updatedPayment.payment_id,
        patient: {
          patient_id: updatedPayment.patient.patient_id,
          name: updatedPayment.patient.name,
        },
        session: updatedPayment.session
          ? {
              session_id: updatedPayment.session.session_id,
              name: (updatedPayment.session as any).name || null,
            }
          : null,
        created_by: {
          id: updatedPayment.created_by.id,
          name: (updatedPayment.created_by as any).name || null,
        },
        amount_paid: updatedPayment.amount_paid,
        payment_mode: updatedPayment.payment_mode,
        remarks: updatedPayment.remarks,
        payment_date: updatedPayment.payment_date,
        remaining_amount: updatedPayment.remaining_amount,
        created_at: updatedPayment.created_at,
      };
    } catch (error) {
      this.logger.error(`Failed to update payment #${id}: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to update payment.');
    }
  }

  async remove(id: number): Promise<any> {
    try {
      // First get filtered payment details
      const payment = await this.findOne(id);

      const result = await this.paymentsRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      this.logger.log(`Payment #${id} deleted successfully.`);

      // ✅ Return filtered deleted record
      return {
        deleted: true,
        payment: {
          payment_id: payment.payment_id,
          patient: {
            patient_id: payment.patient.patient_id,
            name: payment.patient.name,
          },
          session: payment.session
            ? {
                session_id: payment.session.session_id,
                name: (payment.session as any).name || null,
              }
            : null,
          created_by: {
            id: payment.created_by.id,
            name: (payment.created_by as any).name || null,
          },
          amount_paid: payment.amount_paid,
          payment_mode: payment.payment_mode,
          remarks: payment.remarks,
          payment_date: payment.payment_date,
          remaining_amount: payment.remaining_amount,
          created_at: payment.created_at,
        },
      };
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