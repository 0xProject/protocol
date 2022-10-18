import {
    artifacts,
    AssetSwapperContractAddresses,
    ERC20BridgeSamplerContract,
    ProtocolFeeUtils,
    SupportedProvider,
} from '@0x/asset-swapper';
import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { PrivateKeyWalletSubprovider } from '@0x/subproviders';
import { getTokenMetadataIfExists } from '@0x/token-metadata';
import { Web3Wrapper } from '@0x/web3-wrapper';
import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { providers, Wallet } from 'ethers';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Kafka, Producer as KafkaProducer } from 'kafkajs';
import * as redis from 'redis';
import { Producer } from 'sqs-producer';

import {
    ChainConfiguration,
    ChainConfigurations,
    KAFKA_BROKERS,
    META_TX_WORKER_MNEMONIC,
    REDIS_URI,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
    ZERO_EX_API_KEY,
} from '../config';
import {
    DEFAULT_RFQM_WORKER_TRANSACTION_WATCHER_SLEEP_TIME_MS,
    KEEP_ALIVE_TTL,
    PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
} from '../constants';
import { logger } from '../logger';
import { RfqmFeeService } from '../services/rfqm_fee_service';
import { RfqmService } from '../services/rfqm_service';
import { RfqMakerBalanceCacheService } from '../services/rfq_maker_balance_cache_service';
import { WorkerService } from '../services/WorkerService';

import { BalanceChecker } from './balance_checker';
import { CacheClient } from './cache_client';
import { ConfigManager } from './config_manager';
import { GasOracle } from './GasOracle';
import { GasStationAttendant } from './GasStationAttendant';
import { GasStationAttendantEthereum } from './GasStationAttendantEthereum';
import { GasStationAttendantPolygon } from './GasStationAttendantPolygon';
import { GasStationAttendantRopsten } from './GasStationAttendantRopsten';
import { providerUtils } from './provider_utils';
import { QuoteServerClient } from './quote_server_client';
import { RfqmDbUtils } from './rfqm_db_utils';
import { RfqBlockchainUtils } from './rfq_blockchain_utils';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';
import { RfqMakerManager } from './rfq_maker_manager';
import { TokenPriceOracle } from './TokenPriceOracle';
import { ZeroExApiClient } from './ZeroExApiClient';

export type RfqmServices = Map<number, RfqmService>;

const DEFAULT_AXIOS_TIMEOUT = 600; // ms

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
        // tslint:disable-next-line: no-floating-promises
        kafkaProducer.connect();
    }
    return kafkaProducer;
}

/**
 * Creates the default Axios Request Config
 */
export function getAxiosRequestConfig(timeout: number = DEFAULT_AXIOS_TIMEOUT): AxiosRequestConfig {
    return {
        httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
        httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
        timeout,
    };
}

/**
 * Creates the Axios Request Config with egress proxy
 */
