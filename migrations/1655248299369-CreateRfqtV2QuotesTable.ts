import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRfqtV2QuotesTable1655248299369 implements MigrationInterface {
    name = 'CreateRfqtV2QuotesTable1655248299369';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'rfqt_v2_quotes',
                columns: [
                    { name: 'order_hash', type: 'varchar', isPrimary: true },
                    { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
                    { name: 'chain_id', type: 'integer' },
                    { name: 'integrator_id', type: 'varchar' },
                    { name: 'maker_id', type: 'varchar' },
                    { name: 'maker_uri', type: 'varchar' },
                    { name: 'fee', type: 'jsonb' },
                    { name: 'order', type: 'jsonb' },
                    { name: 'affiliate_address', type: 'varchar', isNullable: true },
                ],
            }),
        );

        const createdAtIndex = new TableIndex({ name: `rfqt_v2_quotes_created_at_idx`, columnNames: ['created_at'] });

        await queryRunner.createIndex('rfqt_v2_quotes', createdAtIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "rfqt_v2_quotes_created_at_idx"`);
        await queryRunner.query(`DROP TABLE "rfqt_v2_quotes"`);
    }
}
