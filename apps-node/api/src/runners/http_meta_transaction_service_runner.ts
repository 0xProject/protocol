import { createDefaultServer } from '@0x/api-utils';
import * as express from 'express';
import * as core from 'express-serve-static-core';
import { Server } from 'http';

import { getDefaultAppDependenciesAsync } from './utils';
import {
    defaultHttpServiceConfig,
    SENTRY_DSN,
    SENTRY_ENVIRONMENT,
    SENTRY_SAMPLE_RATE,
    SENTRY_TRACES_SAMPLE_RATE,
} from '../config';
import { META_TRANSACTION_V1_PATH, META_TRANSACTION_V2_PATH } from '../constants';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { errorHandler } from '../middleware/error_handling';
import { createMetaTransactionV1Router, createMetaTransactionV2Router } from '../routers/meta_transaction_router';
import { SentryInit, SentryOptions } from '../sentry';
import { HttpServiceConfig, AppDependencies } from '../types';
import { providerUtils } from '../utils/provider_utils';

import { destroyCallback } from './utils';

/**
 * This module can be used to run the Meta Transaction HTTP service standalone
 */

process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    if (err) {
        logger.error(err);
    }
});

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(
            defaultHttpServiceConfig.ethereumRpcUrl,
            defaultHttpServiceConfig.rpcRequestTimeout,
            defaultHttpServiceConfig.shouldCompressRequest,
        );
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceConfig);
        await runHttpServiceAsync(dependencies, defaultHttpServiceConfig);
    })().catch((error) => logger.error(error));
}

async function runHttpServiceAsync(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
    _app?: core.Express,
): Promise<Server> {
    const app = _app || express();

    if (dependencies.hasSentry) {
        const options: SentryOptions = {
            app: app,
            dsn: SENTRY_DSN,
            environment: SENTRY_ENVIRONMENT,
            paths: [META_TRANSACTION_V1_PATH, META_TRANSACTION_V2_PATH],
            sampleRate: SENTRY_SAMPLE_RATE,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
        };

        SentryInit(options);
    }

    const server = createDefaultServer(config, app, logger, destroyCallback(dependencies));

    app.get('/', rootHandler);

    if (dependencies.metaTransactionService) {
        app.use(META_TRANSACTION_V1_PATH, createMetaTransactionV1Router(dependencies.metaTransactionService));
        app.use(META_TRANSACTION_V2_PATH, createMetaTransactionV2Router(dependencies.metaTransactionService));
    } else {
        logger.error(`Could not run meta transaction service, exiting`);
        process.exit(1);
    }

    app.use(errorHandler);
    server.listen(config.httpPort);

    return server;
}
