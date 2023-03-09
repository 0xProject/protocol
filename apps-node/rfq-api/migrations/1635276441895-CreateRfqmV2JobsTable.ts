import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const rfqmV2JobsTable = new Table({
    name: 'rfqm_v2_jobs',
    columns: [
        { name: 'order_hash', type: 'varchar', isPrimary: true },
        { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        { name: 'updated_at', type: 'timestamptz', isNullable: true },
        { name: 'expiry', type: 'numeric' },
        { name: 'chain_id', type: 'integer' },
        { name: 'integrator_id', type: 'varchar', isNullable: true },
        { name: 'maker_uri', type: 'varchar' },
        { name: 'status', type: 'varchar' },
        { name: 'fee', type: 'jsonb' },
        { name: 'order', type: 'jsonb' },
        { name: 'worker_address', type: 'varchar', isNullable: true },
        { name: 'last_look_result', type: 'boolean', isNullable: true },
        { name: 'affiliate_address', type: 'varchar', isNullable: true },
        { name: 'taker_signature', type: 'jsonb', isNullable: true },
        { name: 'maker_signature', type: 'jsonb', isNullable: true },
        { name: 'is_unwrap', type: 'boolean' },
    ],
});

const createdAtIndex = new TableIndex({ name: `rfqm_v2_jobs_created_at_index`, columnNames: ['created_at'] });
const statusIndex = new TableIndex({ name: `rfqm_v2_jobs_status_index`, columnNames: ['status'] });

export class CreateRfqmV2JobsTable1635276441895 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(rfqmV2JobsTable);
        await queryRunner.createIndex('rfqm_v2_jobs', createdAtIndex);
        await queryRunner.createIndex('rfqm_v2_jobs', statusIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('rfqm_v2_jobs', createdAtIndex);
        await queryRunner.dropIndex('rfqm_v2_jobs', statusIndex);
        await queryRunner.dropTable(rfqmV2JobsTable);
    }
}
