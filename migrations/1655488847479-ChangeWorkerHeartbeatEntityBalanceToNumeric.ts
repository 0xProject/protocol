import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Update the Rfqm Worker Heartbeats table so that the `balance` column
 * type is `numeric` instead of `bigint`. `bigint` can only store values
 * up to about 10e18, so storing a value of 10 ETH in WEI fails.
 */
export class ChangeWorkerHeartbeatEntityBalanceToNumeric1655488847479 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn(
            'rfqm_worker_heartbeats',
            'balance',
            new TableColumn({ name: 'balance', type: 'numeric' }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn(
            'rfqm_worker_heartbeats',
            'balance',
            new TableColumn({ name: 'balance', type: 'bigint' }),
        );
    }
}
