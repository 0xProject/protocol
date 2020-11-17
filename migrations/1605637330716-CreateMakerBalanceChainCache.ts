import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const makerBalanceChainCacheTable = new Table({
    name: 'maker_balance_chain_cache',
    columns: [
        { name: 'token_address', type: 'varchar', isPrimary: true },
        { name: 'maker_address', type: 'varchar', isPrimary: true },
        { name: 'time_first_seen', type: 'timestamptz' },
        // fields are nullable for the job that adds new rows upon
        // discovery of a new maker address
        { name: 'balance', type: 'varchar', isNullable: true },
        { name: 'time_of_sample', type: 'timestamptz', isNullable: true },
    ],
});

export class CreateMakerBalanceChainCache1605637330716 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        queryRunner.createTable(makerBalanceChainCacheTable);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        queryRunner.dropTable(makerBalanceChainCacheTable);
    }
}
