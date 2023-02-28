import { getAppAsync } from './app';
import { getDefaultAppDependenciesAsync } from './runners/utils';
import { defaultHttpServiceConfig } from './config';
import { logger } from './logger';
import { providerUtils } from './utils/provider_utils';

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(
            defaultHttpServiceConfig.ethereumRpcUrl,
            defaultHttpServiceConfig.rpcRequestTimeout,
            defaultHttpServiceConfig.shouldCompressRequest,
        );
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceConfig);
        await getAppAsync(dependencies, defaultHttpServiceConfig);
    })().catch((err) => logger.error(err.stack));
}
process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    if (err) {
        logger.error(err);
    }
});
