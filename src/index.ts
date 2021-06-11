import { getAppAsync, getDefaultAppDependenciesAsync } from './app';
import { defaultHttpServiceWithRateLimiterConfig } from './config';
import { logger } from './logger';
import { providerUtils } from './utils/provider_utils';

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceWithRateLimiterConfig);
        await getAppAsync(dependencies, defaultHttpServiceWithRateLimiterConfig);
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
