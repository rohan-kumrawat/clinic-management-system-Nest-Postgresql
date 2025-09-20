import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, SelectQueryBuilder, Brackets } from 'typeorm';
import { Patient } from './entity/patient.entity';
import { UserRole } from '../auth/entity/user.entity';
import { PatientStatus, PaymentStatus, VisitType, Gender } from 'src/common/enums';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) { }

  async create(patientData: CreatePatientDto): Promise<Patient> {
    try {
      console.log('Received patientData:', patientData);
      
      // Handle the assigned_doctor object from frontend
      if (patientData.assigned_doctor && typeof patientData.assigned_doctor === 'object') {
        const doctorData = patientData.assigned_doctor as any;
        const doctorId = doctorData.id || doctorData.doctor_id;
        
        console.log('Extracted doctorId:', doctorId);
        
        if (doctorId) {
          patientData.assigned_doctor = { doctor_id: doctorId } as any;
        } else {
          patientData.assigned_doctor = null;
        }
      }

      // Agar frontend se per_session_amount nahi aaya hai toh calculate karein
      if (!patientData.per_session_amount && patientData.total_sessions > 0) {
        patientData.per_session_amount = patientData.total_amount / patientData.total_sessions;
      }

      console.log('Saving patientData:', patientData);
      
      const patient = this.patientsRepository.create(patientData);
      const savedPatient = await this.patientsRepository.save(patient);
      
      console.log('Saved patient:', savedPatient);
      
      return savedPatient;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw new Error('Failed to create patient. Please check your data.');
    }
  }

  async update(id: number, updateData: UpdatePatientDto, userRole: UserRole | null = null): Promise<Patient> {
    try {
      await this.findOne(id, userRole);

      // Handle the assigned_doctor object in update as well
      if (updateData.assigned_doctor && typeof updateData.assigned_doctor === 'object') {
        const doctorData = updateData.assigned_doctor as any;
        const doctorId = doctorData.id || doctorData.doctor_id;
        
        if (doctorId) {
          updateData.assigned_doctor = { doctor_id: doctorId } as any;
        } else {
          updateData.assigned_doctor = null;
        }
      }

      // Agar total_sessions ya total_amount change hua hai aur per_session_amount nahi diya gaya hai
      if ((updateData.total_sessions !== undefined || updateData.total_amount !== undefined) && 
          !updateData.per_session_amount) {
        const patient = await this.patientsRepository.findOne({ where: { patient_id: id } });
        if (!patient) {
          throw new NotFoundException(`Patient with ID ${id} not found`);
        }
        const newTotalSessions = updateData.total_sessions !== undefined ? updateData.total_sessions : patient.total_sessions;
        const newTotalAmount = updateData.total_amount !== undefined ? updateData.total_amount : patient.total_amount;

        if (newTotalSessions > 0) {
          updateData.per_session_amount = newTotalAmount / newTotalSessions;
        }
      }

      await this.patientsRepository.update(id, updateData);
      return this.findOne(id, userRole);
    } catch (error) {
      console.error('Error updating patient:', error);
      throw new Error('Failed to update patient');
    }
  }

  private async recalculateReleasedSessionsAndCarryAmount(patientId: number): Promise<void> {
    const patient = await this.patientsRepository.findOne({
      where: { patient_id: patientId },
      relations: ['payments']
    });
    
    if (!patient) return;
    
    // Total paid amount calculate karein
    const totalPaid = patient.payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
    
    // Total available amount (including current carry amount)
    const totalAvailableAmount = totalPaid;
    
    // Kitne sessions release kar sakte hain
    const perSessionAmount = patient.per_session_amount || (patient.total_amount / patient.total_sessions);
    const sessionsToRelease = Math.floor(totalAvailableAmount / perSessionAmount);
    
    // Naya carry amount calculate karein
    const newCarryAmount = totalAvailableAmount % perSessionAmount;
    
    // Patient update karein
    await this.patientsRepository.update(patientId, {
      released_sessions: sessionsToRelease,
      carry_amount: newCarryAmount
    });
  }

  async findOne(id: number, userRole: UserRole | null = null): Promise<any> {
  try {
    let queryBuilder = this.patientsRepository
      .createQueryBuilder('patient')
      .leftJoin('patient.assigned_doctor', 'doctor')
      .addSelect(['doctor.doctor_id', 'doctor.name'])
      .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions')
      .where('patient.patient_id = :id', { id });

    // Apply role-based filter (Receptionist can only see ACTIVE patients)
    if (userRole === UserRole.RECEPTIONIST) {
      queryBuilder = queryBuilder.andWhere('patient.status = :status', { status: PatientStatus.ACTIVE });
    }

    const patient = await queryBuilder.getOne();

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    // Get the accurate attended sessions count
    const sessionCountResult = await this.patientsRepository.manager.query(
      `SELECT COUNT(*) as count FROM sessions WHERE patient_id = $1`,
      [id]
    );
    
    const attendedSessionsCount = parseInt(sessionCountResult[0].count, 10);
    
    // Get paid amount
    const paidResult = await this.patientsRepository.manager.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total_paid 
       FROM payments 
       WHERE patient_id = $1`,
      [id]
    );
    
    const paidAmount = parseFloat(paidResult[0].total_paid);
    
    // Calculate payment status
    const remaining = patient.total_amount - paidAmount;
    let paymentStatus = PaymentStatus.UNPAID;
    
    if (paidAmount === 0) {
      paymentStatus = PaymentStatus.UNPAID;
    } else if (remaining > 0) {
      paymentStatus = PaymentStatus.PARTIALLY_PAID;
    } else {
      paymentStatus = PaymentStatus.FULLY_PAID;
    }
    
    // Calculate remaining release sessions
    const remainingReleaseSessions = Math.max(patient.released_sessions - attendedSessionsCount, 0);
    
    // Format assigned_doctor
    const formattedDoctor = patient.assigned_doctor ? {
      doctor_id: patient.assigned_doctor.doctor_id,
      name: patient.assigned_doctor.name
    } : null;

    // Return the complete patient object with all stats
    return {
      ...patient,
      assigned_doctor: formattedDoctor,
      attended_sessions_count: attendedSessionsCount,
      paid_amount: paidAmount,
      payment_status: paymentStatus,
      remaining_release_sessions: remainingReleaseSessions
    };
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw new Error('Failed to fetch patient');
  }
}

  async remove(id: number): Promise<{ message: string }> {
    try {
      const result = await this.patientsRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      return { message: 'Patient deleted successfully' };
    } catch (error) {
      console.error('Error deleting patient:', error);

      if (error.message.includes('foreign key constraint')) {
        throw new Error('Cannot delete patient. There are associated sessions or payments.');
      }

      throw new Error('Failed to delete patient');
    }
  }

  private buildFindQuery(
    userRole: UserRole,
    filters: {
      name?: string;
      reg_no?: string;
      doctorId?: number;
      status?: PatientStatus;
      visitType?: VisitType;
      paymentStatus?: PaymentStatus;
    },
  ) {
    // Start building the query
    const queryBuilder = this.patientsRepository
      .createQueryBuilder('patient')
      .leftJoin('patient.assigned_doctor', 'doctor')
      .addSelect(['doctor.doctor_id', 'doctor.name']) // Select only necessary fields
      .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions');

    // Apply role-based filter (Receptionist can only see ACTIVE patients)
    if (userRole === UserRole.RECEPTIONIST) {
      queryBuilder.andWhere('patient.status = :status', { status: PatientStatus.ACTIVE });
    }

    // Apply other filters dynamically
    if (filters.name) {
      queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.reg_no) {
      queryBuilder.andWhere('patient.reg_no ILIKE :reg_no', { reg_no: `%${filters.reg_no}%` });
    }

    if (filters.doctorId) {
      queryBuilder.andWhere('patient.assigned_doctor_id = :doctorId', { doctorId: filters.doctorId });
    }

    if (filters.status) {
      queryBuilder.andWhere('patient.status = :status', { status: filters.status });
    }

    if (filters.visitType) {
      queryBuilder.andWhere('patient.visit_type = :visitType', { visitType: filters.visitType });
    }

    return queryBuilder;
  }

  async findAll(
    userRole: UserRole,
    page: number = 1,
    limit: number = 10,
    name?: string,
    reg_no?: string,
    doctorId?: number,
    status?: PatientStatus,
    visitType?: VisitType,
    paymentStatus?: PaymentStatus,
  ): Promise<{ patients: any[]; total: number; page: number; limit: number }> {
    try {
      const queryBuilder = this.buildFindQuery(userRole, {
        name,
        reg_no,
        doctorId,
        status,
        visitType,
        paymentStatus,
      });

      // Get the total count before pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      const patients = await queryBuilder
        .orderBy('patient.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      // Use addSessionAndPaymentStats to get all stats including remaining_release_sessions
      const patientsWithStats = await this.addSessionAndPaymentStats(patients);

      // Apply payment status filter if specified
      let filteredPatients = patientsWithStats;
      if (paymentStatus) {
        filteredPatients = patientsWithStats.filter(patient => 
          patient.payment_status === paymentStatus
        );
      }

      return {
        patients: filteredPatients,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw new Error('Failed to fetch patients');
    }
  }

  async findAllActive(
    page: number = 1,
    limit: number = 10,
    name?: string,
    reg_no?: string,
    doctorId?: number,
    visitType?: VisitType,
    paymentStatus?: PaymentStatus,
  ): Promise<{ patients: any[]; total: number; page: number; limit: number }> {
    try {
      // For active patients, we explicitly set the status to ACTIVE
      const queryBuilder = this.patientsRepository
        .createQueryBuilder('patient')
        .leftJoin('patient.assigned_doctor', 'doctor')
        .addSelect(['doctor.doctor_id', 'doctor.name']) 
        .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions')
        .where('patient.status = :status', { status: PatientStatus.ACTIVE });

      // Apply other filters dynamically
      if (name) {
        queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${name}%` });
      }

      if (reg_no) {
        queryBuilder.andWhere('patient.reg_no ILIKE :reg_no', { reg_no: `%${reg_no}%` });
      }

      if (doctorId) {
        queryBuilder.andWhere('patient.assigned_doctor_id = :doctorId', { doctorId });
      }

      if (visitType) {
        queryBuilder.andWhere('patient.visit_type = :visitType', { visitType });
      }

      // Get the total count before pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      const patients = await queryBuilder
        .orderBy('patient.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      // Use addSessionAndPaymentStats to get all stats including remaining_release_sessions
      const patientsWithStats = await this.addSessionAndPaymentStats(patients);

      // Apply payment status filter if specified
      let filteredPatients = patientsWithStats;
      if (paymentStatus) {
        filteredPatients = patientsWithStats.filter(patient => 
          patient.payment_status === paymentStatus
        );
      }

      return {
        patients: filteredPatients,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching active patients:', error);
      throw new Error('Failed to fetch active patients');
    }
  }

  private async addSessionAndPaymentStats(patients: Patient[]): Promise<any[]> {
  try {
    if (patients.length === 0) return patients;

    const patientIds = patients.map(p => p.patient_id);

    // Get paid amount for each patient using a more reliable query
    const paidAmounts = await this.patientsRepository.manager.query(`
      SELECT patient_id, COALESCE(SUM(amount_paid), 0) as paid_amount 
      FROM payments 
      WHERE patient_id IN (${patientIds.join(',')})
      GROUP BY patient_id
    `);

    // Map the stats to patients and format assigned_doctor
    return patients.map(patient => {
      const paidAmount = paidAmounts.find((pa: any) => pa.patient_id === patient.patient_id);

      // Format assigned_doctor to only include id and name
      const formattedDoctor = patient.assigned_doctor ? {
        doctor_id: patient.assigned_doctor.doctor_id,
        name: patient.assigned_doctor.name
      } : null;

      const attendedSessionsCount = patient.attended_sessions_count || 0;
      
      // Calculate remaining release sessions
      const remainingReleaseSessions = Math.max(patient.released_sessions - attendedSessionsCount, 0);

      // Calculate payment status
      const totalPaid = paidAmount ? parseFloat(paidAmount.paid_amount) : 0;
      const remaining = patient.total_amount - totalPaid;
      let paymentStatus = PaymentStatus.UNPAID;
      
      if (totalPaid === 0) {
        paymentStatus = PaymentStatus.UNPAID;
      } else if (remaining > 0) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      } else {
        paymentStatus = PaymentStatus.FULLY_PAID;
      }

      // Return a plain object with all the required fields
      return {
        ...patient,
        assigned_doctor: formattedDoctor,
        paid_amount: totalPaid,
        payment_status: paymentStatus,
        remaining_release_sessions: remainingReleaseSessions
      };
    });
  } catch (error) {
    console.error('Error in addSessionAndPaymentStats:', error);
    // If there's an error, return patients without stats
    return patients.map(patient => ({
      ...patient,
      attended_sessions_count: 0,
      paid_amount: 0,
      payment_status: PaymentStatus.UNPAID,
      remaining_release_sessions: 0
    }));
  }
}

  async getStats(): Promise<{
    total: number;
    active: number;
    discharged: number;
  }> {
    try {
      const total = await this.patientsRepository.count();
      const active = await this.patientsRepository.count({ where: { status: PatientStatus.ACTIVE } });
      const discharged = await this.patientsRepository.count({ where: { status: PatientStatus.DISCHARGED } });

      return { total, active, discharged };
    } catch (error) {
      console.error('Error getting patient stats:', error);
      throw new Error('Failed to get patient statistics');
    }
  }
}