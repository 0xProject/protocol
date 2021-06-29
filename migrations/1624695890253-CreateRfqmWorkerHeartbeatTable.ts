import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const TABLE_NAME = 'rfqm_worker_heartbeats';

const rfqmWorkerHeartbeatTable = new Table({
    name: TABLE_NAME,
    columns: [
        { name: 'address', type: 'varchar', isPrimary: true },
        { name: 'timestamp', type: 'timestamptz', default: 'NOW()' },
        { name: 'balance', type: 'bigint' },
        { name: 'index', type: 'int' },
    ],
});

export class CreateRfqmWorkerHeartbeatTable1624695890253 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(rfqmWorkerHeartbeatTable);
        // Update timestamp on every write
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_timestamp_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.timestamp = now();
                    RETURN NEW;
                END;
            $$ language 'plpgsql';
        `);
        await queryRunner.query(`
            CREATE TRIGGER update_heartbeat_timestamp BEFORE UPDATE ON ${TABLE_NAME} FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_heartbeat_timestamp on ${TABLE_NAME}`);
        await queryRunner.dropTable(rfqmWorkerHeartbeatTable);
    }
}
