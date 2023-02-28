import { assert } from '@0x/assert';
import { ChainId } from '@0x/contract-addresses';
import { TokenMetadatasForChains, valueByChainId } from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import * as fs from 'fs';
import * as _ from 'lodash';
import { linearBuckets } from 'prom-client';
import * as validateUUID from 'uuid-validate';

import {
    DEFAULT_LOGGER_INCLUDE_TIMESTAMP,
    DEFAULT_META_TX_MIN_ALLOWED_SLIPPAGE,
    DEFAULT_ZERO_EX_GAS_API_URL,
    HEALTHCHECK_PATH,
    METRICS_PATH,
    NULL_ADDRESS,
    ONE_HOUR_MS,
    ONE_MINUTE_MS,
    ORDERBOOK_PATH,
    TEN_MINUTES_MS,
    TX_BASE_GAS,
} from './constants';
import { schemas } from './schemas';
import { HttpServiceConfig, Integrator } from './types';
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
    JsonStringList,
}

/**
 * A taker-integrator of the 0x API.
 */
type IntegratorsAcl = Integrator[];

/**
 * Configuration which represents taker-integrators of the 0x API. The configuration contains the label, id,
 * api keys, and allowed liquidity sources for each integrator.
 */
const INTEGRATORS_ACL: IntegratorsAcl = (() => {
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
export const getApiKeyWhitelistFromIntegratorsAcl = (groupType: 'rfqt' | 'rfqm'): string[] => {
    return INTEGRATORS_ACL.filter((i) => i[groupType])
        .flatMap((i) => i.apiKeys)
        .sort();
};

/**
 * Gets the integrator ID for the provided label.
 */
const getIntegratorIdFromLabel = (label: string): string | undefined => {
    for (const integrator of INTEGRATORS_ACL) {
        if (integrator.label === label) {
            return integrator.integratorId;
        }
    }
};

// Log level for pino.js
export const LOG_LEVEL: string = _.isEmpty(process.env.LOG_LEVEL)
    ? 'info'
    : assertEnvVarType('LOG_LEVEL', process.env.LOG_LEVEL, EnvVarType.NonEmptyString);

// Network port to listen on
const HTTP_PORT = _.isEmpty(process.env.HTTP_PORT)
    ? 3000
    : assertEnvVarType('HTTP_PORT', process.env.HTTP_PORT, EnvVarType.Port);

// Network port for the healthcheck service at /healthz, if not provided, it uses the HTTP_PORT value.
const HEALTHCHECK_HTTP_PORT = _.isEmpty(process.env.HEALTHCHECK_HTTP_PORT)
    ? HTTP_PORT
    : assertEnvVarType('HEALTHCHECK_HTTP_PORT', process.env.HEALTHCHECK_HTTP_PORT, EnvVarType.Port);

// Number of milliseconds of inactivity the servers waits for additional
// incoming data aftere it finished writing last response before a socket will
// be destroyed.
// Ref: https://nodejs.org/api/http.html#http_server_keepalivetimeout
const HTTP_KEEP_ALIVE_TIMEOUT = _.isEmpty(process.env.HTTP_KEEP_ALIVE_TIMEOUT)
    ? 76 * 1000
    : assertEnvVarType('HTTP_KEEP_ALIVE_TIMEOUT', process.env.HTTP_KEEP_ALIVE_TIMEOUT, EnvVarType.KeepAliveTimeout);

// Limit the amount of time the parser will wait to receive the complete HTTP headers.
// NOTE: This value HAS to be higher than HTTP_KEEP_ALIVE_TIMEOUT.
// Ref: https://nodejs.org/api/http.html#http_server_headerstimeout
const HTTP_HEADERS_TIMEOUT = _.isEmpty(process.env.HTTP_HEADERS_TIMEOUT)
    ? 77 * 1000
    : assertEnvVarType('HTTP_HEADERS_TIMEOUT', process.env.HTTP_HEADERS_TIMEOUT, EnvVarType.KeepAliveTimeout);

// Default chain id to use when not specified
export const CHAIN_ID: ChainId = _.isEmpty(process.env.CHAIN_ID)
    ? ChainId.Mainnet
    : assertEnvVarType('CHAIN_ID', process.env.CHAIN_ID, EnvVarType.ChainId);

// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
export const WHITELISTED_TOKENS: string[] | '*' = _.isEmpty(process.env.WHITELIST_ALL_TOKENS)
    ? TokenMetadatasForChains.map((tm) => tm.tokenAddresses[CHAIN_ID])
    : assertEnvVarType('WHITELIST_ALL_TOKENS', process.env.WHITELIST_ALL_TOKENS, EnvVarType.WhitelistAllTokens);

export const DB_ORDERS_UPDATE_CHUNK_SIZE = 300;

// Ethereum RPC Url list
const ETHEREUM_RPC_URL = assertEnvVarType('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL, EnvVarType.UrlList);
// Timeout in seconds to wait for an RPC request (default 5000)
const RPC_REQUEST_TIMEOUT = _.isEmpty(process.env.RPC_REQUEST_TIMEOUT)
    ? 5000
    : assertEnvVarType('RPC_REQUEST_TIMEOUT', process.env.RPC_REQUEST_TIMEOUT, EnvVarType.Integer);

// Prometheus shared metrics
export const PROMETHEUS_REQUEST_BUCKETS = linearBuckets(0, 0.25, RPC_REQUEST_TIMEOUT / 1000 / 0.25); // [ 0,  0.25,  0.5,  0.75, ... 5 ]
export const PROMETHEUS_REQUEST_SIZE_BUCKETS = linearBuckets(0, 50000, 20); // A single step is 50kb, up to 1mb.
export const PROMETHEUS_RESPONSE_SIZE_BUCKETS = linearBuckets(0, 50000, 20); // A single step is 50kb, up to 1mb.
export const PROMETHEUS_LABEL_STATUS_OK = 'ok';
export const PROMETHEUS_LABEL_STATUS_ERROR = 'error';

// Enable client side content compression when sending RPC requests (default false)
const ENABLE_RPC_REQUEST_COMPRESSION = _.isEmpty(process.env.ENABLE_RPC_REQUEST_COMPRESSION)
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

const KAFKA_CONSUMER_GROUP_ID = _.isEmpty(process.env.KAFKA_CONSUMER_GROUP_ID)
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

// LEGACY: This is now the fallback affiliate address for tagging (becomes "Unknown Affiliate")
export const FEE_RECIPIENT_ADDRESS = _.isEmpty(process.env.FEE_RECIPIENT_ADDRESS)
    ? NULL_ADDRESS
    : assertEnvVarType('FEE_RECIPIENT_ADDRESS', process.env.FEE_RECIPIENT_ADDRESS, EnvVarType.ETHAddressHex);

// The fee recipient for 0x
export const ZERO_EX_FEE_RECIPIENT_ADDRESS: string = resolveEnvVar<string>(
    'ZERO_EX_FEE_RECIPIENT_ADDRESS',
    EnvVarType.ETHAddressHex,
    NULL_ADDRESS,
);

// The set of fee tokens for 0x
export const ZERO_EX_FEE_TOKENS: Set<string> = new Set(
    resolveEnvVar<string[]>('ZERO_EX_FEE_TOKENS', EnvVarType.JsonStringList, []).map((addr) => addr.toLowerCase()),
);

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

export const POSTGRES_URI: string | undefined = _.isEmpty(process.env.POSTGRES_URI)
    ? undefined
    : assertEnvVarType('POSTGRES_URI', process.env.POSTGRES_URI, EnvVarType.Url);

export const POSTGRES_READ_REPLICA_URIS: string[] | undefined = _.isEmpty(process.env.POSTGRES_READ_REPLICA_URIS)
    ? undefined
    : assertEnvVarType('POSTGRES_READ_REPLICA_URIS', process.env.POSTGRES_READ_REPLICA_URIS, EnvVarType.UrlList);

// Should the logger include time field in the output logs, defaults to true.
export const LOGGER_INCLUDE_TIMESTAMP = _.isEmpty(process.env.LOGGER_INCLUDE_TIMESTAMP)
    ? DEFAULT_LOGGER_INCLUDE_TIMESTAMP
    : assertEnvVarType('LOGGER_INCLUDE_TIMESTAMP', process.env.LOGGER_INCLUDE_TIMESTAMP, EnvVarType.Boolean);

export const RFQT_REGISTRY_PASSWORDS: string[] = resolveEnvVar<string[]>(
    'RFQT_REGISTRY_PASSWORDS',
    EnvVarType.JsonStringList,
    [],
);

export const RFQT_INTEGRATORS: Integrator[] = INTEGRATORS_ACL.filter((i) => i.rfqt);
export const RFQT_INTEGRATOR_IDS: string[] = INTEGRATORS_ACL.filter((i) => i.rfqt).map((i) => i.integratorId);
export const RFQT_API_KEY_WHITELIST: string[] = getApiKeyWhitelistFromIntegratorsAcl('rfqt');

export const MATCHA_INTEGRATOR_ID: string | undefined = getIntegratorIdFromLabel('Matcha');

export const RFQ_API_URL: string = resolveEnvVar('RFQ_API_URL', EnvVarType.NonEmptyString, '');
// TODO(byeongminp): migrate tx blacklist
export const ENABLE_RFQT_TX_ORIGIN_BLACKLIST = !_.isEmpty(process.env.RFQT_TX_ORIGIN_BLACKLIST);
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

export const PROTOCOL_FEE_MULTIPLIER = new BigNumber(0);

const UNWRAP_GAS_BY_CHAIN_ID = valueByChainId<BigNumber>(
    {
        // NOTE: FTM uses a different WFTM implementation than WETH which uses more gas
        [ChainId.Fantom]: new BigNumber(37000),
    },
    new BigNumber(25000),
);
const UNWRAP_WETH_GAS = UNWRAP_GAS_BY_CHAIN_ID[CHAIN_ID];
export const UNWRAP_QUOTE_GAS = TX_BASE_GAS.plus(UNWRAP_WETH_GAS);
export const WRAP_QUOTE_GAS = UNWRAP_QUOTE_GAS;

const DEFAULT_SAMPLE_DISTRIBUTION_BASE = 1;
export const SAMPLE_DISTRIBUTION_BASE: number = _.isEmpty(process.env.SAMPLE_DISTRIBUTION_BASE)
    ? DEFAULT_SAMPLE_DISTRIBUTION_BASE
    : assertEnvVarType('SAMPLE_DISTRIBUTION_BASE', process.env.SAMPLE_DISTRIBUTION_BASE, EnvVarType.Float);

export const CHAIN_HAS_VIPS = (chainId: ChainId) => {
    return [ChainId.Mainnet, ChainId.BSC].includes(chainId);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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
        default:
            throw new Error(`Unrecognised EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}
