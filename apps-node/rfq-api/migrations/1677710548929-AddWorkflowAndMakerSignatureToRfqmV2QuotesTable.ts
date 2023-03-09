import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const workflow = new TableColumn({
    name: 'workflow',
    type: 'varchar',
    default: "'rfqm'", // default for existing RFQm quotes/jobs
});

const makerSignature = new TableColumn({
    name: 'maker_signature',
    type: 'jsonb',
    isNullable: true,
});

/**
 * Adds `workflow` and optional `makerSignature` to `rfqm_v2_quotes` table.
 * Also adds `workflow` to `rfqm_v2_jobs` table.
 */
export class AddWorkflowAndMakerSignatureToRfqmV2Tables1677710548929 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('rfqm_v2_quotes', [workflow, makerSignature]);
        await queryRunner.addColumn('rfqm_v2_jobs', workflow);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns('rfqm_v2_quotes', [workflow, makerSignature]);
        await queryRunner.dropColumn('rfqm_v2_jobs', workflow);
    }
}
