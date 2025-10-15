import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class AddCreatedByToPatients1712345678901 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('Adding created_by and updated_by columns to patients table...');

        // Step 1: Add created_by and updated_by columns
        await queryRunner.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS created_by INTEGER,
            ADD COLUMN IF NOT EXISTS updated_by INTEGER
        `);

        // Step 2: Add foreign key for created_by
        await queryRunner.createForeignKey(
            'patients',
            new TableForeignKey({
                columnNames: ['created_by'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL',
                name: 'FK_patients_created_by_users'
            })
        );

        // Step 3: Add foreign key for updated_by
        await queryRunner.createForeignKey(
            'patients',
            new TableForeignKey({
                columnNames: ['updated_by'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL',
                name: 'FK_patients_updated_by_users'
            })
        );

        console.log('Successfully added created_by and updated_by columns with foreign keys');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Removing created_by and updated_by columns from patients table...');

        // Step 1: Drop foreign keys first
        try {
            await queryRunner.dropForeignKey('patients', 'FK_patients_created_by_users');
        } catch (error) {
            console.log('Foreign key FK_patients_created_by_users not found, skipping...');
        }

        try {
            await queryRunner.dropForeignKey('patients', 'FK_patients_updated_by_users');
        } catch (error) {
            console.log('Foreign key FK_patients_updated_by_users not found, skipping...');
        }

        // Step 2: Drop columns
        await queryRunner.query(`
            ALTER TABLE patients 
            DROP COLUMN IF EXISTS created_by,
            DROP COLUMN IF EXISTS updated_by
        `);

        console.log('Successfully removed created_by and updated_by columns');
    }
}