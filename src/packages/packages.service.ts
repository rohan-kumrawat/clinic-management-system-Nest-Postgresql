import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientPackage } from './entity/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ClosePackageDto } from './dto/close-package.dto';
import { Patient } from '../patients/entity/patient.entity';
import { User } from '../auth/entity/user.entity';
import { PackageStatus, PatientStatus } from '../common/enums';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(PatientPackage)
    private packagesRepository: Repository<PatientPackage>,
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createPackageDto: CreatePackageDto, patientId: number): Promise<PatientPackage> {
    const patient = await this.patientsRepository.findOne({ 
      where: { patient_id: patientId } 
    });
    
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // Calculate derived fields
    const total_amount = createPackageDto.original_amount - (createPackageDto.discount_amount || 0);
    const per_session_amount = total_amount / createPackageDto.total_sessions;

    const patientPackage = this.packagesRepository.create({
      ...createPackageDto,
      patient_id: patientId,
      total_amount,
      per_session_amount,
      status: PackageStatus.ACTIVE,
      start_date: new Date(),
    });

    const savedPackage = await this.packagesRepository.save(patientPackage);
    
    // Update patient status
    await this.updatePatientStatus(patientId);
    
    return savedPackage;
  }

  async findAllByPatient(patientId: number): Promise<PatientPackage[]> {
    return await this.packagesRepository.find({
      where: { patient_id: patientId },
      relations: ['assigned_doctor'],
      order: { created_at: 'DESC' }
    });
  }

  async findByPatientId(patientId: number): Promise<PatientPackage[]> {
    return this.findAllByPatient(patientId);
  }

  async findActiveByPatientId(patientId: number): Promise<PatientPackage | null> {
    return await this.packagesRepository.findOne({
      where: { 
        patient_id: patientId,
        status: PackageStatus.ACTIVE
      },
      relations: ['assigned_doctor']
    });
  }

  async findActivePackage(patientId: number): Promise<PatientPackage | null> {
    return this.findActiveByPatientId(patientId);
  }

  async findOne(packageId: number): Promise<PatientPackage> {
    const patientPackage = await this.packagesRepository.findOne({
      where: { package_id: packageId },
      relations: ['patient', 'assigned_doctor', 'closed_by']
    });

    if (!patientPackage) {
      throw new NotFoundException(`Package with ID ${packageId} not found`);
    }

    return patientPackage;
  }

  async update(packageId: number, updatePackageDto: UpdatePackageDto): Promise<PatientPackage> {
    const patientPackage = await this.findOne(packageId);

    // Recalculate if financial fields are updated
    if (updatePackageDto.original_amount || updatePackageDto.discount_amount || updatePackageDto.total_sessions) {
      const original_amount = updatePackageDto.original_amount || patientPackage.original_amount;
      const discount_amount = updatePackageDto.discount_amount || patientPackage.discount_amount;
      const total_sessions = updatePackageDto.total_sessions || patientPackage.total_sessions;
      
      const total_amount = original_amount - discount_amount;
      const per_session_amount = total_amount / total_sessions;

      // Create update data object
      const updateData: any = {
        ...updatePackageDto,
        total_amount,
        per_session_amount
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await this.packagesRepository.update(packageId, updateData);
    } else {
      // Remove undefined values from updatePackageDto
      const updateData: any = { ...updatePackageDto };
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      if (Object.keys(updateData).length > 0) {
        await this.packagesRepository.update(packageId, updateData);
      }
    }

    const updatedPackage = await this.findOne(packageId);
    
    // Update patient status if needed
    if (updatePackageDto.status && updatedPackage.patient_id) {
      await this.updatePatientStatus(updatedPackage.patient_id);
    }
    
    return updatedPackage;
  }

  async closePackage(
    packageId: number, 
    closePackageDto: ClosePackageDto, 
    closedByUserId?: number
  ): Promise<PatientPackage> {
    const patientPackage = await this.findOne(packageId);

    if (patientPackage.status === PackageStatus.COMPLETED || patientPackage.status === PackageStatus.CLOSED) {
      throw new BadRequestException(`Package is already ${patientPackage.status}`);
    }

    const updateData: any = {
      status: closePackageDto.status,
      closed_at: new Date(),
      end_date: new Date(),
    };

    if (closedByUserId) {
      const closedByUser = await this.usersRepository.findOne({ 
        where: { id: closedByUserId } 
      });
      
      if (closedByUser) {
        updateData.closed_by = closedByUser;
        updateData.closed_by_id = closedByUserId;
      }
    }

    await this.packagesRepository.update(packageId, updateData);

    const updatedPackage = await this.findOne(packageId);
    
    // Update patient status
    if (updatedPackage.patient_id) {
      await this.updatePatientStatus(updatedPackage.patient_id);
    }
    
    return updatedPackage;
  }

  async incrementUsedSessions(packageId: number): Promise<PatientPackage> {
    const patientPackage = await this.findOne(packageId);

    if (patientPackage.status !== PackageStatus.ACTIVE) {
      throw new BadRequestException(`Cannot add sessions to ${patientPackage.status} package`);
    }

    // Check if released sessions available
    if (patientPackage.used_sessions >= patientPackage.released_sessions) {
      throw new BadRequestException('No released sessions available');
    }

    const newUsedSessions = patientPackage.used_sessions + 1;
    
    const updateData: any = {
      used_sessions: newUsedSessions
    };

    // Auto-complete if all sessions used
    if (newUsedSessions >= patientPackage.total_sessions) {
      updateData.status = PackageStatus.COMPLETED;
      updateData.closed_at = new Date();
      updateData.end_date = new Date();
    }

    await this.packagesRepository.update(packageId, updateData);

    const updatedPackage = await this.findOne(packageId);
    
    // Update patient status if package completed
    if (updateData.status === PackageStatus.COMPLETED && updatedPackage.patient_id) {
      await this.updatePatientStatus(updatedPackage.patient_id);
    }
    
    return updatedPackage;
  }

  async updateReleasedSessions(packageId: number, releasedSessions: number, carryAmount: number): Promise<PatientPackage> {
    await this.packagesRepository.update(packageId, {
      released_sessions: releasedSessions,
      carry_amount: carryAmount
    });

    return this.findOne(packageId);
  }

  async delete(packageId: number): Promise<{ message: string }> {
    const patientPackage = await this.findOne(packageId);
    const patientId = patientPackage.patient_id;
    
    await this.packagesRepository.delete(packageId);
    
    // Update patient status
    if (patientId) {
      await this.updatePatientStatus(patientId);
    }
    
    return { message: 'Package deleted successfully' };
  }

  private async updatePatientStatus(patientId: number): Promise<void> {
    const packages = await this.findAllByPatient(patientId);
    
    if (packages.length === 0) {
      await this.patientsRepository.update(patientId, { status: PatientStatus.NO_PACKAGE });
      return;
    }
    
    const hasActivePackage = packages.some(pkg => pkg.status === PackageStatus.ACTIVE);
    const newStatus = hasActivePackage ? PatientStatus.ACTIVE : PatientStatus.DISCHARGED;
    
    await this.patientsRepository.update(patientId, { status: newStatus });
  }

  async getPackageStats(packageId: number): Promise<{
    remaining_sessions: number;
    remaining_release_sessions: number;
    used_amount: number;
    pending_amount: number;
    completion_percentage: number;
  }> {
    const patientPackage = await this.findOne(packageId);
    
    const remaining_sessions = Math.max(0, patientPackage.total_sessions - patientPackage.used_sessions);
    const remaining_release_sessions = Math.max(0, patientPackage.released_sessions - patientPackage.used_sessions);
    const used_amount = patientPackage.used_sessions * patientPackage.per_session_amount;
    const pending_amount = Math.max(0, patientPackage.total_amount - used_amount);
    const completion_percentage = patientPackage.total_sessions > 0 
      ? (patientPackage.used_sessions / patientPackage.total_sessions) * 100 
      : 0;
    
    return {
      remaining_sessions,
      remaining_release_sessions,
      used_amount,
      pending_amount,
      completion_percentage: Math.round(completion_percentage * 100) / 100
    };
  }
}