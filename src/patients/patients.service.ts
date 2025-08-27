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
    // Calculate per_session_amount
    if (patientData.total_sessions && patientData.total_amount) {
      patientData.per_session_amount = patientData.total_amount / patientData.total_sessions;
    }

    const patient = this.patientsRepository.create(patientData);
    return this.patientsRepository.save(patient);
  }

  async findAll(userRole: UserRole): Promise<Patient[]> {
    if (userRole === UserRole.RECEPTIONIST) {
      // Receptionist sirf active patients dekh sakta hai
      return this.patientsRepository.find({
        where: { status: PatientStatus.ACTIVE },
        relations: ['assigned_doctor', 'sessions', 'payments'],
      });
    } else if (userRole === UserRole.OWNER) {
      // Owner sabhi patients dekh sakta hai
      return this.patientsRepository.find({
        relations: ['assigned_doctor', 'sessions', 'payments'],
      });
    }
    
    throw new ForbiddenException('Access denied');
  }

 async findOne(id: number, userRole: UserRole | null = null): Promise<Patient> {
  const patient = await this.patientsRepository.findOne({
    where: { patient_id: id },
    relations: ['assigned_doctor', 'sessions', 'sessions.doctor', 'payments'],
  });

  if (!patient) {
    throw new NotFoundException(`Patient with ID ${id} not found`);
  }

  // Agar user role provided hai aur user receptionist hai aur patient active nahi hai
  if (userRole !== null && userRole === UserRole.RECEPTIONIST && patient.status !== PatientStatus.ACTIVE) {
    throw new ForbiddenException('Access denied to non-active patients');
  }

  return patient;
}
async update(id: number, updateData: Partial<Patient>, userRole: UserRole | null = null): Promise<Patient> {
  // Pehle patient access check karein
  const patient = await this.findOne(id, userRole);
  
  // Recalculate per_session_amount if total_sessions or total_amount changed
  if ((updateData.total_sessions !== undefined || updateData.total_amount !== undefined) && 
      (updateData.total_sessions !== patient.total_sessions || updateData.total_amount !== patient.total_amount)) {
    const newTotalSessions = updateData.total_sessions !== undefined ? updateData.total_sessions : patient.total_sessions;
    const newTotalAmount = updateData.total_amount !== undefined ? updateData.total_amount : patient.total_amount;
    updateData.per_session_amount = newTotalAmount / newTotalSessions;
  }

  await this.patientsRepository.update(id, updateData);
  return this.findOne(id, userRole);
}
  async remove(id: number): Promise<void> {
    const result = await this.patientsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    dropped: number;
  }> {
    const total = await this.patientsRepository.count();
    const active = await this.patientsRepository.count({ where: { status: PatientStatus.ACTIVE } });
    const completed = await this.patientsRepository.count({ where: { status: PatientStatus.COMPLETED } });
    const dropped = await this.patientsRepository.count({ where: { status: PatientStatus.DROPPED } });

    return { total, active, completed, dropped };
  }
}