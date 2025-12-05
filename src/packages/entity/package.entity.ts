import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Patient } from '../../patients/entity/patient.entity';
import { User } from '../../auth/entity/user.entity';
import { Doctor } from '../../doctors/entity/doctor.entity';
import { DecimalTransformer } from 'src/common/decimal.transformer';
import { Session } from '../../sessions/entity/session.entity';
import { PackageStatus, VisitType } from 'src/common/enums';

@Entity('patient_packages')
export class PatientPackage {
  @PrimaryGeneratedColumn()
  package_id: number;

  @ManyToOne(() => Patient, patient => patient.packages)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column()
  patient_id: number;

  @Column({ type: 'varchar', length: 255 })
  package_name: string;

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

  @Column({ type: 'int' })
  total_sessions: number;

  @Column('decimal', { 
    precision: 10, 
    scale: 2,
    transformer: new DecimalTransformer()
  })
  per_session_amount: number;

  @Column({ type: 'int', default: 0 })
  released_sessions: number;

  @Column('decimal', { 
    precision: 10, 
    scale: 2, 
    default: 0,
    transformer: new DecimalTransformer() 
  })
  carry_amount: number;

  @Column({ type: 'int', default: 0 })
  used_sessions: number;

  @Column({
    type: 'enum',
    enum: PackageStatus,
    default: PackageStatus.ACTIVE,
  })
  status: PackageStatus;

  @ManyToOne(() => Doctor, { nullable: true })
  @JoinColumn({ name: 'assigned_doctor_id' })
  assigned_doctor: Doctor;

  @Column({ nullable: true })
  assigned_doctor_id: number;

  @Column({
    type: 'enum',
    enum: VisitType,
    default: VisitType.CLINIC
  })
  visit_type: VisitType;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'closed_by' })
  closed_by: User;

  @Column({ nullable: true })
  closed_by_id: number;

  @OneToMany(() => Session, session => session.package)
  sessions: Session[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual fields
  remaining_sessions: number;
  remaining_release_sessions: number;
  paid_amount: number;
  pending_amount: number;
}