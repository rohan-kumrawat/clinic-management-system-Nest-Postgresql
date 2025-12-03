import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entity/doctor.entity';
import { PatientPackage } from '../packages/entity/package.entity';
import { PackageStatus } from 'src/common/enums';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(PatientPackage)
    private packagesRepository: Repository<PatientPackage>,
  ) {}

  async create(doctorData: Partial<Doctor>): Promise<Doctor> {
    try {
      const doctor = this.doctorsRepository.create(doctorData);
      return await this.doctorsRepository.save(doctor);
    } catch (error) {
      console.error('Error creating doctor:', error);
      throw new Error('Failed to create doctor');
    }
  }

  async findAll(): Promise<Doctor[]> {
    const doctors = await this.doctorsRepository.find({
      where: { deleted: false },
      order: { name: 'ASC' },
    });

    // Count active patients through active packages
    const doctorsWithCount = await Promise.all(
      doctors.map(async (doctor) => {
        // Get active packages for this doctor
        const activePackages = await this.packagesRepository.find({
          where: {
            assigned_doctor: { doctor_id: doctor.doctor_id },
            status: PackageStatus.ACTIVE,
          },
          relations: ['patient'],
        });

        // Get unique patient IDs from active packages
        const uniquePatientIds = [...new Set(activePackages.map(pkg => pkg.patient.patient_id))];
        const activePatientsCount = uniquePatientIds.length;

        return {
          ...doctor,
          active_patients_count: activePatientsCount,
        };
      })
    );

    return doctorsWithCount;
  }

  async findAllDeleted(): Promise<Doctor[]> {
    const doctors = await this.doctorsRepository.find({
      where: { deleted: true },
      order: { name: 'ASC' },
    });

    // Count total packages for each doctor
    const doctorsWithCount = await Promise.all(
      doctors.map(async (doctor) => {
        const packagesCount = await this.packagesRepository.count({
          where: {
            assigned_doctor: { doctor_id: doctor.doctor_id }
          },
        });

        return {
          ...doctor,
          total_packages_count: packagesCount, // Changed property name
        };
      })
    );

    return doctorsWithCount;
  }

  async findAllForDropdown(): Promise<{ doctor_id: number; name: string }[]> {
    try {
      const doctors = await this.doctorsRepository.find({
        select: ['doctor_id', 'name'],
        where: { status: true, deleted: false },
        order: { name: 'ASC' },
      });

      return doctors;
    } catch (error) {
      console.error('Error fetching doctors for dropdown:', error);
      throw new Error('Failed to fetch doctors for dropdown');
    }
  }

  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({
      where: { doctor_id: id, deleted: false },
      relations: ['sessions'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    // Count active patients through active packages
    const activePackages = await this.packagesRepository.find({
      where: {
        assigned_doctor: { doctor_id: doctor.doctor_id },
        status: PackageStatus.ACTIVE,
      },
      relations: ['patient'],
    });

    // Get unique patient IDs
    const uniquePatientIds = [...new Set(activePackages.map(pkg => pkg.patient.patient_id))];
    const activePatientsCount = uniquePatientIds.length;

    // Get doctor's statistics
    const totalPackagesCount = await this.packagesRepository.count({
      where: {
        assigned_doctor: { doctor_id: doctor.doctor_id },
      },
    });

    const activePackagesCount = await this.packagesRepository.count({
      where: {
        assigned_doctor: { doctor_id: doctor.doctor_id },
        status: PackageStatus.ACTIVE,
      },
    });

    const completedPackagesCount = await this.packagesRepository.count({
      where: {
        assigned_doctor: { doctor_id: doctor.doctor_id },
        status: PackageStatus.COMPLETED,
      },
    });

    // Create a new object with the additional properties
    const doctorWithStats = {
      ...doctor,
      active_patients_count: activePatientsCount,
      total_packages_count: totalPackagesCount,
      active_packages_count: activePackagesCount,
      completed_packages_count: completedPackagesCount,
    };

    return doctorWithStats as Doctor;
  }

  async update(id: number, updateData: Partial<Doctor>): Promise<Doctor> {
    try {
      await this.doctorsRepository.update(id, updateData);
      const updatedDoctor = await this.doctorsRepository.findOne({
        where: { doctor_id: id }
      });

      if (!updatedDoctor) {
        throw new NotFoundException(`Doctor with ID ${id} not found`);
      }

      return updatedDoctor;
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw new Error('Failed to update doctor');
    }
  }

  async remove(id: number, deletedByUserId?: number): Promise<{
    message: string;
    deleteType: 'permanent' | 'soft';
    packageCount: number;
  }> {
    try {
      const doctor = await this.doctorsRepository.findOne({
        where: { doctor_id: id, deleted: false }
      });

      if (!doctor) {
        throw new NotFoundException(`Doctor with ID ${id} not found`);
      }

      // Count active packages assigned to this doctor
      const activePackageCount = await this.packagesRepository.count({
        where: {
          assigned_doctor: { doctor_id: id },
          status: PackageStatus.ACTIVE,
        }
      });

      if (activePackageCount === 0) {
        // Check if doctor has any packages at all
        const totalPackageCount = await this.packagesRepository.count({
          where: { assigned_doctor: { doctor_id: id } }
        });

        if (totalPackageCount === 0) {
          // Permanent delete - no packages at all
          await this.doctorsRepository.delete(id);
          return {
            message: 'Doctor permanently deleted from system',
            deleteType: 'permanent',
            packageCount: 0
          };
        } else {
          // Soft delete - has packages but none are active
          await this.doctorsRepository.update(id, {
            deleted: true,
            deleted_at: new Date(),
            deleted_by: deletedByUserId
          });
          return {
            message: `Doctor hidden from active list. ${totalPackageCount} packages exist (none active).`,
            deleteType: 'soft',
            packageCount: totalPackageCount
          };
        }
      } else {
        // Soft delete - has active packages
        await this.doctorsRepository.update(id, {
          deleted: true,
          deleted_at: new Date(),
          deleted_by: deletedByUserId
        });
        return {
          message: `Doctor hidden from active list. ${activePackageCount} active packages remain assigned.`,
          deleteType: 'soft',
          packageCount: activePackageCount
        };
      }
    } catch (error) {
      console.error('Error deleting doctor:', error);
      throw new Error('Failed to delete doctor');
    }
  }

  async restore(id: number): Promise<{ message: string }> {
    await this.doctorsRepository.update(id, {
      deleted: false,
      deleted_at: undefined,
      deleted_by: undefined
    });
    return { message: 'Doctor restored successfully' };
  }

  // New method: Get doctor statistics
  async getDoctorStatistics(doctorId: number): Promise<any> {
    const doctor = await this.doctorsRepository.findOne({
      where: { doctor_id: doctorId }
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    const activePackages = await this.packagesRepository.find({
      where: {
        assigned_doctor: { doctor_id: doctorId },
        status: PackageStatus.ACTIVE,
      },
      relations: ['patient'],
    });

    const uniquePatientIds = [...new Set(activePackages.map(pkg => pkg.patient.patient_id))];

    const totalSessions = await this.packagesRepository
      .createQueryBuilder('package')
      .select('SUM(package.total_sessions)', 'total')
      .where('package.assigned_doctor_id = :doctorId', { doctorId })
      .getRawOne();

    const usedSessions = await this.packagesRepository
      .createQueryBuilder('package')
      .select('SUM(package.used_sessions)', 'total')
      .where('package.assigned_doctor_id = :doctorId', { doctorId })
      .getRawOne();

    return {
      doctor_id: doctorId,
      name: doctor.name,
      specialization: doctor.specialization,
      active_patients: uniquePatientIds.length,
      active_packages: activePackages.length,
      total_sessions: parseInt(totalSessions.total) || 0,
      used_sessions: parseInt(usedSessions.total) || 0,
      remaining_sessions: (parseInt(totalSessions.total) || 0) - (parseInt(usedSessions.total) || 0),
    };
  }
}