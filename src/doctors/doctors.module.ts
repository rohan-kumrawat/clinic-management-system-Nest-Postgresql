import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from './entity/doctor.entity';
import { PatientPackage } from '../packages/entity/package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, PatientPackage])],
  providers: [DoctorsService],
  controllers: [DoctorsController],
  exports: [DoctorsService],
})
export class DoctorsModule {}