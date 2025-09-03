import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Patient, patient => patient.assigned_doctor)
  @Exclude()
  patients: Patient[];

  @OneToMany(() => Session, session => session.doctor)
  @Exclude()
  sessions: Session[];

  active_patients_count?: number;
}