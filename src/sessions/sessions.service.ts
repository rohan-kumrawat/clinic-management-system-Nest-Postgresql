import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entity/session.entity';
import { PatientsService } from '../patients/patients.service';
import { DoctorsService } from '../doctors/doctors.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    private patientsService: PatientsService,
    private doctorsService: DoctorsService,
  ) {}

  async create(sessionData: {
    patient: { patient_id: number };
    doctor?: { doctor_id: number };
    created_by: { id: number };
    session_date: Date;
    remarks?: string;
  }): Promise<Session> {
    try {
      // Verify patient exists
      await this.patientsService.findOne(sessionData.patient.patient_id, null);
      
      // If doctor is provided, verify it exists
      if (sessionData.doctor) {
        await this.doctorsService.findOne(sessionData.doctor.doctor_id);
      }

      const session = this.sessionsRepository.create(sessionData);
      return await this.sessionsRepository.save(session);
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async findAll(): Promise<Session[]> {
  try {
    return await this.sessionsRepository
      .createQueryBuilder('session')
      .select(['session']) // ⚡ sabhi session ke fields lo
      .leftJoin('session.patient', 'patient')
      .addSelect(['patient.patient_id', 'patient.name']) // only required fields
      .leftJoin('session.doctor', 'doctor')
      .addSelect(['doctor.doctor_id', 'doctor.name'])   // only required fields
      .getMany();
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw new Error('Failed to fetch sessions');
  }
}

  async findOne(id: number): Promise<Session> {
    try {
      const session = await this.sessionsRepository.findOne({
        where: { session_id: id },
        relations: ['patient', 'doctor'],
      });

      if (!session) {
        throw new NotFoundException(`Session with ID ${id} not found`);
      }

      return session;
    } catch (error) {
      console.error('Error fetching session:', error);
      // Fallback: relations ke bina try karein
      const session = await this.sessionsRepository.findOne({
        where: { session_id: id }
      });

      if (!session) {
        throw new NotFoundException(`Session with ID ${id} not found`);
      }

      return session;
    }
  }

  async update(id: number, updateData: Partial<Session>): Promise<Session> {
    try {
      await this.sessionsRepository.update(id, updateData);
      const updatedSession = await this.sessionsRepository.findOne({
        where: { session_id: id }
      });
      
      if (!updatedSession) {
        throw new NotFoundException(`Session with ID ${id} not found`);
      }
      
      return updatedSession;
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error('Failed to update session');
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const result = await this.sessionsRepository.delete(id);
      
      if (result.affected === 0) {
        throw new NotFoundException(`Session with ID ${id} not found`);
      }
      
      return { message: 'Session deleted successfully' };
    } catch (error) {
      console.error('Error deleting session:', error);
      
      if (error.message.includes('foreign key constraint')) {
        throw new Error('Cannot delete session. There are associated payments.');
      }
      
      throw new Error('Failed to delete session');
    }
  }

   //Find sessions by patient ID with pagination
   
  async findByPatientId(patientId: number, page: number = 1, limit: number = 10): Promise<{ sessions: Session[], total: number }> {
    const [sessions, total] = await this.sessionsRepository.findAndCount({
      where: { patient: { patient_id: patientId } },
      relations: ['patient', 'doctor', 'created_by'],
      order: { session_date: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (!sessions || sessions.length === 0) {
      throw new NotFoundException(`No sessions found for patient with ID ${patientId}`);
    }

    return { sessions, total };
  }
}