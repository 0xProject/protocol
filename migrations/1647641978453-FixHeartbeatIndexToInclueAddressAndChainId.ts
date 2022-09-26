import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_NAME = 'rfqm_worker_heartbeats';

/**
 * Manually remove the old primary key and create a new one with both
 * 'address' and 'chainId'.
 *
 * The previous migration added `chain_id` as part of the primary key,
 * but after some investigation it seems this does not happen if the
 * table already has data in it.
 */
export class FixHeartbeatIndexToInclueAddressAndChainId1647641978453 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.clearTable(TABLE_NAME);
        await queryRunner.dropPrimaryKey(TABLE_NAME);
        await queryRunner.createPrimaryKey(TABLE_NAME, ['address', 'chain_id']);
    }

    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async down(_queryRunner: QueryRunner): Promise<void> {
        // a no-op since the table state is ill-defined from the previous
        // migration depending on whether or not there was data in the table
    }
}
