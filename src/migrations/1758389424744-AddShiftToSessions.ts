import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShiftToSessions1758389424744 implements MigrationInterface {
    name = 'AddShiftToSessions1758389424744'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sessions" ADD "shift" VARCHAR(20) DEFAULT 'morning'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sessions" DROP COLUMN "shift"
        `);
    }
}
