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
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    public async up(queryRunner: QueryRunner): Promise<void> {}

    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    public async down(queryRunner: QueryRunner): Promise<void> {}
}
