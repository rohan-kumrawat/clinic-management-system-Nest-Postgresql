import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entity/doctor.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
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
    try {
      return await this.doctorsRepository.find({
        relations: ['patients', 'sessions'],
      });
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Relations ke bina try karein
      return await this.doctorsRepository.find();
    }
  }

  async findOne(id: number): Promise<Doctor> {
    try {
      const doctor = await this.doctorsRepository.findOne({
        where: { doctor_id: id },
        relations: ['patients', 'sessions'],
      });

      if (!doctor) {
        throw new NotFoundException(`Doctor with ID ${id} not found`);
      }

      return doctor;
    } catch (error) {
      console.error('Error fetching doctor:', error);
      // Relations ke bina try karein
      const doctor = await this.doctorsRepository.findOne({
        where: { doctor_id: id }
      });
      
      if (!doctor) {
        throw new NotFoundException(`Doctor with ID ${id} not found`);
      }
      
      return doctor;
    }
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