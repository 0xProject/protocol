import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const columns = ['max_fee_per_gas', 'max_priority_fee_per_gas'].map(
    (name) =>
        new TableColumn({
            name,
            type: 'numeric',
            isNullable: true,
        }),
);

export class AddEip1559Columns1632854586018 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await Promise.all(columns.map((column) => queryRunner.addColumn('rfqm_transaction_submissions', column)));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await Promise.all(columns.map((column) => queryRunner.dropColumn('rfqm_transaction_submissions', column)));
    }
}
