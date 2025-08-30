import { Body, Controller, Post, Get, Param, Put, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.gaurd';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from './entity/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  // Get all users
  @Get('receptionists')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async getAllReceptionists() {
    return this.authService.getAllReceptionists();
  }

  // Toggle user status
  @Put('users/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async toggleUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean
  ) {
    return this.authService.toggleUserStatus(parseInt(id), isActive);
  }

  // Reset user password
  @Put('users/:id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async resetPassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.resetPassword(parseInt(id), changePasswordDto.newPassword);
  }
}

// import { Controller, Post, Body, Get, Param, Put, Delete, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
// import { AuthService } from './auth.service';
// import { User } from './entity/user.entity';
// import { JwtAuthGuard } from './jwt-auth.guard';
// import { Roles } from './roles.decorator';
// import { RolesGuard } from './roles.gaurd';
// import { UserRole } from './entity/user.entity';
// import { CreateUserDto } from './dto/create-user.dto';
// import { ChangePasswordDto } from './dto/change-password.dto';

// @Controller('auth')
// export class AuthController {
//   userRepository: any;
//   constructor(private authService: AuthService) {}

//   @Post('login')
//   async login(@Body() loginData: { email: string; password: string }) {
//     const user = await this.authService.validateUser(loginData.email, loginData.password);
//     if (!user) {
//       throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
//     }
//     return this.authService.login(user);
//   }

//   @Post('register')
//   async register(@Body() userData: Partial<User>) {
//     try {
//       return await this.authService.register(userData);
//     } catch (error) {
//       throw new HttpException('Registration failed', HttpStatus.BAD_REQUEST);
//     }
//   }

//   // Owner Create User(Receptionist)

//   @Post('users')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(UserRole.OWNER) // Only owner can create users
//   async createUser(@Body() createUserDto: CreateUserDto) {
//     return this.authService.createUser(createUserDto);
//   }

//    // Get all users (admin only)
//   @Get('users')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(UserRole.OWNER)
//   async getAllUsers() {
//     return this.authService.getAllUsers();
//   }

//   // Toggle user status (activate/deactivate)
//   @Put('users/:id/status')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(UserRole.OWNER)
//   async toggleUserStatus(
//     @Param('id') id: string,
//     @Body('isActive') isActive: boolean
//   ) {
//     return this.authService.toggleUserStatus(parseInt(id), isActive);
//   }

//   // Reset user password (admin only)
//   @Put('users/:id/password')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(UserRole.OWNER)
//   async resetPassword(
//     @Param('id') id: string,
//     @Body() changePasswordDto: ChangePasswordDto
//   ) {
//     return this.authService.resetPassword(parseInt(id), changePasswordDto.newPassword);
//   }

//   // Hard delete user (admin only) - use carefully
//   @Delete('users/:id')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(UserRole.OWNER)
//   async deleteUser(@Param('id') id: string) {
//     return this.userRepository.delete(parseInt(id));
//   }
// }