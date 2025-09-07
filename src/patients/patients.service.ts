// src/patients/patients.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, SelectQueryBuilder, Brackets } from 'typeorm';
import { Patient } from './entity/patient.entity';
import { UserRole } from '../auth/entity/user.entity';
import { PatientStatus, PaymentStatus, VisitType } from 'src/common/enums';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) { }

  async create(patientData: Partial<Patient>): Promise<Patient> {
    try {

      if (patientData.assigned_doctor && (patientData.assigned_doctor as any).doctor_id) {
        patientData.assigned_doctor = { doctor_id: (patientData.assigned_doctor as any).doctor_id } as any;
      }

      const patient = this.patientsRepository.create(patientData);
      return await this.patientsRepository.save(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      throw new Error('Failed to create patient. Please check your data.');
    }
  }


  async findOne(id: number, userRole: UserRole | null = null): Promise<Patient> {
    try {
      let patient: Patient | null;

      if (userRole === UserRole.RECEPTIONIST) {
        patient = await this.patientsRepository.findOne({
          where: { patient_id: id, status: PatientStatus.ACTIVE },
          relations: ['assigned_doctor'],
        });
      } else {
        patient = await this.patientsRepository.findOne({
          where: { patient_id: id },
          relations: ['assigned_doctor'],
        });
      }

      if (!patient) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      const patientsWithStats = await this.addSessionAndPaymentStats([patient]);
      return patientsWithStats[0];
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw new Error('Failed to fetch patient');
    }
  }


  async update(id: number, updateData: Partial<Patient>, userRole: UserRole | null = null): Promise<Patient> {
    try {
      await this.findOne(id, userRole);

      if ((updateData.total_sessions !== undefined || updateData.total_amount !== undefined)) {
        const patient = await this.patientsRepository.findOne({ where: { patient_id: id } });
        if (!patient) {
          throw new NotFoundException(`Patient with ID ${id} not found`);
        }
        const newTotalSessions = updateData.total_sessions !== undefined ? updateData.total_sessions : patient.total_sessions;
        const newTotalAmount = updateData.total_amount !== undefined ? updateData.total_amount : patient.total_amount;

        if (newTotalSessions > 0) {
          updateData.per_session_amount = newTotalAmount / newTotalSessions;
        }
      }

      await this.patientsRepository.update(id, updateData);
      return this.findOne(id, userRole);
    } catch (error) {
      console.error('Error updating patient:', error);
      throw new Error('Failed to update patient');
    }
  }


  async remove(id: number): Promise<{ message: string }> {
    try {
      const result = await this.patientsRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Patient with ID ${id} not found`);
      }

      return { message: 'Patient deleted successfully' };
    } catch (error) {
      console.error('Error deleting patient:', error);

      if (error.message.includes('foreign key constraint')) {
        throw new Error('Cannot delete patient. There are associated sessions or payments.');
      }

      throw new Error('Failed to delete patient');
    }
  }



  /**
   * Builds a complex query for finding patients with advanced filters
   */
  // private buildFindQuery(
  //   userRole: UserRole,
  //   filters: {
  //     name?: string;
  //     doctorId?: number;
  //     status?: PatientStatus;
  //     visitType?: VisitType;
  //     paymentStatus?: PaymentStatus;
  //   },
  // ) {
  //   // Start building the query
  //   const queryBuilder = this.patientsRepository
  //     .createQueryBuilder('patient')
  //     .leftJoinAndSelect('patient.assigned_doctor', 'doctor')
  //     .leftJoinAndSelect('patient.payments', 'payments')
  //     .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions');

  //   // Apply role-based filter (Receptionist can only see ACTIVE patients)
  //   if (userRole === UserRole.RECEPTIONIST) {
  //     queryBuilder.andWhere('patient.status = :status', { status: PatientStatus.ACTIVE });
  //   }

  //   // Apply other filters dynamically
  //   if (filters.name) {
  //     queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${filters.name}%` });
  //   }

  //   if (filters.doctorId) {
  //     queryBuilder.andWhere('patient.assigned_doctor_id = :doctorId', { doctorId: filters.doctorId });
  //   }

  //   if (filters.status) {
  //     queryBuilder.andWhere('patient.status = :status', { status: filters.status });
  //   }

  //   if (filters.visitType) {
  //     queryBuilder.andWhere('patient.visit_type = :visitType', { visitType: filters.visitType });
  //   }

  //   return queryBuilder;
  // }

  // async findAll(
  //   userRole: UserRole,
  //   page: number = 1,
  //   limit: number = 10,
  //   name?: string,
  //   doctorId?: number,
  //   status?: PatientStatus,
  //   visitType?: VisitType,
  //   paymentStatus?: PaymentStatus,
  // ): Promise<{ patients: Patient[]; total: number; page: number; limit: number }> {
  //   try {
  //     const queryBuilder = this.buildFindQuery(userRole, {
  //       name,
  //       doctorId,
  //       status,
  //       visitType,
  //       paymentStatus,
  //     });

  //     // Get the total count before pagination
  //     const total = await queryBuilder.getCount();

  //     // Apply pagination
  //     const patients = await queryBuilder
  //       .orderBy('patient.name', 'ASC')
  //       .skip((page - 1) * limit)
  //       .take(limit)
  //       .getMany();

  //     // Calculate payment stats for each patient
  //     const patientsWithStats = await Promise.all(
  //       patients.map(async (patient) => {
  //         // Calculate paid amount
  //         const paidResult = await this.patientsRepository.manager.query(
  //           `SELECT COALESCE(SUM(amount_paid), 0) as total_paid 
  //            FROM payments 
  //            WHERE patient_id = $1`,
  //           [patient.patient_id]
  //         );
          
  //         const paidAmount = parseFloat(paidResult[0].total_paid);
  //         patient.paid_amount = paidAmount;

  //         // Calculate payment status
  //         const remaining = patient.total_amount - paidAmount;
  //         if (paidAmount === 0) {
  //           patient.payment_status = PaymentStatus.UNPAID;
  //         } else if (remaining > 0) {
  //           patient.payment_status = PaymentStatus.PARTIALLY_PAID;
  //         } else {
  //           patient.payment_status = PaymentStatus.FULLY_PAID;
  //         }

  //         return patient;
  //       })
  //     );

  //     // Apply payment status filter if specified
  //     let filteredPatients = patientsWithStats;
  //     if (paymentStatus) {
  //       filteredPatients = patientsWithStats.filter(patient => 
  //         patient.payment_status === paymentStatus
  //       );
  //     }

  //     return {
  //       patients: filteredPatients,
  //       total,
  //       page,
  //       limit,
  //     };
  //   } catch (error) {
  //     console.error('Error fetching patients:', error);
  //     throw new Error('Failed to fetch patients');
  //   }
  // }

  
  // async findAllActive(
  //   page: number = 1,
  //   limit: number = 10,
  //   name?: string,
  //   doctorId?: number,
  //   visitType?: VisitType,
  //   paymentStatus?: PaymentStatus,
  // ): Promise<{ patients: Patient[]; total: number; page: number; limit: number }> {
  //   try {
  //     // For active patients, we explicitly set the status to ACTIVE
  //     const queryBuilder = this.patientsRepository
  //       .createQueryBuilder('patient')
  //       .leftJoinAndSelect('patient.assigned_doctor', 'doctor')
  //       .leftJoinAndSelect('patient.payments', 'payments')
  //       .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions')
  //       .where('patient.status = :status', { status: PatientStatus.ACTIVE });

  //     // Apply other filters dynamically
  //     if (name) {
  //       queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${name}%` });
  //     }

  //     if (doctorId) {
  //       queryBuilder.andWhere('patient.assigned_doctor_id = :doctorId', { doctorId });
  //     }

  //     if (visitType) {
  //       queryBuilder.andWhere('patient.visit_type = :visitType', { visitType });
  //     }

  //     // Get the total count before pagination
  //     const total = await queryBuilder.getCount();

  //     // Apply pagination
  //     const patients = await queryBuilder
  //       .orderBy('patient.name', 'ASC')
  //       .skip((page - 1) * limit)
  //       .take(limit)
  //       .getMany();

  //     // Calculate payment stats for each patient
  //     const patientsWithStats = await Promise.all(
  //       patients.map(async (patient) => {
  //         // Calculate paid amount
  //         const paidResult = await this.patientsRepository.manager.query(
  //           `SELECT COALESCE(SUM(amount_paid), 0) as total_paid 
  //            FROM payments 
  //            WHERE patient_id = $1`,
  //           [patient.patient_id]
  //         );
          
  //         const paidAmount = parseFloat(paidResult[0].total_paid);
  //         patient.paid_amount = paidAmount;

  //         // Calculate payment status
  //         const remaining = patient.total_amount - paidAmount;
  //         if (paidAmount === 0) {
  //           patient.payment_status = PaymentStatus.UNPAID;
  //         } else if (remaining > 0) {
  //           patient.payment_status = PaymentStatus.PARTIALLY_PAID;
  //         } else {
  //           patient.payment_status = PaymentStatus.FULLY_PAID;
  //         }

  //         return patient;
  //       })
  //     );

  //     // Apply payment status filter if specified
  //     let filteredPatients = patientsWithStats;
  //     if (paymentStatus) {
  //       filteredPatients = patientsWithStats.filter(patient => 
  //         patient.payment_status === paymentStatus
  //       );
  //     }

  //     return {
  //       patients: filteredPatients,
  //       total,
  //       page,
  //       limit,
  //     };
  //   } catch (error) {
  //     console.error('Error fetching active patients:', error);
  //     throw new Error('Failed to fetch active patients');
  //   }
  // }


  //new code start


 private buildFindQuery(
    userRole: UserRole,
    filters: {
      name?: string;
      doctorId?: number;
      status?: PatientStatus;
      visitType?: VisitType;
      paymentStatus?: PaymentStatus;
    },
  ) {
    // Start building the query
    const queryBuilder = this.patientsRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.assigned_doctor', 'doctor')
      .addSelect(['doctor.doctor_id', 'doctor.name']) // Select only necessary fields
      // .leftJoinAndSelect('patient.payments', 'payments')
      .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions');

    // Apply role-based filter (Receptionist can only see ACTIVE patients)
    if (userRole === UserRole.RECEPTIONIST) {
      queryBuilder.andWhere('patient.status = :status', { status: PatientStatus.ACTIVE });
    }

    // Apply other filters dynamically
    if (filters.name) {
      queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.doctorId) {
      queryBuilder.andWhere('patient.assigned_doctor_id = :doctorId', { doctorId: filters.doctorId });
    }

    if (filters.status) {
      queryBuilder.andWhere('patient.status = :status', { status: filters.status });
    }

    if (filters.visitType) {
      queryBuilder.andWhere('patient.visit_type = :visitType', { visitType: filters.visitType });
    }

    return queryBuilder;
  }

  async findAll(
    userRole: UserRole,
    page: number = 1,
    limit: number = 10,
    name?: string,
    doctorId?: number,
    status?: PatientStatus,
    visitType?: VisitType,
    paymentStatus?: PaymentStatus,
  ): Promise<{ patients: Patient[]; total: number; page: number; limit: number }> {
    try {
      const queryBuilder = this.buildFindQuery(userRole, {
        name,
        doctorId,
        status,
        visitType,
        paymentStatus,
      });

      // Get the total count before pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      const patients = await queryBuilder
        .orderBy('patient.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      // Calculate payment stats for each patient
      const patientsWithStats = await Promise.all(
        patients.map(async (patient) => {
          // Calculate paid amount
          const paidResult = await this.patientsRepository.manager.query(
            `SELECT COALESCE(SUM(amount_paid), 0) as total_paid 
             FROM payments 
             WHERE patient_id = $1`,
            [patient.patient_id]
          );
          
          const paidAmount = parseFloat(paidResult[0].total_paid);
          patient.paid_amount = paidAmount;

          // Calculate payment status
          const remaining = patient.total_amount - paidAmount;
          if (paidAmount === 0) {
            patient.payment_status = PaymentStatus.UNPAID;
          } else if (remaining > 0) {
            patient.payment_status = PaymentStatus.PARTIALLY_PAID;
          } else {
            patient.payment_status = PaymentStatus.FULLY_PAID;
          }

          return patient;
        })
      );

      // Apply payment status filter if specified
      let filteredPatients = patientsWithStats;
      if (paymentStatus) {
        filteredPatients = patientsWithStats.filter(patient => 
          patient.payment_status === paymentStatus
        );
      }

      return {
        patients: filteredPatients,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw new Error('Failed to fetch patients');
    }
  }

  async findAllActive(
    page: number = 1,
    limit: number = 10,
    name?: string,
    doctorId?: number,
    visitType?: VisitType,
    paymentStatus?: PaymentStatus,
  ): Promise<{ patients: Patient[]; total: number; page: number; limit: number }> {
    try {
      // For active patients, we explicitly set the status to ACTIVE
      const queryBuilder = this.patientsRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.assigned_doctor', 'doctor')
        .leftJoinAndSelect('patient.payments', 'payments')
        .loadRelationCountAndMap('patient.attended_sessions_count', 'patient.sessions')
        .where('patient.status = :status', { status: PatientStatus.ACTIVE });

      // Apply other filters dynamically
      if (name) {
        queryBuilder.andWhere('patient.name ILIKE :name', { name: `%${name}%` });
      }

      if (doctorId) {
        queryBuilder.andWhere('patient.assigned_doctor_id = :doctorId', { doctorId });
      }

      if (visitType) {
        queryBuilder.andWhere('patient.visit_type = :visitType', { visitType });
      }

      // Get the total count before pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      const patients = await queryBuilder
        .orderBy('patient.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      // Calculate payment stats for each patient
      const patientsWithStats = await Promise.all(
        patients.map(async (patient) => {
          // Calculate paid amount
          const paidResult = await this.patientsRepository.manager.query(
            `SELECT COALESCE(SUM(amount_paid), 0) as total_paid 
             FROM payments 
             WHERE patient_id = $1`,
            [patient.patient_id]
          );
          
          const paidAmount = parseFloat(paidResult[0].total_paid);
          patient.paid_amount = paidAmount;

          // Calculate payment status
          const remaining = patient.total_amount - paidAmount;
          if (paidAmount === 0) {
            patient.payment_status = PaymentStatus.UNPAID;
          } else if (remaining > 0) {
            patient.payment_status = PaymentStatus.PARTIALLY_PAID;
          } else {
            patient.payment_status = PaymentStatus.FULLY_PAID;
          }

          return patient;
        })
      );

      // Apply payment status filter if specified
      let filteredPatients = patientsWithStats;
      if (paymentStatus) {
        filteredPatients = patientsWithStats.filter(patient => 
          patient.payment_status === paymentStatus
        );
      }

      return {
        patients: filteredPatients,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching active patients:', error);
      throw new Error('Failed to fetch active patients');
    }
  }

  //new code end

  /**
   * Helper method to transform raw SQL results into Patient objects.
   * Reused by both findAll and findAllActive.
   */
  // private transformRawPatients(rawPatients: any[]): Patient[] {
  //   return rawPatients.map((rawPatient) => {
  //     const patient = new Patient();
  //     patient.patient_id = rawPatient.patient_patient_id;
  //     patient.serial_no = rawPatient.patient_serial_no;
  //     patient.reg_no = rawPatient.patient_reg_no;
  //     patient.name = rawPatient.patient_name;
  //     patient.age = rawPatient.patient_age;
  //     patient.visit_type = rawPatient.patient_visit_type;
  //     patient.referred_dr = rawPatient.patient_referred_dr;
  //     patient.mobile = rawPatient.patient_mobile;
  //     patient.package_name = rawPatient.patient_package_name;
  //     patient.original_amount = parseFloat(rawPatient.patient_original_amount);
  //     patient.discount_amount = parseFloat(rawPatient.patient_discount_amount);
  //     patient.total_amount = parseFloat(rawPatient.patient_total_amount);
  //     patient.total_sessions = rawPatient.patient_total_sessions;
  //     patient.per_session_amount = parseFloat(rawPatient.patient_per_session_amount);
  //     patient.attachment = rawPatient.patient_attachment;
  //     patient.status = rawPatient.patient_status;
  //     patient.created_at = rawPatient.patient_created_at;
  //     patient.updated_at = rawPatient.patient_updated_at;

  //     // Handle the joined doctor relation
  //     if (rawPatient.doctor_doctor_id) {
  //       patient.assigned_doctor = {
  //         doctor_id: rawPatient.doctor_doctor_id,
  //         name: rawPatient.doctor_name,
  //       } as any;
  //     }

  //     // Add the calculated stats from the query
  //     patient.attended_sessions_count = rawPatient.patient_attended_sessions_count;
  //     patient.paid_amount = parseFloat(rawPatient.patient_paid_amount || '0');

  //     // Calculate and add the payment_status virtual field
  //     const remaining = parseFloat(rawPatient.patient_remaining_amount || '0');
  //     if (patient.paid_amount === 0) {
  //       patient.payment_status = PaymentStatus.UNPAID;
  //     } else if (remaining > 0) {
  //       patient.payment_status = PaymentStatus.PARTIALLY_PAID;
  //     } else {
  //       patient.payment_status = PaymentStatus.FULLY_PAID;
  //     }

  //     return patient;
  //   });
  // }


  // Helper method to add session and payment stats


  private async addSessionAndPaymentStats(patients: Patient[]): Promise<Patient[]> {
    try {
      if (patients.length === 0) return patients;

      const patientIds = patients.map(p => p.patient_id);

      // Get sessions count for each patient using a more reliable query
      const sessionCounts = await this.patientsRepository.manager.query(`
        SELECT patient_id, COUNT(session_id) as sessions_count 
        FROM sessions 
        WHERE patient_id IN (${patientIds.join(',')})
        GROUP BY patient_id
      `);

      // Get paid amount for each patient using a more reliable query
      const paidAmounts = await this.patientsRepository.manager.query(`
        SELECT patient_id, COALESCE(SUM(amount_paid), 0) as paid_amount 
        FROM payments 
        WHERE patient_id IN (${patientIds.join(',')})
        GROUP BY patient_id
      `);

      // Map the stats to patients and format assigned_doctor
      return patients.map(patient => {
        const sessionCount = sessionCounts.find((sc: any) => sc.patient_id === patient.patient_id);
        const paidAmount = paidAmounts.find((pa: any) => pa.patient_id === patient.patient_id);

        // Format assigned_doctor to only include id and name
        const formattedDoctor = patient.assigned_doctor ? {
          doctor_id: patient.assigned_doctor.doctor_id,
          name: patient.assigned_doctor.name
        } : null;

        // Create a new object with the required properties
        const patientWithStats = {
          ...patient,
          assigned_doctor: formattedDoctor,
          attended_sessions_count: sessionCount ? parseInt(sessionCount.sessions_count) : 0,
          paid_amount: paidAmount ? parseFloat(paidAmount.paid_amount) : 0,
        };

        return patientWithStats as Patient;
      });
    } catch (error) {
      console.error('Error in addSessionAndPaymentStats:', error);
      // If there's an error, return patients without stats
      return patients.map(patient => ({
        ...patient,
        attended_sessions_count: 0,
        paid_amount: 0,
      } as Patient));
    }
  }



  async getStats(): Promise<{
    total: number;
    active: number;
    discharged: number;
  }> {
    try {
      const total = await this.patientsRepository.count();
      const active = await this.patientsRepository.count({ where: { status: PatientStatus.ACTIVE } });
      const discharged = await this.patientsRepository.count({ where: { status: PatientStatus.DISCHARGED } });

      return { total, active, discharged };
    } catch (error) {
      console.error('Error getting patient stats:', error);
      throw new Error('Failed to get patient statistics');
    }
  }
}