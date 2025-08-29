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
    // Verify patient exists
    await this.patientsService.findOne(sessionData.patient.patient_id);

    // If doctor is provided, verify it exists
    if (sessionData.doctor) {
      await this.doctorsService.findOne(sessionData.doctor.doctor_id);
    }

    const session = this.sessionsRepository.create(sessionData);
    return this.sessionsRepository.save(session);
  }

  async findAll(): Promise<Session[]> {
    return this.sessionsRepository.find({
      relations: ['patient', 'doctor', 'payment'],
    });
  }

  async findOne(id: number): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { session_id: id },
      relations: ['patient', 'doctor', 'payment'],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
  }

  // async findByDateRange(startDate: Date, endDate: Date): Promise<Session[]> {
  //   return this.sessionsRepository.find({
  //     where: {
  //       session_date: Between(startDate, endDate),
  //     },
  //     relations: ['patient', 'doctor', 'payment'],
  //   });
  // }

  async update(id: number, updateData: Partial<Session>): Promise<Session> {
    await this.sessionsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.sessionsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }
  }
}
