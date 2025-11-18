import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entity/session.entity';
import { PatientsService } from '../patients/patients.service';
import { DoctorsService } from '../doctors/doctors.service';
import { ShiftType } from 'src/common/enums';
import { PackagesService } from 'src/packages/packages.service';
import { PatientPackage } from 'src/packages/entity/package.entity';
import { CreateSessionDto } from './dto/create-session.dto';


@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    private patientsService: PatientsService,
    private doctorsService: DoctorsService,
    private packagesService: PackagesService,
  ) {}

  async create(createSessionDto: CreateSessionDto, createdByUserId: number): Promise<Session> {
    try {
      // Convert DTO to session data format
      const sessionData = {
        patient: { patient_id: createSessionDto.patient.patient_id },
        doctor: createSessionDto.doctor ? { doctor_id: createSessionDto.doctor.doctor_id } : undefined,
        session_date: new Date(createSessionDto.session_date),
        remarks: createSessionDto.remarks,
        shift: createSessionDto.shift,
        visit_type: createSessionDto.visit_type,
        package_id: createSessionDto.package_id,
        created_by: { id: createdByUserId }
      };

      // Verify patient exists
      await this.patientsService.findOne(sessionData.patient.patient_id, null);
      
      // If doctor is provided, verify it exists
      if (sessionData.doctor && sessionData.doctor.doctor_id) {
        await this.doctorsService.findOne(sessionData.doctor.doctor_id);
      }

      // Package handling
      let packageEntity: PatientPackage | null = null;
      if (sessionData.package_id) {
        packageEntity = await this.packagesService.findOne(sessionData.package_id);
      } else {
        // Auto-assign to active package if no package specified
        packageEntity = await this.packagesService.findActivePackage(sessionData.patient.patient_id);
      }

      // ✅ FIX: Proper session creation
      const sessionToCreate = {
        patient: sessionData.patient,
        doctor: sessionData.doctor,
        created_by: sessionData.created_by,
        session_date: sessionData.session_date,
        remarks: sessionData.remarks,
        shift: sessionData.shift,
        visit_type: sessionData.visit_type,
        package: packageEntity || undefined
      };

      const session = this.sessionsRepository.create(sessionToCreate);
      const savedSession = await this.sessionsRepository.save(session);

      // Increment used_sessions in package
      if (packageEntity) {
        await this.packagesService.incrementUsedSessions(packageEntity.package_id);
      }

      return savedSession as Session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async findAll(): Promise<any[]> {
  try {
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .select([
        'session.session_id',
        'session.session_date',
        'session.remarks',
        'session.created_at',
        'session.patient_id',
        'session.doctor_id',
        'session.ShiftType',
        'session.created_by',
      ])
      .leftJoin('session.patient', 'patient')
      .addSelect(['patient.patient_id', 'patient.name'])
      .leftJoin('session.doctor', 'doctor')
      .addSelect(['doctor.doctor_id', 'doctor.name'])
      .leftJoin('session.created_by', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.name'])
      .getMany();

    return sessions.map(s => ({
      session_id: s.session_id,
      session_date: s.session_date,
      remarks: s.remarks,
      created_at: s.created_at,
      patient_id: s.patient.patient_id, // ✅ Include in response
      doctor_id: s.doctor.doctor_id,   // ✅ Include in response
      visit_type: s.visit_type, // ✅ Include if needed
      shift: s.shift,           // ✅ Include if needed
      patient: s.patient ? { 
        patient_id: s.patient.patient_id, 
        name: s.patient.name 
      } : null,
      doctor: s.doctor ? { 
        doctor_id: s.doctor.doctor_id, 
        name: s.doctor.name 
      } : null,
      created_by: s.created_by ? { 
        id: s.created_by.id, 
        name: s.created_by.name 
      } : null,
    }));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw new Error('Failed to fetch sessions');
  }
}

  async findOne(id: number): Promise<any> {
  try {
    const session = await this.sessionsRepository.findOne({
      where: { session_id: id },
      relations: ['patient', 'doctor', 'created_by'],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return {
      session_id: session.session_id,
      session_date: session.session_date,
      remarks: session.remarks,
      created_at: session.created_at,
      patient_id: session.patient.patient_id, 
      doctor_id: session.doctor.doctor_id,  
      visit_type: session.visit_type, 
      shift: session.shift,
      patient: session.patient
        ? { patient_id: session.patient.patient_id, name: session.patient.name }
        : null,
      doctor: session.doctor
        ? { doctor_id: session.doctor.doctor_id, name: session.doctor.name }
        : null,
      created_by: session.created_by
        ? { id: session.created_by.id, name: session.created_by.name }
        : null,
    };
  } catch (error) {
    console.error('Error fetching session:', error);
    throw new InternalServerErrorException('Failed to fetch session');
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
   
  async findByPatientId(
  patientId: number,
  page: number = 1,
  limit: number = 10
): Promise<{ sessions: any[]; total: number }> {
  try {
    const query = this.sessionsRepository
      .createQueryBuilder('session')
      .select([
        'session.session_id',
        'session.session_date',
        'session.remarks',
        'session.created_at',
        'session.patient_id',
        'session.doctor_id',
        'session.visit_type',
        'session.shift',
        'session.created_by',
      ])
      .leftJoin('session.patient', 'patient')
      .addSelect(['patient.patient_id', 'patient.name'])
      .leftJoin('session.doctor', 'doctor')
      .addSelect(['doctor.doctor_id', 'doctor.name'])
      .leftJoin('session.created_by', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.name'])
      .where('patient.patient_id = :patientId', { patientId })
      .orderBy('session.session_date', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit));

    const [sessions, total] = await query.getManyAndCount();

    return {
      sessions: sessions.map(s => ({
        session_id: s.session_id,
        session_date: s.session_date,
        remarks: s.remarks,
        created_at: s.created_at,
        patient_id: s.patient.patient_id, 
        doctor_id: s.doctor.doctor_id,  
        visit_type: s.visit_type, 
        shift: s.shift,
        patient: s.patient ? { patient_id: s.patient.patient_id, name: s.patient.name } : null,
        doctor: s.doctor ? { doctor_id: s.doctor.doctor_id, name: s.doctor.name } : null,
        created_by: s.created_by ? { id: s.created_by.id, name: s.created_by.name } : null,
      })),
      total,
    };
  } catch (error) {
    console.error('Error fetching sessions by patientId:', error);
    throw new InternalServerErrorException('Failed to fetch sessions');
  }
}

}