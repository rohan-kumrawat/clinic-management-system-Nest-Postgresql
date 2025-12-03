import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Session } from '../../sessions/entity/session.entity';
import { PatientPackage } from '../../packages/entity/package.entity';
//import { Exclude } from 'class-transformer';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  doctor_id: number;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column()
  specialization: string;

  @Column()
  mobile: string;

  @Column({ nullable: true })
  experience: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  qualification: string;

  @Column({ default: true })
  status: boolean;

  @Column({ default: false })
  @Index()
  deleted: boolean;  // Soft delete flag
  
  @Column({ nullable: true })
  deleted_at: Date;  // When was it deleted
  
  @Column({ nullable: true })
  deleted_by: number; // Who deleted (user_id)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Session, session => session.doctor)
  sessions: Session[];

  @OneToMany(() => PatientPackage, pkg => pkg.assigned_doctor)
  packages: PatientPackage[];

  // Add these properties for statistical data (not stored in DB)
  active_patients_count?: number;
  total_packages_count?: number;
  active_packages_count?: number;
  completed_packages_count?: number;
}