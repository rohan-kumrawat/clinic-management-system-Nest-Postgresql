import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
//import { IsNotEmpty } from 'class-validator';
import { Patient } from '../../patients/entity/patient.entity';
import { Doctor } from '../../doctors/entity/doctor.entity';
import { Payment } from '../../payments/entity/payment.entity';
import { User } from '../../auth/entity/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  session_id: number;

  @ManyToOne(() => Patient, patient => patient.sessions)
  @JoinColumn({ name: 'patient_id' }) // ✅ Explicit join column add karein
  patient: Patient;

  @ManyToOne(() => Doctor, doctor => doctor.sessions)
  @JoinColumn({ name: 'doctor_id' }) // ✅ Explicit join column add karein
  doctor: Doctor;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @Column({ type: 'date' })
  session_date: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => Payment, payment => payment.session)
  payment: Payment;
}