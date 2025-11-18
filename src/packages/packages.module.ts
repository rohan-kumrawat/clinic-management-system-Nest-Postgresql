import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { PatientPackage } from './entity/package.entity';
import { Patient } from '../patients/entity/patient.entity';
import { User } from '../auth/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientPackage, Patient, User])
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService]
})
export class PackagesModule {}