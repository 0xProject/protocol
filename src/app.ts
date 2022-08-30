import { Web3Wrapper } from '@0x/dev-utils';
import { S3 } from 'aws-sdk';
import axios from 'axios';
import * as express from 'express';
import { Server } from 'http';
import { Kafka } from 'kafkajs';
import { Connection } from 'typeorm';

import {
    artifacts,
    AssetSwapperContractAddresses,
    ChainId,
    ContractAddresses,
    ERC20BridgeSamplerContract,
    getContractAddressesForChainOrThrow,
    SupportedProvider,
} from './asset-swapper';
import {
    CHAIN_ID,
    ORDER_WATCHER_KAFKA_TOPIC,
    RFQT_TX_ORIGIN_BLACKLIST,
    RFQ_API_URL,
    SENTRY_ENABLED,
    SLIPPAGE_MODEL_S3_API_VERSION,
    WEBSOCKET_ORDER_UPDATES_PATH,
} from './config';
import { RFQ_DYNAMIC_BLACKLIST_TTL, RFQ_FIRM_QUOTE_CACHE_EXPIRY } from './constants';
import { getDBConnectionAsync } from './db_connection';
import { MakerBalanceChainCacheEntity } from './entities/MakerBalanceChainCacheEntity';
import { logger } from './logger';
import { runHttpServiceAsync } from './runners/http_service_runner';
import { MetaTransactionService } from './services/meta_transaction_service';
import { OrderBookService } from './services/orderbook_service';
import { PostgresRfqtFirmQuoteValidator } from './services/postgres_rfqt_firm_quote_validator';
import { SwapService } from './services/swap_service';
import { HttpServiceConfig, WebsocketSRAOpts } from './types';
import { AssetSwapperOrderbook } from './utils/asset_swapper_orderbook';
import { ConfigManager } from './utils/config_manager';
import { OrderWatcher } from './utils/order_watcher';
import { PairsManager } from './utils/pairs_manager';
import { RfqClient } from './utils/rfq_client';
import { RfqDynamicBlacklist } from './utils/rfq_dyanmic_blacklist';
import { RfqMakerDbUtils } from './utils/rfq_maker_db_utils';
import { S3Client } from './utils/s3_client';
import { SlippageModelManager } from './utils/slippage_model_manager';

export interface AppDependencies {
    contractAddresses: ContractAddresses;
    connection: Connection;
    kafkaClient?: Kafka;
    orderBookService: OrderBookService;
    swapService?: SwapService;
    metaTransactionService?: MetaTransactionService;
    provider: SupportedProvider;
    websocketOpts: Partial<WebsocketSRAOpts>;
    hasSentry?: boolean;
}

async function deploySamplerContractAsync(
    provider: SupportedProvider,
    chainId: ChainId,
): Promise<ERC20BridgeSamplerContract> {
    const web3Wrapper = new Web3Wrapper(provider);
    const _chainId = await web3Wrapper.getChainIdAsync();
    if (_chainId !== chainId) {
        throw new Error(`Incorrect Chain Id: ${_chainId}`);
    }
    const [account] = await web3Wrapper.getAvailableAddressesAsync();
    try {
        const sampler = await ERC20BridgeSamplerContract.deployFrom0xArtifactAsync(
            artifacts.ERC20BridgeSampler,
            provider,
            { from: account },
            {},
        );
        logger.info(`Deployed ERC20BridgeSamplerContract on network ${chainId}: ${sampler.address}`);
        return sampler;
    } catch (err) {
        logger.error(`Failed to deploy ERC20BridgeSamplerContract on network ${chainId}: ${err}`);
        throw err;
    }
}

let contractAddresses_: AssetSwapperContractAddresses | undefined;

/**
 * Determines the contract addresses needed for the network. For testing (ganache)
 * required contracts are deployed
 * @param provider provider to the network, used for ganache deployment
 * @param chainId the network chain id
 */
export async function getContractAddressesForNetworkOrThrowAsync(
    provider: SupportedProvider,
    chainId: ChainId,
): Promise<AssetSwapperContractAddresses> {
    // If global exists, use that
    if (contractAddresses_) {
        return contractAddresses_;
    }
    let contractAddresses = getContractAddressesForChainOrThrow(chainId.toString() as any);
    // In a testnet where the environment does not support overrides
    // so we deploy the latest sampler
    if (chainId === ChainId.Ganache) {
        const sampler = await deploySamplerContractAsync(provider, chainId);
        contractAddresses = { ...contractAddresses, erc20BridgeSampler: sampler.address };
    }
    // Set the global cached contractAddresses_
    contractAddresses_ = contractAddresses;
    return contractAddresses_;
}

