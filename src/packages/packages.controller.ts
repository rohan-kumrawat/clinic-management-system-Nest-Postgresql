import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards, 
  Req,
  HttpException,
  HttpStatus,
  ParseIntPipe 
} from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PatientPackage } from './entity/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ClosePackageDto } from './dto/close-package.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post('patient/:patientId')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async create(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() createPackageDto: CreatePackageDto
  ): Promise<PatientPackage> {
    try {
      return await this.packagesService.create(createPackageDto, patientId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('patient/:patientId')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findAllByPatient(
    @Param('patientId', ParseIntPipe) patientId: number
  ): Promise<PatientPackage[]> {
    try {
      return await this.packagesService.findAllByPatient(patientId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('patient/:patientId/active')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findActivePackage(
    @Param('patientId', ParseIntPipe) patientId: number
  ): Promise<PatientPackage | null> {
    try {
      return await this.packagesService.findActivePackage(patientId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findOne(
    @Param('id', ParseIntPipe) id: number
  ): Promise<PatientPackage> {
    try {
      return await this.packagesService.findOne(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePackageDto: UpdatePackageDto
  ): Promise<PatientPackage> {
    try {
      return await this.packagesService.update(id, updatePackageDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/close')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async closePackage(
    @Param('id', ParseIntPipe) id: number,
    @Body() closePackageDto: ClosePackageDto,
    @Req() request: AuthenticatedRequest
  ): Promise<PatientPackage> {
    try {
      const userId = request.user.userId;
      return await this.packagesService.closePackage(id, closePackageDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/increment-session')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async incrementUsedSessions(
    @Param('id', ParseIntPipe) id: number
  ): Promise<PatientPackage> {
    try {
      return await this.packagesService.incrementUsedSessions(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async delete(
    @Param('id', ParseIntPipe) id: number
  ): Promise<{ message: string }> {
    try {
      return await this.packagesService.delete(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}