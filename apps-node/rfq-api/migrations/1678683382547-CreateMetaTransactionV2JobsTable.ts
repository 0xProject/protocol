import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const metaTransactionv2JobsTable = new Table({
    name: 'meta_transaction_v2_jobs',
    columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'meta_transaction_hash', type: 'varchar', isUnique: true },
        { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        { name: 'updated_at', type: 'timestamptz', isNullable: true },
        { name: 'expiry', type: 'numeric' },
        { name: 'chain_id', type: 'integer' },
        { name: 'integrator_id', type: 'varchar' },
        { name: 'status', type: 'varchar' },
        { name: 'meta_transaction', type: 'jsonb' },
        { name: 'called_function', type: 'varchar' },
        { name: 'worker_address', type: 'varchar', isNullable: true },
        { name: 'affiliate_address', type: 'varchar', isNullable: true },
        { name: 'taker_address', type: 'varchar' },
        { name: 'taker_signature', type: 'jsonb' },
        { name: 'approval', type: 'jsonb', isNullable: true },
        { name: 'approval_signature', type: 'jsonb', isNullable: true },
        { name: 'input_token', type: 'varchar' },
        { name: 'output_token', type: 'varchar' },
        { name: 'tokens', type: 'varchar', isArray: true },
        { name: 'input_token_amount', type: 'numeric' },
        { name: 'min_output_token_amount', type: 'numeric' },
    ],
});

const metaTransactionHashIndex = new TableIndex({
    name: `meta_transaction_v2_jobs_meta_transaction_hash_index`,
    columnNames: ['meta_transaction_hash'],
});
const createdAtIndex = new TableIndex({
    name: `meta_transaction_v2_jobs_created_at_index`,
    columnNames: ['created_at'],
});
const statusIndex = new TableIndex({ name: `meta_transaction_v2_jobs_status_index`, columnNames: ['status'] });
const workerAddressIndex = new TableIndex({
    name: `meta_transaction_v2_jobs_worker_address_index`,
    columnNames: ['worker_address'],
});
const takerAddressIndex = new TableIndex({
    name: `meta_transaction_v2_jobs_taker_address_index`,
    columnNames: ['taker_address'],
});
const inputTokenIndex = new TableIndex({
    name: `meta_transaction_v2_jobs_input_token_index`,
    columnNames: ['input_token'],
});

export class CreateMetaTransactionV2JobsTable1678683382547 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`); // for `uuid_generate_v4`
        await queryRunner.createTable(metaTransactionv2JobsTable);
        await queryRunner.createIndex(metaTransactionv2JobsTable, metaTransactionHashIndex);
        await queryRunner.createIndex(metaTransactionv2JobsTable, createdAtIndex);
        await queryRunner.createIndex(metaTransactionv2JobsTable, statusIndex);
        await queryRunner.createIndex(metaTransactionv2JobsTable, workerAddressIndex);
        await queryRunner.createIndex(metaTransactionv2JobsTable, takerAddressIndex);
        await queryRunner.createIndex(metaTransactionv2JobsTable, inputTokenIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex(metaTransactionv2JobsTable, metaTransactionHashIndex);
        await queryRunner.dropIndex(metaTransactionv2JobsTable, createdAtIndex);
        await queryRunner.dropIndex(metaTransactionv2JobsTable, statusIndex);
        await queryRunner.dropIndex(metaTransactionv2JobsTable, workerAddressIndex);
        await queryRunner.dropIndex(metaTransactionv2JobsTable, takerAddressIndex);
        await queryRunner.dropIndex(metaTransactionv2JobsTable, inputTokenIndex);
        await queryRunner.dropTable(metaTransactionv2JobsTable);
        await queryRunner.query(`DROP EXTENSION "uuid-ossp"`);
    }
}
