
import { ConflictException, Injectable, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailService } from 'src/email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const otpStore = new Map<string, { otp: string; expiry: Date; attempts: number }>();

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {}

  //const otpStore = new Map<string, { otp: string; expiry: Date; attempts: number }>();

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    // Check if user exists and is active
    if (user && !user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      },
    };
  }

  async register(userData: Partial<User>): Promise<User> {
    const hashedPassword = bcrypt.hashSync(userData.password || '', 10);
    
    // Create user object manually
    const user = new User();
    if (!userData.email) {
      throw new ConflictException('Email is required');
    }
    user.email = userData.email;
    user.password = hashedPassword;
    user.name = userData.name ?? '';
    user.mobile = userData.mobile ?? '';
    user.role = userData.role ?? UserRole.RECEPTIONIST;
    user.isActive = userData.isActive !== undefined ? userData.isActive : true;

    return this.userRepository.save(user);
  }

  // Create receptionist
  async createReceptionists(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, name, mobile, role } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object manually
    const user = new User();
    user.email = email;
    user.password = hashedPassword;
    user.name = name;
    user.mobile = mobile;
    user.role = role;
    user.isActive = true;

    return this.userRepository.save(user);
  }

  // Find user by ID (for JWT strategy)
  async findUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // User ko deactivate/activate karne ka method
async toggleReceptionistsStatus(userId: number, isActive: boolean): Promise<User> {
  const user = await this.userRepository.findOne({ 
    where: { id: userId } 
  });
  
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  // ✅ Check: Sirf receptionist ko modify kar sakte hain
  if (user.role !== UserRole.RECEPTIONIST) {
    throw new ForbiddenException('Can only modify receptionist accounts');
  }
  
  user.isActive = isActive;
  return this.userRepository.save(user);
}

// Password reset karne ka method
async resetReceptionistPassword(userId: number, newPassword: string): Promise<User> {
  const user = await this.userRepository.findOne({ 
    where: { id: userId } 
  });
  
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  // ✅ Check: Sirf receptionist ka password reset kar sakte hain
  if (user.role !== UserRole.RECEPTIONIST) {
    throw new ForbiddenException('Can only reset password for receptionist accounts');
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  
  return this.userRepository.save(user);
}

  // Saare users ko get karne ka method (admin ke liye)
  async getAllReceptionists(): Promise<Omit<User, 'password'>[]> {
    const receptionists = await this.userRepository.find({
      where: { role: UserRole.RECEPTIONIST }
    });
    // Password field exclude karte hain response se
    return receptionists.map(({ password, ...user }) => user);
  }



// Receptionist delete karne ka method (Hard Delete)
async deleteReceptionists(userId: number): Promise<{ message: string }> {
  const user = await this.userRepository.findOne({ 
    where: { id: userId } 
  });
  
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  // ✅ Check: Sirf receptionist ko delete kar sakte hain
  if (user.role !== UserRole.RECEPTIONIST) {
    throw new ForbiddenException('Can only delete receptionist accounts');
  }
  
  await this.userRepository.delete(userId);
  
  return { message: 'Receptionist deleted successfully' };
}

// ADD this at top of auth.service.ts

// UPDATE the forgotPassword method:
async forgotAdminPassword(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await this.userRepository.findOne({ 
      where: { email } 
    });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return { success: true, message: 'If the email exists, OTP has been sent' };
    }

    // ✅ CHECK: Only allow for ADMIN/OWNER users
    if (user.role !== UserRole.OWNER) {
      return { success: false, message: 'This feature is only available for admin users' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // ✅ STORE IN MEMORY (No database changes)
    otpStore.set(email, {
      otp: await bcrypt.hash(otp, 10),
      expiry: otpExpiry,
      attempts: 0
    });

    // Send OTP via email
    const emailSent = await this.emailService.sendOTP(email, otp);

    if (emailSent) {
      return { success: true, message: 'OTP sent to your email' };
    } else {
      otpStore.delete(email); // Clean up if email fails
      return { success: false, message: 'Failed to send OTP. Please try again.' };
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, message: 'Failed to process request' };
  }
}

// UPDATE the resetPassword method:
async resetAdminPassword(resetData: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
  try {
    const user = await this.userRepository.findOne({ 
      where: { email: resetData.email } 
    });
    
    if (!user) {
      return { success: false, message: 'Invalid OTP or email' };
    }

    // ✅ CHECK: Only allow for ADMIN/OWNER users
    if (user.role !== UserRole.OWNER) {
      return { success: false, message: 'This feature is only available for admin users' };
    }

    // Get OTP from memory store
    const otpData = otpStore.get(resetData.email);
    
    if (!otpData) {
      return { success: false, message: 'OTP not found or expired' };
    }

    // Check OTP attempts
    if (otpData.attempts >= 5) {
      otpStore.delete(resetData.email);
      return { success: false, message: 'Too many OTP attempts. Please request a new OTP.' };
    }

    // Check OTP expiry
    if (new Date() > otpData.expiry) {
      otpStore.delete(resetData.email);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Verify OTP
    const isOtpValid = await bcrypt.compare(resetData.otp, otpData.otp);
    
    if (!isOtpValid) {
      // Increment attempt counter
      otpData.attempts += 1;
      otpStore.set(resetData.email, otpData);
      
      return { success: false, message: 'Invalid OTP' };
    }

    // Reset password
    const hashedPassword = await bcrypt.hash(resetData.newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // Clear OTP data from memory
    otpStore.delete(resetData.email);

    return { success: true, message: 'Password reset successfully' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, message: 'Failed to reset password' };
  }
}}
