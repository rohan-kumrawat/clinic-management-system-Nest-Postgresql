// src/patients/entity/patient.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Doctor } from '../../doctors/entity/doctor.entity';
import { Session } from '../../sessions/entity/session.entity';
import { Payment } from '../../payments/entity/payment.entity';

export enum PatientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCHARGED = 'discharged',
}

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  patient_id: number;

  @Column({ nullable: true })
  serial_no: number;

  @Column()
  reg_no: string;

  @Column()
  name: string;

  @Column()
  age: number;

  @Column()
  visit_type: string;

  @Column()
  referred_dr: string;

  @Column()
  mobile: string;

  @Column()
  package_name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  original_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  discount_amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total_amount: number;

  @Column()
  total_sessions: number;

  @Column('decimal', { precision: 10, scale: 2 })
  per_session_amount: number;

  @Column({ nullable: true })
  attachment: string;

  @ManyToOne(() => Doctor, doctor => doctor.patients)
  @JoinColumn({ name: 'assigned_doctor_id' }) // Explicitly specify the column name
  assigned_doctor: Doctor;

  @OneToMany(() => Session, session => session.patient)
  sessions: Session[];

  @OneToMany(() => Payment, payment => payment.patient)
  payments: Payment[];

  @Column({
    type: 'enum',
    enum: PatientStatus,
    default: PatientStatus.ACTIVE,
  })
  status: PatientStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual fields (not stored in database)
  attended_sessions_count: number;
  paid_amount: number;
}