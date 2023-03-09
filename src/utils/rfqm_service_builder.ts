import { ChainId, ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { PrivateKeyWalletSubprovider, SupportedProvider } from '@0x/subproviders';
import { getTokenMetadataIfExists } from '@0x/token-metadata';
import { Web3Wrapper } from '@0x/web3-wrapper';
import Axios, { AxiosRequestConfig } from 'axios';
import { providers, Wallet } from 'ethers';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import Redis from 'ioredis';
import { Producer } from 'sqs-producer';

import {
    ChainConfiguration,
    ChainConfigurations,
    META_TX_WORKER_MNEMONIC,
    REDIS_URI,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
    ZERO_EX_API_KEY,
} from '../config';
import {
    DEFAULT_MIN_EXPIRY_DURATION_MS,
    DEFAULT_WORKER_TRANSACTION_WATCHER_SLEEP_TIME_MS,
    KEEP_ALIVE_TTL,
} from '../core/constants';
import { artifacts } from '../generated-artifacts/artifacts';
import { ERC20BridgeSamplerContract } from '../generated-wrappers/erc20_bridge_sampler';
import { logger } from '../logger';
import { FeeService } from '../services/fee_service';
import { RfqmService } from '../services/rfqm_service';
import { RfqMakerBalanceCacheService } from '../services/rfq_maker_balance_cache_service';
import { WorkerService } from '../services/WorkerService';

import { BalanceChecker } from './balance_checker';
import { CacheClient } from './cache_client';
import { ConfigManager } from './config_manager';
import { getGasStationAttendant } from './GasStationAttendantUtils';
import { providerUtils } from './provider_utils';
import { QuoteServerClient } from './quote_server_client';
import { RfqmDbUtils } from './rfqm_db_utils';
import { RfqBalanceCheckUtils, RfqBlockchainUtils } from './rfq_blockchain_utils';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';
import { RfqMakerManager } from './rfq_maker_manager';
import { getKafkaProducer } from './runner_utils';
import { TokenMetadataManager } from './TokenMetadataManager';
import { TokenPriceOracle } from './TokenPriceOracle';
import { ZeroExApiClient } from './ZeroExApiClient';

export type RfqmServices = Map<number, RfqmService>;

const DEFAULT_AXIOS_TIMEOUT = 600; // ms

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
): Promise<ContractAddresses> {
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

/**
 * Builds a single instance of RfqmService
 */
export async function buildRfqmServiceAsync(
    rfqmDbUtils: RfqmDbUtils,
    rfqMakerManager: RfqMakerManager,
    tokenPriceOracle: TokenPriceOracle,
    configManager: ConfigManager,
    chain: ChainConfiguration,
    redis: Redis,
): Promise<RfqmService> {
    const { rfqm: rfqmConfiguration, chainId } = chain;
    if (!rfqmConfiguration) {
        throw new Error(`RFQm Service for chain ${chainId} does not exist`);
    }

    // ether.js Provider coexists with web3 provider during migration away from 0x/web3-wrapper.
    const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chainId);

    const rpcProvider = providerUtils.createWeb3Provider(chain.rpcUrl);
    const provider: SupportedProvider = rpcProvider;

    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, chain);
    const axiosInstance = Axios.create(getAxiosRequestConfig());
    const proxiedAxiosInstance = Axios.create(getAxiosRequestConfigWithProxy());

    const balanceChecker = new BalanceChecker(provider);
    const rfqBlockchainUtils = new RfqBlockchainUtils(
        provider,
        contractAddresses.exchangeProxy,
        balanceChecker,
        ethersProvider,
    );

    const tokenMetadataManager = new TokenMetadataManager(chainId, rfqBlockchainUtils);

    const sqsProducer = Producer.create({
        queueUrl: chain.sqsUrl,
    });

    const quoteServerClient = new QuoteServerClient(proxiedAxiosInstance);

    const cacheClient = new CacheClient(redis);

    const kafkaProducer = getKafkaProducer();

    const gasStationAttendant = getGasStationAttendant(chain, axiosInstance);

    const feeTokenMetadata = getTokenMetadataIfExists(contractAddresses.etherToken, chainId);
    if (feeTokenMetadata === undefined) {
        throw new Error(`Fee token ${contractAddresses.etherToken} on chain ${chainId} could not be found!`);
    }

    const zeroExApiClient = new ZeroExApiClient(Axios.create(), ZERO_EX_API_KEY, chain);

    const feeService = new FeeService(
        chainId,
        feeTokenMetadata,
        configManager,
        gasStationAttendant,
        tokenPriceOracle,
        zeroExApiClient,
        rfqmConfiguration.minExpiryDurationMs || DEFAULT_MIN_EXPIRY_DURATION_MS,
    );

    const rfqMakerBalanceCacheService = new RfqMakerBalanceCacheService(
        cacheClient,
        rfqBlockchainUtils.balanceCheckUtils,
    );

    return new RfqmService(
        chainId,
        feeService,
        rfqmConfiguration.feeModelVersion || 0,
        contractAddresses,
        chain.registryAddress,
        rfqBlockchainUtils,
        rfqmDbUtils,
        sqsProducer,
        quoteServerClient,
        rfqmConfiguration.minExpiryDurationMs || DEFAULT_MIN_EXPIRY_DURATION_MS,
        cacheClient,
        rfqMakerBalanceCacheService,
        rfqMakerManager,
        tokenMetadataManager,
        kafkaProducer,
        rfqmConfiguration.quoteReportTopic,
    );
}

