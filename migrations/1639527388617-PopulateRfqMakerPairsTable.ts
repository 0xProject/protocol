import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * This migration was originally used to populate `rfq_maker_pairs` table as we move pairs info from
 * config files to DB. But the code logic does not work any more as we move more maker config info,
 * such as rfqmUri and rfqtUri, to DB.
 * So we removed the migration logic but keep the migration file as a placeholder as the original code
 * had been executed in DB prod.
 */
export class PopulateRfqMakerPairsTable1639527388617 implements MigrationInterface {
    name = 'PopulateRfqMakerPairsTable1639527388617';

    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    public async up(queryRunner: QueryRunner): Promise<void> {}

    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    public async down(queryRunner: QueryRunner): Promise<void> {}
}
