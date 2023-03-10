import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { getTokenMetadataIfExists } from '@0x/token-metadata';
import Axios, { AxiosRequestConfig } from 'axios';
import { providers } from 'ethersv5';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import Redis from 'ioredis';

import {
    ALT_RFQ_MM_API_KEY,
    ALT_RFQ_MM_PROFILE,
    ChainConfigurations,
    DEFINED_FI_API_KEY,
    DEFINED_FI_ENDPOINT,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
    ZERO_EX_API_KEY,
} from '../config';
import { DEFAULT_MIN_EXPIRY_DURATION_MS, KEEP_ALIVE_TTL } from '../core/constants';
import { RefreshingQuoteRequestor } from '../quoteRequestor/RefreshingQuoteRequestor';
import { FeeService } from '../services/fee_service';
import { RfqtService } from '../services/RfqtService';
import { RfqMakerBalanceCacheService } from '../services/rfq_maker_balance_cache_service';

import { BalanceChecker } from './balance_checker';
import { CacheClient } from './cache_client';
import { ConfigManager } from './config_manager';
import { getGasStationAttendant } from './GasStationAttendantUtils';
import { providerUtils } from './provider_utils';
import { QuoteServerClient } from './quote_server_client';
import { RfqBalanceCheckUtils, RfqBlockchainUtils } from './rfq_blockchain_utils';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';
import { RfqMakerManager } from './rfq_maker_manager';
import { getKafkaProducer } from './runner_utils';
import { TokenMetadataManager } from './TokenMetadataManager';
import { TokenPriceOracle } from './TokenPriceOracle';
import { ZeroExApiClient } from './ZeroExApiClient';

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
    const proxiedAxiosInstance = Axios.create(getAxiosRequestConfigWithProxy());
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
            const { rfqt: rfqtConfiguration, chainId } = chain;
            if (!rfqtConfiguration) {
                throw new Error(`RFQt Service for chain ${chainId} does not exist`);
            }

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, chainId);
            await rfqMakerManager.initializeAsync();
            const quoteRequestor = new RefreshingQuoteRequestor(rfqMakerManager, proxiedAxiosInstance, altRfqOptions);
            const quoteServerClient = new QuoteServerClient(proxiedAxiosInstance);
            const contractAddresses = getContractAddressesForChainOrThrow(chainId);
            const ethersProvider = new providers.JsonRpcProvider(chain.rpcUrl, chainId);
            const provider = providerUtils.createWeb3Provider(chain.rpcUrl);

            const balanceChecker = new BalanceChecker(provider);
            const rfqBlockchainUtils = new RfqBlockchainUtils(
                provider,
                contractAddresses.exchangeProxy,
                balanceChecker,
                ethersProvider,
            );
            const tokenMetadataManager = new TokenMetadataManager(chainId, rfqBlockchainUtils);

            const balanceCheckUtils = new RfqBalanceCheckUtils(balanceChecker, contractAddresses.exchangeProxy);
            const cacheClient = new CacheClient(redis);
            const rfqMakerBalanceCacheService = new RfqMakerBalanceCacheService(cacheClient, balanceCheckUtils);

            const kafkaProducer = getKafkaProducer();

            const feeTokenMetadata = getTokenMetadataIfExists(contractAddresses.etherToken, chainId);
            if (feeTokenMetadata === undefined) {
                throw new Error(`Fee token ${contractAddresses.etherToken} on chain ${chainId} could not be found!`);
            }

            const gasStationAttendant = getGasStationAttendant(chain, axiosInstance);
            const tokenPriceOracle = new TokenPriceOracle(axiosInstance, DEFINED_FI_API_KEY, DEFINED_FI_ENDPOINT);
            const zeroExApiClient = new ZeroExApiClient(Axios.create(), ZERO_EX_API_KEY, chain);
            const feeService = new FeeService(
                chainId,
                feeTokenMetadata,
                configManager,
                gasStationAttendant,
                tokenPriceOracle,
                zeroExApiClient,
                rfqtConfiguration.minExpiryDurationMs || DEFAULT_MIN_EXPIRY_DURATION_MS,
            );

            return new RfqtService(
                chainId,
                rfqMakerManager,
                quoteRequestor,
                quoteServerClient,
                rfqtConfiguration.minExpiryDurationMs || DEFAULT_MIN_EXPIRY_DURATION_MS,
                rfqBlockchainUtils,
                tokenMetadataManager,
                contractAddresses,
                feeService,
                rfqtConfiguration.feeModelVersion || 0,
                rfqMakerBalanceCacheService,
                cacheClient,
                tokenPriceOracle,
                kafkaProducer,
                rfqtConfiguration.feeEventTopic,
            );
        }),
    );
    return new Map(services.map((s, i) => [chainConfigurations[i].chainId, s]));
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
