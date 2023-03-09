import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';
import { RfqTables } from '../src/entities/types';

const orderHashIndex = new TableIndex({
    name: `rfqm_v2_transaction_submissions_order_hash_index`,
    columnNames: ['order_hash'],
});

export class AddRfqmV2TransactionSubmissionOrderHashIndex1659632191798 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createIndex(RfqTables.RfqmV2TransactionSubmissions, orderHashIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex(RfqTables.RfqmV2TransactionSubmissions, orderHashIndex);
    }
}
