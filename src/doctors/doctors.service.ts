import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entity/doctor.entity';
import { Patient } from '../patients/entity/patient.entity';
import { PatientStatus } from 'src/common/enums';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
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
      order: { name: 'ASC' },
    });

    // Har doctor ke liye active patients count calculate karein
    const doctorsWithCount = await Promise.all(
      doctors.map(async (doctor) => {
        const activePatientsCount = await this.patientsRepository.count({
          where: {
            assigned_doctor: { doctor_id: doctor.doctor_id },
            status: PatientStatus.ACTIVE,
          },
        });
        
        return {
          ...doctor,
          active_patients_count: activePatientsCount,
        };
      })
    );

    return doctorsWithCount;
  }



  async findAllForDropdown(): Promise<{ doctor_id: number; name: string }[]> {
    try {
      const doctors = await this.doctorsRepository.find({
        select: ['doctor_id', 'name'], // Sirf yeh do fields select karein
        where: { status: true }, // Sirf active doctors
        order: { name: 'ASC' }, // Name ke hisaab se sort
      });
      
      return doctors;
    } catch (error) {
      console.error('Error fetching doctors for dropdown:', error);
      throw new Error('Failed to fetch doctors for dropdown');
    }
  }


  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({
      where: { doctor_id: id },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    // Active patients count add karein
    const activePatientsCount = await this.patientsRepository.count({
      where: {
        assigned_doctor: { doctor_id: doctor.doctor_id },
        status: PatientStatus.ACTIVE,
      },
    });

    return {
      ...doctor,
      active_patients_count: activePatientsCount,
    };
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

  async remove(id: number): Promise<{ message: string }> {
    try {
      const result = await this.doctorsRepository.delete(id);
      
      if (result.affected === 0) {
        throw new NotFoundException(`Doctor with ID ${id} not found`);
      }
      
      return { message: 'Doctor deleted successfully' };
    } catch (error) {
      console.error('Error deleting doctor:', error);
      
      // Agar foreign key constraint error hai to
      if (error.message.includes('foreign key constraint')) {
        throw new Error('Cannot delete doctor. There are associated patients or sessions.');
      }
      
      throw new Error('Failed to delete doctor');
    }
  }
}