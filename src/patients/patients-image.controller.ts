import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PatientsService } from './patients.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import { UseGuards } from '@nestjs/common';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsImageController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post(':id/upload-image')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  @UseInterceptors(FileInterceptor('image'))
  async uploadPatientImage(
    @Param('id', ParseIntPipe) patientId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No image file uploaded');
      }

      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadPatientImage(file);
      
      // Update patient record
      const updatedPatient = await this.patientsService.updatePatientImage(
        patientId,
        uploadResult.url,
        uploadResult.public_id
      );

      return {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: uploadResult.url,
          publicId: uploadResult.public_id,
          patient: {
            id: updatedPatient.patient_id,
            name: updatedPatient.name,
            image_url: updatedPatient.image_url,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id/remove-image')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async removePatientImage(@Param('id', ParseIntPipe) patientId: number) {
    try {
      const updatedPatient = await this.patientsService.removePatientImage(patientId);

      return {
        success: true,
        message: 'Image removed successfully',
        data: {
          patient: {
            id: updatedPatient.patient_id,
            name: updatedPatient.name,
            image_url: updatedPatient.image_url,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}