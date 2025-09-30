import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Patient } from '../patients/entity/patient.entity';
import { Session } from '../sessions/entity/session.entity';
import { Payment } from '../payments/entity/payment.entity';
import { Doctor } from '../doctors/entity/doctor.entity';
import { PatientStatus } from 'src/common/enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
  ) { }

  async getDashboardStats() {
    try {
      const patientStats = await this.patientsRepository
        .createQueryBuilder('patient')
        .select('patient.status', 'status')
        .addSelect('COUNT(patient.patient_id)', 'count')
        .groupBy('patient.status')
        .getRawMany();

      const totalRevenue = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount_paid)', 'total')
        .getRawOne();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRevenue = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount_paid)', 'total')
        .where('payment.payment_date >= :today', { today })
        .getRawOne();

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyRevenue = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount_paid)', 'total')
        .where('payment.payment_date >= :startOfMonth', { startOfMonth })
        .getRawOne();

      // Get today's sessions count
      const todaysSessions = await this.sessionsRepository
        .createQueryBuilder('session')
        .where('session.session_date >= :today', { today })
        .getCount();

      return {
        patientStats,
        revenue: {
          total: parseFloat(totalRevenue.total) || 0,
          today: parseFloat(todayRevenue.total) || 0,
          monthly: parseFloat(monthlyRevenue.total) || 0,
        },
        todaysSessions
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch dashboard statistics');
    }
  }



  // async getPatientHistory(id: number): Promise<any> {
  //   if (!id || isNaN(id)) {
  //     throw new BadRequestException('Valid patient ID is required');
  //   }

  //   try {
  //     const patient = await this.patientsRepository
  //           .createQueryBuilder('patient')
  //           .leftJoinAndSelect('patient.sessions', 'sessions')
  //           .leftJoinAndSelect('sessions.payment', 'session_payment')
  //           .leftJoinAndSelect('sessions.doctor', 'doctor')
  //           .leftJoinAndSelect('patient.assigned_doctor', 'assigned_doctor')
  //           .where('patient.patient_id = :id', { id })
  //           .getOne();

  //     if (!patient) {
  //       throw new NotFoundException(`Patient with ID ${id} not found`);
  //     }

  //     const payments = await this.paymentsRepository
  //           .createQueryBuilder('payment')
  //           .select([
  //               'payment.payment_id',
  //               'payment.amount_paid',
  //               'payment.payment_mode',
  //               'payment.remarks',
  //               'payment.payment_date',
  //               'payment.remaining_amount',
  //               'payment.created_at',
  //               'payment.patient_id' 
  //           ])
  //           .leftJoin('payment.patient', 'patient')
  //           .addSelect(['patient.patient_id', 'patient.name'])
  //           .where('payment.patient_id = :patientId', { patientId: id })
  //           .orderBy('payment.payment_date', 'DESC')
  //           .getMany();

  //     // Calculate total paid and remaining amount
  //     const totalPaid = patient.payments.reduce((sum, payment) => {
  //       return sum + parseFloat(payment.amount_paid.toString());
  //     }, 0);

  //     const remainingAmount = parseFloat(patient.total_amount.toString()) - totalPaid;

  //     // Sort sessions by date descending
  //     const sortedSessions = patient.sessions.sort(
  //       (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
  //     );

  //     // Sort payments by date descending
  //     const sortedPayments = patient.payments.sort(
  //       (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  //     );

  //     return {
  //       patient: {
  //         ...patient,
  //         totalPaid,
  //         remainingAmount
  //       },
  //       sessions: sortedSessions,
  //       payments: payments,
  //     };
  //   } catch (error) {
  //     if (error instanceof NotFoundException) {
  //       throw error;
  //     }
  //     throw new BadRequestException('Failed to fetch patient history');
  //   }
  // }

  async getFinancialSummary(startDate: Date, endDate: Date) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates are required');
    }

    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    try {
      // Adjust end date to include the entire day
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);

      const payments = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('payment.payment_mode', 'paymentMode')
        .addSelect('SUM(payment.amount_paid)', 'total')
        .where('payment.payment_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate: adjustedEndDate
        })
        .groupBy('payment.payment_mode')
        .getRawMany();

      const totalRevenue = payments.reduce((sum, item) => sum + parseFloat(item.total), 0);

      return {
        period: { startDate, endDate },
        revenueByPaymentMode: payments,
        totalRevenue
      };
    } catch (error) {
      throw new BadRequestException('Failed to generate financial summary');
    }
  }

  async getMonthlyFinancialReport(year: number, month: number) {
    try {
      if (!year || !month) {
        throw new BadRequestException('Year and month are required');
      }

      // Calculate start and end dates for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

      // Get daily revenue for the month
      const dailyRevenue = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('DATE(payment.payment_date)', 'date')
        .addSelect('SUM(payment.amount_paid)', 'revenue')
        .where('payment.payment_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy('DATE(payment.payment_date)')
        .orderBy('date', 'ASC')
        .getRawMany();

      // Get revenue by payment mode for the month
      const revenueByPaymentMode = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('payment.payment_mode', 'paymentMode')
        .addSelect('SUM(payment.amount_paid)', 'total')
        .where('payment.payment_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy('payment.payment_mode')
        .getRawMany();

      const totalRevenue = revenueByPaymentMode.reduce((sum, item) => sum + parseFloat(item.total), 0);

      return {
        period: { year, month },
        dailyRevenue,
        revenueByPaymentMode,
        totalRevenue
      };
    } catch (error) {
      throw new BadRequestException('Failed to generate monthly financial report');
    }
  }

  // Yearly Financial Report API
  async getYearlyFinancialReport(year: number) {
    try {
      if (!year) {
        throw new BadRequestException('Year is required');
      }

      // Calculate start and end dates for the year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);

      // Get monthly revenue for the year
      const monthlyRevenue = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('EXTRACT(MONTH FROM payment.payment_date)', 'month')
        .addSelect('SUM(payment.amount_paid)', 'revenue')
        .where('payment.payment_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy('EXTRACT(MONTH FROM payment.payment_date)')
        .orderBy('month', 'ASC')
        .getRawMany();

      // Get revenue by payment mode for the year
      const revenueByPaymentMode = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('payment.payment_mode', 'paymentMode')
        .addSelect('SUM(payment.amount_paid)', 'total')
        .where('payment.payment_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy('payment.payment_mode')
        .getRawMany();

      const totalRevenue = revenueByPaymentMode.reduce((sum, item) => sum + parseFloat(item.total), 0);

      return {
        year,
        monthlyRevenue,
        revenueByPaymentMode,
        totalRevenue
      };
    } catch (error) {
      throw new BadRequestException('Failed to generate yearly financial report');
    }
  }

  // Pending Payment Patients List API
  async getPendingPaymentPatients() {
    try {
      const patients = await this.patientsRepository.find({
        relations: ['payments', 'assigned_doctor'],
        where: { status: PatientStatus.ACTIVE }
      });

      const pendingPaymentPatients = patients.map(patient => {
        const totalPaid = patient.payments.reduce((sum, payment) => {
          return sum + parseFloat(payment.amount_paid.toString());
        }, 0);

        const pendingAmount = parseFloat(patient.total_amount.toString()) - totalPaid;

        return {
          patient_id: patient.patient_id,
          name: patient.name,
          mobile: patient.mobile,
          total_amount: patient.total_amount,
          paid_amount: totalPaid,
          pending_amount: pendingAmount > 0 ? pendingAmount : 0,
          total_sessions: patient.total_sessions,
          paid_sessions: patient.released_sessions
        };
      }).filter(patient => patient.pending_amount > 0);

      return pendingPaymentPatients;
    } catch (error) {
      throw new BadRequestException('Failed to fetch pending payment patients');
    }
  }

  async getDoctorWiseStats() {
  try {
    console.log('🔍 Starting doctor-wise stats calculation with raw SQL...');

    const doctorStats = await this.doctorsRepository.query(`
      SELECT 
        d.doctor_id as "doctorId",
        d.name as "doctorName", 
        d.specialization as "specialization",
        COUNT(DISTINCT s.patient_id) as "patientCount",
        COUNT(s.session_id) as "sessionCount",
        COALESCE(SUM(p.amount_paid), 0) as "revenue"
      FROM doctors d
      LEFT JOIN sessions s ON d.doctor_id = s.doctor_id
      LEFT JOIN patients pt ON s.patient_id = pt.patient_id  
      LEFT JOIN payments p ON pt.patient_id = p.patient_id
      GROUP BY d.doctor_id, d.name, d.specialization
      ORDER BY revenue DESC
    `);

    console.log('📈 Raw SQL doctor stats:', doctorStats);

    return doctorStats.map(stat => ({
      doctorId: stat.doctorId,
      doctorName: stat.doctorName,
      specialization: stat.specialization,
      patientCount: parseInt(stat.patientCount) || 0,
      sessionCount: parseInt(stat.sessionCount) || 0,
      revenue: parseFloat(stat.revenue) || 0
    }));

  } catch (error) {
    console.error('💥 Error in getDoctorWiseStats:', error);
    throw new BadRequestException('Failed to generate doctor-wise statistics');
  }
}

  // ✅ Add this verification function
  async verifyDoctorStats(doctorId: number) {
  try {
    console.log(`🔍 Verifying stats for doctor ${doctorId}`);

    // Get doctor with relations
    const doctor = await this.doctorsRepository.findOne({
      where: { doctor_id: doctorId },
      relations: ['sessions', 'sessions.patient', 'sessions.patient.payments']
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    console.log(`📅 Sessions found:`, doctor.sessions.length);

    // Get unique patients
    const uniquePatients = new Map();
    doctor.sessions.forEach(session => {
      if (session.patient) {
        uniquePatients.set(session.patient.patient_id, session.patient);
      }
    });

    console.log(`👥 Unique patients:`, uniquePatients.size);

    // Calculate total revenue
    let totalRevenue = 0;
    uniquePatients.forEach(patient => {
      if (patient.payments) {
        const patientRevenue = patient.payments.reduce((sum, payment) => {
          return sum + parseFloat(payment.amount_paid.toString());
        }, 0);
        totalRevenue += patientRevenue;
        console.log(`💰 Patient ${patient.patient_id} revenue: ${patientRevenue}`);
      }
    });

    return {
      doctor: {
        id: doctor.doctor_id,
        name: doctor.name,
        specialization: doctor.specialization
      },
      sessions: doctor.sessions.length,
      patients: Array.from(uniquePatients.keys()),
      totalRevenue: totalRevenue,
      debug: {
        sessions_sample: doctor.sessions.slice(0, 3).map(s => ({
          session_id: s.session_id,
          patient_id: s.patient?.patient_id,
          session_date: s.session_date
        })),
        patients_sample: Array.from(uniquePatients.values()).slice(0, 3).map(p => ({
          patient_id: p.patient_id,
          name: p.name,
          payment_count: p.payments?.length || 0
        }))
      }
    };
  } catch (error) {
    console.error('Verification error:', error);
    return { error: error.message };
  }
}
}