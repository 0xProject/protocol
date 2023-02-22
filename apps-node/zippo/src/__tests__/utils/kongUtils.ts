import { env } from '../../env';
import { exec } from 'child_process';
import util from 'util';
import waitOn from 'wait-on';

const promisifyExec = util.promisify(exec);

export async function ensureKongIsRunning() {
    await promisifyExec('docker-compose up -d 2>&1 > /dev/null');

    const postgresUrl = new URL(env.DATABASE_URL);

    await waitOn({
        resources: ['tcp:' + postgresUrl.hostname + ':' + (postgresUrl.port || '5432'), env.KONG_ADMIN_URL + '/status'],
        timeout: 30000,
    });
}

export function resetKongConfiguration() {
    return promisifyExec('yarn kong:dev:configure 2>&1 > /dev/null');
}
