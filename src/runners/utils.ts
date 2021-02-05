import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { createServer, Server } from 'http';

import { AppDependencies } from '../app';
import { HEALTHCHECK_PATH } from '../constants';
import { logger } from '../logger';
import { requestLogger } from '../middleware/request_logger';
import { createHealthcheckRouter } from '../routers/healthcheck_router';
import { HealthcheckService } from '../services/healthcheck_service';
import { HttpServiceConfig } from '../types';

/**
 * creates the NodeJS http server with graceful shutdowns, healthchecks,
 * configured header timeouts and other sane defaults set.
 */
export function createDefaultServer(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
    app: core.Express,
): Server {
    app.use(requestLogger());
    app.use(cors());
    app.use(bodyParser.json());

    const server = createServer(app);
    server.keepAliveTimeout = config.httpKeepAliveTimeout;
    server.headersTimeout = config.httpHeadersTimeout;
    const healthcheckService = new HealthcheckService();

    server.on('close', () => {
        logger.info('http server shutdown');
    });
    server.on('listening', () => {
        logger.info(`server listening on ${config.httpPort}`);
        healthcheckService.setHealth(true);
    });

    const shutdownFunc = (sig: string) => {
        logger.info(`received: ${sig}, shutting down server`);
        healthcheckService.setHealth(false);
        server.close(async err => {
            // TODO(kimpers): do we need to handle anything here?
            // if (dependencies.meshClient) {
            // dependencies.meshClient.destroy();
            // }
            if (dependencies.connection) {
                await dependencies.connection.close();
            }
            if (!server.listening) {
                process.exit(0);
            }
            if (err) {
                logger.error(`server closed with an error: ${err}, exiting`);
                process.exit(1);
            }
            logger.info('successful shutdown, exiting');
            process.exit(0);
        });
    };
    if (config.httpPort === config.healthcheckHttpPort) {
        app.use(HEALTHCHECK_PATH, createHealthcheckRouter(healthcheckService));
    } else {
        // if we don't want to expose the /healthz healthcheck service route to
        // the public, we serve it from a different port. Serving it through a
        // different express app also removes the unnecessary request logging.
        const healthcheckApp = express();
        healthcheckApp.use(HEALTHCHECK_PATH, createHealthcheckRouter(healthcheckService));
        healthcheckApp.listen(config.healthcheckHttpPort, () => {
            logger.info(`healthcheckApp listening on ${config.healthcheckHttpPort}`);
        });
    }
    process.on('SIGINT', shutdownFunc);
    process.on('SIGTERM', shutdownFunc);
    process.on('SIGQUIT', shutdownFunc);
    return server;
}
