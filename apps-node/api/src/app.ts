import * as express from 'express';
import { Server } from 'http';

import { runHttpServiceAsync } from './runners/http_service_runner';
import { HttpServiceConfig, AppDependencies } from './types';

/*
 * starts the app with dependencies injected. This entry-point is used when running a single instance 0x API
 * deployment and in tests. It is not used in production deployments where scaling is required.
 * @param dependencies  all values are optional and will be filled with reasonable defaults.
 * @return the app object
 */
export async function getAppAsync(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
): Promise<{ app: Express.Application; server: Server }> {
    const app = express();
    const { server } = await runHttpServiceAsync(dependencies, config, app);

    server.on('close', async () => {
        // Register a shutdown event listener.
        // TODO: More teardown logic should be added here. For example individual services should be torn down.
    });

    return { app, server };
}
