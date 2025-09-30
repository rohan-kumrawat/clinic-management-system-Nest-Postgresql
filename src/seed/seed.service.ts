import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../auth/entity/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  async seedAdmin() {
    const adminExists = await this.userRepository.findOne({ 
      where: { email: 'admin@clinic.com' } 
    });
    
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      const admin = this.userRepository.create({
        email: 'rohanrkmail@gmail.com',
        password: hashedPassword,
        name: 'Test Admin', // ✅ Required field
        mobile: '0000000000', // ✅ Required field (temporary number)
        role: UserRole.OWNER, // ✅ Role sahi hai
        isActive: true, // ✅ Default true hai par explicitly set karein
      });
      
      await this.userRepository.save(admin);
      console.log('✅ Admin user created successfully');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  }
}
