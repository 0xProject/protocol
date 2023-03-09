import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTakerSpecifiedSide1666280503080 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'rfqm_v2_quotes',
            new TableColumn({
                name: 'taker_specified_side',
                type: 'varchar',
                isNullable: true,
            }),
        );
        await queryRunner.addColumn(
            'rfqm_v2_jobs',
            new TableColumn({
                name: 'taker_specified_side',
                type: 'varchar',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfqm_v2_quotes', 'taker_specified_side');
        await queryRunner.dropColumn('rfqm_v2_jobs', 'taker_specified_side');
    }
}
