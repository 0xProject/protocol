import { SupportedProvider } from '@0x/asset-swapper';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import Axios, { AxiosRequestConfig } from 'axios';
import { providers } from 'ethers';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import Redis from 'ioredis';
import { Kafka, Producer as KafkaProducer } from 'kafkajs';

import {
    ALT_RFQ_MM_API_KEY,
    ALT_RFQ_MM_PROFILE,
    ChainConfigurations,
    KAFKA_BROKERS,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
} from '../config';
import { KEEP_ALIVE_TTL } from '../constants';
import { RefreshingQuoteRequestor } from '../quoteRequestor/RefreshingQuoteRequestor';
import { RfqtService } from '../services/RfqtService';
import { RfqMakerBalanceCacheService } from '../services/rfq_maker_balance_cache_service';

import { BalanceChecker } from './balance_checker';
import { CacheClient } from './cache_client';
import { ConfigManager } from './config_manager';
import { providerUtils } from './provider_utils';
import { QuoteServerClient } from './quote_server_client';
import { RfqBalanceCheckUtils, RfqBlockchainUtils } from './rfq_blockchain_utils';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';
import { RfqMakerManager } from './rfq_maker_manager';
import { TokenMetadataManager } from './TokenMetadataManager';

export type RfqtServices = Map<number, RfqtService>;

const DEFAULT_AXIOS_TIMEOUT = 600; // ms

/**
 * Creates an RFQT Service for each chain present in `ChainConfigurations`.
 *
 * Intended for use by the top-level runners.
 */
export async function buildRfqtServicesAsync(
    chainConfigurations: ChainConfigurations,
    rfqMakerDbUtils: RfqMakerDbUtils,
    redis: Redis,
): Promise<RfqtServices> {
    const axiosInstance = Axios.create(getAxiosRequestConfig());
    const configManager = new ConfigManager();
    const altRfqOptions =
        ALT_RFQ_MM_API_KEY !== undefined && ALT_RFQ_MM_PROFILE !== undefined
            ? {
                  // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  altRfqApiKey: ALT_RFQ_MM_API_KEY!,
                  // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  altRfqProfile: ALT_RFQ_MM_PROFILE!,
              }
            : undefined;
    const services = await Promise.all(
        chainConfigurations.map(async (chain) => {
            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, chain.chainId);
            await rfqMakerManager.initializeAsync();
            const quoteRequestor = new RefreshingQuoteRequestor(rfqMakerManager, axiosInstance, altRfqOptions);
            const quoteServerClient = new QuoteServerClient(axiosInstance);
            const contractAddresses = getContractAddressesForChainOrThrow(chain.chainId);
            const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chain.chainId);
            const provider: SupportedProvider = providerUtils.createWeb3Provider(chain.rpcUrl);

            const balanceChecker = new BalanceChecker(provider);
            const rfqBlockchainUtils = new RfqBlockchainUtils(
                provider,
                contractAddresses.exchangeProxy,
                balanceChecker,
                ethersProvider,
            );
            const tokenMetadataManager = new TokenMetadataManager(chain.chainId, rfqBlockchainUtils);

            const balanceCheckUtils = new RfqBalanceCheckUtils(balanceChecker, contractAddresses.exchangeProxy);
            const cacheClient = new CacheClient(redis);
            const rfqMakerBalanceCacheService = new RfqMakerBalanceCacheService(cacheClient, balanceCheckUtils);

            const kafkaProducer = getKafkaProducer();

            return new RfqtService(
                chain.chainId,
                rfqMakerManager,
                quoteRequestor,
                quoteServerClient,
                tokenMetadataManager,
                contractAddresses,
                chain.rfqtFeeModelVersion || 0,
                rfqMakerBalanceCacheService,
                kafkaProducer,
                chain.rfqtQuoteReportTopic,
            );
        }),
    );
    return new Map(services.map((s, i) => [chainConfigurations[i].chainId, s]));
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
