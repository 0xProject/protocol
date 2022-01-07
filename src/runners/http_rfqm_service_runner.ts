/**
 * This module can be used to run the RFQM HTTP service standalone
 */
import { createDefaultServer } from '@0x/api-utils';
import { ProtocolFeeUtils } from '@0x/asset-swapper';
import { SupportedProvider } from '@0x/dev-utils';
import { PrivateKeyWalletSubprovider } from '@0x/subproviders';
import Axios, { AxiosRequestConfig } from 'axios';
import { providers, Wallet } from 'ethers';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Agent as HttpAgent, Server } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Kafka, Producer as KafkaProducer } from 'kafkajs';
import * as redis from 'redis';
import * as rax from 'retry-axios';
import { Producer } from 'sqs-producer';
import { Connection } from 'typeorm';

import { getContractAddressesForNetworkOrThrowAsync } from '../app';
import {
    CHAIN_ID,
    defaultHttpServiceWithRateLimiterConfig,
    ETHEREUM_RPC_URL,
    ETH_GAS_STATION_API_URL,
    KAFKA_BROKERS,
    META_TX_WORKER_MNEMONIC,
    META_TX_WORKER_REGISTRY,
    REDIS_URI,
    RFQM_META_TX_SQS_URL,
    RFQM_WORKER_INDEX,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
    SWAP_QUOTER_OPTS,
} from '../config';
import {
    KEEP_ALIVE_TTL,
    PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
    RFQM_PATH,
    RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS,
    RFQ_MAKER_PATH,
} from '../constants';
import { getDBConnectionAsync } from '../db_connection';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createRfqmRouter } from '../routers/rfqm_router';
import { createRfqMakerRouter } from '../routers/rfq_maker_router';
import { RfqmService } from '../services/rfqm_service';
import { RfqMakerService } from '../services/rfq_maker_service';
import { HttpServiceConfig } from '../types';
import { BalanceChecker } from '../utils/balance_checker';
import { CacheClient } from '../utils/cache_client';
import { ConfigManager } from '../utils/config_manager';
import { METRICS_PROXY } from '../utils/metrics_service';
import { PairsManager } from '../utils/pairs_manager';
import { providerUtils } from '../utils/provider_utils';
import { QuoteRequestorManager } from '../utils/quote_requestor_manager';
import { QuoteServerClient } from '../utils/quote_server_client';
import { RfqmDbUtils } from '../utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { RfqMakerDbUtils } from '../utils/rfq_maker_db_utils';

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
        };
        const connection = await getDBConnectionAsync();
        const rfqmDbUtils = new RfqmDbUtils(connection);
        const rfqMakerDbUtils = new RfqMakerDbUtils(connection);
        const configManager = new ConfigManager();

        const rfqmService = await buildRfqmServiceAsync(
            /* asWorker = */ false,
            rfqmDbUtils,
            rfqMakerDbUtils,
            configManager,
        );
        const rfqMakerService = buildRfqMakerService(rfqMakerDbUtils, configManager);
        await runHttpRfqmServiceAsync(rfqmService, rfqMakerService, configManager, config, connection);
    })().catch((error) => logger.error(error.stack));
}

/**
 * Builds an instance of RfqmService
 */
