import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValidSignedOrdersV4View1627932761228 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE VIEW valid_signed_orders_v4
            AS SELECT * FROM signed_orders_v4
            WHERE invalid_since IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW valid_signed_orders_v4`);
    }
}
