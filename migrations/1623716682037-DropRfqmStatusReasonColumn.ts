import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class DropRfqmStatusReasonColumn1623716682037 implements MigrationInterface {
    name = 'DropRfqmStatusReasonColumn1623716682037';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfqm_jobs', 'status_reason');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'rfqm_jobs',
            new TableColumn({
                isNullable: true,
                name: 'status_reason',
                type: 'varchar',
            }),
        );
    }
}
