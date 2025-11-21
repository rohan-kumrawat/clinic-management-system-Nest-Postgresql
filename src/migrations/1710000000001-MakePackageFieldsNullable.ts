import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePackageFieldsNullable1710000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make package fields nullable in patients table
        await queryRunner.query(`
            ALTER TABLE patients 
            ALTER COLUMN package_name DROP NOT NULL,
            ALTER COLUMN original_amount DROP NOT NULL,
            ALTER COLUMN discount_amount DROP NOT NULL,
            ALTER COLUMN total_amount DROP NOT NULL,
            ALTER COLUMN total_sessions DROP NOT NULL,
            ALTER COLUMN per_session_amount DROP NOT NULL;
        `);

        // Set default values for existing records
        await queryRunner.query(`
            UPDATE patients 
            SET 
                package_name = COALESCE(package_name, ''),
                original_amount = COALESCE(original_amount, 0),
                discount_amount = COALESCE(discount_amount, 0),
                total_amount = COALESCE(total_amount, 0),
                total_sessions = COALESCE(total_sessions, 0),
                per_session_amount = COALESCE(per_session_amount, 0)
            WHERE package_name IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes if needed
        await queryRunner.query(`
            ALTER TABLE patients 
            ALTER COLUMN package_name SET NOT NULL,
            ALTER COLUMN original_amount SET NOT NULL,
            ALTER COLUMN discount_amount SET NOT NULL,
            ALTER COLUMN total_amount SET NOT NULL,
            ALTER COLUMN total_sessions SET NOT NULL,
            ALTER COLUMN per_session_amount SET NOT NULL;
        `);
    }
}