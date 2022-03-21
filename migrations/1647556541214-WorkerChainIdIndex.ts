import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const oldChainIdColumn = new TableColumn({
    name: 'chain_id',
    type: 'integer',
    isNullable: true,
    default: null,
});

const newChainIdColumn = new TableColumn({
    name: 'chain_id',
    type: 'integer',
    isPrimary: true,
});

/**
 * The heartbeat table has the address column as `isPrimary`, so if the same
 * address is active on two chains and talking to the same database the workers
 * are overwriting each other's heartbeats.
 *
 * This updates the chain ID to be part of the primary key.
 *
 * Also, the databases have been updated and the `chain_id` column is populated,
 * so we can make it non-nullable.
 */
export class WorkerChainIdIndex1647556541214 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.changeColumn('rfqm_worker_heartbeats', 'chain_id', newChainIdColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.changeColumn('rfqm_worker_heartbeats', 'chain_id', oldChainIdColumn);
    }
}
