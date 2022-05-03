import {
    artifacts,
    AssetSwapperContractAddresses,
    ERC20BridgeSamplerContract,
    ProtocolFeeUtils,
    SupportedProvider,
} from '@0x/asset-swapper';
import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { PrivateKeyWalletSubprovider } from '@0x/subproviders';
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
    RFQM_WORKER_INDEX,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
} from '../config';
import {
    KEEP_ALIVE_TTL,
    PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
    RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS,
} from '../constants';
import { logger } from '../logger';
import { RfqmService } from '../services/rfqm_service';

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
 * Creates the Axios Request Config
 */
function getAxiosRequestConfig(): AxiosRequestConfig {
    const axiosRequestConfig: AxiosRequestConfig = {
        httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
        httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
        timeout: DEFAULT_AXIOS_TIMEOUT,
    };
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
 * @param chainId the network chain id
 */
export async function getContractAddressesForNetworkOrThrowAsync(
    provider: SupportedProvider,
    chainId: number,
): Promise<AssetSwapperContractAddresses> {
    let contractAddresses = getContractAddressesForChainOrThrow(chainId.toString() as any);
    // In a testnet where the environment does not support overrides
    // so we deploy the latest sampler
    if (chainId === ChainId.Ganache) {
        const sampler = await deploySamplerContractAsync(provider, chainId);
        contractAddresses = { ...contractAddresses, erc20BridgeSampler: sampler.address };
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
        default:
            throw new Error(`Gas station attendant not configured for chain: ${chain.name}`);
    }
    // tslint:enable: custom-no-magic-numbers
}

/**
 * Builds a single instance of RfqmService, intended to be used
 * when creating the RFQM worker.
 */
export async function buildRfqmServiceAsync(
    asWorker: boolean,
    rfqmDbUtils: RfqmDbUtils,
    rfqMakerDbUtils: RfqMakerDbUtils,
    configManager: ConfigManager,
    chain: ChainConfiguration,
): Promise<RfqmService> {
    let provider: SupportedProvider;

    // ether.js Provider coexists with web3 provider during migration away from 0x/web3-wrapper.
    const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chain.chainId);
    let ethersWallet: Wallet | undefined;

    const rpcProvider = providerUtils.createWeb3Provider(chain.rpcUrl);
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

    const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, chain.chainId);
    await rfqMakerManager.initializeAsync();
    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, chain.chainId);
    const axiosInstance = Axios.create(getAxiosRequestConfig());

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

    const sqsProducer = Producer.create({
        queueUrl: chain.sqsUrl,
    });

    const quoteServerClient = new QuoteServerClient(axiosInstance);

    const redisClient = redis.createClient({ url: REDIS_URI });
    const cacheClient = new CacheClient(redisClient);

    const kafkaProducer = getKafkaProducer();

    return new RfqmService(
        chain.chainId,
        getGasStationAttendant(chain, axiosInstance, protocolFeeUtils),
        contractAddresses,
        chain.registryAddress,
        rfqBlockchainUtils,
        rfqmDbUtils,
        sqsProducer,
        quoteServerClient,
        RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS,
        cacheClient,
        rfqMakerManager,
        chain.initialMaxPriorityFeePerGasGwei,
        kafkaProducer,
    );
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
    configManager: ConfigManager = new ConfigManager(),
): Promise<RfqmServices> {
    const services = await Promise.all(
        chainConfigurations.map(async (chain) =>
            buildRfqmServiceAsync(asWorker, rfqmDbUtils, rfqMakerDbUtils, configManager, chain),
        ),
    );
    return new Map(services.map((s, i) => [chainConfigurations[i].chainId, s]));
}
