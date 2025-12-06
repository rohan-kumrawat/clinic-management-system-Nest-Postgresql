import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Exclude } from 'class-transformer';
import { Patient } from 'src/patients/entity/patient.entity';

export enum UserRole {
  OWNER = 'owner',
  RECEPTIONIST = 'receptionist',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Patient, (patient) => patient.created_by)
  patientsCreated: Patient[];

  @OneToMany(() => Patient, (patient) => patient.updated_by)
  patientsUpdated: Patient[];

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  @IsNotEmpty()
  @Exclude()
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