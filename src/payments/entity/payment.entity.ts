import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { Patient } from '../../patients/entity/patient.entity';
import { Session } from '../../sessions/entity/session.entity';
import { User } from '../../auth/entity/user.entity';

export enum PaymentMode {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  payment_id: number;

  @ManyToOne(() => Patient, (patient) => patient.payments)
  patient: Patient;

  @OneToOne(() => Session, { nullable: true })
  @JoinColumn()
  session: Session;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @Column('decimal', { precision: 10, scale: 2 })
  amount_paid: number;

  @Column({
    type: 'enum',
    enum: PaymentMode,
    default: PaymentMode.CASH,
  })
  @IsEnum(PaymentMode)
  payment_mode: PaymentMode;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'date' })
  payment_date: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  remaining_amount: number;

  @CreateDateColumn()
  created_at: Date;
}
