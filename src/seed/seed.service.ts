import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../auth/entity/user.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async seedAdmin() {
    const adminExists = await this.userRepository.findOne({
      where: { email: 'admin@clinic.com' },
    });

    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      const admin = this.userRepository.create({
        email: 'admin@clinic.com',
        password: hashedPassword,
        role: UserRole.OWNER,
      });

      await this.userRepository.save(admin);
      console.log('Admin user created');
    }
  }
}
