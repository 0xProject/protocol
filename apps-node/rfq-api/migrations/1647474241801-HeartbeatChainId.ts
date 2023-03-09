import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const chainIdColumn = new TableColumn({
    name: 'chain_id',
    type: 'integer',
    isNullable: true,
    default: null,
});

export class HeartbeatChainId1647474241801 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('rfqm_worker_heartbeats', chainIdColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfqm_worker_heartbeats', chainIdColumn);
    }
}
