import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// The block number in which the signed order became invalid. A null value means that the order is valid.
const InvalidSinceColumn = new TableColumn({
    name: 'invalid_since',
    type: 'bigint',
    isNullable: true,
});

export class AddInvalidSinceColumn1627477365530 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('signed_orders_v4', InvalidSinceColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('signed_orders_v4', InvalidSinceColumn);
    }
}
