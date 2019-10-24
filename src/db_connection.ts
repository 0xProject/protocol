import * as _ from 'lodash';
import { Connection, createConnection } from 'typeorm';

let connectionIfExists: Connection | undefined;

/**
 * Returns the DB connnection
 */
export function getDBConnection(): Connection {
    if (connectionIfExists === undefined) {
        throw new Error('DB connection not initialized');
    }
    return connectionIfExists;
}

/**
 * Creates the DB connnection to use in an app
 */
export async function initDBConnectionAsync(): Promise<void> {
    if (connectionIfExists !== undefined) {
        throw new Error('DB connection already exists');
    }
    connectionIfExists = await createConnection();
}
