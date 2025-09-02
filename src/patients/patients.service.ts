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
      // Calculate per_session_amount
      if (patientData.total_sessions && patientData.total_amount) {
        patientData.per_session_amount = patientData.total_amount / patientData.total_sessions;
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
      if (userRole === UserRole.RECEPTIONIST) {
        // Receptionist sirf active patients dekh sakta hai
        return await this.patientsRepository.find({
          where: { status: PatientStatus.ACTIVE },
          relations: ['assigned_doctor'],
        });
      } else if (userRole === UserRole.OWNER) {
        // Owner sabhi patients dekh sakta hai
        return await this.patientsRepository.find({
          relations: ['assigned_doctor'],
        });
      }
      
      throw new ForbiddenException('Access denied');
    } catch (error) {
      console.error('Error fetching patients:', error);
      
      // Fallback: Relations ke bina try karein
      if (userRole === UserRole.RECEPTIONIST) {
        return await this.patientsRepository.find({
          where: { status: PatientStatus.ACTIVE }
        });
      } else {
        return await this.patientsRepository.find();
      }
    }
  }

   async findAllActive(): Promise<Patient[]> {
    try {
      return await this.patientsRepository.find({
        where: { status: PatientStatus.ACTIVE },
        relations: ['assigned_doctor'],
        order: { name: 'ASC' }, // Optional: Name ke hisaab se sort karein
      });
    } catch (error) {
      console.error('Error fetching active patients:', error);
      
      // Fallback: Relations ke bina try karein
      return await this.patientsRepository.find({
        where: { status: PatientStatus.ACTIVE },
        order: { name: 'ASC' },
      });
    }
  }

  async findOne(id: number, userRole: UserRole | null = null): Promise<Patient> {
    try {
      const patient = await this.patientsRepository.findOne({
        where: { patient_id: id },
        relations: ['assigned_doctor'],
      });

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      // Agar user role provided hai aur user receptionist hai aur patient active nahi hai
      if (userRole !== null && userRole === UserRole.RECEPTIONIST && patient.status !== PatientStatus.ACTIVE) {
        throw new ForbiddenException('Access denied to non-active patients');
      }

      return patient;
    } catch (error) {
      console.error('Error fetching patient:', error);
      
      // Fallback: Relations ke bina try karein
      const patient = await this.patientsRepository.findOne({
        where: { patient_id: id }
      });

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      if (userRole !== null && userRole === UserRole.RECEPTIONIST && patient.status !== PatientStatus.ACTIVE) {
        throw new ForbiddenException('Access denied to non-active patients');
      }

      return patient;
    }
  }

  async update(id: number, updateData: Partial<Patient>, userRole: UserRole | null = null): Promise<Patient> {
    try {
      // Pehle patient access check karein
      await this.findOne(id, userRole);
      
      // Recalculate per_session_amount if total_sessions or total_amount changed
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
      

      return { total, active, discharged, };
    } catch (error) {
      console.error('Error getting patient stats:', error);
      throw new Error('Failed to get patient statistics');
    }
  }
}