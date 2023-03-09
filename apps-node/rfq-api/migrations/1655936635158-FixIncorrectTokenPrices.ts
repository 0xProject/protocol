import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * This script was originally used to fix incorrect token prices. The content has been removed as
 * we only need to run it one time in production, while the script cause problems when running migration
 * from an empty DB. The migration file is kept as a placeholder as the original code had been executed
 * in production DB.
 *
 * For the original script, see PR https://github.com/0xProject/0x-rfq-api/pull/272
 *
 */
export class FixIncorrectTokenPrices1655936635158 implements MigrationInterface {
    public async up(_queryRunner: QueryRunner): Promise<void> {
        // no-op
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
