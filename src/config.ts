import { assert } from '@0x/assert';
import { nativeWrappedTokenSymbol, TokenMetadatasForChains, valueByChainId } from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import * as fs from 'fs';
import * as _ from 'lodash';
import { linearBuckets } from 'prom-client';
import * as validateUUID from 'uuid-validate';

import {
    BlockParamLiteral,
    ChainId,
    DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID,
    ERC20BridgeSource,
    LiquidityProviderRegistry,
    OrderPrunerPermittedFeeTypes,
    RfqMakerAssetOfferings,
    SamplerOverrides,
    SOURCE_FLAGS,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
    SwapQuoterRfqOpts,
} from './asset-swapper';
import {
    DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    DEFAULT_LOCAL_POSTGRES_URI,
    DEFAULT_LOGGER_INCLUDE_TIMESTAMP,
    DEFAULT_META_TX_MIN_ALLOWED_SLIPPAGE,
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    DEFAULT_ZERO_EX_GAS_API_URL,
    HEALTHCHECK_PATH,
    METRICS_PATH,
    NULL_ADDRESS,
    ONE_HOUR_MS,
    ONE_MINUTE_MS,
    ORDERBOOK_PATH,
    QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    TEN_MINUTES_MS,
    TX_BASE_GAS,
} from './constants';
import { schemas } from './schemas';
import { HttpServiceConfig } from './types';
import { schemaUtils } from './utils/schema_utils';

enum EnvVarType {
    AddressList,
    StringList,
    Integer,
    Float,
    Port,
    KeepAliveTimeout,
    ChainId,
    ETHAddressHex,
    UnitAmount,
    Url,
    UrlList,
    WhitelistAllTokens,
    Boolean,
    NonEmptyString,
    APIKeys,
    PrivateKeys,
    RfqMakerAssetOfferings,
    RateLimitConfig,
    LiquidityProviderRegistry,
    JsonStringList,
}

/**
 * A taker-integrator of the 0x API.
 */
export interface Integrator {
    apiKeys: string[];
    integratorId: string;
    whitelistIntegratorUrls?: string[];
    label: string;
    plp: boolean;
    rfqm: boolean;
    rfqt: boolean;
    slippageModel?: boolean;
}
export type IntegratorsAcl = Integrator[];

/**
 * Configuration which represents taker-integrators of the 0x API. The configuration contains the label, id,
 * api keys, and allowed liquidity sources for each integrator.
 */
export const INTEGRATORS_ACL: IntegratorsAcl = (() => {
    let integrators: IntegratorsAcl;
    try {
        integrators = resolveEnvVar<IntegratorsAcl>('INTEGRATORS_ACL', EnvVarType.JsonStringList, []);
        schemaUtils.validateSchema(integrators, schemas.integratorsAclSchema);
    } catch (e) {
        throw new Error(`INTEGRATORS_ACL was defined but is not valid JSON per the schema: ${e}`);
    }
    return integrators;
})();

/**
 * Extracts the integrator API keys from the `INTEGRATORS_ACL` environment variable for the provided group type.
 */
export const getApiKeyWhitelistFromIntegratorsAcl = (groupType: 'rfqt' | 'plp' | 'rfqm'): string[] => {
    return INTEGRATORS_ACL.filter((i) => i[groupType])
        .flatMap((i) => i.apiKeys)
        .sort();
};

/**
 * Gets the integrator ID for the provided label.
 */
export const getIntegratorIdFromLabel = (label: string): string | undefined => {
    for (const integrator of INTEGRATORS_ACL) {
        if (integrator.label === label) {
            return integrator.integratorId;
        }
    }
};

export type RfqWorkFlowType = 'rfqt' | 'rfqm';
export type RfqOrderType = 'rfq' | 'otc';

export const RFQ_WORKFLOW: RfqWorkFlowType = 'rfqt'; // This code base currently only supports rfqt workflow.
export const RFQ_PAIR_REFRESH_INTERVAL_MS: number = ONE_MINUTE_MS * 1;

/**
 * The JSON config for each Market Maker, providing information including URIs, type of order supported and authentication.
 */
export interface RfqMakerConfig {
    makerId: string;
    label: string;
    rfqmMakerUri: string;
    rfqmOrderTypes: RfqOrderType[];
    rfqtMakerUri: string;
    rfqtOrderTypes: RfqOrderType[];
    apiKeyHashes: string[];
}

/**
 * A Map type which map the makerId to the config object.
 */
export type MakerIdsToConfigs = Map</* makerId */ string, RfqMakerConfig>;

/**
 * Generate a map from MakerId to MakerConfig that support a given order type for a given workflow
 */
export const getMakerConfigMapForOrderType = (
    orderType: RfqOrderType | 'any',
    workflow: RfqWorkFlowType,
): MakerIdsToConfigs => {
    const typesField = workflow === 'rfqt' ? 'rfqtOrderTypes' : 'rfqmOrderTypes';
    return RFQ_MAKER_CONFIGS.reduce((acc, curr) => {
        if (orderType === 'any' || curr[typesField].includes(orderType)) {
            acc.set(curr.makerId, curr);
        }
        return acc;
    }, new Map<string, RfqMakerConfig>());
};

/**
 * A list of type RfqMakerConfig, read from the RFQ_MAKER_CONFIGS env variable
 */
