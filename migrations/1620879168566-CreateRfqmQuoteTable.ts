import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRfqmQuoteTable1620879168566 implements MigrationInterface {
    name = 'CreateRfqmQuoteTable1620879168566';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'rfqm_quotes',
                columns: [
                    { name: 'order_hash', type: 'varchar', isPrimary: true },
                    { name: 'metatransaction_hash', type: 'varchar', isUnique: true, isNullable: true },
                    { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
                    { name: 'chain_id', type: 'integer' },
                    { name: 'integrator_id', type: 'varchar', isNullable: true },
                    { name: 'maker_uri', type: 'varchar' },
                    { name: 'fee', type: 'jsonb', isNullable: true },
                    { name: 'order', type: 'jsonb', isNullable: true },
                ],
            }),
        );

        const indices = ['created_at'].map(
            (col) => new TableIndex({ name: `rfqm_quotes_${col}_idx`, columnNames: [col] }),
        );

        await queryRunner.createIndices('rfqm_quotes', indices);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "rfqm_quotes_created_at_idx"`);
        await queryRunner.query(`DROP TABLE "rfqm_quotes"`);
    }
}
