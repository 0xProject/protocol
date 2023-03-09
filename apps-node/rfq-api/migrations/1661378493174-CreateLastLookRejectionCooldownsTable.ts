import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const lastLookRejectionCooldownsTable = new Table({
    name: 'last_look_rejection_cooldowns',
    columns: [
        { name: 'maker_id', type: 'varchar', isPrimary: true },
        { name: 'chain_id', type: 'integer', isPrimary: true },
        { name: 'pair_key', type: 'varchar', isPrimary: true },
        { name: 'start_time', type: 'timestamptz', isPrimary: true },
        { name: 'end_time', type: 'timestamptz', isNullable: false },
        { name: 'order_hash', type: 'varchar', isNullable: false },
    ],
});

export class CreateLastLookRejectionCooldownsTable1661378493174 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(lastLookRejectionCooldownsTable);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable(lastLookRejectionCooldownsTable);
    }
}
