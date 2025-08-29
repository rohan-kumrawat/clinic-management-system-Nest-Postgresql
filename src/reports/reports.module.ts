import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Patient } from '../patients/entity/patient.entity';
import { Session } from '../sessions/entity/session.entity';
import { Payment } from '../payments/entity/payment.entity';
import { Doctor } from '../doctors/entity/doctor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, Session, Payment, Doctor])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
