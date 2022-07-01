import { Worker } from 'bullmq';
import Redis from 'ioredis';

import { logger } from '../logger';

/**
 * Close redis connections.
 *
 * @param redisConnections Redis connections to close.
 */
export async function closeRedisConnectionsAsync(redisConnections: Redis[]): Promise<void> {
    for (const connection of redisConnections) {
        try {
            await connection.quit();
        } catch (error) {
            logger.error({ errorMessage: error.message, stack: error.stack }, 'Faied to shutdown redis connection');
        }
    }
}

/**
 * Close bullmq workers.
 *
 * @param workers Bullmq workers to close.
 */
export async function closeWorkersAsync(workers: Worker[]): Promise<void> {
    for (const worker of workers) {
        try {
            await worker.close();
        } catch (error) {
            logger.error(
                { errorMessage: error.message, stack: error.stack },
                `Failed to shutdown worker ${worker.name}`,
            );
        }
    }
}
