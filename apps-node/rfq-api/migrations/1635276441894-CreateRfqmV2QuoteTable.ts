import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRfqmV2QuoteTable1635276441894 implements MigrationInterface {
    name = 'CreateRfqmV2QuoteTable1635276441894';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'rfqm_v2_quotes',
                columns: [
                    { name: 'order_hash', type: 'varchar', isPrimary: true },
                    { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
                    { name: 'chain_id', type: 'integer' },
                    { name: 'integrator_id', type: 'varchar', isNullable: true },
                    { name: 'maker_uri', type: 'varchar' },
                    { name: 'fee', type: 'jsonb' },
                    { name: 'order', type: 'jsonb' },
                    { name: 'is_unwrap', type: 'boolean' },
                    { name: 'affiliate_address', type: 'varchar', isNullable: true },
                ],
            }),
        );

        const createdAtIndex = new TableIndex({ name: `rfqm_v2_quotes_created_at_idx`, columnNames: ['created_at'] });

        await queryRunner.createIndex('rfqm_v2_quotes', createdAtIndex);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "rfqm_v2_quotes_created_at_idx"`);
        await queryRunner.query(`DROP TABLE "rfqm_v2_quotes"`);
    }
}
