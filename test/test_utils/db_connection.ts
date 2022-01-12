import { Connection } from 'typeorm';

import { getDBConnectionAsync } from '../../src/db_connection';

/**
 * Get the DB connection and initialize it by installing extension and synchronize schemas
 * @returns db connection
 */
export async function initDBConnectionAsync(): Promise<Connection> {
    const connection = await getDBConnectionAsync();
    await connection.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`); // used by view `rfq_maker_pairs_update_time_hashes`
    await connection.synchronize(true);
    return connection;
}
