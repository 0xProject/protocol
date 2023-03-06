/**
 * This runner script creates the bull board to visualize queues.
 */
import { createDefaultServer, HttpServiceConfig } from '@0x/api-utils';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import * as express from 'express';
import Redis from 'ioredis';

import { BackgroundJobBlueprint } from '../../background-jobs/blueprint';
import { BackgroundJobData, BackgroundJobResult } from '../../background-jobs/types';
import { BACKGROUND_JOB_TYPES, defaultHttpServiceConfig, REDIS_BACKGROUND_JOB_URI } from '../../config';
import { logger } from '../../logger';
import { errorHandler } from '../../middleware/error_handling';
import { closeRedisConnectionsAsync } from '../../utils/runner_utils';

const BULLMQ_UI_PORT = 3002;
const connections: Redis[] = [];

process.on('uncaughtException', async (error) => {
    logger.error({ errorMessage: error.message, stack: error.stack }, 'uncaughtException in bull_board_runner');
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    if (reason instanceof Error) {
        logger.error({ errorMessage: reason, stack: reason.stack, promise }, 'unhandledRejection in bull_board_runner');
    } else {
        logger.error('unhandledRejection in scheduler_runner');
    }
    process.exit(1);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Start to shutdown the bull board and redis connections');
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

// Used for shutting down locally
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Start to shutdown the bull board and redis connections');
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

if (require.main === module) {
    // tslint:disable:no-floating-promises
    // Promise rejections would be handled by the unhandledRejection handler
    (async () => {
        // Prepare Redis connections
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const connection = new Redis(REDIS_BACKGROUND_JOB_URI!);
        connections.push(connection);

        // Prepare queues to visualize in bull-board
        const queues: Queue[] = [];
        const backgroundJobTypes: string[] = (BACKGROUND_JOB_TYPES || '').split(',');
        for (const jobType of backgroundJobTypes) {
            logger.info(`Setting up queue for ${jobType}`);
            const { queueName } = (await import(`../../background-jobs/${jobType}`)).default as BackgroundJobBlueprint<
                BackgroundJobData,
                BackgroundJobResult
            >;
            queues.push(new Queue(queueName, { connection }));
        }

        logger.info('Setting up bullmq UI board');
        setUpBullBoard(queues);
    })();
}

/**
 * Set up UI for BullMQ to visualize the status of the queue.
 *
 * @param queues Queues to create visualization for.
 */
function setUpBullBoard(queues: Queue[]): void {
    const serverAdapter = new ExpressAdapter();
    createBullBoard({ queues: queues.map((queue) => new BullMQAdapter(queue)), serverAdapter });
    const app = express();

    const config: HttpServiceConfig = {
        ...defaultHttpServiceConfig,
        httpPort: BULLMQ_UI_PORT,
        healthcheckHttpPort: BULLMQ_UI_PORT,
    };

    app.use(errorHandler);
    serverAdapter.setBasePath('/admin/queues');
    app.use('/admin/queues', serverAdapter.getRouter());

    const server = createDefaultServer(config, app, logger, async () => {
        // nothing to perform when shutting down the server
    });
    server.listen(config.httpPort);
}
