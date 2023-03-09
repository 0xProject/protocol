import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const metaTransactionJobsTable = new Table({
    name: 'meta_transaction_jobs',
    columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'meta_transaction_hash', type: 'varchar', isUnique: true },
        { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        { name: 'updated_at', type: 'timestamptz', isNullable: true },
        { name: 'expiry', type: 'numeric' },
        { name: 'chain_id', type: 'integer' },
        { name: 'integrator_id', type: 'varchar' },
        { name: 'status', type: 'varchar' },
        { name: 'fee', type: 'jsonb' },
        { name: 'meta_transaction', type: 'jsonb' },
        { name: 'worker_address', type: 'varchar', isNullable: true },
        { name: 'affiliate_address', type: 'varchar', isNullable: true },
        { name: 'taker_address', type: 'varchar' },
        { name: 'taker_signature', type: 'jsonb' },
        { name: 'approval', type: 'jsonb', isNullable: true },
        { name: 'approval_signature', type: 'jsonb', isNullable: true },
    ],
});

const metaTransactionHashIndex = new TableIndex({
    name: `meta_transaction_jobs_meta_transaction_hash_index`,
    columnNames: ['meta_transaction_hash'],
});
const createdAtIndex = new TableIndex({ name: `meta_transaction_jobs_created_at_index`, columnNames: ['created_at'] });
const statusIndex = new TableIndex({ name: `meta_transaction_jobs_status_index`, columnNames: ['status'] });
const workerAddressIndex = new TableIndex({
    name: `meta_transaction_jobs_worker_address_index`,
    columnNames: ['worker_address'],
});
const takerAddressIndex = new TableIndex({
    name: `meta_transaction_jobs_taker_address_index`,
    columnNames: ['taker_address'],
});

export class CreateMetaTransactionJobsTable1660082486373 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`); // for `uuid_generate_v4`
        await queryRunner.createTable(metaTransactionJobsTable);
        await queryRunner.createIndex(metaTransactionJobsTable, metaTransactionHashIndex);
        await queryRunner.createIndex(metaTransactionJobsTable, createdAtIndex);
        await queryRunner.createIndex(metaTransactionJobsTable, statusIndex);
        await queryRunner.createIndex(metaTransactionJobsTable, workerAddressIndex);
        await queryRunner.createIndex(metaTransactionJobsTable, takerAddressIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex(metaTransactionJobsTable, metaTransactionHashIndex);
        await queryRunner.dropIndex(metaTransactionJobsTable, createdAtIndex);
        await queryRunner.dropIndex(metaTransactionJobsTable, statusIndex);
        await queryRunner.dropIndex(metaTransactionJobsTable, workerAddressIndex);
        await queryRunner.dropIndex(metaTransactionJobsTable, takerAddressIndex);
        await queryRunner.dropTable(metaTransactionJobsTable);
        await queryRunner.query(`DROP EXTENSION "uuid-ossp"`);
    }
}
