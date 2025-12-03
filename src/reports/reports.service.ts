import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Patient } from '../patients/entity/patient.entity';
import { Session } from '../sessions/entity/session.entity';
import { Payment } from '../payments/entity/payment.entity';
import { Doctor } from '../doctors/entity/doctor.entity';
import { PatientPackage } from '../packages/entity/package.entity';
import { PackageStatus, PatientStatus, PaymentStatus } from '../common/enums';

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
    @InjectRepository(PatientPackage)
    private packagesRepository: Repository<PatientPackage>,
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

      const todaysSessions = await this.sessionsRepository
        .createQueryBuilder('session')
        .where('session.session_date >= :today', { today })
        .getCount();

      // Get package statistics
      const activePackages = await this.packagesRepository.count({
        where: { status: PackageStatus.ACTIVE }
      });

      const totalPackageRevenue = await this.packagesRepository
        .createQueryBuilder('package')
        .select('SUM(package.total_amount)', 'total')
        .getRawOne();

      return {
        patientStats,
        revenue: {
          total: parseFloat(totalRevenue.total) || 0,
          today: parseFloat(todayRevenue.total) || 0,
          monthly: parseFloat(monthlyRevenue.total) || 0,
          totalPackageRevenue: parseFloat(totalPackageRevenue.total) || 0
        },
        todaysSessions,
        activePackages,
        totalActivePatients: patientStats.find(p => p.status === PatientStatus.ACTIVE)?.count || 0
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch dashboard statistics');
    }
  }

  async getPatientHistory(id: number): Promise<any> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Valid patient ID is required');
    }

    try {
      const patient = await this.patientsRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.packages', 'packages')
        .leftJoinAndSelect('patient.sessions', 'sessions')
        .leftJoin('sessions.doctor', 'sessionDoctor')
        .addSelect(['sessionDoctor.doctor_id', 'sessionDoctor.name'])
        .leftJoinAndSelect('patient.payments', 'payments')
        .where('patient.patient_id = :id', { id })
        .getOne();

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      // Calculate total paid
      const totalPaid = patient.payments?.reduce((sum, payment) => {
        return sum + Number(payment.amount_paid || 0);
      }, 0) || 0;

      // Calculate total package amount
      const totalPackageAmount = patient.packages?.reduce((sum, pkg) => {
        return sum + Number(pkg.total_amount || 0);
      }, 0) || 0;

      const remainingAmount = totalPackageAmount - totalPaid;

      // Sort data
      const sortedSessions = patient.sessions?.sort(
        (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      ) || [];

      const sortedPayments = patient.payments?.sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      ) || [];

      const sortedPackages = patient.packages?.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || [];

      return {
        patient: {
          patient_id: patient.patient_id,
          name: patient.name,
          mobile: patient.mobile,
          reg_no: patient.reg_no,
          age: patient.age,
          gender: patient.gender,
          status: patient.status,
          totalPaid,
          totalPackageAmount,
          remainingAmount
        },
        packages: sortedPackages,
        sessions: sortedSessions.map(s => ({
          session_id: s.session_id,
          session_date: s.session_date,
          shift: s.shift,
          visit_type: s.visit_type,
          remarks: s.remarks,
          doctor: s.doctor ? {
            doctor_id: s.doctor.doctor_id,
            name: s.doctor.name
          } : null
        })),
        payments: sortedPayments.map(p => ({
          payment_id: p.payment_id,
          amount_paid: p.amount_paid,
          payment_mode: p.payment_mode,
          payment_date: p.payment_date,
          remarks: p.remarks
        }))
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch patient history');
    }
  }

  async getFinancialSummary(startDate: Date, endDate: Date) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates are required');
    }

    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    try {
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

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

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

  async getYearlyFinancialReport(year: number) {
    try {
      if (!year) {
        throw new BadRequestException('Year is required');
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);

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

  async getPendingPaymentPatients() {
  try {
    // Get all active patients with their packages and payments
    const patients = await this.patientsRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.packages', 'packages')
      .leftJoinAndSelect('patient.payments', 'payments')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .getMany();

    // ✅ FIX: Define proper type for the array
    const pendingPaymentPatients: Array<{
      patient_id: number;
      name: string;
      mobile: string;
      reg_no: string;
      total_amount: number;
      paid_amount: number;
      pending_amount: number;
      total_sessions: number;
      paid_sessions: number;
      status: PatientStatus;
      current_doctor: { doctor_id: number | null } | null;
    }> = [];

    for (const patient of patients) {
      // Calculate total from all packages
      let totalPackageAmount = 0;
      let totalSessions = 0;
      let totalReleasedSessions = 0;
      
      if (patient.packages && patient.packages.length > 0) {
        patient.packages.forEach(pkg => {
          totalPackageAmount += Number(pkg.total_amount) || 0;
          totalSessions += pkg.total_sessions || 0;
          totalReleasedSessions += pkg.released_sessions || 0;
        });
      }

      // Calculate total paid amount
      const totalPaid = patient.payments?.reduce((sum, payment) => 
        sum + Number(payment.amount_paid || 0), 0) || 0;

      const pendingAmount = totalPackageAmount - totalPaid;

      if (pendingAmount > 0) {
        // Get active package for current doctor info
        const activePackage = patient.packages?.find(pkg => pkg.status === PackageStatus.ACTIVE);
        
        pendingPaymentPatients.push({
          patient_id: patient.patient_id,
          name: patient.name,
          mobile: patient.mobile,
          reg_no: patient.reg_no,
          total_amount: totalPackageAmount,
          paid_amount: totalPaid,
          pending_amount: pendingAmount,
          total_sessions: totalSessions,
          paid_sessions: totalReleasedSessions,
          status: patient.status,
          current_doctor: activePackage && activePackage.assigned_doctor_id ? {
            doctor_id: activePackage.assigned_doctor_id
          } : null
        });
      }
    }

    return pendingPaymentPatients;
  } catch (error) {
    console.error('Error in getPendingPaymentPatients:', error);
    throw new BadRequestException('Failed to fetch pending payment patients');
  }
}

  async getDoctorWiseStats() {
    try {
      const doctors = await this.doctorsRepository.find();

      const statsPromises = doctors.map(async (doctor) => {
        try {
          // Get sessions for this doctor
          const sessions = await this.sessionsRepository
            .createQueryBuilder('session')
            .where('session.doctor_id = :doctorId', { doctorId: doctor.doctor_id })
            .getMany();

          // Get packages assigned to this doctor
          const assignedPackages = await this.packagesRepository.find({
            where: { assigned_doctor_id: doctor.doctor_id }
          });

          // Get unique patient IDs
          const sessionPatientIds = [...new Set(sessions.map(s => s.patient_id))];
          const packagePatientIds = [...new Set(assignedPackages.map(p => p.patient_id))];
          const uniquePatientIds = [...new Set([...sessionPatientIds, ...packagePatientIds])];

          // Calculate revenue
          let totalRevenue = 0;
          
          if (uniquePatientIds.length > 0) {
            const revenueResult = await this.paymentsRepository
              .createQueryBuilder('payment')
              .select('SUM(payment.amount_paid)', 'total')
              .where('payment.patient_id IN (:...patientIds)', { patientIds: uniquePatientIds })
              .getRawOne();

            totalRevenue = parseFloat(revenueResult?.total || '0');
          }

          // Calculate package revenue
          const packageRevenue = assignedPackages.reduce((sum, pkg) => 
            sum + Number(pkg.total_amount || 0), 0);

          return {
            doctorId: doctor.doctor_id,
            doctorName: doctor.name,
            specialization: doctor.specialization,
            assignedPackages: assignedPackages.length,
            packageRevenue: packageRevenue,
            sessionsConducted: sessions.length,
            patientCount: uniquePatientIds.length,
            revenue: totalRevenue
          };
        } catch (error) {
          console.error(`Error for doctor ${doctor.doctor_id}:`, error);
          return {
            doctorId: doctor.doctor_id,
            doctorName: doctor.name,
            specialization: doctor.specialization,
            assignedPackages: 0,
            packageRevenue: 0,
            sessionsConducted: 0,
            patientCount: 0,
            revenue: 0
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      return stats;

    } catch (error) {
      console.error('Error in getDoctorWiseStats:', error);
      throw new BadRequestException('Failed to generate doctor-wise statistics');
    }
  }

  async getPackageAnalytics() {
    try {
      const packages = await this.packagesRepository.find({
        order: { created_at: 'DESC' }
      });

      const totalPackages = packages.length;
      const activePackages = packages.filter(p => p.status === PackageStatus.ACTIVE).length;
      const completedPackages = packages.filter(p => p.status === PackageStatus.COMPLETED).length;
      const cancelledPackages = packages.filter(p => p.status === PackageStatus.CLOSED).length;

      const totalPackageRevenue = packages.reduce((sum, pkg) => 
        sum + Number(pkg.total_amount || 0), 0);

      const avgPackageValue = totalPackages > 0 ? totalPackageRevenue / totalPackages : 0;

      return {
        summary: {
          totalPackages,
          activePackages,
          completedPackages,
          cancelledPackages,
          totalPackageRevenue,
          avgPackageValue: Math.round(avgPackageValue * 100) / 100
        },
        recentPackages: packages.slice(0, 10).map(pkg => ({
          package_id: pkg.package_id,
          package_name: pkg.package_name,
          total_amount: pkg.total_amount,
          status: pkg.status,
          start_date: pkg.start_date,
          assigned_doctor_id: pkg.assigned_doctor_id
        }))
      };
    } catch (error) {
      console.error('Error in getPackageAnalytics:', error);
      throw new BadRequestException('Failed to generate package analytics');
    }
  }

  async getPatientPackageHistory(patientId: number) {
    try {
      const patient = await this.patientsRepository.findOne({
        where: { patient_id: patientId },
        relations: ['packages', 'payments']
      });

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${patientId} not found`);
      }

      const totalPackageAmount = patient.packages?.reduce((sum, pkg) => 
        sum + Number(pkg.total_amount || 0), 0) || 0;

      const totalPaid = patient.payments?.reduce((sum, payment) => 
        sum + Number(payment.amount_paid || 0), 0) || 0;

      const pendingAmount = totalPackageAmount - totalPaid;

      return {
        patient: {
          patient_id: patient.patient_id,
          name: patient.name,
          mobile: patient.mobile,
          status: patient.status
        },
        financial_summary: {
          total_package_amount: totalPackageAmount,
          total_paid: totalPaid,
          pending_amount: pendingAmount,
          payment_status: pendingAmount > 0 ? 'pending' : 'paid'
        },
        packages: patient.packages?.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) || [],
        payments: patient.payments?.sort((a, b) => 
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        ) || []
      };
    } catch (error) {
      console.error('Error in getPatientPackageHistory:', error);
      throw new BadRequestException('Failed to generate patient package history');
    }
  }

  // ✅ Verification methods (existing, unchanged)
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

  async getSessionsDebug() {
    try {
      const sessions = await this.sessionsRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.doctor', 'doctor')
        .leftJoinAndSelect('session.patient', 'patient')
        .leftJoinAndSelect('session.package', 'package')
        .select([
          'session.session_id',
          'session.doctor_id',
          'session.patient_id',
          'session.package_id',
          'session.session_date',
          'doctor.doctor_id',
          'doctor.name',
          'patient.patient_id',
          'patient.name',
          'package.package_id',
          'package.package_name'
        ])
        .getMany();

      return {
        totalSessions: sessions.length,
        sessions: sessions.map(s => ({
          session_id: s.session_id,
          doctor_id: s.doctor_id,
          doctor_name: s.doctor?.name,
          patient_id: s.patient_id,
          patient_name: s.patient?.name,
          package_id: s.package_id,
          package_name: s.package?.package_name,
          session_date: s.session_date
        }))
      };
    } catch (error) {
      console.error('Debug sessions error:', error);
      return { error: error.message };
    }
  }

  async getPaymentsDebug() {
    try {
      const payments = await this.paymentsRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.patient', 'patient')
        .select([
          'payment.payment_id',
          'payment.patient_id',
          'payment.amount_paid',
          'payment.payment_date',
          'patient.patient_id',
          'patient.name'
        ])
        .getMany();

      return {
        totalPayments: payments.length,
        totalRevenue: payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0),
        payments: payments.map(p => ({
          payment_id: p.payment_id,
          patient_id: p.patient_id,
          patient_name: p.patient?.name,
          amount_paid: p.amount_paid,
          payment_date: p.payment_date
        }))
      };
    } catch (error) {
      console.error('Debug payments error:', error);
      return { error: error.message };
    }
  }
}