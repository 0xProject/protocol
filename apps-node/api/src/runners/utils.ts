import { Web3Wrapper } from '@0x/dev-utils';
import { S3 } from 'aws-sdk';
import axios from 'axios';
import { Kafka } from 'kafkajs';

import {
    artifacts,
    AssetSwapperContractAddresses,
    ChainId,
    ContractAddresses,
    ERC20BridgeSamplerContract,
    getContractAddressesForChainOrThrow,
    Orderbook,
    SupportedProvider,
} from '../asset-swapper';
import {
    CHAIN_ID,
    ORDER_WATCHER_KAFKA_TOPIC,
    RFQ_API_URL,
    SENTRY_ENABLED,
    SLIPPAGE_MODEL_S3_API_VERSION,
    WEBSOCKET_ORDER_UPDATES_PATH,
} from '../config';
import { getDBConnection } from '../db_connection';
import { logger } from '../logger';
import { MetaTransactionService } from '../services/meta_transaction_service';
import { OrderBookService } from '../services/orderbook_service';
import { PostgresRfqtFirmQuoteValidator } from '../services/postgres_rfqt_firm_quote_validator';
import { SwapService } from '../services/swap_service';
import { HttpServiceConfig, AppDependencies } from '../types';
import { AssetSwapperOrderbook } from '../orderbook/asset_swapper_orderbook';
import { NoOpOrderbook } from '../orderbook/no_op_orderbook';
import { RfqClient } from '../utils/rfq_client';
import { RfqDynamicBlacklist } from '../utils/rfq_dyanmic_blacklist';
import { S3Client } from '../utils/s3_client';
import { SlippageModelManager } from '../utils/slippage_model_manager';

/**
 * Pass this callback into the default server to ensure all dependencies shut down correctly
 * @param dependencies A set of app dependencies
 */
export function destroyCallback(dependencies: AppDependencies): () => Promise<void> {
    return async () => {
        if (dependencies.connection) {
            await dependencies.connection.close();
        }
    };
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
async function getContractAddressesForNetworkOrThrowAsync(
    provider: SupportedProvider,
    chainId: ChainId,
): Promise<AssetSwapperContractAddresses> {
    // If global exists, use that
    if (contractAddresses_) {
        return contractAddresses_;
    }
    let contractAddresses = getContractAddressesForChainOrThrow(chainId);
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
 * Create and initialize a SlippageModelManager instance
 */
async function createAndInitializeSlippageModelManagerAsync(s3Client: S3Client): Promise<SlippageModelManager> {
    const slippageModelManager = new SlippageModelManager(s3Client);
    await slippageModelManager.initializeAsync();
    return slippageModelManager;
}

function createOrderbook(orderBookService: OrderBookService | undefined): Orderbook {
    if (orderBookService === undefined) {
        return new NoOpOrderbook();
    }
    return new AssetSwapperOrderbook(orderBookService);
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
    const connection = await getDBConnection();

    let kafkaClient: Kafka | undefined;
    if (config.kafkaBrokers !== undefined) {
        kafkaClient = new Kafka({
            clientId: 'sra-client',
            brokers: config.kafkaBrokers,
        });
    } else {
        logger.warn(`skipping kafka client creation because no kafkaBrokers were passed in`);
    }

    const orderBookService = OrderBookService.create(connection);

    if (orderBookService == undefined) {
        logger.warn('Order book service is disabled');
    }

    let swapService: SwapService | undefined;
    let metaTransactionService: MetaTransactionService | undefined;
    try {
        const rfqClient: RfqClient = new RfqClient(RFQ_API_URL, axios);

        const s3Client: S3Client = new S3Client(
            new S3({
                apiVersion: SLIPPAGE_MODEL_S3_API_VERSION,
            }),
        );
        const slippageModelManager = await createAndInitializeSlippageModelManagerAsync(s3Client);
        swapService = new SwapService(
            createOrderbook(orderBookService),
            provider,
            contractAddresses,
            rfqClient,
            PostgresRfqtFirmQuoteValidator.create(connection),
            RfqDynamicBlacklist.create(connection),
            slippageModelManager,
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

/*
/**
 * Instantiates a MetaTransactionService
 */
function createMetaTxnServiceFromSwapService(
    swapService: SwapService,
    contractAddresses: ContractAddresses,
): MetaTransactionService {
    return new MetaTransactionService(swapService, contractAddresses);
}
