import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

const targetTable = 'rfqm_jobs';
const isCompletedColumn = new TableColumn({
    name: 'is_completed',
    type: 'boolean',
    default: false,
    isNullable: false,
});
const workerAddressColumn = new TableColumn({
    name: 'worker_address',
    type: 'varchar',
    isNullable: true,
});
const lastLookResultColumn = new TableColumn({
    name: 'last_look_result',
    type: 'boolean',
    isNullable: true,
});

const isCompletedIndex = new TableIndex({ name: `rfqm_jobs_is_completed_index`, columnNames: ['is_completed'] });

export class AddWorkerAddressLastLookResultToRfqmJobs1623452505377 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(targetTable, isCompletedColumn);
        await queryRunner.addColumn(targetTable, workerAddressColumn);
        await queryRunner.addColumn(targetTable, lastLookResultColumn);
        await queryRunner.createIndex(targetTable, isCompletedIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex(targetTable, isCompletedIndex);
        await queryRunner.dropColumn(targetTable, isCompletedColumn);
        await queryRunner.dropColumn(targetTable, workerAddressColumn);
        await queryRunner.dropColumn(targetTable, lastLookResultColumn);
    }
}
