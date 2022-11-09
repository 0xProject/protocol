import { Connection, ConnectionOptions, createConnection } from 'typeorm';

import * as config from './ormconfig';

let connection: Connection;

/**
 * Creates the DB connnection to use in an app
 */
export async function getDBConnectionAsync(): Promise<Connection> {
    if (!connection) {
        connection = await createConnection(config as ConnectionOptions);
    }
    return connection;
}
