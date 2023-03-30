import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as path from 'path';

const ONE_MINUTE_MS = 60_000;

// Depends on a `docker-compose.yml` existing in the pool-cache root directory
const dockerComposeFilename = 'docker-compose.yml';

// IP and port must reflect the ones specified in docker-compose.yml
export const DOCKER_ANVIL_URL = 'http://0.0.0.0:0100';
export const DOCKER_REDIS_URL = '//0.0.0.0:0101';

/**
 * Call to shutdown the dependencies spun up by `setupDependencies`.
 * Returns `true` if the teardown is successful.
 */
export type TeardownDependenciesFn = () => boolean;

type Service = 'anvil' | 'redis';

export async function setupDependencies(services: Service[]): Promise<TeardownDependenciesFn> {
    if (services.length === 0) {
        throw new Error('Pick at least one service to start');
    }

    const configFilePath = path.resolve(__dirname, '../../..', dockerComposeFilename);

    /**
     * Only starts the services specified in `services`.
     */
    const dockerCompose = spawn(`docker-compose`, ['-f', configFilePath, 'up', ...services], {});

    await waitForDependencyStartup(dockerCompose, services);

    // Return the function handle which will shutdown the services
    return () => dockerCompose.kill();
}

async function waitForDependencyStartup(logStream: ChildProcessWithoutNullStreams, services: Service[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const startupTimeout = ONE_MINUTE_MS;
        const timeoutHandle = setTimeout(() => {
            reject(new Error(`Timed out waiting for dependency logs\n${JSON.stringify(isServiceStarted)}`));
        }, startupTimeout);

        const startupRegexAnvil = /.*anvil.*Listening on/;
        const startupRegexRedis = /.*redis.*Ready to accept connections/;

        const isServiceStarted: Record<Service, boolean> = {
            anvil: !services.includes('anvil'),
            redis: !services.includes('redis'),
        };

        logStream.on('error', (error) => {
            reject(`Stream closed with error: ${error}`);
        });

        logStream.stdout.on('data', (data) => {
            const log = data.toString();
            if (startupRegexAnvil.test(log)) {
                isServiceStarted.anvil = true;
            }
            if (startupRegexRedis.test(log)) {
                isServiceStarted.redis = true;
            }

            // Once all the services are started, resolve the promise
            if (Object.values(isServiceStarted).every((v) => v)) {
                clearTimeout(timeoutHandle);
                resolve();
            }
        });
    });
}
