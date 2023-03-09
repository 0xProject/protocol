import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const newTableName = 'rfq_maker_pairs';
const rfqMakerPairsTable = new Table({
    name: newTableName,
    columns: [
        { name: 'maker_id', type: 'varchar', isNullable: false, isPrimary: true },
        { name: 'chain_id', type: 'integer', isNullable: false, isPrimary: true },
        { name: 'updated_at', type: 'timestamptz', isNullable: true },
        { name: 'pairs', type: 'jsonb', isNullable: false },
    ],
});

export class CreateRfqMakerPairsTable1638230050100 implements MigrationInterface {
    name = 'CreateRfqMakerPairsTable1638230050100';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(rfqMakerPairsTable);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable(newTableName, true, true, true);
    }
}