export const RFQ_MAKER_CONFIGS: RfqMakerConfig[] = (() => {
    try {
        const makerConfigs = resolveEnvVar<RfqMakerConfig[]>('RFQ_MAKER_CONFIGS', EnvVarType.JsonStringList, []);
        schemaUtils.validateSchema(makerConfigs, schemas.rfqMakerConfigListSchema);
        return makerConfigs;
    } catch (e) {
        throw new Error(`RFQ_MAKER_CONFIGS was defined but is not valid JSON per the schema: ${e}`);
    }
})();

// Log level for pino.js
export const LOG_LEVEL: string = _.isEmpty(process.env.LOG_LEVEL)
    ? 'info'
    : assertEnvVarType('LOG_LEVEL', process.env.LOG_LEVEL, EnvVarType.NonEmptyString);

// Network port to listen on
export const HTTP_PORT = _.isEmpty(process.env.HTTP_PORT)
    ? 3000
    : assertEnvVarType('HTTP_PORT', process.env.HTTP_PORT, EnvVarType.Port);

// Network port for the healthcheck service at /healthz, if not provided, it uses the HTTP_PORT value.
export const HEALTHCHECK_HTTP_PORT = _.isEmpty(process.env.HEALTHCHECK_HTTP_PORT)
    ? HTTP_PORT
    : assertEnvVarType('HEALTHCHECK_HTTP_PORT', process.env.HEALTHCHECK_HTTP_PORT, EnvVarType.Port);

// Number of milliseconds of inactivity the servers waits for additional
// incoming data aftere it finished writing last response before a socket will
// be destroyed.
// Ref: https://nodejs.org/api/http.html#http_server_keepalivetimeout
export const HTTP_KEEP_ALIVE_TIMEOUT = _.isEmpty(process.env.HTTP_KEEP_ALIVE_TIMEOUT)
    ? 76 * 1000
    : assertEnvVarType('HTTP_KEEP_ALIVE_TIMEOUT', process.env.HTTP_KEEP_ALIVE_TIMEOUT, EnvVarType.KeepAliveTimeout);

// Limit the amount of time the parser will wait to receive the complete HTTP headers.
// NOTE: This value HAS to be higher than HTTP_KEEP_ALIVE_TIMEOUT.
// Ref: https://nodejs.org/api/http.html#http_server_headerstimeout
export const HTTP_HEADERS_TIMEOUT = _.isEmpty(process.env.HTTP_HEADERS_TIMEOUT)
    ? 77 * 1000
    : assertEnvVarType('HTTP_HEADERS_TIMEOUT', process.env.HTTP_HEADERS_TIMEOUT, EnvVarType.KeepAliveTimeout);

// Default chain id to use when not specified
export const CHAIN_ID: ChainId = _.isEmpty(process.env.CHAIN_ID)
    ? ChainId.Kovan
    : assertEnvVarType('CHAIN_ID', process.env.CHAIN_ID, EnvVarType.ChainId);

// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
export const WHITELISTED_TOKENS: string[] | '*' = _.isEmpty(process.env.WHITELIST_ALL_TOKENS)
    ? TokenMetadatasForChains.map((tm) => tm.tokenAddresses[CHAIN_ID])
    : assertEnvVarType('WHITELIST_ALL_TOKENS', process.env.WHITELIST_ALL_TOKENS, EnvVarType.WhitelistAllTokens);

// Ignored addresses only for Swap endpoints (still present in database and SRA).
export const SWAP_IGNORED_ADDRESSES: string[] = _.isEmpty(process.env.SWAP_IGNORED_ADDRESSES)
    ? []
    : assertEnvVarType('SWAP_IGNORED_ADDRESSES', process.env.SWAP_IGNORED_ADDRESSES, EnvVarType.AddressList);

export const DB_ORDERS_UPDATE_CHUNK_SIZE = 300;

