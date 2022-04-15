import { Connection, createConnection } from 'typeorm';

import { POSTGRES_URI } from './config';
import { createConfig } from './createOrmConfig';

let connection: Connection;

/**
 * Creates the DB connnection to use in an app
 */
export async function getDBConnectionAsync(postgresUri: string = POSTGRES_URI): Promise<Connection> {
    if (!connection) {
        const config = createConfig(postgresUri);
        connection = await createConnection(config);
    }
    return connection;
}