export function getAxiosRequestConfigWithProxy(): AxiosRequestConfig {
    const axiosRequestConfig: AxiosRequestConfig = getAxiosRequestConfig();
    if (RFQ_PROXY_ADDRESS !== undefined && RFQ_PROXY_PORT !== undefined) {
        axiosRequestConfig.proxy = {
            host: RFQ_PROXY_ADDRESS,
            port: RFQ_PROXY_PORT,
        };
    }

    return axiosRequestConfig;
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

/**
 * Determines the contract addresses needed for the network. For testing (ganache)
 * required contracts are deployed
 * @param provider provider to the network, used for ganache deployment
 * @param chainConfiguration used for getting chainId and exchangeProxyContractAddressOverride
 */
export async function getContractAddressesForNetworkOrThrowAsync(
    provider: SupportedProvider,
    chainConfiguration: Pick<ChainConfiguration, 'chainId' | 'exchangeProxyContractAddressOverride'>,
): Promise<AssetSwapperContractAddresses> {
    const { chainId, exchangeProxyContractAddressOverride } = chainConfiguration;
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contractAddresses = getContractAddressesForChainOrThrow(chainId.toString() as any);
    // In a testnet where the environment does not support overrides
    // so we deploy the latest sampler
    if (chainId === ChainId.Ganache) {
        const sampler = await deploySamplerContractAsync(provider, chainId);
        contractAddresses = { ...contractAddresses, erc20BridgeSampler: sampler.address };
    }
    // If 0x Exchange Proxy contract address override is defined in the chain config
    // we use address instead of the one provided from `@0x/contract-addresses`
    if (exchangeProxyContractAddressOverride) {
        contractAddresses = { ...contractAddresses, exchangeProxy: exchangeProxyContractAddressOverride };
    }
    return contractAddresses;
}

function getGasStationAttendant(
    chain: ChainConfiguration,
    axiosInstance: AxiosInstance,
    protocolFeeUtils: ProtocolFeeUtils,
): GasStationAttendant {
    let gasOracle: GasOracle;
    // tslint:disable: custom-no-magic-numbers
    switch (chain.chainId) {
        case /* ethereum */ 1:
            gasOracle = GasOracle.create(chain.gasStationUrl, axiosInstance);
            return new GasStationAttendantEthereum(gasOracle);
        case /* ropsten */ 3:
            return new GasStationAttendantRopsten(protocolFeeUtils);
        case /* ganache */ 1337:
            gasOracle = GasOracle.create(chain.gasStationUrl, axiosInstance);
            return new GasStationAttendantEthereum(gasOracle);
        case /* polygon */ 137:
            return new GasStationAttendantPolygon(protocolFeeUtils);
        case /* mumbai */ 80001:
            return new GasStationAttendantPolygon(protocolFeeUtils);
        default:
            throw new Error(`Gas station attendant not configured for chain: ${chain.name}`);
    }
    // tslint:enable: custom-no-magic-numbers
}

/**
 * Builds a single instance of RfqmService
 */
export async function buildRfqmServiceAsync(
    rfqmDbUtils: RfqmDbUtils,
    rfqMakerManager: RfqMakerManager,
    tokenPriceOracle: TokenPriceOracle,
    configManager: ConfigManager,
    chain: ChainConfiguration,
): Promise<RfqmService> {
    // ether.js Provider coexists with web3 provider during migration away from 0x/web3-wrapper.
    const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chain.chainId);

    const rpcProvider = providerUtils.createWeb3Provider(chain.rpcUrl);
    const provider: SupportedProvider = rpcProvider;

    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, chain);
    const axiosInstance = Axios.create(getAxiosRequestConfigWithProxy());

    const protocolFeeUtils = ProtocolFeeUtils.getInstance(
        PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
        chain.gasStationUrl,
    );

    const balanceChecker = new BalanceChecker(provider);
    const rfqBlockchainUtils = new RfqBlockchainUtils(
        provider,
        contractAddresses.exchangeProxy,
        balanceChecker,
        ethersProvider,
    );

    const sqsProducer = Producer.create({
        queueUrl: chain.sqsUrl,
    });

    const quoteServerClient = new QuoteServerClient(axiosInstance);

    const redisClient: redis.RedisClientType = redis.createClient({ url: REDIS_URI });
    await redisClient.connect();
    const cacheClient = new CacheClient(redisClient);

    const kafkaProducer = getKafkaProducer();

    const gasStationAttendant = getGasStationAttendant(chain, axiosInstance, protocolFeeUtils);

    const feeTokenMetadata = getTokenMetadataIfExists(contractAddresses.etherToken, chain.chainId);
    if (feeTokenMetadata === undefined) {
        throw new Error(`Fee token ${contractAddresses.etherToken} on chain ${chain.chainId} could not be found!`);
    }

    const zeroExApiClient = new ZeroExApiClient(Axios.create(), ZERO_EX_API_KEY, chain);

    const rfqmFeeService = new RfqmFeeService(
        chain.chainId,
        feeTokenMetadata,
        configManager,
        gasStationAttendant,
        tokenPriceOracle,
        zeroExApiClient,
    );

    const rfqMakerBalanceCacheService = new RfqMakerBalanceCacheService(cacheClient, rfqBlockchainUtils);

    return new RfqmService(
        chain.chainId,
        rfqmFeeService,
        chain.feeModelVersion || 0,
        contractAddresses,
        chain.registryAddress,
        rfqBlockchainUtils,
        rfqmDbUtils,
        sqsProducer,
        quoteServerClient,
        cacheClient,
        rfqMakerBalanceCacheService,
        rfqMakerManager,
        kafkaProducer,
        chain.quoteReportTopic,
    );
}

/**
 * Builds a single instance of the WorkerService
 */
