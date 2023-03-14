import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';
const takerAddress = new TableColumn({
    name: 'taker_address',
    type: 'varchar',
    isNullable: true,
});

const takerToken = new TableColumn({
    name: 'taker_token',
    type: 'varchar',
    isNullable: true,
});
const takerAddressIndex = new TableIndex({
    name: `rfqm_v2_jobs_taker_address_index`,
    columnNames: ['taker_address'],
});
const takerTokenIndex = new TableIndex({
    name: `rfqm_v2_jobs_taker_token_index`,
    columnNames: ['taker_token'],
});
const workerAddressIndex = new TableIndex({
    name: `rfqm_v2_jobs_worker_address_index`,
    columnNames: ['worker_address'],
});

/**
 * Add taker address and taker token columns to rfqm_v2_jobs
 * Also add indexes for taker address, taker token, and worker address
 */
export class AddTakerTokenAndTakerAddressToRfqmV2Job1678763623741 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('rfqm_v2_jobs', [takerAddress, takerToken]);
        await queryRunner.createIndices('rfqm_v2_jobs', [takerAddressIndex, takerTokenIndex, workerAddressIndex]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndices('rfqm_v2_jobs', [takerAddressIndex, takerTokenIndex, workerAddressIndex]);
        await queryRunner.dropColumns('rfqm_v2_jobs', [takerAddress, takerToken]);
    }
}
