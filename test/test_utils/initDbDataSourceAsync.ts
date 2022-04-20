import { DataSource } from 'typeorm';

import { getDbDataSourceAsync } from '../../src/getDbDataSourceAsync';

/**
 * Get the DB connection and initialize it by installing extension and synchronize schemas
 * @returns db connection
 */
export async function initDbDataSourceAsync(port: number = 5432): Promise<DataSource> {
    const dataSource = await getDbDataSourceAsync(`postgres://api:api@localhost:${port}/api`);
    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`); // used by view `rfq_maker_pairs_update_time_hashes`
    await dataSource.synchronize(true);
    return dataSource;
}