export async function buildWorkerServiceAsync(
    rfqmDbUtils: RfqmDbUtils,
    rfqMakerManager: RfqMakerManager,
    chain: ChainConfiguration,
    workerIndex: number,
): Promise<WorkerService> {
    let provider: SupportedProvider;

    // ether.js Provider coexists with web3 provider during migration away from 0x/web3-wrapper.
    const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chain.chainId);
    let ethersWallet: Wallet | undefined;

    const rpcProvider = providerUtils.createWeb3Provider(chain.rpcUrl);
    if (META_TX_WORKER_MNEMONIC === undefined) {
        throw new Error(`META_TX_WORKER_MNEMONIC must be defined to run RFQM service as a worker`);
    }
    const workerPrivateKey = RfqBlockchainUtils.getPrivateKeyFromIndexAndPhrase(META_TX_WORKER_MNEMONIC, workerIndex);

    // TODO (rhinodavid): Remove once migration to ethers.js is complete
    const privateWalletSubprovider = new PrivateKeyWalletSubprovider(workerPrivateKey);
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line prefer-const
    provider = RfqBlockchainUtils.createPrivateKeyProvider(rpcProvider, privateWalletSubprovider);

    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ethersWallet = Wallet.fromMnemonic(META_TX_WORKER_MNEMONIC, `m/44'/60'/0'/0/${workerIndex!}`);
    ethersWallet = ethersWallet.connect(ethersProvider);

    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, chain);
    const axiosInstance = Axios.create(getAxiosRequestConfigWithProxy());

    const protocolFeeUtils = ProtocolFeeUtils.getInstance(
        PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
        chain.gasStationUrl,
    );

    const balanceChecker = new BalanceChecker(provider);
    const rfqBlockchainUtils = new RfqBlockchainUtils(
        provider,
        contractAddresses.exchangeProxy,
        balanceChecker,
        ethersProvider,
        ethersWallet,
    );

    const quoteServerClient = new QuoteServerClient(axiosInstance);

    const redisClient: redis.RedisClientType = redis.createClient({ url: REDIS_URI });
    await redisClient.connect();
    const cacheClient = new CacheClient(redisClient);

    const gasStationAttendant = getGasStationAttendant(chain, axiosInstance, protocolFeeUtils);

    const feeTokenMetadata = getTokenMetadataIfExists(contractAddresses.etherToken, chain.chainId);
    if (feeTokenMetadata === undefined) {
        throw new Error(`Fee token ${contractAddresses.etherToken} on chain ${chain.chainId} could not be found!`);
    }

    const rfqMakerBalanceCacheService = new RfqMakerBalanceCacheService(cacheClient, rfqBlockchainUtils);

    return new WorkerService(
        chain.chainId,
        gasStationAttendant,
        chain.registryAddress,
        rfqBlockchainUtils,
        rfqmDbUtils,
        quoteServerClient,
        chain.rfqmWorkerTransactionWatcherSleepTimeMs || DEFAULT_RFQM_WORKER_TRANSACTION_WATCHER_SLEEP_TIME_MS,
        cacheClient,
        rfqMakerBalanceCacheService,
        rfqMakerManager,
        chain.initialMaxPriorityFeePerGasGwei,
        chain.enableAccessList,
    );
}

/**
 * Builds an instance of maker balance cache service.
 * Intended to be used by maker balance cache background jobs.
 */
export async function buildRfqMakerBalanceCacheServiceAsync(
    chain: ChainConfiguration,
): Promise<RfqMakerBalanceCacheService> {
    const provider = providerUtils.createWeb3Provider(chain.rpcUrl);
    const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chain.chainId);
    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, chain);
    const balanceChecker = new BalanceChecker(provider);
    const rfqBlockchainUtils = new RfqBlockchainUtils(
        provider,
        contractAddresses.exchangeProxy,
        balanceChecker,
        ethersProvider,
    );

    const redisClient: redis.RedisClientType = redis.createClient({ url: REDIS_URI });
    await redisClient.connect();
    const cacheClient = new CacheClient(redisClient);

    return new RfqMakerBalanceCacheService(cacheClient, rfqBlockchainUtils);
}

/**
 * Creates an RFQM Service for each chain present in `ChainConfigurations`.
 *
 * Intended for use by the top-level runners.
 */
export async function buildRfqmServicesAsync(
    asWorker: boolean,
    rfqmDbUtils: RfqmDbUtils,
    rfqMakerDbUtils: RfqMakerDbUtils,
    chainConfigurations: ChainConfigurations,
    tokenPriceOracle: TokenPriceOracle,
    configManager: ConfigManager = new ConfigManager(),
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    _workerIndex: number = 0,
): Promise<RfqmServices> {
    const services = await Promise.all(
        chainConfigurations.map(async (chain) => {
            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, chain.chainId);
            await rfqMakerManager.initializeAsync();
            return buildRfqmServiceAsync(rfqmDbUtils, rfqMakerManager, tokenPriceOracle, configManager, chain);
        }),
    );
    return new Map(services.map((s, i) => [chainConfigurations[i].chainId, s]));
}
