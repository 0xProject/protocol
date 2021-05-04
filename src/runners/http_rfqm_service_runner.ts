/**
 * This module can be used to run the RFQM HTTP service standalone
 */
import { createDefaultServer } from '@0x/api-utils';
import { ProtocolFeeUtils, QuoteRequestor } from '@0x/asset-swapper';
import { NULL_ADDRESS } from '@0x/utils';
import Axios, { AxiosRequestConfig } from 'axios';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Agent as HttpAgent, Server } from 'http';
import { Agent as HttpsAgent } from 'https';

import { getContractAddressesForNetworkOrThrowAsync } from '../app';
import {
    CHAIN_ID,
    defaultHttpServiceWithRateLimiterConfig,
    ETH_GAS_STATION_API_URL,
    META_TX_WORKER_REGISTRY,
    RFQM_MAKER_ASSET_OFFERINGS,
    RFQT_MAKER_ASSET_OFFERINGS,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
    SWAP_QUOTER_OPTS,
} from '../config';
import { KEEP_ALIVE_TTL, PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS, RFQM_PATH } from '../constants';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createRfqmRouter } from '../routers/rfqm_router';
import { RfqmService } from '../services/rfqm_service';
import { HttpServiceConfig } from '../types';
import { ConfigManager } from '../utils/config_manager';
import { providerUtils } from '../utils/provider_utils';

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
        const provider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const config: HttpServiceConfig = {
            ...defaultHttpServiceWithRateLimiterConfig,
            // Mesh is not required for Rfqm Service
            meshWebsocketUri: undefined,
            meshHttpUri: undefined,
        };

        const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, CHAIN_ID);
        const quoteRequestor = new QuoteRequestor(
            RFQT_MAKER_ASSET_OFFERINGS,
            RFQM_MAKER_ASSET_OFFERINGS,
            Axios.create(getAxiosRequestConfig()),
            undefined, // No Alt RFQM offerings at the moment
            logger.warn.bind(logger),
            logger.info.bind(logger),
            SWAP_QUOTER_OPTS.expiryBufferMs,
        );

        const protocolFeeUtils = ProtocolFeeUtils.getInstance(
            PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
            ETH_GAS_STATION_API_URL,
        );
        const metaTxWorkerRegistry = META_TX_WORKER_REGISTRY || NULL_ADDRESS;
        const rfqmService = new RfqmService(quoteRequestor, protocolFeeUtils, contractAddresses, metaTxWorkerRegistry);

        const configManager = new ConfigManager();

        await runHttpRfqmServiceAsync(rfqmService, configManager, config);
    })().catch((error) => logger.error(error.stack));
}

/**
 * Creates the Axios Request Config
 */
function getAxiosRequestConfig(): AxiosRequestConfig {
    const axiosRequestConfig: AxiosRequestConfig = {
        httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
        httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
    };
    if (RFQ_PROXY_ADDRESS !== undefined && RFQ_PROXY_PORT !== undefined) {
        axiosRequestConfig.proxy = {
            host: RFQ_PROXY_ADDRESS,
            port: RFQ_PROXY_PORT,
        };
    }

    return axiosRequestConfig;
}

/**
 * Runs the Rfqm Service in isolation
 */
export async function runHttpRfqmServiceAsync(
    rfqmService: RfqmService,
    configManager: ConfigManager,
    config: HttpServiceConfig,
    _app?: core.Express,
): Promise<{ app: express.Application; server: Server }> {
    const app = _app || express();
    app.use(addressNormalizer);
    const server = createDefaultServer(config, app, logger, async () => {
        /* TODO - clean up DB connection when present */
    });

    if (rfqmService && configManager) {
        app.use(RFQM_PATH, createRfqmRouter(rfqmService, configManager));
    } else {
        logger.error(`Could not run rfqm service, exiting`);
        process.exit(1);
    }

    app.use(errorHandler);

    server.listen(config.httpPort);
    return { app, server };
}
