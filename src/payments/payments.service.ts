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
import { PackagesService } from 'src/packages/packages.service';


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
    private packagesService: PackagesService,
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

    // ✅ FIX: Define sessionEntity variable
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

    // ✅ NEW: Get active package for payment distribution
    const activePackage = await this.packagesService.findActivePackage(patient.patient_id);
    
    if (!activePackage) {
      throw new BadRequestException('No active package found for patient');
    }

    // Use package's financial data instead of patient's
    const packageTotal = Number(activePackage.total_amount);
    const packageCarryAmount = Number(activePackage.carry_amount || 0);
    const packageReleasedSessions = Number(activePackage.released_sessions || 0);
    const perSessionAmount = Number(activePackage.per_session_amount);

    // Check if patient.total_amount exists (for backward compatibility)
    if (patient.total_amount === undefined || patient.total_amount === null) {
      this.logger.error(`Patient #${patient.patient_id} is missing the 'total_amount' field.`);
      throw new InternalServerErrorException(`Patient data is incomplete. Please check patient records.`);
    }

    // Validate amount
    if (paymentData.amount_paid <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    // Calculate total paid including this payment
    let totalPaid = await this.getTotalPaid(patient.patient_id).catch(() => 0);
    totalPaid = Number(totalPaid) + Number(paymentData.amount_paid);

    // Calculate remaining amount
    const remainingAmount = packageTotal - totalPaid;

    // Calculate released sessions and carry amount with proper decimal handling
    const totalAvailableAmount = packageCarryAmount + Number(paymentData.amount_paid);
    const sessionsToRelease = Math.floor(totalAvailableAmount / perSessionAmount);
    const newCarryAmount = totalAvailableAmount % perSessionAmount;
    const newReleasedSessions = packageReleasedSessions + sessionsToRelease;

    // Calculate remaining release sessions
    const attendedSessionsResult = await this.patientsRepository.manager.query(
      `SELECT COUNT(*) as count FROM sessions WHERE patient_id = $1 AND package_id = $2`,
      [patient.patient_id, activePackage.package_id]
    );
    const attendedSessionsCount = parseInt(attendedSessionsResult[0].count, 10);
    const remainingReleaseSessions = Math.max(newReleasedSessions - attendedSessionsCount, 0);

    // Create payment entity
    const payment = new Payment();
    payment.patient = patient;
    payment.session = sessionEntity; // ✅ Now sessionEntity is defined
    payment.created_by = { id: paymentData.created_by.id } as User;
    payment.amount_paid = Number(paymentData.amount_paid);
    payment.payment_mode = paymentData.payment_mode || PaymentMode.CASH;
    payment.remarks = paymentData.remarks ?? '';
    payment.payment_date = paymentData.payment_date;
    payment.remaining_amount = remainingAmount < 0 ? 0 : remainingAmount;

    const savedPayment = await this.paymentsRepository.save(payment);

    // ✅ UPDATE: Update PACKAGE instead of patient
    await this.packagesService.updateReleasedSessions(
      activePackage.package_id, 
      newReleasedSessions, 
      newCarryAmount
    );

    // Return response
    return {
      payment_id: savedPayment.payment_id,
      patient: {
        patient_id: patient.patient_id,
        name: patient.name,
        released_sessions: newReleasedSessions,
        carry_amount: parseFloat(newCarryAmount.toFixed(2)),
        remaining_release_sessions: remainingReleaseSessions
      },
      package: {
        package_id: activePackage.package_id,
        package_name: activePackage.package_name,
        remaining_sessions: activePackage.total_sessions - activePackage.used_sessions
      },
      // ✅ FIX: sessionEntity is now defined
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
          'payment.patient_id',
          'payment.created_by_id',
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
      }> 
    {
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