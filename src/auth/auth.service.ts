import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entity/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
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
      user: 
      { 
        id: user.id, 
        name:user.name, 
        email:user.email, 
        role: user.role 
      },
    };
  }

async register(userData: Partial<User>): Promise<User> {
  const hashedPassword = bcrypt.hashSync(userData.password || '', 10);
  const user = this.userRepository.create({
    ...userData,
    password: hashedPassword,
  });
  return this.userRepository.save(user);
}
}