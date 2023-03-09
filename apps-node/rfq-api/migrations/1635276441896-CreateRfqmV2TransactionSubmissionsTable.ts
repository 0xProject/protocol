import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

const newTableName = 'rfqm_v2_transaction_submissions';
const transactionSubmissionsTable = new Table({
    name: newTableName,
    columns: [
        { name: 'transaction_hash', type: 'varchar', isPrimary: true },
        { name: 'order_hash', type: 'varchar' },
        { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        { name: 'updated_at', type: 'timestamptz', isNullable: true },
        { name: 'from', type: 'varchar' },
        { name: 'to', type: 'varchar' },
        { name: 'nonce', type: 'bigint' },
        { name: 'gas_price', type: 'numeric', isNullable: true },
        { name: 'max_fee_per_gas', type: 'numeric', isNullable: true },
        { name: 'max_priority_fee_per_gas', type: 'numeric', isNullable: true },
        { name: 'gas_used', type: 'numeric', isNullable: true },
        { name: 'block_mined', type: 'numeric', isNullable: true },
        { name: 'status', type: 'varchar' },
    ],
});

const createdAtIndex = new TableIndex({
    name: `rfqm_v2_transaction_submissions_created_at_index`,
    columnNames: ['created_at'],
});
const statusIndex = new TableIndex({ name: `rfqm_v2_transaction_submissions_status_index`, columnNames: ['status'] });

const foreignKey = new TableForeignKey({
    name: 'rfqm_v2_transaction_submissions_order_hash_foreign_key',
    columnNames: ['order_hash'],
    referencedColumnNames: ['order_hash'],
    referencedTableName: 'rfqm_v2_jobs',
    onDelete: 'RESTRICT',
});

export class CreateRfqmV2TransactionSubmissionsTable1635276441896 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(transactionSubmissionsTable);
        await queryRunner.createIndex(newTableName, createdAtIndex);
        await queryRunner.createIndex(newTableName, statusIndex);
        await queryRunner.createForeignKey(newTableName, foreignKey);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey(newTableName, foreignKey);
        await queryRunner.dropIndex(newTableName, createdAtIndex);
        await queryRunner.dropIndex(newTableName, statusIndex);
        await queryRunner.dropTable(transactionSubmissionsTable);
    }
}
