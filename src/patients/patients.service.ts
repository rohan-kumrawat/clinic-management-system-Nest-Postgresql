import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, SelectQueryBuilder, Brackets } from 'typeorm';
import { Patient } from './entity/patient.entity';
import { User, UserRole } from '../auth/entity/user.entity';
import { PatientStatus, PaymentStatus, VisitType, Gender } from 'src/common/enums';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../sessions/entity/session.entity';
import { Payment } from '../payments/entity/payment.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(patientData: CreatePatientDto, createdByUserId: number): Promise<Patient> {
    try {
      console.log('Received patientData:', patientData);
      console.log('Created by user ID:', createdByUserId);

      // Find the user who is creating the patient
      const createdByUser = await this.usersRepository.findOne({ where: { id: createdByUserId } });
      if (!createdByUser) {
        throw new NotFoundException(`User with ID ${createdByUserId} not found`);
      }

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

      const patient = this.patientsRepository.create({
        ...patientData,
        created_by: createdByUser, // Set the created_by relationship
      });

      const savedPatient = await this.patientsRepository.save(patient);

      console.log('Saved patient:', savedPatient);

      return savedPatient;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw new Error('Failed to create patient. Please check your data.');
    }
  }

  async update(id: number, updateData: UpdatePatientDto, userRole: UserRole | null = null, updatedByUserId?: number): Promise<Patient> {
    try {
      await this.findOne(id, userRole);

       if (updatedByUserId) {
        const updatedByUser = await this.usersRepository.findOne({ 
          where: { id: updatedByUserId } 
        });

        if (updatedByUser) {
          // Add updated_by to update data
          updateData['updated_by'] = updatedByUser;
        }
      }
      
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

      // Recalculate total_amount if original_amount or discount_amount is updated
      if (updateData.original_amount !== undefined || updateData.discount_amount !== undefined) {
        const patient = await this.patientsRepository.findOne({ where: { patient_id: id } });
        if (!patient) {
          throw new NotFoundException(`Patient with ID ${id} not found`);
        }

        const newOriginalAmount = updateData.original_amount !== undefined ?
          updateData.original_amount : patient.original_amount;
        const newDiscountAmount = updateData.discount_amount !== undefined ?
          updateData.discount_amount : patient.discount_amount;

        updateData.total_amount = newOriginalAmount - newDiscountAmount;
      }

      // Recalculate per_session_amount if total_amount or total_sessions is updated
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

      // Update the patient with the new data
      await this.patientsRepository.update(id, updateData);

      // If financial fields were updated, recalculate released_sessions and carry_amount
      const financialFieldsUpdated =
        updateData.original_amount !== undefined ||
        updateData.discount_amount !== undefined ||
        updateData.total_amount !== undefined ||
        updateData.total_sessions !== undefined;

      if (financialFieldsUpdated) {
        await this.recalculateReleasedSessionsAndCarryAmount(id);
      }

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

    // Get the current patient data with updated financial fields
    const currentPatient = await this.patientsRepository.findOne({
      where: { patient_id: patientId }
    });

    if (!currentPatient) return;

    // Total paid amount calculate karein
    const totalPaid = patient.payments.reduce((sum, payment) => sum + payment.amount_paid, 0);

    // Use the updated per_session_amount if available
    const perSessionAmount = currentPatient.per_session_amount ||
      (currentPatient.total_amount / currentPatient.total_sessions);

    // Calculate released sessions and carry amount
    const sessionsToRelease = Math.floor(totalPaid / perSessionAmount);
    const newCarryAmount = totalPaid % perSessionAmount;

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
        .leftJoin('patient.created_by', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.name', 'createdBy.email'])
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

      // Format created_by user data
      const formattedCreatedBy = patient.created_by ? {
        id: patient.created_by.id,
        name: patient.created_by.name,
        email: patient.created_by.email
      } : null;

      // Return the complete patient object with all stats
      return {
        ...patient,
        remaining_release_sessions: remainingReleaseSessions,
        attended_sessions_count: attendedSessionsCount,
        paid_amount: paidAmount,
        payment_status: paymentStatus,
        assigned_doctor: formattedDoctor,
        created_by: formattedCreatedBy
      };
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw new Error('Failed to fetch patient');
    }
  }


 // UPDATE uploadPatientReports method
async uploadPatientReports(
  patientId: number, 
  files: Express.Multer.File[],
  descriptions?: string[]
): Promise<Patient> {
  const patient = await this.patientsRepository.findOne({ 
    where: { patient_id: patientId } 
  });
  
  if (!patient) {
    throw new NotFoundException(`Patient with ID ${patientId} not found`);
  }

  // Upload all files to Cloudinary
  const uploadResults = await this.cloudinaryService.uploadMultipleFiles(files);

  // Create report objects with file type
  const newReports = uploadResults.map((result, index) => ({
    id: uuidv4(),
    url: result.url,
    public_id: result.public_id,
    filename: result.filename,
    uploaded_at: new Date(),
    description: descriptions && descriptions[index] ? descriptions[index] : `Report ${index + 1}`,
    file_size: files[index].size,
    mime_type: files[index].mimetype,
    file_type: result.file_type // ✅ ADD file type
  }));

  if (!patient.reports) {
    patient.reports = [];
  }

  patient.reports = [...patient.reports, ...newReports];

  return await this.patientsRepository.save(patient);
}

// UPDATE removePatientReport method
async removePatientReport(patientId: number, reportId: string): Promise<Patient> {
  const patient = await this.patientsRepository.findOne({ 
    where: { patient_id: patientId } 
  });
  
  if (!patient) {
    throw new NotFoundException(`Patient with ID ${patientId} not found`);
  }

  if (!patient.reports) {
    throw new NotFoundException('No reports found for this patient');
  }

  const reportIndex = patient.reports.findIndex(report => report.id === reportId);
  
  if (reportIndex === -1) {
    throw new NotFoundException(`Report with ID ${reportId} not found`);
  }

  const reportToRemove = patient.reports[reportIndex];

  // Use file_type to determine resource type
  const resourceType = reportToRemove.file_type === 'pdf' ? 'raw' : 'image';
  
  // Delete from Cloudinary with correct resource type
  await this.cloudinaryService.deleteFile(reportToRemove.public_id, resourceType);

  // Remove from array
  patient.reports.splice(reportIndex, 1);

  return await this.patientsRepository.save(patient);
}

// UPDATE clearAllPatientReports method
async clearAllPatientReports(patientId: number): Promise<Patient> {
  const patient = await this.patientsRepository.findOne({ 
    where: { patient_id: patientId } 
  });
  
  if (!patient) {
    throw new NotFoundException(`Patient with ID ${patientId} not found`);
  }

  if (patient.reports && patient.reports.length > 0) {
    // Delete all files from Cloudinary with correct resource types
    const deletePromises = patient.reports.map(report => {
      const resourceType = report.file_type === 'pdf' ? 'raw' : 'image';
      return this.cloudinaryService.deleteFile(report.public_id, resourceType);
    });
    
    await Promise.all(deletePromises);

    // Clear reports array
    patient.reports = [];
  }

  return await this.patientsRepository.save(patient);
}

  // Get a report by its ID
  async getPatientReport(patientId: number, reportId: string) {
    const patient = await this.patientsRepository.findOne({
      where: { patient_id: patientId }
    });

    if (!patient || !patient.reports) {
      throw new NotFoundException('Report not found');
    }

    const report = patient.reports.find(r => r.id === reportId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async getPatientReports(patientId: number): Promise<any[]> {
  const patient = await this.patientsRepository.findOne({ 
    where: { patient_id: patientId } 
  });
  
  if (!patient) {
    throw new NotFoundException(`Patient with ID ${patientId} not found`);
  }

  // Return reports array or empty array if no reports
  return patient.reports || [];
}

 async remove(id: number): Promise<{ message: string }> {
  // ✅ SESSIONS AUR PAYMENTS REPOSITORIES INJECT KAREN
  const queryRunner = this.patientsRepository.manager.connection.createQueryRunner();
  
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log(`Starting deletion process for patient ID: ${id}`);

    // 1. Pehle patient find karo with relations
    const patient = await queryRunner.manager.findOne(Patient, {
      where: { patient_id: id },
      relations: ['sessions', 'payments'] // ✅ RELATIONS LOAD KAREN
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    console.log(`Found patient: ${patient.name}`);
    console.log(`Related sessions: ${patient.sessions?.length || 0}`);
    console.log(`Related payments: ${patient.payments?.length || 0}`);

    // 2. Pehle related SESSIONS delete karo
    if (patient.sessions && patient.sessions.length > 0) {
      console.log(`Deleting ${patient.sessions.length} sessions...`);
      await queryRunner.manager.delete(Session, { patient: { patient_id: id } });
      console.log('Sessions deleted successfully');
    }

    // 3. Phir related PAYMENTS delete karo
    if (patient.payments && patient.payments.length > 0) {
      console.log(`Deleting ${patient.payments.length} payments...`);
      await queryRunner.manager.delete(Payment, { patient: { patient_id: id } });
      console.log('Payments deleted successfully');
    }

    // 4. Patient reports delete karo (Cloudinary se bhi) - Aapka existing code
    if (patient.reports && patient.reports.length > 0) {
      console.log(`Deleting ${patient.reports.length} reports from Cloudinary...`);
      const deletePromises = patient.reports.map(report => {
        const resourceType = report.file_type === 'pdf' ? 'raw' : 'image';
        return this.cloudinaryService.deleteFile(report.public_id, resourceType);
      });
      await Promise.all(deletePromises);
      console.log('Reports deleted from Cloudinary');
    }

    // 5. Ab finally PATIENT delete karo
    console.log('Deleting patient record...');
    const result = await queryRunner.manager.delete(Patient, id);

    if (result.affected === 0) {
      throw new NotFoundException(`Patient with ID ${id} not found after cleaning related data`);
    }

    await queryRunner.commitTransaction();
    console.log(`✅ Successfully deleted patient ${id} and all related data`);

    return { message: 'Patient and all related data deleted successfully' };

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error deleting patient:', error);

    // Specific error messages
    if (error.message.includes('foreign key constraint')) {
      throw new Error('Cannot delete patient. There are associated sessions or payments.');
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    throw new Error('Failed to delete patient: ' + error.message);
  } finally {
    await queryRunner.release();
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