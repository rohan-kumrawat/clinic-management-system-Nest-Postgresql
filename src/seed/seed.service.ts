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
      where: { email: 'shashipareta12@gmail.com' } 
    });
    
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('123456', 10);
      const admin = this.userRepository.create({
        email: 'shashipareta12@gmail.com',
        password: hashedPassword,
        name: 'Shashi Pareta', // ✅ Required field
        mobile: '8817144273', // ✅ Required field (temporary number)
        role: UserRole.OWNER, // ✅ Role
        isActive: true, // ✅ Default true hai but explicitly set karein
      });
      
      await this.userRepository.save(admin);
      console.log('✅ Admin user created successfully');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  }
}
