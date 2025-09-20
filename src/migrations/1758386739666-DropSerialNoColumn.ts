import { MigrationInterface, QueryRunner } from "typeorm";

export class DropSerialNoColumn1758386739666 implements MigrationInterface {
    name = 'DropSerialNoColumn1758386739666'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "serial_no"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" ADD "serial_no" integer`);
    }

}