/**
 * Builds a single instance of the WorkerService
 */
export async function buildWorkerServiceAsync(
    rfqmDbUtils: RfqmDbUtils,
    rfqMakerManager: RfqMakerManager,
    chain: ChainConfiguration,
    redis: Redis,
    workerIndex: number,
): Promise<WorkerService> {
    const { worker: workerConfiguration, chainId } = chain;
    if (!workerConfiguration) {
        throw new Error(`Worker Service for chain ${chainId} does not exist`);
    }

    let provider: SupportedProvider;

    // ether.js Provider coexists with web3 provider during migration away from 0x/web3-wrapper.
    const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chainId);
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

    const balanceChecker = new BalanceChecker(provider);
    const rfqBlockchainUtils = new RfqBlockchainUtils(
        provider,
        contractAddresses.exchangeProxy,
        balanceChecker,
        ethersProvider,
        ethersWallet,
    );

    const quoteServerClient = new QuoteServerClient(axiosInstance);

    const cacheClient = new CacheClient(redis);

    const gasStationAttendant = getGasStationAttendant(chain, axiosInstance);

    const feeTokenMetadata = getTokenMetadataIfExists(contractAddresses.etherToken, chainId);
    if (feeTokenMetadata === undefined) {
        throw new Error(`Fee token ${contractAddresses.etherToken} on chain ${chainId} could not be found!`);
    }

    const rfqMakerBalanceCacheService = new RfqMakerBalanceCacheService(
        cacheClient,
        rfqBlockchainUtils.balanceCheckUtils,
    );

    return new WorkerService(
        chainId,
        gasStationAttendant,
        chain.registryAddress,
        rfqBlockchainUtils,
        rfqmDbUtils,
        quoteServerClient,
        workerConfiguration.transactionWatcherSleepTimeMs || DEFAULT_WORKER_TRANSACTION_WATCHER_SLEEP_TIME_MS,
        cacheClient,
        rfqMakerBalanceCacheService,
        rfqMakerManager,
        workerConfiguration.initialMaxPriorityFeePerGasGwei,
        workerConfiguration.maxFeePerGasCapGwei,
        workerConfiguration.enableAccessList,
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
    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, chain);
    const balanceChecker = new BalanceChecker(provider);
    const balanceCheckUtils = new RfqBalanceCheckUtils(balanceChecker, contractAddresses.exchangeProxy);

    if (!REDIS_URI) {
        throw new Error('No redis URI provided to maker balance cache service');
    }
    const redis = new Redis(REDIS_URI);
    const cacheClient = new CacheClient(redis);

    return new RfqMakerBalanceCacheService(cacheClient, balanceCheckUtils);
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
    redis: Redis,
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    _workerIndex: number = 0,
): Promise<RfqmServices> {
    const services = await Promise.all(
        chainConfigurations.map(async (chain) => {
            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, chain.chainId);
            await rfqMakerManager.initializeAsync();
            return buildRfqmServiceAsync(rfqmDbUtils, rfqMakerManager, tokenPriceOracle, configManager, chain, redis);
        }),
    );
    return new Map(services.map((s, i) => [chainConfigurations[i].chainId, s]));
}
