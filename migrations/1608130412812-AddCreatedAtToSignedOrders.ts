import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCreatedAtToSignedOrders1608130412812 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'signed_orders',
            new TableColumn({
                name: 'created_at',
                type: 'TIMESTAMP WITH TIME ZONE NOT NULL',
                default: 'now()',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('signed_orders', 'created_at');
    }
}
