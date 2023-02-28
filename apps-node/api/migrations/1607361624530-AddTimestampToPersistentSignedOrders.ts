import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTimestampToPersistentSignedOrders1607361624530 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'persistent_signed_orders',
            new TableColumn({
                name: 'created_at',
                type: 'TIMESTAMP WITH TIME ZONE NOT NULL',
                default: 'now()',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('persistent_signed_orders', 'created_at');
    }
}
