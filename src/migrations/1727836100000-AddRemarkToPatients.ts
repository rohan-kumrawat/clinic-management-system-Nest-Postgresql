
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRemarkToPatients1727836100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add remark column to patients table
        await queryRunner.query(`
            ALTER TABLE patients 
            ADD COLUMN remark TEXT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove remark column
        await queryRunner.query(`
            ALTER TABLE patients 
            DROP COLUMN remark
        `);
    }
}