export async function buildRfqmServiceAsync(
    asWorker: boolean,
    rfqmDbUtils: RfqmDbUtils,
    rfqMakerDbUtils: RfqMakerDbUtils,
    configManager: ConfigManager = new ConfigManager(),
): Promise<RfqmService> {
    let provider: SupportedProvider;

    // ether.js Provider coexists with web3 provider during migration away from 0x/web3-wrapper.
    const ethersProvider = new providers.JsonRpcProvider(ETHEREUM_RPC_URL[0], CHAIN_ID);
    let ethersWallet: Wallet | undefined;

    const rpcProvider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
    if (asWorker) {
        if (META_TX_WORKER_MNEMONIC === undefined) {
            throw new Error(`META_TX_WORKER_MNEMONIC must be defined to run RFQM service as a worker`);
        }
        if (RFQM_WORKER_INDEX === undefined) {
            throw new Error(`RFQM_WORKER_INDEX must be defined to run RFQM service as a worker`);
        }
        const workerPrivateKey = RfqBlockchainUtils.getPrivateKeyFromIndexAndPhrase(
            META_TX_WORKER_MNEMONIC,
            RFQM_WORKER_INDEX,
        );

        // TODO (rhinodavid): Remove once migration to ethers.js is complete
        const privateWalletSubprovider = new PrivateKeyWalletSubprovider(workerPrivateKey);
        provider = RfqBlockchainUtils.createPrivateKeyProvider(rpcProvider, privateWalletSubprovider);

        ethersWallet = Wallet.fromMnemonic(META_TX_WORKER_MNEMONIC, `m/44'/60'/0'/0/${RFQM_WORKER_INDEX!}`);
        ethersWallet = ethersWallet.connect(ethersProvider);
    } else {
        provider = rpcProvider;
    }

    const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
    await pairsManager.initializeAsync();
    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, CHAIN_ID);
    const axiosInstance = Axios.create(getAxiosRequestConfig());
    axiosInstance.defaults.raxConfig = {
        retry: 3, // Retry on 429, 500, etc.
        noResponseRetries: 0, // Do not retry on timeouts
        instance: axiosInstance,
    };
    rax.attach(axiosInstance);

    // NOTE: QuoteRequestor is only used for RfqOrder
    const quoteRequestorManager = new QuoteRequestorManager(
        pairsManager,
        {}, // No RFQT offerings
        axiosInstance,
        undefined, // No Alt RFQM offerings at the moment
        logger.warn.bind(logger),
        logger.info.bind(logger),
        SWAP_QUOTER_OPTS.expiryBufferMs,
        METRICS_PROXY,
    );

    const protocolFeeUtils = ProtocolFeeUtils.getInstance(
        PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
        ETH_GAS_STATION_API_URL,
    );
    if (META_TX_WORKER_REGISTRY === undefined) {
        throw new Error('META_TX_WORKER_REGISTRY must be set!');
    }

    const balanceChecker = new BalanceChecker(provider);
    const rfqBlockchainUtils = new RfqBlockchainUtils(
        provider,
        contractAddresses.exchangeProxy,
        balanceChecker,
        ethersProvider,
        ethersWallet,
    );

    const sqsProducer = Producer.create({
        queueUrl: RFQM_META_TX_SQS_URL,
    });

    const quoteServerClient = new QuoteServerClient(axiosInstance);

    const redisClient = redis.createClient({ url: REDIS_URI });
    const cacheClient = new CacheClient(redisClient);

    const kafkaProducer = getKafkaProducer();

    return new RfqmService(
        quoteRequestorManager,
        protocolFeeUtils,
        contractAddresses,
        META_TX_WORKER_REGISTRY!,
        rfqBlockchainUtils,
        rfqmDbUtils,
        sqsProducer,
        quoteServerClient,
        RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS,
        cacheClient,
        pairsManager,
        kafkaProducer,
    );
}

/**
 * Builds an instance of RfqMakerService
 */
export function buildRfqMakerService(dbUtils: RfqMakerDbUtils, configManager: ConfigManager): RfqMakerService {
    return new RfqMakerService(dbUtils, configManager);
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
    rfqMakerService: RfqMakerService,
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
        app.use(RFQ_MAKER_PATH, createRfqMakerRouter(rfqMakerService));
    } else {
        logger.error(`Could not run rfqm service, exiting`);
        process.exit(1);
    }

    app.use(errorHandler);

    server.listen(config.httpPort);
    return { app, server };
}

/**
 * Initialize a kafka producer if KAFKA_BROKERS is set
 */
function getKafkaProducer(): KafkaProducer | undefined {
    let kafkaProducer: KafkaProducer | undefined;
    if (KAFKA_BROKERS !== undefined) {
        const kafka = new Kafka({
            clientId: '0x-api',
            brokers: KAFKA_BROKERS,
        });

        kafkaProducer = kafka.producer();
        kafkaProducer.connect();
    }
    return kafkaProducer;
}
