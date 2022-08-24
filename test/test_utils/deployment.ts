import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as path from 'path';

import { ONE_MINUTE_MS } from '../../src/constants';

import { initDbDataSourceAsync } from './initDbDataSourceAsync';

// depends on a `docker-compose.yml` existing in the api root directory
const dockerComposeFilename = 'docker-compose.yml';

/**
 * Returned by `setupDependenciesAsync`. Call to shutdown the
 * dependencies spun up by `setupDependenciesAsync`. Returns
 * `true` if the teardown is successful.
 */
export type TeardownDependenciesFunctionHandle = () => boolean;

type Service = 'sqs' | 'postgres' | 'redis' | 'ganache';

/**
 * Sets up 0x-api's dependencies
 *
 * @param services An array of services to start
 * @returns A function handle which will tear down the dependencies when called
 */
export async function setupDependenciesAsync(services: Service[]): Promise<TeardownDependenciesFunctionHandle> {
    if (services.length === 0) {
        throw new Error('Pick at least one service to start');
    }

    const configFilePath = path.resolve(__dirname, '../../', dockerComposeFilename);

    /**
     * Only starts the services specified in `services`.
     */
    const up = spawn(`docker-compose`, ['-f', configFilePath, 'up', ...services], {});

    await waitForDependencyStartupAsync(up, services);

    if (services.includes('postgres')) {
        await confirmPostgresConnectivityAsync();
    }
    // Return the function handle which will shutdown the services
    return function closeFunction(): boolean {
        const wasSuccessfulKill = up.kill();
        return wasSuccessfulKill;
    };
}

/**
 * Monitor the logs being emitted from the docker containers to detect
 * when services have started up. Postgres startup is managed with
 * `confirmPostgresConnectivityAsync`
 */
async function waitForDependencyStartupAsync(
    logStream: ChildProcessWithoutNullStreams,
    services: Service[],
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const startupTimeout = ONE_MINUTE_MS * 3; // tslint:disable-line custom-no-magic-numbers
        const timeoutHandle = setTimeout(() => {
            reject(new Error(`Timed out waiting for dependency logs\n${JSON.stringify(isServiceStarted)}`));
        }, startupTimeout);

        const startupRegexSqs = /.*sqs.*listening on port \d{4}/;
        const startupRegexRedis = /.*redis.*Ready to accept connections/;
        const startupRegexGananche = /.*ganache.*Listening on 0.0.0.0:\d{4}/;

        const isServiceStarted: Record<Service, boolean> = {
            sqs: !services.includes('sqs'),
            postgres: true, // managed by confirmPostgresConnectivityAsync
            redis: !services.includes('redis'),
            ganache: !services.includes('ganache'),
        };

        logStream.on('error', (error) => {
            reject(`Stream closed with error: ${error}`);
        });

        logStream.stdout.on('data', (data) => {
            const log = data.toString();
            if (startupRegexRedis.test(log)) {
                isServiceStarted.redis = true;
            }
            if (startupRegexSqs.test(log)) {
                isServiceStarted.sqs = true;
            }
            if (startupRegexGananche.test(log)) {
                isServiceStarted.ganache = true;
            }

            // Once all the services are started, resolve the promise
            if (Object.values(isServiceStarted).every((v) => v)) {
                // logStream.stdout.removeAllListeners('data');
                // logStream.removeAllListeners('error');
                clearTimeout(timeoutHandle);
                resolve();
            }
        });
    });
}

async function confirmPostgresConnectivityAsync(maxTries: number = 5): Promise<void> {
    try {
        await Promise.all([
            // delay before retrying
            new Promise<void>((resolve) => setTimeout(resolve, 2000)), // tslint:disable-line:custom-no-magic-numbers
            async () => {
                await initDbDataSourceAsync();
            },
        ]);
        return;
    } catch (e) {
        if (maxTries > 0) {
            await confirmPostgresConnectivityAsync(maxTries - 1);
        } else {
            throw e;
        }
    }
}