/**
 * Create and initialize a PairsManager instance
 */
async function createAndInitializePairsManagerAsync(
    configManager: ConfigManager,
    rfqMakerDbUtils: RfqMakerDbUtils,
): Promise<PairsManager | undefined> {
    const chainId = configManager.getChainId();
    if (chainId !== ChainId.Mainnet && chainId !== ChainId.Ropsten) {
        return undefined;
    }

    const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
    await pairsManager.initializeAsync();
    return pairsManager;
}

/**
 * Create and initialize a SlippageModelManager instance
 */
async function createAndInitializeSlippageModelManagerAsync(s3Client: S3Client): Promise<SlippageModelManager> {
    const slippageModelManager = new SlippageModelManager(s3Client);
    await slippageModelManager.initializeAsync();
    return slippageModelManager;
}

/**
 * Instantiates dependencies required to run the app. Uses default settings based on config
 * @param config should the ethereum RPC URL
 */
export async function getDefaultAppDependenciesAsync(
    provider: SupportedProvider,
    config: HttpServiceConfig,
): Promise<AppDependencies> {
    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, CHAIN_ID);
    const connection = await getDBConnectionAsync();

    let kafkaClient: Kafka | undefined;
    if (config.kafkaBrokers !== undefined) {
        kafkaClient = new Kafka({
            clientId: 'sra-client',
            brokers: config.kafkaBrokers,
        });
    } else {
        logger.warn(`skipping kafka client creation because no kafkaBrokers were passed in`);
    }

    const orderBookService = new OrderBookService(connection, new OrderWatcher());

    const rfqtFirmQuoteValidator = new PostgresRfqtFirmQuoteValidator(
        connection.getRepository(MakerBalanceChainCacheEntity),
        RFQ_FIRM_QUOTE_CACHE_EXPIRY,
    );

    let swapService: SwapService | undefined;
    let metaTransactionService: MetaTransactionService | undefined;
    try {
        const rfqDynamicBlacklist = new RfqDynamicBlacklist(
            connection,
            RFQT_TX_ORIGIN_BLACKLIST,
            RFQ_DYNAMIC_BLACKLIST_TTL,
        );

        const configManager: ConfigManager = new ConfigManager();
        const rfqMakerDbUtils: RfqMakerDbUtils = new RfqMakerDbUtils(connection);
        const rfqClient: RfqClient = new RfqClient(RFQ_API_URL, axios);
        const pairsManager = await createAndInitializePairsManagerAsync(configManager, rfqMakerDbUtils);

        const s3Client: S3Client = new S3Client(
            new S3({
                apiVersion: SLIPPAGE_MODEL_S3_API_VERSION,
            }),
        );
        const slippageModelManager = await createAndInitializeSlippageModelManagerAsync(s3Client);
        swapService = new SwapService(
            new AssetSwapperOrderbook(orderBookService),
            provider,
            contractAddresses,
            rfqtFirmQuoteValidator,
            rfqDynamicBlacklist,
            pairsManager,
            slippageModelManager,
            rfqClient,
        );
        metaTransactionService = createMetaTxnServiceFromSwapService(swapService, contractAddresses);
    } catch (err) {
        logger.error(err.stack);
    }

    const websocketOpts = { path: WEBSOCKET_ORDER_UPDATES_PATH, kafkaTopic: ORDER_WATCHER_KAFKA_TOPIC };
    const hasSentry: boolean = SENTRY_ENABLED;

    if (hasSentry) {
        logger.info('sentry enabled');
    } else {
        logger.info('sentry disabled');
    }

    return {
        contractAddresses,
        connection,
        kafkaClient,
        orderBookService,
        swapService,
        metaTransactionService,
        provider,
        websocketOpts,
        hasSentry,
    };
}

/**
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

/**
 * Instantiates a MetaTransactionService
 */
export function createMetaTxnServiceFromSwapService(
    swapService: SwapService,
    contractAddresses: ContractAddresses,
): MetaTransactionService {
    return new MetaTransactionService(swapService, contractAddresses);
}
