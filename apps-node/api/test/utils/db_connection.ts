import { Connection } from 'typeorm';

import { getDBConnectionOrThrow } from '../../src/db_connection';

/**
 * Get the DB connection and initialize it by installing extension and synchronize schemas
 * @returns db connection
 */
export async function initDBConnectionAsync(): Promise<Connection> {
    const connection = await getDBConnectionOrThrow();

    await connection.synchronize(true);
    return connection;
}
