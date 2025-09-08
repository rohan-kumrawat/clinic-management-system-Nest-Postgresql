import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export enum UserRole {
  OWNER = 'owner',
  RECEPTIONIST = 'receptionist',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  @IsNotEmpty()
  password: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column()
  @IsNotEmpty()
  mobile: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RECEPTIONIST,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  sessionsCreated: any;
}