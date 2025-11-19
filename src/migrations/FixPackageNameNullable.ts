import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPackageNameNullable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pehle existing column ko drop karen (agar exists hai toh)
    await queryRunner.query(`
      ALTER TABLE patient_packages 
      ALTER COLUMN package_name DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: NOT NULL wapas set karen
    await queryRunner.query(`
      UPDATE patient_packages 
      SET package_name = 'Default Package' 
      WHERE package_name IS NULL
    `);
    
    await queryRunner.query(`
      ALTER TABLE patient_packages 
      ALTER COLUMN package_name SET NOT NULL
    `);
  }
}