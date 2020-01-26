import { Connection, createConnection } from 'typeorm';

import { config } from './ormconfig';

const connection = createConnection(config);
/**
 * Creates the DB connnection to use in an app
 */
export async function getDBConnectionAsync(): Promise<Connection> {
    return connection;
}
