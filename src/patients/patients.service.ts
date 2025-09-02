// src/patients/patients.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient, PatientStatus } from './entity/patient.entity';
import { UserRole } from '../auth/entity/user.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) {}

  async create(patientData: Partial<Patient>): Promise<Patient> {
    try {
      if (patientData.total_sessions && patientData.total_amount) {
        patientData.per_session_amount = patientData.total_amount / patientData.total_sessions;
      }

      if (patientData.assigned_doctor && (patientData.assigned_doctor as any).doctor_id) {
        patientData.assigned_doctor = { doctor_id: (patientData.assigned_doctor as any).doctor_id } as any;
      }

      const patient = this.patientsRepository.create(patientData);
      return await this.patientsRepository.save(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      throw new Error('Failed to create patient. Please check your data.');
    }
  }

  async findAll(userRole: UserRole): Promise<Patient[]> {
    try {
      let patients: Patient[];
      
      if (userRole === UserRole.RECEPTIONIST) {
        patients = await this.patientsRepository.find({
          where: { status: PatientStatus.ACTIVE },
          relations: ['assigned_doctor'],
        });
      } else if (userRole === UserRole.OWNER) {
        patients = await this.patientsRepository.find({
          relations: ['assigned_doctor'],
        });
      } else {
        throw new ForbiddenException('Access denied');
      }
      
      return await this.addSessionAndPaymentStats(patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw new Error('Failed to fetch patients');
    }
  }

  async findOne(id: number, userRole: UserRole | null = null): Promise<Patient> {
    try {
      let patient: Patient | null;

      if (userRole === UserRole.RECEPTIONIST) {
        patient = await this.patientsRepository.findOne({
          where: { patient_id: id, status: PatientStatus.ACTIVE },
          relations: ['assigned_doctor'],
        });
      } else {
        patient = await this.patientsRepository.findOne({
          where: { patient_id: id },
          relations: ['assigned_doctor'],
        });
      }

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      const patientsWithStats = await this.addSessionAndPaymentStats([patient]);
      return patientsWithStats[0];
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw new Error('Failed to fetch patient');
    }
  }

  async findAllActive(): Promise<Patient[]> {
    try {
      const patients = await this.patientsRepository.find({
        where: { status: PatientStatus.ACTIVE },
        relations: ['assigned_doctor'],
        order: { name: 'ASC' },
      });
      
      return await this.addSessionAndPaymentStats(patients);
    } catch (error) {
      console.error('Error fetching active patients:', error);
      throw new Error('Failed to fetch active patients');
    }
  }

  // Helper method to add session and payment stats
  private async addSessionAndPaymentStats(patients: Patient[]): Promise<Patient[]> {
    try {
      if (patients.length === 0) return patients;

      const patientIds = patients.map(p => p.patient_id);
      
      // Get sessions count for each patient using a more reliable query
      const sessionCounts = await this.patientsRepository.manager.query(`
        SELECT patient_id, COUNT(session_id) as sessions_count 
        FROM sessions 
        WHERE patient_id IN (${patientIds.join(',')})
        GROUP BY patient_id
      `);
      
      // Get paid amount for each patient using a more reliable query
      const paidAmounts = await this.patientsRepository.manager.query(`
        SELECT patient_id, COALESCE(SUM(amount_paid), 0) as paid_amount 
        FROM payments 
        WHERE patient_id IN (${patientIds.join(',')})
        GROUP BY patient_id
      `);

      // Map the stats to patients and format assigned_doctor
      return patients.map(patient => {
        const sessionCount = sessionCounts.find((sc: any) => sc.patient_id === patient.patient_id);
        const paidAmount = paidAmounts.find((pa: any) => pa.patient_id === patient.patient_id);
        
        // Format assigned_doctor to only include id and name
        const formattedDoctor = patient.assigned_doctor ? {
          doctor_id: patient.assigned_doctor.doctor_id,
          name: patient.assigned_doctor.name
        } : null;
        
        // Create a new object with the required properties
        const patientWithStats = {
          ...patient,
          assigned_doctor: formattedDoctor,
          attended_sessions_count: sessionCount ? parseInt(sessionCount.sessions_count) : 0,
          paid_amount: paidAmount ? parseFloat(paidAmount.paid_amount) : 0,
        };
        
        return patientWithStats as Patient;
      });
    } catch (error) {
      console.error('Error in addSessionAndPaymentStats:', error);
      // If there's an error, return patients without stats
      return patients.map(patient => ({
        ...patient,
        attended_sessions_count: 0,
        paid_amount: 0,
      } as Patient));
    }
  }

  async update(id: number, updateData: Partial<Patient>, userRole: UserRole | null = null): Promise<Patient> {
    try {
      await this.findOne(id, userRole);
      
      if ((updateData.total_sessions !== undefined || updateData.total_amount !== undefined)) {
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