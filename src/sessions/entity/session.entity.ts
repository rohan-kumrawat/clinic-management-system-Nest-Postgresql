import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Patient } from '../../patients/entity/patient.entity';
import { Doctor } from '../../doctors/entity/doctor.entity';
import { Payment } from '../../payments/entity/payment.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  session_id: number;

  @ManyToOne(() => Patient, patient => patient.sessions)
  patient: Patient;

  @ManyToOne(() => Doctor, doctor => doctor.sessions)
  doctor: Doctor;

  @Column({ type: 'date' })
  session_date: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => Payment, payment => payment.session)
  payment: Payment;
}