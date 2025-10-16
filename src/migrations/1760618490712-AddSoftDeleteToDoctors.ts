import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSoftDeleteToDoctors1698765432100 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('Adding soft delete columns to doctors table...');
        
        // Add new columns for soft delete
        await queryRunner.addColumns('doctors', [
            new TableColumn({
                name: 'deleted',
                type: 'boolean',
                default: false
            }),
            new TableColumn({
                name: 'deleted_at',
                type: 'timestamp',
                isNullable: true
            }),
            new TableColumn({
                name: 'deleted_by',
                type: 'int',
                isNullable: true
            })
        ]);

        console.log('Soft delete columns added successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Removing soft delete columns from doctors table...');
        
        // Remove the added columns
        await queryRunner.dropColumns('doctors', ['deleted', 'deleted_at', 'deleted_by']);
        
        console.log('Soft delete columns removed successfully');
    }
}