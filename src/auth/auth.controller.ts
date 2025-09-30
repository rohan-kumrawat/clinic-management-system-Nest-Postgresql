import { Body, Controller, Post, Get, Param, Put, Delete, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.gaurd';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from './entity/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // Existing login endpoint
  @Post('login')
  async login(@Body() loginDto: any) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  // Create new user (receptionist)
  @Post('receptionists')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async createReceptionists(@Body() createUserDto: CreateUserDto) {
    return this.authService.createReceptionists(createUserDto);
  }

  // Get all users
  @Get('receptionists')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async getAllReceptionists() {
    return this.authService.getAllReceptionists();
  }

  // Toggle user status
  @Put('receptionists/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async toggleUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean
  ) {
    return this.authService.toggleReceptionistsStatus(parseInt(id), isActive);
  }

  // Reset user password
  @Put('receptionists/:id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async resetReceptionPassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.resetReceptionistPassword(parseInt(id), changePasswordDto.newPassword);
  }

  // Delete receptionist
  @Delete('receptionists/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async deleteReceptionists(@Param('id') id: string) {
    return this.authService.deleteReceptionists(parseInt(id));
  }

  @Post('forgot-password')
async forgotAdminPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
  return this.authService.forgotAdminPassword(forgotPasswordDto.email);
}

@Post('reset-password')
async resetAdminPassword(@Body() resetPasswordDto: ResetPasswordDto) {
  return this.authService.resetAdminPassword(resetPasswordDto);
}
}
