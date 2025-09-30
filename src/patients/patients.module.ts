import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { Patient } from './entity/patient.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { PatientsImageController } from './patients-image.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    CloudinaryModule,
  ],
  providers: [PatientsService],
  controllers: [
    PatientsController,
    PatientsImageController,
  ],
  exports: [PatientsService],
})
export class PatientsModule {}