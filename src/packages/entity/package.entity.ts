import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Patient } from '../../patients/entity/patient.entity';
import { User } from '../../auth/entity/user.entity';
import { DecimalTransformer } from 'src/common/decimal.transformer';

@Entity('patient_packages')
export class PatientPackage {
  @PrimaryGeneratedColumn()
  package_id: number;

  @ManyToOne(() => Patient, patient => patient.packages)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column()
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

  @Column()
  total_sessions: number;

  @Column('decimal', { 
    precision: 10, 
    scale: 2,
    transformer: new DecimalTransformer()
  })
  per_session_amount: number;

  @Column({ default: 0 })
  released_sessions: number;

  @Column('decimal', { 
    precision: 10, 
    scale: 2, 
    default: 0,
    transformer: new DecimalTransformer() 
  })
  carry_amount: number;

  @Column({ default: 0 })
  used_sessions: number;

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'closed_by' })
  closed_by: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual fields
  remaining_sessions: number;
  remaining_release_sessions: number;
}