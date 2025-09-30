import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPatientImageFields1690000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('patients', [
      new TableColumn({
        name: 'image_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
      new TableColumn({
        name: 'image_public_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('patients', 'image_url');
    await queryRunner.dropColumn('patients', 'image_public_id');
  }
}