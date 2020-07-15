import { Connection } from 'typeorm';

import { getDBConnectionAsync } from '../../src/db_connection';

/**
 * Creates the DB connnection to use in an app
 * synchronizing for tests
 */
export async function getTestDBConnectionAsync(): Promise<Connection> {
    const connection = await getDBConnectionAsync();
    await connection.synchronize(true);
    return connection;
}
