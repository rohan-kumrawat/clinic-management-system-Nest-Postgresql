// src/patients/entity/patient.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Doctor } from '../../doctors/entity/doctor.entity';
import { Session } from '../../sessions/entity/session.entity';
import { Payment } from '../../payments/entity/payment.entity';
import { PatientStatus, VisitType, Gender } from '../../common/enums';
import { DecimalTransformer } from 'src/common/decimal.transformer';
import { User } from 'src/auth/entity/user.entity';


@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  patient_id: number;

  @Column({ unique: false })
  reg_no: string;

  @Column()
  name: string;

  @Column()
  age: number;

  
  @Column({ nullable: true })
  referred_dr: string;
  
  @Column()
  mobile: string;
  
  @Column()
  package_name: string;

  @Column({ default: 0 })
  released_sessions: number;

  @Column('decimal', { 
    precision: 10, 
    scale: 2, 
    default: 0,
    transformer: new DecimalTransformer() 
  })
  carry_amount: number;
  
  @Column('decimal', { 
    precision: 10, 
    scale: 2,
    transformer: new DecimalTransformer()
  })
  original_amount: number;
  
  @Column('decimal', { 
    precision: 10, 
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer()
  })
  discount_amount: number;
  
  @Column('decimal', { 
    precision: 10, 
    scale: 2, 
    transformer: new DecimalTransformer()
  })
  total_amount: number;
  
  @Column()
  total_sessions: number;
  
  @Column('decimal', { 
    precision: 10, 
    scale: 2, 
    transformer: new DecimalTransformer()
  })
  per_session_amount: number;
  
  @Column({ nullable: true })
  attachment: string;

  @ManyToOne(() => User, (user) => user.patientsCreated)
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @ManyToOne(() => User, (user) => user.patientsUpdated, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updated_by: User;
  
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

  @Column({
    type: 'enum',
    enum: VisitType,
    default: VisitType.CLINIC,
  })
  visit_type: VisitType;

  @Column({
    type: 'enum',
    enum: Gender
    })
    gender: Gender;


// For multiple images/reports:
@Column({ type: 'jsonb', nullable: true })
reports: Array<{
  id: string;  // Unique identifier for each report
  url: string;
  public_id: string;
  filename: string;
  uploaded_at: Date;
  description?: string;
  file_size?: number; // in bytes
  mime_type?: string; // e.g., 'image/png', 'application/pdf'
  file_type: string;
}>;


  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual fields (not stored in database)
  attended_sessions_count: number;
  paid_amount: number;
  payment_status: string;
  remaining_released_sessions: number;
}