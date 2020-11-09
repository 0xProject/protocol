import { OrderEventEndState } from '@0x/mesh-rpc-client';
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const OrderEventEndStateStrings = Object.keys(OrderEventEndState)
    .filter(x => isNaN(parseInt(x, 10)))
    .map(s => s.toUpperCase());

export class CreatePersistentSignedOrder1604516429383 implements MigrationInterface {
    public indices = ['maker_address', 'maker_asset_data', 'taker_asset_data', 'fee_recipient_address'].map(
        colName => new TableIndex({ name: `persistent_signed_orders_${colName}`, columnNames: [colName] }),
    );

    // tslint:disable-next-line
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "persistent_signed_orders_state_enum" AS ENUM(\'${OrderEventEndStateStrings.join(
                `\',\'`,
            )}\');`,
        );
        await queryRunner.createTable(
            new Table({
                name: 'persistent_signed_orders',
                columns: [
                    { name: 'hash', type: 'varchar', isPrimary: true },
                    { name: 'sender_address', type: 'varchar' },
                    { name: 'maker_address', type: 'varchar' },
                    { name: 'taker_address', type: 'varchar' },
                    { name: 'maker_asset_data', type: 'varchar' },
                    { name: 'taker_asset_data', type: 'varchar' },
                    { name: 'exchange_address', type: 'varchar' },
                    { name: 'fee_recipient_address', type: 'varchar' },
                    { name: 'expiration_time_seconds', type: 'varchar' },
                    { name: 'maker_fee', type: 'varchar' },
                    { name: 'taker_fee', type: 'varchar' },
                    { name: 'maker_asset_amount', type: 'varchar' },
                    { name: 'taker_asset_amount', type: 'varchar' },
                    { name: 'salt', type: 'varchar' },
                    { name: 'signature', type: 'varchar' },
                    { name: 'remaining_fillable_taker_asset_amount', type: 'varchar' },
                    { name: 'maker_fee_asset_data', type: 'varchar' },
                    { name: 'taker_fee_asset_data', type: 'varchar' },
                    {
                        name: 'state',
                        type: 'enum',
                        enum: OrderEventEndStateStrings,
                        default: `'${OrderEventEndState.Added}'`,
                    },
                ],
            }),
            true,
        );
        await queryRunner.createIndices('persistent_signed_orders', this.indices);
    }

    // tslint:disable-next-line
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('persistent_signed_orders', true, true, true);
        await queryRunner.query(`DROP TYPE "persistent_signed_orders_state_enum"`);
    }
}
