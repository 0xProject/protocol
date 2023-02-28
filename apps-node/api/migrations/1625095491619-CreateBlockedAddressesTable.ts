import { MigrationInterface, QueryRunner, Table, TableCheck, TableIndex } from 'typeorm';

const blockedAddressesTable = new Table({
    name: 'blocked_addresses',
    columns: [
        { name: 'address', type: 'varchar', isPrimary: true },
        { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        { name: 'parent', type: 'varchar', isNullable: true },
        { name: 'last_seen_nonce', type: 'bigint', isNullable: true },
        { name: 'ignore', type: 'boolean', default: false },
    ],
});
const createdAtIndex = new TableIndex({ name: `blocked_addresses_created_at_index`, columnNames: ['created_at'] });
const ignoreIndex = new TableIndex({ name: `blocked_addresses_ignore_index`, columnNames: ['ignore'] });

export class CreateBlockedAddressesTable1625095491619 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const driver = queryRunner.connection.driver;
        const addressLowerCaseConstraint = new TableCheck({
            columnNames: ['address'],
            expression: `${driver.escape('address')} = lower(${driver.escape('address')})`,
        });
        await queryRunner.createTable(blockedAddressesTable);
        await queryRunner.createIndex('blocked_addresses', createdAtIndex);
        await queryRunner.createIndex('blocked_addresses', ignoreIndex);
        await queryRunner.createCheckConstraint('blocked_addresses', addressLowerCaseConstraint);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const driver = queryRunner.connection.driver;
        const addressLowerCaseConstraint = new TableCheck({
            columnNames: ['address'],
            expression: `${driver.escape('address')} = lower(${driver.escape('address')})`,
        });
        await queryRunner.dropIndex('blocked_addresses', createdAtIndex);
        await queryRunner.dropIndex('blocked_addresses', ignoreIndex);
        await queryRunner.dropCheckConstraint('blocked_addresses', addressLowerCaseConstraint);
        await queryRunner.dropTable(blockedAddressesTable);
    }
}
