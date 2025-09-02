import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from './entity/doctor.entity';
import { Patient } from 'src/patients/entity/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Patient])],
  providers: [DoctorsService],
  controllers: [DoctorsController],
  exports: [DoctorsService],
})
export class DoctorsModule {}