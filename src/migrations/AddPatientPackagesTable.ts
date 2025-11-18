import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddPatientPackagesTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create patient_packages table
    await queryRunner.createTable(new Table({
      name: 'patient_packages',
      columns: [
        {
          name: 'package_id',
          type: 'serial',
          isPrimary: true
        },
        {
          name: 'patient_id',
          type: 'int',
          isNullable: false
        },
        {
          name: 'package_name',
          type: 'varchar',
          length: '255'
        },
        {
          name: 'original_amount',
          type: 'decimal',
          precision: 10,
          scale: 2
        },
        {
          name: 'discount_amount',
          type: 'decimal',
          precision: 10,
          scale: 2,
          default: 0
        },
        {
          name: 'total_amount',
          type: 'decimal',
          precision: 10,
          scale: 2
        },
        {
          name: 'total_sessions',
          type: 'int'
        },
        {
          name: 'per_session_amount',
          type: 'decimal',
          precision: 10,
          scale: 2
        },
        {
          name: 'released_sessions',
          type: 'int',
          default: 0
        },
        {
          name: 'carry_amount',
          type: 'decimal',
          precision: 10,
          scale: 2,
          default: 0
        },
        {
          name: 'used_sessions',
          type: 'int',
          default: 0
        },
        {
          name: 'status',
          type: 'enum',
          enum: ['active', 'completed', 'cancelled'],
          default: "'active'"
        },
        {
          name: 'start_date',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'end_date',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'closed_at',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'closed_by',
          type: 'int',
          isNullable: true
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        }
      ]
    }));

    // Add foreign key
    await queryRunner.createForeignKey('patient_packages', new TableForeignKey({
      columnNames: ['patient_id'],
      referencedColumnNames: ['patient_id'],
      referencedTableName: 'patients',
      onDelete: 'CASCADE'
    }));

    // Migrate existing patient data to packages
    await queryRunner.query(`
      INSERT INTO patient_packages 
        (patient_id, package_name, original_amount, discount_amount, total_amount, 
         total_sessions, per_session_amount, released_sessions, carry_amount, status)
      SELECT 
        patient_id, package_name, original_amount, discount_amount, total_amount,
        total_sessions, per_session_amount, released_sessions, carry_amount, 'active'
      FROM patients 
      WHERE package_name IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('patient_packages');
  }
}