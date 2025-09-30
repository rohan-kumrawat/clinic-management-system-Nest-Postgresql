import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ModifyPatientReportsField1690000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove old single image columns
    await queryRunner.dropColumn('patients', 'image_url');
    await queryRunner.dropColumn('patients', 'image_public_id');
    
    // Add new reports JSONB column
    await queryRunner.addColumn('patients', new TableColumn({
      name: 'reports',
      type: 'jsonb',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove reports column
    await queryRunner.dropColumn('patients', 'reports');
    
    // Add back old columns
    await queryRunner.addColumn('patients', new TableColumn({
      name: 'image_url',
      type: 'varchar',
      length: '500',
      isNullable: true,
    }));
    await queryRunner.addColumn('patients', new TableColumn({
      name: 'image_public_id',
      type: 'varchar',
      length: '100',
      isNullable: true,
    }));
  }
}