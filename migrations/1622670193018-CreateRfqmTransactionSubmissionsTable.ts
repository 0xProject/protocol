import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

const newTableName = 'rfqm_transaction_submissions';
const transactionSubmissionsTable = new Table({
    name: newTableName,
    columns: [
        { name: 'transaction_hash', type: 'varchar', isPrimary: true },
        { name: 'order_hash', type: 'varchar' },
        { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        { name: 'updated_at', type: 'timestamptz', isNullable: true },

        // important transaction properties
        { name: 'from', type: 'varchar', isNullable: true },
        { name: 'to', type: 'varchar', isNullable: true },
        { name: 'nonce', type: 'bigint', isNullable: true },
        { name: 'gas_price', type: 'numeric', isNullable: true },
        { name: 'gas_used', type: 'numeric', isNullable: true },
        { name: 'block_mined', type: 'numeric', isNullable: true },

        { name: 'status', type: 'varchar' },
        { name: 'status_reason', type: 'varchar', isNullable: true },
        { name: 'metadata', type: 'jsonb', isNullable: true },
    ],
});

const createdAtIndex = new TableIndex({
    name: `rfqm_transaction_submissions_created_at_index`,
    columnNames: ['created_at'],
});
const statusIndex = new TableIndex({ name: `rfqm_transaction_submissions_status_index`, columnNames: ['status'] });

const foreignKey = new TableForeignKey({
    name: 'rfqm_transaction_submissions_order_hash_foreign_key',
    columnNames: ['order_hash'],
    referencedColumnNames: ['order_hash'],
    referencedTableName: 'rfqm_jobs',
    onDelete: 'RESTRICT',
});

export class CreateRfqmTransactionSubmissionsTable1622670193018 implements MigrationInterface {
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
