import { Connection, createConnection } from 'typeorm';
import { getOrmConfig } from './ormconfig';

let connection: Connection | undefined;

export async function getDBConnection(): Promise<Connection | undefined> {
    if (connection !== undefined) {
        return connection;
    }

    const ormConfig = getOrmConfig();
    if (ormConfig === undefined) {
        return undefined;
    }
    connection = await createConnection(ormConfig);
    return connection;
}

export async function getDBConnectionOrThrow(): Promise<Connection> {
    const connection = await getDBConnection();
    if (connection === undefined) {
        throw new Error('Could not get a DB connection');
    }
    return connection;
}
