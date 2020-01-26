import { getAppAsync, getDefaultAppDependenciesAsync } from './app';
import * as config from './config';
import { logger } from './logger';
import { providerUtils } from './utils/provider_utils';

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(config.ETHEREUM_RPC_URL);
        const dependencies = await getDefaultAppDependenciesAsync(provider, config);
        await getAppAsync(dependencies, config);
    })().catch(err => logger.error(err));
}
process.on('uncaughtException', err => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    if (err) {
        logger.error(err);
    }
});
