import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Patient, PatientStatus } from '../patients/entity/patient.entity';
import { Session } from '../sessions/entity/session.entity';
import { Payment, PaymentMode } from '../payments/entity/payment.entity';
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

    const monthlyRevenue = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_paid)', 'total')
      .where('payment.payment_date >= :startOfMonth', {
        startOfMonth: new Date(today.getFullYear(), today.getMonth(), 1),
      })
      .getRawOne();

    return {
      patientStats,
      revenue: {
        total: parseFloat(totalRevenue.total) || 0,
        today: parseFloat(todayRevenue.total) || 0,
        monthly: parseFloat(monthlyRevenue.total) || 0,
      },
    };
  }

  async getDoctorWiseStats(startDate: Date, endDate: Date) {
    return this.doctorsRepository
      .createQueryBuilder('doctor')
      .leftJoin(
        'doctor.sessions',
        'session',
        'session.session_date BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      )
      .leftJoin('session.payment', 'payment')
      .select('doctor.name', 'doctorName')
      .addSelect('COUNT(DISTINCT session.patient_id)', 'patientCount')
      .addSelect('COUNT(session.session_id)', 'sessionCount')
      .addSelect('SUM(payment.amount_paid)', 'revenue')
      .groupBy('doctor.doctor_id')
      .getRawMany();
  }

  async getPatientHistory(patientId: number) {
    const patient = await this.patientsRepository.findOne({
      where: { patient_id: patientId },
      relations: ['sessions', 'sessions.doctor', 'payments'],
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return {
      patient,
      sessions: patient.sessions,
      payments: patient.payments,
      totalPaid: patient.payments.reduce(
        (sum, payment) => sum + payment.amount_paid,
        0,
      ),
      remainingAmount:
        patient.total_amount -
        patient.payments.reduce((sum, payment) => sum + payment.amount_paid, 0),
    };
  }

  async exportData(
    type: 'patients' | 'sessions' | 'payments',
    startDate?: Date,
    endDate?: Date,
  ) {
    let data: any[] = [];

    switch (type) {
      case 'patients':
        data = await this.patientsRepository.find({
          relations: ['assigned_doctor'],
          where:
            startDate && endDate
              ? {
                  created_at: Between(startDate, endDate),
                }
              : {},
        });
        break;

      case 'sessions':
        data = await this.sessionsRepository.find({
          relations: ['patient', 'doctor'],
          where:
            startDate && endDate
              ? {
                  session_date: Between(startDate, endDate),
                }
              : {},
        });
        break;

      case 'payments':
        data = await this.paymentsRepository.find({
          relations: ['patient'],
          where:
            startDate && endDate
              ? {
                  payment_date: Between(startDate, endDate),
                }
              : {},
        });
        break;
    }

    return data;
  }
}
