import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientPackage } from './entity/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ClosePackageDto } from './dto/close-package.dto';
import { Patient } from '../patients/entity/patient.entity';
import { User } from '../auth/entity/user.entity';

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
    // Check if patient exists
    const patient = await this.patientsRepository.findOne({ 
      where: { patient_id: patientId } 
    });
    
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    const patientPackage = this.packagesRepository.create({
      ...createPackageDto,
      patient: patient,
    });

    return await this.packagesRepository.save(patientPackage);
  }

  async findAllByPatient(patientId: number): Promise<PatientPackage[]> {
    const packages = await this.packagesRepository.find({
      where: { patient: { patient_id: patientId } },
      relations: ['patient'],
      order: { created_at: 'DESC' }
    });

    // Add virtual fields
    return packages.map(pkg => ({
      ...pkg,
      remaining_sessions: pkg.total_sessions - pkg.used_sessions,
      remaining_release_sessions: Math.max(pkg.released_sessions - pkg.used_sessions, 0)
    }));
  }

  async findActivePackage(patientId: number): Promise<PatientPackage | null> {
    const activePackage = await this.packagesRepository.findOne({
      where: { 
        patient: { patient_id: patientId },
        status: 'active'
      },
      relations: ['patient']
    });

    if (activePackage) {
      return {
        ...activePackage,
        remaining_sessions: activePackage.total_sessions - activePackage.used_sessions,
        remaining_release_sessions: Math.max(activePackage.released_sessions - activePackage.used_sessions, 0)
      };
    }

    return null;
  }

  async findOne(packageId: number): Promise<PatientPackage> {
    const patientPackage = await this.packagesRepository.findOne({
      where: { package_id: packageId },
      relations: ['patient', 'closed_by']
    });

    if (!patientPackage) {
      throw new NotFoundException(`Package with ID ${packageId} not found`);
    }

    return {
      ...patientPackage,
      remaining_sessions: patientPackage.total_sessions - patientPackage.used_sessions,
      remaining_release_sessions: Math.max(patientPackage.released_sessions - patientPackage.used_sessions, 0)
    };
  }

  async update(packageId: number, updatePackageDto: UpdatePackageDto): Promise<PatientPackage> {
    const patientPackage = await this.findOne(packageId);

    // Update package
    await this.packagesRepository.update(packageId, updatePackageDto);

    // Return updated package
    return this.findOne(packageId);
  }

  async closePackage(
  packageId: number, 
  closePackageDto: ClosePackageDto, 
  closedByUserId?: number
): Promise<PatientPackage> {
  const patientPackage = await this.findOne(packageId);

  // ✅ FIX: Properly handle closed_by user
  const updateData: any = {
    status: closePackageDto.status,
    closed_at: new Date(),
  };

  if (closedByUserId) {
    const closedByUser = await this.usersRepository.findOne({ 
      where: { id: closedByUserId } 
    });
    
    if (closedByUser) {
      updateData.closed_by = closedByUser; // ✅ Assign User object directly
    }
  }

  await this.packagesRepository.update(packageId, updateData);

  return this.findOne(packageId);
}

  async incrementUsedSessions(packageId: number): Promise<PatientPackage> {
    const patientPackage = await this.findOne(packageId);

    const newUsedSessions = patientPackage.used_sessions + 1;
    
    await this.packagesRepository.update(packageId, {
      used_sessions: newUsedSessions
    });

    // Auto-close if all sessions used
    const updatedPackage = await this.findOne(packageId);
    if (updatedPackage.used_sessions >= updatedPackage.total_sessions && updatedPackage.status === 'active') {
      await this.packagesRepository.update(packageId, {
        status: 'completed',
        closed_at: new Date()
      });
    }

    return this.findOne(packageId);
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
    
    await this.packagesRepository.delete(packageId);
    
    return { message: 'Package deleted successfully' };
  }
}