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
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Session } from './entity/session.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entity/user.entity';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  create(
    @Body()
    sessionData: {
      patient: { patient_id: number };
      doctor?: { doctor_id: number };
      session_date: Date;
      remarks?: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Session> {
    // Add created_by from the authenticated user
    const sessionDataWithCreatedBy = {
      ...sessionData,
      created_by: { id: request.user.userId },
    };

    return this.sessionsService.create(sessionDataWithCreatedBy);
  }

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findAll(): Promise<Session[]> {
    return this.sessionsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  findOne(@Param('id') id: string): Promise<Session> {
    return this.sessionsService.findOne(+id);
  }

  @Put(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.OWNER)
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<Session>,
  ): Promise<Session> {
    return this.sessionsService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string): Promise<void> {
    return this.sessionsService.remove(+id);
  }
}
