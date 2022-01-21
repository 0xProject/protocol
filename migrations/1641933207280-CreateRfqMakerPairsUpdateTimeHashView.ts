import { MigrationInterface, QueryRunner } from 'typeorm';

const viewName = 'rfq_maker_pairs_update_time_hashes';

export class CreateRfqMakerPairsUpdateTimeHashView1641933207280 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
        await queryRunner.query(`
            CREATE MATERIALIZED VIEW ${viewName} AS
                SELECT
                    encode(
                        digest(
                            array_agg(
                                updated_at ORDER BY updated_at NULLS FIRST
                            )::text,
                        'sha256'),
                    'hex') AS hash,
                    chain_id
                FROM rfq_maker_pairs
                GROUP BY chain_id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP MATERIALIZED VIEW ${viewName}`);
        await queryRunner.query(`DROP EXTENSION pgcrypto`);
    }
}
