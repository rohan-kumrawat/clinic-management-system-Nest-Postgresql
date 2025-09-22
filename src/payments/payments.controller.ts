import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param,  
  UseGuards, 
  Query, 
  Req, 
  ParseIntPipe, 
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMode } from './entity/payment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';


interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() request: AuthenticatedRequest
  ): Promise<any> {
    try {
      // Add created_by from the authenticated user
      const paymentData = {
        ...createPaymentDto,
        created_by: { id: request.user.userId }
      };
      
      return await this.paymentsService.create(paymentData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get('range')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findByDateRange(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<Payment[]> {
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO string (e.g., "2024-01-15").');
    }
    
    return this.paymentsService.findByDateRange(start, end);
  }

  @Get('revenue')
  @Roles(UserRole.OWNER)
  getRevenueStats(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO string (e.g., "2024-01-15").');
    }
    
    return this.paymentsService.getRevenueStats(start, end);
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Payment> {
    return this.paymentsService.findOne(id);
  }


  // Get payments by patient ID
  
  @Get('patient/:patientId')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  async findByPatientId(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<{ payments: Payment[], total: number }> {
    return this.paymentsService.findByPatientId(patientId, page, limit);
  }


  @Get('debug/test')
  @Roles(UserRole.OWNER)
  async debugTest(): Promise<any> {
    try {
      // Test patient service
      const patient = await this.paymentsService['patientsService'].findOne(3);
      
      // Test session service
      const session = await this.paymentsService['sessionsService'].findOne(1);
      
      // Test getTotalPaid
      const totalPaid = await this.paymentsService['getTotalPaid'](3);
      
      return {
        patient,
        session,
        totalPaid
      };
    } catch (error) {
      return {
        error: error.message,
        stack: error.stack
      };
    }
  }
}