// Ethereum RPC Url list
export const ETHEREUM_RPC_URL = assertEnvVarType('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL, EnvVarType.UrlList);
// Timeout in seconds to wait for an RPC request (default 5000)
export const RPC_REQUEST_TIMEOUT = _.isEmpty(process.env.RPC_REQUEST_TIMEOUT)
    ? 5000
    : assertEnvVarType('RPC_REQUEST_TIMEOUT', process.env.RPC_REQUEST_TIMEOUT, EnvVarType.Integer);

// Prometheus shared metrics
export const PROMETHEUS_REQUEST_BUCKETS = linearBuckets(0, 0.25, RPC_REQUEST_TIMEOUT / 1000 / 0.25); // [ 0,  0.25,  0.5,  0.75, ... 5 ]

// Enable client side content compression when sending RPC requests (default false)
export const ENABLE_RPC_REQUEST_COMPRESSION = _.isEmpty(process.env.ENABLE_RPC_REQUEST_COMPRESSION)
    ? false
    : assertEnvVarType(
          'ENABLE_RPC_REQUEST_COMPRESSION',
          process.env.ENABLE_RPC_REQUEST_COMPRESSION,
          EnvVarType.Boolean,
      );

// S3 bucket for slippage model file
export const SLIPPAGE_MODEL_S3_BUCKET_NAME: string | undefined = _.isEmpty(process.env.SLIPPAGE_MODEL_S3_BUCKET_NAME)
    ? undefined
    : assertEnvVarType(
          'SLIPPAGE_MODEL_S3_BUCKET_NAME',
          process.env.SLIPPAGE_MODEL_S3_BUCKET_NAME,
          EnvVarType.NonEmptyString,
      );
export const SLIPPAGE_MODEL_S3_FILE_NAME = `SlippageModel-${CHAIN_ID}.json`;
export const SLIPPAGE_MODEL_S3_API_VERSION = '2006-03-01';
export const SLIPPAGE_MODEL_S3_FILE_VALID_INTERVAL_MS: number = ONE_HOUR_MS * 2;
export const SLIPPAGE_MODEL_REFRESH_INTERVAL_MS: number = ONE_MINUTE_MS * 1;
export const META_TX_MIN_ALLOWED_SLIPPAGE: number = _.isEmpty(process.env.META_TX_MIN_ALLOWED_SLIPPAGE)
    ? DEFAULT_META_TX_MIN_ALLOWED_SLIPPAGE
    : assertEnvVarType('META_TX_MIN_ALLOWED_SLIPPAGE', process.env.META_TX_MIN_ALLOWED_SLIPPAGE, EnvVarType.Float);

export const ORDER_WATCHER_URL = _.isEmpty(process.env.ORDER_WATCHER_URL)
    ? 'http://127.0.0.1:8080'
    : assertEnvVarType('ORDER_WATCHER_URL', process.env.ORDER_WATCHER_URL, EnvVarType.Url);

export const ORDER_WATCHER_KAFKA_TOPIC = _.isEmpty(process.env.ORDER_WATCHER_KAFKA_TOPIC)
    ? 'order_watcher_events'
    : assertEnvVarType('ORDER_WATCHER_KAFKA_TOPIC', process.env.ORDER_WATCHER_KAFKA_TOPIC, EnvVarType.NonEmptyString);

export const KAFKA_BROKERS = _.isEmpty(process.env.KAFKA_BROKERS)
    ? undefined
    : assertEnvVarType('KAFKA_BROKERS', process.env.KAFKA_BROKERS, EnvVarType.StringList);

export const KAFKA_CONSUMER_GROUP_ID = _.isEmpty(process.env.KAFKA_CONSUMER_GROUP_ID)
    ? undefined
    : assertEnvVarType('KAFKA_CONSUMER_GROUP_ID', process.env.KAFKA_CONSUMER_GROUP_ID, EnvVarType.NonEmptyString);

// The path for the Websocket order-watcher updates
export const WEBSOCKET_ORDER_UPDATES_PATH = _.isEmpty(process.env.WEBSOCKET_ORDER_UPDATES_PATH)
    ? ORDERBOOK_PATH
    : assertEnvVarType(
          'WEBSOCKET_ORDER_UPDATES_PATH',
          process.env.WEBSOCKET_ORDER_UPDATES_PATH,
          EnvVarType.NonEmptyString,
      );

// The fee recipient for orders
export const FEE_RECIPIENT_ADDRESS = _.isEmpty(process.env.FEE_RECIPIENT_ADDRESS)
    ? NULL_ADDRESS
    : assertEnvVarType('FEE_RECIPIENT_ADDRESS', process.env.FEE_RECIPIENT_ADDRESS, EnvVarType.ETHAddressHex);

// A flat fee that should be charged to the order taker
export const TAKER_FEE_UNIT_AMOUNT = _.isEmpty(process.env.TAKER_FEE_UNIT_AMOUNT)
    ? new BigNumber(0)
    : assertEnvVarType('TAKER_FEE_UNIT_AMOUNT', process.env.TAKER_FEE_UNIT_AMOUNT, EnvVarType.UnitAmount);

// If there are any orders in the orderbook that are expired by more than x seconds, log an error
export const MAX_ORDER_EXPIRATION_BUFFER_SECONDS: number = _.isEmpty(process.env.MAX_ORDER_EXPIRATION_BUFFER_SECONDS)
    ? 3 * 60
    : assertEnvVarType(
          'MAX_ORDER_EXPIRATION_BUFFER_SECONDS',
          process.env.MAX_ORDER_EXPIRATION_BUFFER_SECONDS,
          EnvVarType.KeepAliveTimeout,
      );

// Ignore orders greater than x seconds when responding to SRA requests
export const SRA_ORDER_EXPIRATION_BUFFER_SECONDS: number = _.isEmpty(process.env.SRA_ORDER_EXPIRATION_BUFFER_SECONDS)
    ? 10
    : assertEnvVarType(
          'SRA_ORDER_EXPIRATION_BUFFER_SECONDS',
          process.env.SRA_ORDER_EXPIRATION_BUFFER_SECONDS,
          EnvVarType.KeepAliveTimeout,
      );

export const POSTGRES_URI = _.isEmpty(process.env.POSTGRES_URI)
    ? DEFAULT_LOCAL_POSTGRES_URI
    : assertEnvVarType('POSTGRES_URI', process.env.POSTGRES_URI, EnvVarType.Url);

export const POSTGRES_READ_REPLICA_URIS: string[] | undefined = _.isEmpty(process.env.POSTGRES_READ_REPLICA_URIS)
    ? undefined
    : assertEnvVarType('POSTGRES_READ_REPLICA_URIS', process.env.POSTGRES_READ_REPLICA_URIS, EnvVarType.UrlList);

// Should the logger include time field in the output logs, defaults to true.
export const LOGGER_INCLUDE_TIMESTAMP = _.isEmpty(process.env.LOGGER_INCLUDE_TIMESTAMP)
    ? DEFAULT_LOGGER_INCLUDE_TIMESTAMP
    : assertEnvVarType('LOGGER_INCLUDE_TIMESTAMP', process.env.LOGGER_INCLUDE_TIMESTAMP, EnvVarType.Boolean);

export const LIQUIDITY_PROVIDER_REGISTRY: LiquidityProviderRegistry = _.isEmpty(process.env.LIQUIDITY_PROVIDER_REGISTRY)
    ? {}
    : assertEnvVarType(
          'LIQUIDITY_PROVIDER_REGISTRY',
          process.env.LIQUIDITY_PROVIDER_REGISTRY,
          EnvVarType.LiquidityProviderRegistry,
      );

export const RFQT_REGISTRY_PASSWORDS: string[] = resolveEnvVar<string[]>(
    'RFQT_REGISTRY_PASSWORDS',
    EnvVarType.JsonStringList,
    [],
);

export const RFQT_INTEGRATORS: Integrator[] = INTEGRATORS_ACL.filter((i) => i.rfqt);
export const RFQT_INTEGRATOR_IDS: string[] = INTEGRATORS_ACL.filter((i) => i.rfqt).map((i) => i.integratorId);
export const RFQT_API_KEY_WHITELIST: string[] = getApiKeyWhitelistFromIntegratorsAcl('rfqt');
export const RFQM_API_KEY_WHITELIST: Set<string> = new Set(getApiKeyWhitelistFromIntegratorsAcl('rfqm'));
export const PLP_API_KEY_WHITELIST: string[] = getApiKeyWhitelistFromIntegratorsAcl('plp');

export const RFQT_MAKER_CONFIG_MAP_FOR_RFQ_ORDER: MakerIdsToConfigs = getMakerConfigMapForOrderType('rfq', 'rfqt');
export const MATCHA_INTEGRATOR_ID: string | undefined = getIntegratorIdFromLabel('Matcha');

export const RFQ_CLIENT_ROLLOUT_PERCENT: number = resolveEnvVar('RFQ_CLIENT_ROLLOUT_PERCENT', EnvVarType.Integer, 0);
export const RFQ_API_URL: string = resolveEnvVar('RFQ_API_URL', EnvVarType.NonEmptyString, '');
export const RFQT_TX_ORIGIN_BLACKLIST: Set<string> = new Set(
    resolveEnvVar<string[]>('RFQT_TX_ORIGIN_BLACKLIST', EnvVarType.JsonStringList, []).map((addr) =>
        addr.toLowerCase(),
    ),
);

export const ALT_RFQ_MM_ENDPOINT: string | undefined = _.isEmpty(process.env.ALT_RFQ_MM_ENDPOINT)
    ? undefined
    : assertEnvVarType('ALT_RFQ_MM_ENDPOINT', process.env.ALT_RFQ_MM_ENDPOINT, EnvVarType.Url);
export const ALT_RFQ_MM_API_KEY: string | undefined = _.isEmpty(process.env.ALT_RFQ_MM_API_KEY)
    ? undefined
    : assertEnvVarType('ALT_RFQ_MM_API_KEY', process.env.ALT_RFQ_MM_API_KEY, EnvVarType.NonEmptyString);
export const ALT_RFQ_MM_PROFILE: string | undefined = _.isEmpty(process.env.ALT_RFQ_MM_PROFILE)
    ? undefined
    : assertEnvVarType('ALT_RFQ_MM_PROFILE', process.env.ALT_RFQ_MM_PROFILE, EnvVarType.NonEmptyString);

export const RFQT_MAKER_ASSET_OFFERINGS = resolveEnvVar<RfqMakerAssetOfferings>(
    'RFQT_MAKER_ASSET_OFFERINGS',
    EnvVarType.RfqMakerAssetOfferings,
    {},
);

export const RFQM_MAKER_ASSET_OFFERINGS = resolveEnvVar<RfqMakerAssetOfferings>(
    'RFQM_MAKER_ASSET_OFFERINGS',
    EnvVarType.RfqMakerAssetOfferings,
    {},
);

export const META_TX_EXPIRATION_BUFFER_MS = TEN_MINUTES_MS;

export const RFQT_REQUEST_MAX_RESPONSE_MS: number = _.isEmpty(process.env.RFQT_REQUEST_MAX_RESPONSE_MS)
    ? 600
    : assertEnvVarType('RFQT_REQUEST_MAX_RESPONSE_MS', process.env.RFQT_REQUEST_MAX_RESPONSE_MS, EnvVarType.Integer);

// Whitelisted 0x API keys that can post orders to the SRA and have them persist indefinitely
export const SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS: string[] =
    process.env.SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS === undefined
        ? []
        : assertEnvVarType(
              'SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS',
              process.env.SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS,
              EnvVarType.APIKeys,
          );

// Whether or not prometheus metrics should be enabled.
export const ENABLE_PROMETHEUS_METRICS: boolean = _.isEmpty(process.env.ENABLE_PROMETHEUS_METRICS)
    ? false
    : assertEnvVarType('ENABLE_PROMETHEUS_METRICS', process.env.ENABLE_PROMETHEUS_METRICS, EnvVarType.Boolean);

export const PROMETHEUS_PORT: number = _.isEmpty(process.env.PROMETHEUS_PORT)
    ? 8080
    : assertEnvVarType('PROMETHEUS_PORT', process.env.PROMETHEUS_PORT, EnvVarType.Port);

// ZeroEx Gas API URL
export const ZERO_EX_GAS_API_URL: string = _.isEmpty(process.env.ZERO_EX_GAS_API_URL)
    ? DEFAULT_ZERO_EX_GAS_API_URL
    : assertEnvVarType('ZERO_EX_GAS_API_URL', process.env.ZERO_EX_GAS_API_URL, EnvVarType.Url);

export const RFQ_PROXY_PORT: number | undefined = _.isEmpty(process.env.RFQ_PROXY_PORT)
    ? undefined
    : assertEnvVarType('RFQ_PROXY_PORT', process.env.RFQ_PROXY_PORT, EnvVarType.Port);

export const KAFKA_TOPIC_QUOTE_REPORT: string = _.isEmpty(process.env.KAFKA_TOPIC_QUOTE_REPORT)
    ? undefined
    : assertEnvVarType('KAFKA_TOPIC_QUOTE_REPORT', process.env.KAFKA_TOPIC_QUOTE_REPORT, EnvVarType.NonEmptyString);

export const SENTRY_ENABLED: boolean = _.isEmpty(process.env.SENTRY_ENABLED)
    ? false
    : assertEnvVarType('SENTRY_ENABLED', process.env.SENTRY_ENABLED, EnvVarType.Boolean);

export const SENTRY_ENVIRONMENT: string = _.isEmpty(process.env.SENTRY_ENVIRONMENT)
    ? 'development'
    : assertEnvVarType('SENTRY_ENVIRONMENT', process.env.SENTRY_ENVIRONMENT, EnvVarType.NonEmptyString);

export const SENTRY_DSN: string = _.isEmpty(process.env.SENTRY_DSN)
    ? undefined
    : assertEnvVarType('SENTRY_DSN', process.env.SENTRY_DSN, EnvVarType.Url);

export const SENTRY_SAMPLE_RATE: number = _.isEmpty(process.env.SENTRY_SAMPLE_RATE)
    ? 0.1
    : assertEnvVarType('SENTRY_SAMPLE_RATE', process.env.SENTRY_SAMPLE_RATE, EnvVarType.Float);

export const SENTRY_TRACES_SAMPLE_RATE: number = _.isEmpty(process.env.SENTRY_TRACES_SAMPLE_RATE)
    ? 0.1
    : assertEnvVarType('SENTRY_TRACES_SAMPLE_RATE', process.env.SENTRY_TRACES_SAMPLE_RATE, EnvVarType.Float);

export const GASLESS_SWAP_FEE_ENABLED: boolean = _.isEmpty(process.env.GASLESS_SWAP_FEE_ENABLED)
    ? false
    : assertEnvVarType('GASLESS_SWAP_FEE_ENABLED', process.env.GASLESS_SWAP_FEE_ENABLED, EnvVarType.Boolean);

// Max number of entities per page
export const MAX_PER_PAGE = 1000;
// Default ERC20 token precision
export const DEFAULT_ERC20_TOKEN_PRECISION = 18;

export const PROTOCOL_FEE_MULTIPLIER = new BigNumber(0);

export const RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER = 1.2;

const UNWRAP_GAS_BY_CHAIN_ID = valueByChainId<BigNumber>(
    {
        // NOTE: FTM uses a different WFTM implementation than WETH which uses more gas
        [ChainId.Fantom]: new BigNumber(37000),
    },
    new BigNumber(25000),
);
export const UNWRAP_WETH_GAS = UNWRAP_GAS_BY_CHAIN_ID[CHAIN_ID];
export const WRAP_ETH_GAS = UNWRAP_WETH_GAS;
export const UNWRAP_QUOTE_GAS = TX_BASE_GAS.plus(UNWRAP_WETH_GAS);
export const WRAP_QUOTE_GAS = UNWRAP_QUOTE_GAS;

const EXCLUDED_SOURCES = (() => {
    const allERC20BridgeSources = Object.values(ERC20BridgeSource);
    switch (CHAIN_ID) {
        case ChainId.Mainnet:
            return [ERC20BridgeSource.MultiBridge];
        case ChainId.Kovan:
            return allERC20BridgeSources.filter(
                (s) => s !== ERC20BridgeSource.Native && s !== ERC20BridgeSource.UniswapV2,
            );
        case ChainId.Ganache:
            return allERC20BridgeSources.filter((s) => s !== ERC20BridgeSource.Native);
        case ChainId.BSC:
        case ChainId.Polygon:
        case ChainId.Avalanche:
        case ChainId.Celo:
        case ChainId.Fantom:
        case ChainId.Optimism:
        case ChainId.Goerli:
        case ChainId.PolygonMumbai:
        case ChainId.ArbitrumRinkeby:
        case ChainId.Arbitrum:
            return [ERC20BridgeSource.MultiBridge, ERC20BridgeSource.Native];
        default:
            throw new Error(`Excluded sources not specified for ${CHAIN_ID}`);
    }
})();

const EXCLUDED_FEE_SOURCES = (() => {
    switch (CHAIN_ID) {
        case ChainId.Mainnet:
            return [];
        case ChainId.Kovan:
            return [ERC20BridgeSource.Uniswap];
        case ChainId.BSC:
            return [ERC20BridgeSource.Uniswap];
        case ChainId.Polygon:
            return [];
        case ChainId.Celo:
            return [];
        default:
            return [ERC20BridgeSource.Uniswap, ERC20BridgeSource.UniswapV2];
    }
})();
const FILL_QUOTE_TRANSFORMER_GAS_OVERHEAD = new BigNumber(150e3);
const EXCHANGE_PROXY_OVERHEAD_NO_VIP = () => FILL_QUOTE_TRANSFORMER_GAS_OVERHEAD;
const MULTIPLEX_BATCH_FILL_SOURCE_FLAGS =
    SOURCE_FLAGS.Uniswap_V2 |
    SOURCE_FLAGS.SushiSwap |
    SOURCE_FLAGS.LiquidityProvider |
    SOURCE_FLAGS.RfqOrder |
    SOURCE_FLAGS.Uniswap_V3;
const MULTIPLEX_MULTIHOP_FILL_SOURCE_FLAGS =
    SOURCE_FLAGS.Uniswap_V2 | SOURCE_FLAGS.SushiSwap | SOURCE_FLAGS.LiquidityProvider | SOURCE_FLAGS.Uniswap_V3;
const EXCHANGE_PROXY_OVERHEAD_FULLY_FEATURED = (sourceFlags: bigint) => {
    if ([SOURCE_FLAGS.Uniswap_V2, SOURCE_FLAGS.SushiSwap].includes(sourceFlags)) {
        // Uniswap and forks VIP
        return TX_BASE_GAS;
    } else if (
        [
            SOURCE_FLAGS.SushiSwap,
            SOURCE_FLAGS.PancakeSwap,
            SOURCE_FLAGS.PancakeSwap_V2,
            SOURCE_FLAGS.BakerySwap,
            SOURCE_FLAGS.ApeSwap,
        ].includes(sourceFlags) &&
        CHAIN_ID === ChainId.BSC
    ) {
        // PancakeSwap and forks VIP
        return TX_BASE_GAS;
    } else if (SOURCE_FLAGS.Uniswap_V3 === sourceFlags) {
        // Uniswap V3 VIP
        return TX_BASE_GAS.plus(5e3);
    } else if (SOURCE_FLAGS.Curve === sourceFlags) {
        // Curve pseudo-VIP
        return TX_BASE_GAS.plus(40e3);
    } else if (SOURCE_FLAGS.LiquidityProvider === sourceFlags) {
        // PLP VIP
        return TX_BASE_GAS.plus(10e3);
    } else if (SOURCE_FLAGS.RfqOrder === sourceFlags) {
        // RFQ VIP
        return TX_BASE_GAS.plus(5e3);
    } else if ((MULTIPLEX_BATCH_FILL_SOURCE_FLAGS | sourceFlags) === MULTIPLEX_BATCH_FILL_SOURCE_FLAGS) {
        // Multiplex batch fill
        return TX_BASE_GAS.plus(15e3);
    } else if (
        (MULTIPLEX_MULTIHOP_FILL_SOURCE_FLAGS | sourceFlags) ===
        (MULTIPLEX_MULTIHOP_FILL_SOURCE_FLAGS | SOURCE_FLAGS.MultiHop)
    ) {
        // Multiplex multi-hop fill
        return TX_BASE_GAS.plus(25e3);
    } else {
        return FILL_QUOTE_TRANSFORMER_GAS_OVERHEAD;
    }
};

export const NATIVE_WRAPPED_TOKEN_SYMBOL = nativeWrappedTokenSymbol(CHAIN_ID);

const NEON_ROUTER_NUM_SAMPLES = 14;
// TODO(kimpers): Due to an issue with the Rust router we want to use equidistant samples when using the Rust router
const DEFAULT_SAMPLE_DISTRIBUTION_BASE = 1;

export const SAMPLE_DISTRIBUTION_BASE: number = _.isEmpty(process.env.SAMPLE_DISTRIBUTION_BASE)
    ? DEFAULT_SAMPLE_DISTRIBUTION_BASE
    : assertEnvVarType('SAMPLE_DISTRIBUTION_BASE', process.env.SAMPLE_DISTRIBUTION_BASE, EnvVarType.Float);

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS: Partial<SwapQuoteRequestOpts> = {
    excludedSources: EXCLUDED_SOURCES,
    excludedFeeSources: EXCLUDED_FEE_SOURCES,
    bridgeSlippage: DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    maxFallbackSlippage: DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    numSamples: 13,
    sampleDistributionBase: SAMPLE_DISTRIBUTION_BASE,
    neonRouterNumSamples: NEON_ROUTER_NUM_SAMPLES,
    exchangeProxyOverhead: EXCHANGE_PROXY_OVERHEAD_FULLY_FEATURED,
    shouldGenerateQuoteReport: true,
};

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP: Partial<SwapQuoteRequestOpts> = {
    ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    exchangeProxyOverhead: EXCHANGE_PROXY_OVERHEAD_NO_VIP,
};

export const SAMPLER_OVERRIDES: SamplerOverrides | undefined = (() => {
    switch (CHAIN_ID) {
        case ChainId.Ganache:
        case ChainId.Kovan:
            return { overrides: {}, block: BlockParamLiteral.Latest };
        default:
            return undefined;
    }
})();

let SWAP_QUOTER_RFQT_OPTS: SwapQuoterRfqOpts = {
    integratorsWhitelist: RFQT_INTEGRATORS,
    txOriginBlacklist: RFQT_TX_ORIGIN_BLACKLIST,
};

if (ALT_RFQ_MM_API_KEY && ALT_RFQ_MM_PROFILE) {
    SWAP_QUOTER_RFQT_OPTS = {
        ...SWAP_QUOTER_RFQT_OPTS,
        altRfqCreds: {
            altRfqApiKey: ALT_RFQ_MM_API_KEY,
            altRfqProfile: ALT_RFQ_MM_PROFILE,
        },
    };
}

export const SWAP_QUOTER_OPTS: Partial<SwapQuoterOpts> = {
    chainId: CHAIN_ID,
    expiryBufferMs: QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    rfqt: SWAP_QUOTER_RFQT_OPTS,
    zeroExGasApiUrl: ZERO_EX_GAS_API_URL,
    permittedOrderFeeTypes: new Set([OrderPrunerPermittedFeeTypes.NoFees]),
    samplerOverrides: SAMPLER_OVERRIDES,
    tokenAdjacencyGraph: DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID[CHAIN_ID],
    liquidityProviderRegistry: LIQUIDITY_PROVIDER_REGISTRY,
};

export const defaultHttpServiceConfig: HttpServiceConfig = {
    httpPort: HTTP_PORT,
    healthcheckHttpPort: HEALTHCHECK_HTTP_PORT,
    healthcheckPath: HEALTHCHECK_PATH,
    ethereumRpcUrl: ETHEREUM_RPC_URL,
    httpKeepAliveTimeout: HTTP_KEEP_ALIVE_TIMEOUT,
    httpHeadersTimeout: HTTP_HEADERS_TIMEOUT,
    enablePrometheusMetrics: ENABLE_PROMETHEUS_METRICS,
    prometheusPort: PROMETHEUS_PORT,
    prometheusPath: METRICS_PATH,
    kafkaBrokers: KAFKA_BROKERS,
    kafkaConsumerGroupId: KAFKA_CONSUMER_GROUP_ID,
    rpcRequestTimeout: RPC_REQUEST_TIMEOUT,
    shouldCompressRequest: ENABLE_RPC_REQUEST_COMPRESSION,
};

export const getIntegratorByIdOrThrow = (
    (integratorsMap: Map<string, Integrator>) =>
    (integratorId: string): Integrator => {
        const integrator = integratorsMap.get(integratorId);
        if (!integrator) {
            throw new Error(`Integrator ${integratorId} does not exist.`);
        }
        return integrator;
    }
)(transformIntegratorsAcl(INTEGRATORS_ACL, 'integratorId'));

/**
 * Gets the integrator ID for a given API key. If the API key is not in the configuration, returns `undefined`.
 */
export const getIntegratorIdForApiKey = (
    (integratorsMap: Map<string, Integrator>) =>
    (apiKey: string): string | undefined => {
        const integrator = integratorsMap.get(apiKey);
        return integrator?.integratorId;
    }
)(transformIntegratorsAcl(INTEGRATORS_ACL, 'apiKeys'));

/**
 * Utility function to transform INTEGRATORS_ACL into a map of apiKey => integrator. The result can
 * be used to optimize the lookup of the integrator when a request comes in with an api key. Lookup complexity
 * becomes O(1) with the map instead of O(# integrators * # api keys) with the array.
 *
 * @param integrators the integrators map from the environment variable
 * @param keyBy either apiKeys (creates map keyed by every API key) or 'integratorId' (integratorId => Integrator)
 */
function transformIntegratorsAcl(
    integrators: IntegratorsAcl,
    keyBy: 'apiKeys' | 'integratorId',
): Map<string, Integrator> {
    const result = new Map<string, Integrator>();
    integrators.forEach((integrator) => {
        let mapKeys: string[];
        switch (keyBy) {
            case 'apiKeys':
                mapKeys = integrator.apiKeys;
                break;
            case 'integratorId':
                mapKeys = [integrator.integratorId];
                break;
            default:
                throw new Error(`Parameter "${keyBy}" is misconfigured`);
        }
        mapKeys.forEach((apiKey) => {
            result.set(apiKey, integrator);
        });
    });
    return result;
}

/**
 * Resolves a config of type T for an Enviornment Variable. Checks:
 *  - If the env variable is undefined, use the hardcoded fallback
 *  - If the env variable points to a filepath, resolve it
 *  - Otherwise, just use the env variable
 *
 * @param envVar - the name of the Environment Variable
 * @param envVarType - the type
 * @param fallback  - A hardcoded fallback value
 * @returns The config
 */
function resolveEnvVar<T>(envVar: string, envVarType: EnvVarType, fallback: T): T {
    const rawEnvVar = process.env[envVar];
    if (rawEnvVar === undefined || _.isEmpty(rawEnvVar)) {
        return fallback;
    }

    // If the enviornment variable points to a file
    if (fs.existsSync(rawEnvVar)) {
        return JSON.parse(fs.readFileSync(rawEnvVar, 'utf8'));
    }

    return assertEnvVarType(envVar, process.env[envVar], envVarType);
}

function assertEnvVarType(name: string, value: string | undefined, expectedType: EnvVarType): any {
    if (value === undefined) {
        throw new Error(`${name} is not defined`);
    }
    let returnValue;
    switch (expectedType) {
        case EnvVarType.Port: {
            returnValue = parseInt(value, 10);
            const isWithinRange = returnValue >= 0 && returnValue <= 65535;
            if (isNaN(returnValue) || !isWithinRange) {
                throw new Error(`${name} must be between 0 to 65535, found ${value}.`);
            }
            return returnValue;
        }
        case EnvVarType.ChainId:
        case EnvVarType.KeepAliveTimeout:
        case EnvVarType.Integer:
            returnValue = parseInt(value, 10);
            if (isNaN(returnValue)) {
                throw new Error(`${name} must be a valid integer, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.Float:
            returnValue = parseFloat(value);
            if (isNaN(returnValue)) {
                throw new Error(`${name} must be a valid float, found ${value}`);
            }
            return returnValue;
        case EnvVarType.ETHAddressHex:
            assert.isETHAddressHex(name, value);
            return value;
        case EnvVarType.Url:
            assert.isUri(name, value);
            return value;
        case EnvVarType.UrlList: {
            assert.isString(name, value);
            const urlList = (value as string).split(',');
            urlList.forEach((url, i) => assert.isUri(`${name}[${i}]`, url));
            return urlList;
        }
        case EnvVarType.Boolean:
            return value === 'true';
        case EnvVarType.UnitAmount:
            returnValue = new BigNumber(parseFloat(value));
            if (returnValue.isNaN() || returnValue.isNegative()) {
                throw new Error(`${name} must be valid number greater than 0.`);
            }
            return returnValue;
        case EnvVarType.AddressList: {
            assert.isString(name, value);
            const addressList = (value as string).split(',').map((a) => a.toLowerCase());
            addressList.forEach((a, i) => assert.isETHAddressHex(`${name}[${i}]`, a));
            return addressList;
        }
        case EnvVarType.StringList: {
            assert.isString(name, value);
            const stringList = (value as string).split(',');
            return stringList;
        }
        case EnvVarType.WhitelistAllTokens:
            return '*';
        case EnvVarType.NonEmptyString:
            assert.isString(name, value);
            if (value === '') {
                throw new Error(`${name} must be supplied`);
            }
            return value;
        case EnvVarType.APIKeys: {
            assert.isString(name, value);
            const apiKeys = (value as string).split(',').filter((key) => !!key.trim());
            apiKeys.forEach((apiKey) => {
                const isValidUUID = validateUUID(apiKey);
                if (!isValidUUID) {
                    throw new Error(`API Key ${apiKey} isn't UUID compliant`);
                }
            });
            return apiKeys;
        }
        case EnvVarType.JsonStringList: {
            assert.isString(name, value);
            return JSON.parse(value);
        }
        case EnvVarType.RfqMakerAssetOfferings: {
            const offerings: RfqMakerAssetOfferings = JSON.parse(value);
            for (const makerEndpoint in offerings) {
                assert.isWebUri('market maker endpoint', makerEndpoint);

                const assetOffering = offerings[makerEndpoint];
                assert.isArray(`value in maker endpoint mapping, for index ${makerEndpoint},`, assetOffering);
                assetOffering.forEach((assetPair, i) => {
                    assert.isArray(`asset pair array ${i} for maker endpoint ${makerEndpoint}`, assetPair);
                    assert.assert(
                        assetPair.length === 2,
                        `asset pair array ${i} for maker endpoint ${makerEndpoint} does not consist of exactly two elements.`,
                    );
                    assert.isETHAddressHex(
                        `first token address for asset pair ${i} for maker endpoint ${makerEndpoint}`,
                        assetPair[0],
                    );
                    assert.isETHAddressHex(
                        `second token address for asset pair ${i} for maker endpoint ${makerEndpoint}`,
                        assetPair[1],
                    );
                    assert.assert(
                        assetPair[0] !== assetPair[1],
                        `asset pair array ${i} for maker endpoint ${makerEndpoint} has identical assets`,
                    );
                });
            }
            return offerings;
        }
        case EnvVarType.LiquidityProviderRegistry: {
            const registry: LiquidityProviderRegistry = JSON.parse(value);
            for (const liquidityProvider in registry) {
                assert.isETHAddressHex('liquidity provider address', liquidityProvider);

                const { tokens } = registry[liquidityProvider];
                assert.isArray(`token list for liquidity provider ${liquidityProvider}`, tokens);
                tokens.forEach((token, i) => {
                    assert.isETHAddressHex(`address of token ${i} for liquidity provider ${liquidityProvider}`, token);
                });
                // TODO jacob validate gas cost callback in registry
                // assert.isNumber(`gas cost for liquidity provider ${liquidityProvider}`, gasCost);
            }
            return registry;
        }
        default:
            throw new Error(`Unrecognised EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}
