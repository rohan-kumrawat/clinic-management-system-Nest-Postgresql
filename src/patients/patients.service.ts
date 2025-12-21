import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entity/patient.entity';
import { User, UserRole } from '../auth/entity/user.entity';
import { PatientStatus, PaymentStatus, Gender, PackageStatus } from 'src/common/enums';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { randomUUID } from 'crypto';
import { Session } from '../sessions/entity/session.entity';
import { Payment } from '../payments/entity/payment.entity';
import { PackagesService } from 'src/packages/packages.service';
import { PatientPackage } from 'src/packages/entity/package.entity';
import { CreatePackageDto } from 'src/packages/dto/create-package.dto';
import { ClosePackageDto } from 'src/packages/dto/close-package.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly packagesService: PackagesService,
  ) { }

  async create(patientData: CreatePatientDto, createdByUserId: number): Promise<Patient> {
    try {
      const createdByUser = await this.usersRepository.findOne({ where: { id: createdByUserId } });
      if (!createdByUser) {
        throw new NotFoundException(`User with ID ${createdByUserId} not found`);
      }

      const patient = this.patientsRepository.create({
        ...patientData,
        created_by: createdByUser,
        status: PatientStatus.NO_PACKAGE,
      });

      const savedPatient = await this.patientsRepository.save(patient);
      return this.findOne(savedPatient.patient_id, null);
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
          updateData['updated_by'] = updatedByUser;
        }
      }
      
      await this.patientsRepository.update(id, updateData);

      if (updateData.status) {
        await this.patientsRepository.update(id, { status: updateData.status });
      } else {
        await this.updatePatientStatus(id);
      }

      return this.findOne(id, userRole);
    } catch (error) {
      console.error('Error updating patient:', error);
      throw new Error('Failed to update patient');
    }
  }

  async findOne(id: number, userRole: UserRole | null = null): Promise<Patient> {
    try {
      let queryBuilder = this.patientsRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.created_by', 'createdBy')
        .leftJoinAndSelect('patient.updated_by', 'updatedBy')
        .leftJoinAndSelect('patient.packages', 'patientPackages') // ✅ FIXED: alias changed
        .leftJoin('patientPackages.assigned_doctor', 'packageDoctor') // ✅ FIXED: uses correct alias
        .addSelect(['packageDoctor.doctor_id', 'packageDoctor.name'])
        .where('patient.patient_id = :id', { id });

      if (userRole === UserRole.RECEPTIONIST) {
        queryBuilder = queryBuilder.andWhere('patient.status = :status', { status: PatientStatus.ACTIVE });
      }

      const patient = await queryBuilder.getOne();

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      // Calculate statistics
      const sessionCountResult = await this.patientsRepository.manager.query(
        `SELECT COUNT(*) as count FROM sessions WHERE patient_id = $1`,
        [id]
      );
      const attendedSessionsCount = parseInt(sessionCountResult[0].count, 10);

      const paidResult = await this.patientsRepository.manager.query(
        `SELECT COALESCE(SUM(amount_paid), 0) as total_paid 
        FROM payments 
        WHERE patient_id = $1`,
        [id]
      );
      const paidAmount = parseFloat(paidResult[0].total_paid);

      let totalPackageAmount = 0;
      let totalReleasedSessions = 0;
      let totalUsedSessions = 0;
      let activePackage: PatientPackage | null = null;
      
      if (patient.packages && patient.packages.length > 0) {
        patient.packages.forEach(pkg => {
          totalPackageAmount += Number(pkg.total_amount) || 0;
          totalReleasedSessions += pkg.released_sessions || 0;
          totalUsedSessions += pkg.used_sessions || 0;
          
          if (pkg.status === PackageStatus.ACTIVE && !activePackage) {
            activePackage = pkg;
          }
        });
      }

      const remainingReleaseSessions = Math.max(totalReleasedSessions - totalUsedSessions, 0);

      let paymentStatus = PaymentStatus.UNPAID;
      if (paidAmount === 0) {
        paymentStatus = PaymentStatus.UNPAID;
      } else if (paidAmount < totalPackageAmount) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      } else {
        paymentStatus = PaymentStatus.FULLY_PAID;
      }

      const currentDoctor = activePackage && (activePackage as any).assigned_doctor 
        ? (activePackage as any).assigned_doctor
        : null;

      // Set virtual fields on the Patient entity
      patient.attended_sessions_count = attendedSessionsCount;
      patient.paid_amount = paidAmount;
      patient.total_package_amount = totalPackageAmount;
      patient.total_released_sessions = totalReleasedSessions;
      patient.total_used_sessions = totalUsedSessions;
      patient.remaining_released_sessions = remainingReleaseSessions;
      patient.payment_status = paymentStatus;
      patient.current_doctor = currentDoctor;
      patient.active_package = activePackage;

      return patient;
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw new Error('Failed to fetch patient');
    }
  }

  private async updatePatientStatus(patientId: number): Promise<void> {
    const packages = await this.packagesService.findAllByPatient(patientId);
    
    let patientStatus = PatientStatus.NO_PACKAGE;
    
    if (packages.length > 0) {
      const hasActivePackage = packages.some(pkg => pkg.status === PackageStatus.ACTIVE);
      patientStatus = hasActivePackage ? PatientStatus.ACTIVE : PatientStatus.DISCHARGED;
    }
    
    await this.patientsRepository.update(patientId, { status: patientStatus });
  }

  async getPatientPackages(patientId: number): Promise<PatientPackage[]> {
    return await this.packagesService.findAllByPatient(patientId);
  }

  async getActivePatientPackage(patientId: number): Promise<PatientPackage | null> {
    return await this.packagesService.findActiveByPatientId(patientId);
  }

  async addPackageToPatient(patientId: number, createPackageDto: CreatePackageDto, userId: number): Promise<PatientPackage> {
    const patient = await this.patientsRepository.findOne({ where: { patient_id: patientId } });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    return await this.packagesService.create(createPackageDto, patientId);
  }

  async closePatientPackage(packageId: number, closePackageDto: ClosePackageDto, userId: number): Promise<PatientPackage> {
    return await this.packagesService.closePackage(packageId, closePackageDto, userId);
  }

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

    const uploadResults = await this.cloudinaryService.uploadMultipleFiles(files);

    const newReports = uploadResults.map((result, index) => ({
      id: randomUUID(), // ✅ FIXED: crypto se
      url: result.url,
      public_id: result.public_id,
      filename: result.filename,
      uploaded_at: new Date(),
      description: descriptions && descriptions[index] ? descriptions[index] : `Report ${index + 1}`,
      file_size: files[index].size,
      mime_type: files[index].mimetype,
      file_type: result.file_type
    }));

    if (!patient.reports) {
      patient.reports = [];
    }

    patient.reports = [...patient.reports, ...newReports];

    return await this.patientsRepository.save(patient);
  }

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
    const resourceType = reportToRemove.file_type === 'pdf' ? 'raw' : 'image';
    
    await this.cloudinaryService.deleteFile(reportToRemove.public_id, resourceType);
    patient.reports.splice(reportIndex, 1);

    return await this.patientsRepository.save(patient);
  }

  async clearAllPatientReports(patientId: number): Promise<Patient> {
    const patient = await this.patientsRepository.findOne({ 
      where: { patient_id: patientId } 
    });
    
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (patient.reports && patient.reports.length > 0) {
      const deletePromises = patient.reports.map(report => {
        const resourceType = report.file_type === 'pdf' ? 'raw' : 'image';
        return this.cloudinaryService.deleteFile(report.public_id, resourceType);
      });
      
      await Promise.all(deletePromises);
      patient.reports = [];
    }

    return await this.patientsRepository.save(patient);
  }

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

    return patient.reports || [];
  }

  async remove(id: number): Promise<{ message: string }> {
    const queryRunner = this.patientsRepository.manager.connection.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const patient = await queryRunner.manager.findOne(Patient, {
        where: { patient_id: id },
        relations: ['sessions', 'payments', 'packages']
      });

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      if (patient.packages && patient.packages.length > 0) {
        await queryRunner.manager.delete(PatientPackage, { patient: { patient_id: id } });
      }

      if (patient.sessions && patient.sessions.length > 0) {
        await queryRunner.manager.delete(Session, { patient: { patient_id: id } });
      }

      if (patient.payments && patient.payments.length > 0) {
        await queryRunner.manager.delete(Payment, { patient: { patient_id: id } });
      }

      if (patient.reports && patient.reports.length > 0) {
        const deletePromises = patient.reports.map(report => {
          const resourceType = report.file_type === 'pdf' ? 'raw' : 'image';
          return this.cloudinaryService.deleteFile(report.public_id, resourceType);
        });
        await Promise.all(deletePromises);
      }

      const result = await queryRunner.manager.delete(Patient, id);

      if (result.affected === 0) {
        throw new NotFoundException(`Patient with ID ${id} not found after cleaning related data`);
      }

      await queryRunner.commitTransaction();
      return { message: 'Patient and all related data deleted successfully' };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error deleting patient:', error);

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

  async findAll(
    userRole: UserRole,
    page: number = 1,
    limit: number = 10,
    name?: string,
    reg_no?: string,
    status?: PatientStatus,
    paymentStatus?: PaymentStatus,
  ): Promise<{ patients: any[]; total: number; page: number; limit: number }> {
    try {
      const queryBuilder = this.patientsRepository
        .createQueryBuilder('patient')
        .leftJoin('patient.created_by', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.name'])
        .leftJoinAndSelect('patient.packages', 'patientPackages') // ✅ FIXED: alias changed
        .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions');

      if (userRole === UserRole.RECEPTIONIST) {
        queryBuilder.andWhere('patient.status = :status', { status: PatientStatus.ACTIVE });
      }

      if (name) {
        queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${name}%` });
      }

      if (reg_no) {
        queryBuilder.andWhere('patient.reg_no ILIKE :reg_no', { reg_no: `%${reg_no}%` });
      }

      if (status) {
        queryBuilder.andWhere('patient.status = :status', { status: status });
      }

      const total = await queryBuilder.getCount();

      const patients = await queryBuilder
        .orderBy('patient.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      const patientsWithStats = await this.addPackageAndPaymentStats(patients);

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
    paymentStatus?: PaymentStatus,
  ): Promise<{ patients: any[]; total: number; page: number; limit: number }> {
    try {
      const queryBuilder = this.patientsRepository
        .createQueryBuilder('patient')
        .leftJoin('patient.created_by', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.name'])
        .leftJoinAndSelect('patient.packages', 'patientPackages') // ✅ FIXED: alias changed
        .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions')
        .where('patient.status = :status', { status: PatientStatus.ACTIVE });

      if (name) {
        queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${name}%` });
      }

      if (reg_no) {
        queryBuilder.andWhere('patient.reg_no ILIKE :reg_no', { reg_no: `%${reg_no}%` });
      }

      const total = await queryBuilder.getCount();

      const patients = await queryBuilder
        .orderBy('patient.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      const patientsWithStats = await this.addPackageAndPaymentStats(patients);

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

  private async addPackageAndPaymentStats(patients: Patient[]): Promise<any[]> {
    try {
      if (patients.length === 0) return patients;

      const patientIds = patients.map(p => p.patient_id);

      const paidAmounts = await this.patientsRepository.manager.query(`
        SELECT patient_id, COALESCE(SUM(amount_paid), 0) as paid_amount 
        FROM payments 
        WHERE patient_id IN (${patientIds.join(',')})
        GROUP BY patient_id
      `);

      return patients.map(patient => {
        const paidAmountData = paidAmounts.find((pa: any) => pa.patient_id === patient.patient_id);
        const totalPaid = paidAmountData ? parseFloat(paidAmountData.paid_amount) : 0;

        let totalPackageAmount = 0;
        let totalReleasedSessions = 0;
        let totalUsedSessions = 0;
        let activePackage: PatientPackage | null = null;

        if (patient.packages && patient.packages.length > 0) {
          patient.packages.forEach(pkg => {
            totalPackageAmount += Number(pkg.total_amount) || 0;
            totalReleasedSessions += pkg.released_sessions || 0;
            totalUsedSessions += pkg.used_sessions || 0;
            
            if (pkg.status === PackageStatus.ACTIVE && !activePackage) {
              activePackage = pkg;
            }
          });
        }

        let paymentStatus = PaymentStatus.UNPAID;
        if (totalPaid === 0) {
          paymentStatus = PaymentStatus.UNPAID;
        } else if (totalPaid < totalPackageAmount) {
          paymentStatus = PaymentStatus.PARTIALLY_PAID;
        } else {
          paymentStatus = PaymentStatus.FULLY_PAID;
        }

        const remainingReleaseSessions = Math.max(totalReleasedSessions - totalUsedSessions, 0);
        const currentDoctor = activePackage && (activePackage as any).assigned_doctor
        ? (activePackage as any).assigned_doctor 
        : null;

        return {
          ...patient,
          paid_amount: totalPaid,
          total_package_amount: totalPackageAmount,
          total_released_sessions: totalReleasedSessions,
          total_used_sessions: totalUsedSessions,
          remaining_release_sessions: remainingReleaseSessions,
          payment_status: paymentStatus,
          current_doctor: currentDoctor,
          active_package: activePackage
        };
      });
    } catch (error) {
      console.error('Error in addPackageAndPaymentStats:', error);
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
    no_package: number;
  }> {
    try {
      const total = await this.patientsRepository.count();
      const active = await this.patientsRepository.count({ where: { status: PatientStatus.ACTIVE } });
      const discharged = await this.patientsRepository.count({ where: { status: PatientStatus.DISCHARGED } });
      const noPackage = await this.patientsRepository.count({ where: { status: PatientStatus.NO_PACKAGE } });

      return { total, active, discharged, no_package: noPackage };
    } catch (error) {
      console.error('Error getting patient stats:', error);
      throw new Error('Failed to get patient statistics');
    }
  }
}