import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { Patient } from './entity/patient.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { PatientsImageController } from './patients-image.controller';
import { User } from 'src/auth/entity/user.entity';
import { PackagesModule } from 'src/packages/packages.module';
//import { PackagesService } from 'src/packages/packages.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, User]),
    CloudinaryModule,
    PackagesModule,
  ],
  controllers: [
    PatientsController,
    PatientsImageController,
  ],
  providers: [PatientsService, CloudinaryService],
  exports: [PatientsService]
})
export class PatientsModule {}