import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Patient } from '../patients/entity/patient.entity';
import { Session } from '../sessions/entity/session.entity';
import { Payment } from '../payments/entity/payment.entity';
import { Doctor } from '../doctors/entity/doctor.entity';


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
  ) {}

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

  async getDoctorWiseStats(startDate: Date, endDate: Date) {
    // Validate dates
    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates are required');
    }
    
    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    try {
      return await this.doctorsRepository
        .createQueryBuilder('doctor')
        .leftJoin('doctor.sessions', 'session', 'session.session_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .leftJoin('session.payment', 'payment')
        .select('doctor.name', 'doctorName')
        .addSelect('doctor.doctor_id', 'doctorId')
        .addSelect('COUNT(DISTINCT session.patient_id)', 'patientCount')
        .addSelect('COUNT(session.session_id)', 'sessionCount')
        .addSelect('COALESCE(SUM(payment.amount_paid), 0)', 'revenue')
        .groupBy('doctor.doctor_id')
        .getRawMany();
    } catch (error) {
      throw new BadRequestException('Failed to generate doctor-wise statistics');
    }
  }

  async getPatientHistory(id: number): Promise<any> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid patient ID is required');
    }

    try {
      const patient = await this.patientsRepository.findOne({
        where: { patient_id: id },
        relations: ['sessions', 'sessions.payment', 'sessions.doctor', 'payments', 'assigned_doctor'],
      });

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      // Calculate total paid and remaining amount
      const totalPaid = patient.payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
      const remainingAmount = patient.total_amount - totalPaid;

      // Sort sessions by date descending
      const sortedSessions = patient.sessions.sort(
        (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      );

      // Sort payments by date descending
      const sortedPayments = patient.payments.sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      return {
        patient: {
          ...patient,
          totalPaid,
          remainingAmount
        },
        sessions: sortedSessions,
        payments: sortedPayments,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch patient history');
    }
  }

  async exportData(type: 'patients' | 'sessions' | 'payments', startDate?: Date, endDate?: Date) {
    try {
      let data: any[] = [];
      let whereCondition = {};
      
      // Prepare date filter if both dates provided
      if (startDate && endDate) {
        if (startDate > endDate) {
          throw new BadRequestException('Start date cannot be after end date');
        }
        
        // Adjust end date to include the entire day
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);
        
        switch (type) {
          case 'patients':
            whereCondition = { created_at: Between(startDate, adjustedEndDate) };
            break;
          case 'sessions':
            whereCondition = { session_date: Between(startDate, adjustedEndDate) };
            break;
          case 'payments':
            whereCondition = { payment_date: Between(startDate, adjustedEndDate) };
            break;
        }
      }
      
      switch (type) {
        case 'patients':
          data = await this.patientsRepository.find({
            relations: ['assigned_doctor'],
            where: whereCondition,
            order: { created_at: 'DESC' },
          });
          break;
          
        case 'sessions':
          data = await this.sessionsRepository.find({
            relations: ['patient', 'doctor'],
            where: whereCondition,
            order: { session_date: 'DESC' },
          });
          break;
          
        case 'payments':
          data = await this.paymentsRepository.find({
            relations: ['patient'],
            where: whereCondition,
            order: { payment_date: 'DESC' },
          });
          break;
      }
      
      return data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to export data');
    }
  }

  // NEW: Financial summary report
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

  // Get referral analysis report

  async getReferralAnalysis(startDate?: Date, endDate?: Date): Promise<any> {
  try {
    let whereCondition: any = { referred_dr: Like('%') }; // Only patients with referred_dr
    
    if (startDate && endDate) {
      if (startDate > endDate) {
        throw new BadRequestException('Start date cannot be after end date');
      }
      whereCondition.created_at = Between(startDate, endDate);
    }
    
    const referredPatients = await this.patientsRepository.find({
      where: whereCondition,
      relations: ['assigned_doctor'],
      order: { referred_dr: 'ASC' }
    });
    
    // Group by referred doctor
    const referralStats: { [key: string]: { count: number, patients: any[] } } = {};
    
    referredPatients.forEach(patient => {
      if (!referralStats[patient.referred_dr]) {
        referralStats[patient.referred_dr] = {
          count: 0,
          patients: []
        };
      }
      
      referralStats[patient.referred_dr].count += 1;
      referralStats[patient.referred_dr].patients.push({
        id: patient.patient_id,
        name: patient.name,
        mobile: patient.mobile,
        assigned_doctor: patient.assigned_doctor ? patient.assigned_doctor.name : 'Not Assigned',
        created_at: patient.created_at
      });
    });
    
    // Convert to array and sort by count descending
    const result = Object.entries(referralStats)
      .map(([referred_dr, stats]) => ({
        referred_dr,
        patient_count: stats.count,
        patients: stats.patients
      }))
      .sort((a, b) => b.patient_count - a.patient_count);
    
    return result;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException('Failed to generate referral analysis report');
  }
}

/**
 * Get doctor referral performance - which of our doctors received how many referred patients
 */
async getDoctorReferralPerformance(startDate?: Date, endDate?: Date): Promise<any> {
  try {
    let whereCondition: any = { referred_dr: Like('%') }; // Only patients with referred_dr
    
    if (startDate && endDate) {
      if (startDate > endDate) {
        throw new BadRequestException('Start date cannot be after end date');
      }
      whereCondition.created_at = Between(startDate, endDate);
    }
    
    const referredPatients = await this.patientsRepository.find({
      where: whereCondition,
      relations: ['assigned_doctor'],
      order: { assigned_doctor: 'ASC' }
    });
    
    // Group by assigned doctor
    const doctorStats: { [key: string]: { count: number, patients: any[] } } = {
      'Not Assigned': { count: 0, patients: [] }
    };
    
    referredPatients.forEach(patient => {
      const doctorKey = patient.assigned_doctor ? 
        `${patient.assigned_doctor.name} (ID: ${patient.assigned_doctor.doctor_id})` : 
        'Not Assigned';
      
      if (!doctorStats[doctorKey]) {
        doctorStats[doctorKey] = {
          count: 0,
          patients: []
        };
      }
      
      doctorStats[doctorKey].count += 1;
      doctorStats[doctorKey].patients.push({
        id: patient.patient_id,
        name: patient.name,
        mobile: patient.mobile,
        referred_dr: patient.referred_dr,
        created_at: patient.created_at
      });
    });
    
    // Convert to array and sort by count descending
    const result = Object.entries(doctorStats)
      .map(([doctor, stats]) => ({
        doctor,
        referred_patient_count: stats.count,
        patients: stats.patients
      }))
      .sort((a, b) => b.referred_patient_count - a.referred_patient_count);
    
    return result;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException('Failed to generate doctor referral performance report');
  }
}
}