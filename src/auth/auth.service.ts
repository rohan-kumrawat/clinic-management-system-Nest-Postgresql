
import { ConflictException, Injectable, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

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
}
