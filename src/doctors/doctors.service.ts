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
  const doctor = this.doctorsRepository.create(doctorData);
  return this.doctorsRepository.save(doctor);
}

  async findAll(): Promise<Doctor[]> {
    return this.doctorsRepository.find({
      relations: ['patients', 'sessions'],
    });
  }

  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({
      where: { doctor_id: id },
      relations: ['patients', 'sessions'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return doctor;
  }

  async update(id: number, updateData: Partial<Doctor>): Promise<Doctor> {
    await this.doctorsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.doctorsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
  }
}