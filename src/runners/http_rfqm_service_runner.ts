/**
 * This module can be used to run the RFQM HTTP service standalone
 */
import { createDefaultServer } from '@0x/api-utils';
import { ProtocolFeeUtils, QuoteRequestor } from '@0x/asset-swapper';
import Axios, { AxiosRequestConfig } from 'axios';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Agent as HttpAgent, Server } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Producer } from 'sqs-producer';
import { Connection } from 'typeorm';

import { getContractAddressesForNetworkOrThrowAsync } from '../app';
import {
    CHAIN_ID,
    defaultHttpServiceWithRateLimiterConfig,
    ETH_GAS_STATION_API_URL,
    META_TX_WORKER_REGISTRY,
    RFQM_MAKER_ASSET_OFFERINGS,
    RFQM_META_TX_SQS_URL,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
    SWAP_QUOTER_OPTS,
} from '../config';
import { KEEP_ALIVE_TTL, PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS, RFQM_PATH } from '../constants';
import { getDBConnectionAsync } from '../db_connection';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createRfqmRouter } from '../routers/rfqm_router';
import { RfqmService } from '../services/rfqm_service';
import { HttpServiceConfig } from '../types';
import { ConfigManager } from '../utils/config_manager';
import { providerUtils } from '../utils/provider_utils';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';

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
        // Build dependencies
        const config: HttpServiceConfig = {
            ...defaultHttpServiceWithRateLimiterConfig,
            // Mesh is not required for Rfqm Service
            meshWebsocketUri: undefined,
            meshHttpUri: undefined,
        };
        const connection = await getDBConnectionAsync();
        const rfqmService = await buildRfqmServiceAsync(connection);
        const configManager = new ConfigManager();

        await runHttpRfqmServiceAsync(rfqmService, configManager, config, connection);
    })().catch((error) => logger.error(error.stack));
}

/**
 * Builds an instance of RfqmService
 */
export async function buildRfqmServiceAsync(connection: Connection): Promise<RfqmService> {
    const provider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);

    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, CHAIN_ID);
    const quoteRequestor = new QuoteRequestor(
        {}, // No RFQT offerings
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
    if (META_TX_WORKER_REGISTRY === undefined) {
        throw new Error('META_TX_WORKER_REGISTRY must be set!');
    }

    const rfqBlockchainUtils = new RfqBlockchainUtils(provider, contractAddresses.exchangeProxy);

    const sqsProducer = Producer.create({
        queueUrl: RFQM_META_TX_SQS_URL,
    });

    return new RfqmService(
        quoteRequestor,
        protocolFeeUtils,
        contractAddresses,
        META_TX_WORKER_REGISTRY!,
        rfqBlockchainUtils,
        connection,
        sqsProducer,
    );
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
    connection: Connection,
    _app?: core.Express,
): Promise<{ app: express.Application; server: Server }> {
    const app = _app || express();
    app.use(addressNormalizer);
    app.get('/', rootHandler);
    const server = createDefaultServer(config, app, logger, async () => {
        await connection.close();
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
