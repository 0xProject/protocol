import { Connection, createConnection } from 'typeorm';

import { config } from './ormconfig';

/**
 * Creates the DB connnection to use in an app
 */
export async function getDBConnectionAsync(): Promise<Connection> {
    return createConnection(config);
}
