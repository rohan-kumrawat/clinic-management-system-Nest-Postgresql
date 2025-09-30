import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PatientsService } from './patients.service';
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
  ) {}

  @Post(':id/upload-reports')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  @UseInterceptors(FilesInterceptor('reports', 10)) // ← MULTIPLE FILES (max 10)
  async uploadPatientReports(
    @Param('id', ParseIntPipe) patientId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('descriptions') descriptions?: string[], // Optional descriptions for each file
  ) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No report files uploaded');
      }

      // Convert descriptions string to array if it's a string
      let descArray: string[] = [];
      if (descriptions) {
        descArray = Array.isArray(descriptions) ? descriptions : [descriptions];
      }

      const updatedPatient = await this.patientsService.uploadPatientReports(
        patientId,
        files,
        descArray
      );

      return {
        success: true,
        message: `${files.length} report(s) uploaded successfully`,
        data: {
          patient: {
            id: updatedPatient.patient_id,
            name: updatedPatient.name,
            total_reports: updatedPatient.reports ? updatedPatient.reports.length : 0,
            reports: updatedPatient.reports,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id/reports/:reportIndex')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async removePatientReport(
    @Param('id', ParseIntPipe) patientId: number,
    @Param('reportIndex', ParseIntPipe) reportIndex: number,
  ) {
    try {
      const updatedPatient = await this.patientsService.removePatientReport(patientId, reportIndex);

      return {
        success: true,
        message: 'Report removed successfully',
        data: {
          patient: {
            id: updatedPatient.patient_id,
            name: updatedPatient.name,
            total_reports: updatedPatient.reports ? updatedPatient.reports.length : 0,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id/clear-all-reports')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async clearAllPatientReports(@Param('id', ParseIntPipe) patientId: number) {
    try {
      const updatedPatient = await this.patientsService.clearAllPatientReports(patientId);

      return {
        success: true,
        message: 'All reports cleared successfully',
        data: {
          patient: {
            id: updatedPatient.patient_id,
            name: updatedPatient.name,
            total_reports: 0,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Keep the old endpoint for backward compatibility (single image)
  @Post(':id/upload-image')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  @UseInterceptors(FilesInterceptor('image', 1)) // Single file for backward compatibility
  async uploadPatientImage(
    @Param('id', ParseIntPipe) patientId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No image file uploaded');
      }

      const updatedPatient = await this.patientsService.uploadPatientReports(
        patientId,
        [files[0]], // Single file
        ['Profile Image'] // Default description
      );

      return {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          patient: {
            id: updatedPatient.patient_id,
            name: updatedPatient.name,
            reports: updatedPatient.reports,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}