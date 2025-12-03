// src/patients/entity/patient.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Session } from '../../sessions/entity/session.entity';
import { Payment } from '../../payments/entity/payment.entity';
import { PatientStatus, Gender } from '../../common/enums';
import { User } from 'src/auth/entity/user.entity';
import { PatientPackage } from '../../packages/entity/package.entity';

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

  @Column({ type: 'text', nullable: true })
  remarks: string;
  
  @Column({ nullable: true })
  referred_dr: string;
  
  @Column()
  mobile: string;
  
  
  @Column({ nullable: true })
  attachment: string;
  
  @ManyToOne(() => User, (user) => user.patientsCreated)
  @JoinColumn({ name: 'created_by' })
  created_by: User;
  
  @ManyToOne(() => User, (user) => user.patientsUpdated, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updated_by: User;
  
  @OneToMany(() => Session, session => session.patient)
  sessions: Session[];
  
  @OneToMany(() => Payment, payment => payment.patient)
  payments: Payment[];
  
  @OneToMany(() => PatientPackage, pkg => pkg.patient)
  packages: PatientPackage[];
  
  @Column({
    type: 'enum',
    enum: PatientStatus,
    default: PatientStatus.NO_PACKAGE,
  })
  status: PatientStatus;

  
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
  current_doctor: any;
  total_package_amount: number;
  total_released_sessions: number;
  total_used_sessions: number;
  active_package: any;
  
}