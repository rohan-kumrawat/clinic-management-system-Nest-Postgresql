import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Patient } from '../../patients/entity/patient.entity';
import { Session } from '../../sessions/entity/session.entity';

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

  @Column({ default: true })
  status: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Patient, patient => patient.assigned_doctor)
  patients: Patient[];

  @OneToMany(() => Session, session => session.doctor)
  sessions: Session[];
}