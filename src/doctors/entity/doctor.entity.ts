import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Patient } from '../../patients/entity/patient.entity';
import { Session } from '../../sessions/entity/session.entity';
import { Exclude } from 'class-transformer';

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

  @OneToMany(() => Patient, patient => patient.assigned_doctor)
  patients: Patient[];

  @OneToMany(() => Session, session => session.doctor)
  sessions: Session[];

  active_patients_count?: number;
}