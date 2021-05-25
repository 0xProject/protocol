import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const rfqmJobsTable = new Table({
    name: 'rfqm_jobs',
    columns: [
        { name: 'order_hash', type: 'varchar', isPrimary: true },
        { name: 'metatransaction_hash', type: 'varchar', isUnique: true, isNullable: true },
        { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        { name: 'updated_at', type: 'timestamptz', isNullable: true },
        { name: 'expiry', type: 'numeric' },
        { name: 'chain_id', type: 'integer' },
        { name: 'integrator_id', type: 'varchar', isNullable: true },
        { name: 'maker_uri', type: 'varchar' },
        { name: 'status', type: 'varchar' },
        { name: 'status_reason', type: 'varchar', isNullable: true },
        { name: 'calldata', type: 'varchar' },
        { name: 'fee', type: 'jsonb', isNullable: true },
        { name: 'order', type: 'jsonb', isNullable: true },
        { name: 'metadata', type: 'jsonb', isNullable: true },
    ],
});

const createdAtIndex = new TableIndex({ name: `rfqm_jobs_created_at_index`, columnNames: ['created_at'] });
const statusIndex = new TableIndex({ name: `rfqm_jobs_status_index`, columnNames: ['status'] });

export class CreateRfqmJobsTable1621447377869 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(rfqmJobsTable);
        await queryRunner.createIndex('rfqm_jobs', createdAtIndex);
        await queryRunner.createIndex('rfqm_jobs', statusIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('rfqm_jobs', createdAtIndex);
        await queryRunner.dropIndex('rfqm_jobs', statusIndex);
        await queryRunner.dropTable(rfqmJobsTable);
    }
}
