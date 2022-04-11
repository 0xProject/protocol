// tslint:disable:custom-no-magic-numbers max-file-line-count
import { HttpServiceConfig } from '@0x/api-utils';
import { assert } from '@0x/assert';
import { LiquidityProviderRegistry, RfqMakerAssetOfferings } from '@0x/asset-swapper';
import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as validateUUID from 'uuid-validate';

import {
    DEFAULT_ETH_GAS_STATION_API_URL,
    DEFAULT_EXPECTED_MINED_SEC,
    DEFAULT_LOCAL_POSTGRES_URI,
    DEFAULT_LOCAL_REDIS_URI,
    DEFAULT_LOGGER_INCLUDE_TIMESTAMP,
    DEFAULT_SENTRY_ENVIRONMENT,
    HEALTHCHECK_PATH,
    METRICS_PATH,
    NULL_ADDRESS,
    ONE_MINUTE_MS,
} from './constants';
import { schemas } from './schemas';
import { schemaUtils } from './utils/schema_utils';

// tslint:disable:no-bitwise

enum EnvVarType {
    AddressList,
    StringList,
    Integer,
    Port,
    KeepAliveTimeout,
    ChainId,
    ETHAddressHex,
    UnitAmount,
    Rate,
    Url,
    UrlList,
    WhitelistAllTokens,
    Boolean,
    NonEmptyString,
    APIKeys,
    PrivateKeys,
    RfqMakerAssetOfferings,
    LiquidityProviderRegistry,
    JsonStringList,
}

/**
 * Values read from configuration files which enable
 * rfq-api to operate on a chain.
 */
export interface ChainConfiguration {
    chainId: number;
    gasStationUrl: string;
    name: string; // human readable, for logging and such
    registryAddress: string;
    rpcUrl: string;
    sqsUrl: string;
    // The value of the "tip" the worker will use when it starts
    // submitting transactions
    initialMaxPriorityFeePerGasGwei: number;
}

export type ChainConfigurations = ChainConfiguration[];

/**
 * Configuration which contains information about chains and
 * related resources, like the RPC url.
 */
export const CHAIN_CONFIGURATIONS: ChainConfigurations = (() => {
    let result: ChainConfigurations;
    try {
        result = resolveEnvVar<ChainConfigurations>('CHAIN_CONFIGURATIONS', EnvVarType.JsonStringList, []);
        schemaUtils.validateSchema(result, schemas.chainConfigurationsSchema);
    } catch (e) {
        throw new Error(`CHAIN_CONFIGURATIONS was defined but is not valid JSON per the schema: ${e}`);
    }
    return result;
})();

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

export const RFQ_WORKFLOW: RfqWorkFlowType = 'rfqm'; // This code base currently only supports rfqm workflow. rfqt is supported in 0x-api repo.
export const RFQ_MAKER_REFRESH_INTERVAL_MS: number = ONE_MINUTE_MS * 1;

/**
 * The JSON config for each Market Maker, providing information including URLs, type of order supported and authentication.
 */
export interface RfqMakerConfig {
    makerId: string;
    label: string;
    rfqmOrderTypes: RfqOrderType[];
    rfqtOrderTypes: RfqOrderType[];
    apiKeyHashes: string[];
}

/**
 * A Map type which map the makerId to the config object.
 */
export type MakerIdSet = Set</* makerId */ string>;

/**
 * Generate a set of MakerIds that support a given order type for a given workflow
 */
export const getMakerIdSetForOrderType = (orderType: RfqOrderType | 'any', workflow: RfqWorkFlowType): MakerIdSet => {
    const typesField = workflow === 'rfqt' ? 'rfqtOrderTypes' : 'rfqmOrderTypes';
    return RFQ_MAKER_CONFIGS.reduce((acc, curr) => {
        if (orderType === 'any' || curr[typesField].includes(orderType)) {
            acc.add(curr.makerId);
        }
        return acc;
    }, new Set</* makerId */ string>());
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

// Ethereum RPC Url list
export const ETHEREUM_RPC_URL = assertEnvVarType('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL, EnvVarType.UrlList);

export const KAFKA_BROKERS = _.isEmpty(process.env.KAFKA_BROKERS)
    ? undefined
    : assertEnvVarType('KAFKA_BROKERS', process.env.KAFKA_BROKERS, EnvVarType.StringList);

export const KAFKA_CONSUMER_GROUP_ID = _.isEmpty(process.env.KAFKA_CONSUMER_GROUP_ID)
    ? undefined
    : assertEnvVarType('KAFKA_CONSUMER_GROUP_ID', process.env.KAFKA_CONSUMER_GROUP_ID, EnvVarType.NonEmptyString);

// The fee recipient for orders
export const FEE_RECIPIENT_ADDRESS = _.isEmpty(process.env.FEE_RECIPIENT_ADDRESS)
    ? NULL_ADDRESS
    : assertEnvVarType('FEE_RECIPIENT_ADDRESS', process.env.FEE_RECIPIENT_ADDRESS, EnvVarType.ETHAddressHex);

export const POSTGRES_URI = _.isEmpty(process.env.POSTGRES_URI)
    ? DEFAULT_LOCAL_POSTGRES_URI
    : assertEnvVarType('POSTGRES_URI', process.env.POSTGRES_URI, EnvVarType.Url);

export const POSTGRES_READ_REPLICA_URIS: string[] | undefined = _.isEmpty(process.env.POSTGRES_READ_REPLICA_URIS)
    ? undefined
    : assertEnvVarType('POSTGRES_READ_REPLICA_URIS', process.env.POSTGRES_READ_REPLICA_URIS, EnvVarType.UrlList);

// Environment name Sentry used to categorize issues and traces.
export const SENTRY_ENVIRONMENT = _.isEmpty(process.env.SENTRY_ENVIRONMENT)
    ? DEFAULT_SENTRY_ENVIRONMENT
    : assertEnvVarType('SENTRY_ENVIRONMENT', process.env.SENTRY_ENVIRONMENT, EnvVarType.NonEmptyString);

// An Url with client key to access Sentry from client SDK.
export const SENTRY_DSN = _.isEmpty(process.env.SENTRY_DSN)
    ? undefined
    : assertEnvVarType('SENTRY_DSN', process.env.SENTRY_DSN, EnvVarType.Url);

// Sampling rate of traces reported to Sentry. Should be a number between 0.0 and 1.0 (inclusive).
export const SENTRY_TRACES_SAMPLE_RATE = _.isEmpty(process.env.SENTRY_TRACES_SAMPLE_RATE)
    ? 0
    : assertEnvVarType('SENTRY_TRACES_SAMPLE_RATE', process.env.SENTRY_TRACES_SAMPLE_RATE, EnvVarType.Rate);

export const REDIS_URI = _.isEmpty(process.env.REDIS_URI) ? DEFAULT_LOCAL_REDIS_URI : process.env.REDIS_URI;

// Should the logger include time field in the output logs, defaults to true.
export const LOGGER_INCLUDE_TIMESTAMP = _.isEmpty(process.env.LOGGER_INCLUDE_TIMESTAMP)
    ? DEFAULT_LOGGER_INCLUDE_TIMESTAMP
    : assertEnvVarType('LOGGER_INCLUDE_TIMESTAMP', process.env.LOGGER_INCLUDE_TIMESTAMP, EnvVarType.Boolean);

export const RFQM_API_KEY_WHITELIST: Set<string> = new Set(getApiKeyWhitelistFromIntegratorsAcl('rfqm'));

export const RFQM_MAKER_ID_SET: MakerIdSet = getMakerIdSetForOrderType('any', 'rfqm');
export const RFQM_MAKER_ID_SET_FOR_RFQ_ORDER: MakerIdSet = getMakerIdSetForOrderType('rfq', 'rfqm');
export const RFQM_MAKER_ID_SET_FOR_OTC_ORDER: MakerIdSet = getMakerIdSetForOrderType('otc', 'rfqm');

/**
 * A map from RFQ maker's api key hashes to maker ids.
 * Invalid hashes, which appear more than once in the config file and might resolve to different makers, are removed from the result.
 */
export const RFQ_API_KEY_HASH_TO_MAKER_ID: Map<string, string> = (() => {
    const hashToIdCount = RFQ_MAKER_CONFIGS.reduce((result, rfqMakerConfig) => {
        rfqMakerConfig.apiKeyHashes.forEach((hash) => result.set(hash, (result.get(hash) || 0) + 1));
        return result;
    }, new Map<string, number>());

    return RFQ_MAKER_CONFIGS.reduce((result, mm) => {
        mm.apiKeyHashes.forEach((hash) => {
            // Ignore invalid hashes with more than one appearances
            if (hashToIdCount.get(hash) === 1) {
                result.set(hash, mm.makerId);
            }
        });
        return result;
    }, new Map<string, string>());
})();

export const META_TX_WORKER_MNEMONIC: string | undefined = _.isEmpty(process.env.META_TX_WORKER_MNEMONIC)
    ? undefined
    : assertEnvVarType('META_TX_WORKER_MNEMONIC', process.env.META_TX_WORKER_MNEMONIC, EnvVarType.NonEmptyString);

export const RFQM_WORKER_INDEX: number | undefined = _.isEmpty(process.env.RFQM_WORKER_INDEX)
    ? undefined
    : assertEnvVarType('RFQM_WORKER_INDEX', process.env.RFQM_WORKER_INDEX, EnvVarType.Integer);

// If set to TRUE, system health will change to MAINTENANCE and integrators will be told to not
// send RFQM orders.
// tslint:disable-next-line boolean-naming
export const RFQM_MAINTENANCE_MODE: boolean = _.isEmpty(process.env.RFQM_MAINTENANCE_MODE)
    ? false
    : assertEnvVarType('RFQM_MAINTENANCE_MODE', process.env.RFQM_MAINTENANCE_MODE, EnvVarType.Boolean);

// tslint:disable-next-line:boolean-naming
export const RFQT_REQUEST_MAX_RESPONSE_MS = _.isEmpty(process.env.RFQT_REQUEST_MAX_RESPONSE_MS)
    ? 600
    : assertEnvVarType('RFQT_REQUEST_MAX_RESPONSE_MS', process.env.RFQT_REQUEST_MAX_RESPONSE_MS, EnvVarType.Integer);

// The expected time for a meta-txn to be included in a block.
export const META_TXN_RELAY_EXPECTED_MINED_SEC: number = _.isEmpty(process.env.META_TXN_RELAY_EXPECTED_MINED_SEC)
    ? DEFAULT_EXPECTED_MINED_SEC
    : assertEnvVarType(
          'META_TXN_RELAY_EXPECTED_MINED_SEC',
          process.env.META_TXN_RELAY_EXPECTED_MINED_SEC,
          EnvVarType.Integer,
      );

// Whether or not prometheus metrics should be enabled.
// tslint:disable-next-line:boolean-naming
export const ENABLE_PROMETHEUS_METRICS: boolean = _.isEmpty(process.env.ENABLE_PROMETHEUS_METRICS)
    ? false
    : assertEnvVarType('ENABLE_PROMETHEUS_METRICS', process.env.ENABLE_PROMETHEUS_METRICS, EnvVarType.Boolean);

export const PROMETHEUS_PORT: number = _.isEmpty(process.env.PROMETHEUS_PORT)
    ? 8080
    : assertEnvVarType('PROMETHEUS_PORT', process.env.PROMETHEUS_PORT, EnvVarType.Port);

// Eth Gas Station URL
export const ETH_GAS_STATION_API_URL: string = _.isEmpty(process.env.ETH_GAS_STATION_API_URL)
    ? DEFAULT_ETH_GAS_STATION_API_URL
    : assertEnvVarType('ETH_GAS_STATION_API_URL', process.env.ETH_GAS_STATION_API_URL, EnvVarType.Url);

export const RFQ_PROXY_ADDRESS: string | undefined = _.isEmpty(process.env.RFQ_PROXY_ADDRESS)
    ? undefined
    : assertEnvVarType('RFQ_PROXY_ADDRESS', process.env.RFQ_PROXY_ADDRESS, EnvVarType.NonEmptyString);

export const RFQ_PROXY_PORT: number | undefined = _.isEmpty(process.env.RFQ_PROXY_PORT)
    ? undefined
    : assertEnvVarType('RFQ_PROXY_PORT', process.env.RFQ_PROXY_PORT, EnvVarType.Port);

export const KAFKA_TOPIC_QUOTE_REPORT: string = _.isEmpty(process.env.KAFKA_TOPIC_QUOTE_REPORT)
    ? undefined
    : assertEnvVarType('KAFKA_TOPIC_QUOTE_REPORT', process.env.KAFKA_TOPIC_QUOTE_REPORT, EnvVarType.NonEmptyString);

export const defaultHttpServiceConfig: HttpServiceConfig = {
    httpPort: HTTP_PORT,
    healthcheckHttpPort: HEALTHCHECK_HTTP_PORT,
    healthcheckPath: HEALTHCHECK_PATH,
    httpKeepAliveTimeout: HTTP_KEEP_ALIVE_TIMEOUT,
    httpHeadersTimeout: HTTP_HEADERS_TIMEOUT,
    enablePrometheusMetrics: ENABLE_PROMETHEUS_METRICS,
    prometheusPort: PROMETHEUS_PORT,
    prometheusPath: METRICS_PATH,
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

function assertEnvVarType(name: string, value: any, expectedType: EnvVarType): any {
    let returnValue;
    switch (expectedType) {
        case EnvVarType.Port:
            returnValue = parseInt(value, 10);
            const isWithinRange = returnValue >= 0 && returnValue <= 65535;
            if (isNaN(returnValue) || !isWithinRange) {
                throw new Error(`${name} must be between 0 to 65535, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.ChainId:
        case EnvVarType.KeepAliveTimeout:
        case EnvVarType.Integer:
            returnValue = parseInt(value, 10);
            if (isNaN(returnValue)) {
                throw new Error(`${name} must be a valid integer, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.ETHAddressHex:
            assert.isETHAddressHex(name, value);
            return value;
        case EnvVarType.Url:
            assert.isUri(name, value);
            return value;
        case EnvVarType.UrlList:
            assert.isString(name, value);
            const urlList = (value as string).split(',');
            urlList.forEach((url, i) => assert.isUri(`${name}[${i}]`, url));
            return urlList;
        case EnvVarType.Boolean:
            return value === 'true';
        case EnvVarType.UnitAmount:
            returnValue = new BigNumber(parseFloat(value));
            if (returnValue.isNaN() || returnValue.isNegative()) {
                throw new Error(`${name} must be valid number greater than 0.`);
            }
            return returnValue;
        case EnvVarType.Rate:
            returnValue = parseFloat(value);
            if (returnValue < 0 || returnValue > 1) {
                throw new Error(`${name} must be valid number between 0.0 and 1.0.`);
            }
            return returnValue;
        case EnvVarType.AddressList:
            assert.isString(name, value);
            const addressList = (value as string).split(',').map((a) => a.toLowerCase());
            addressList.forEach((a, i) => assert.isETHAddressHex(`${name}[${i}]`, a));
            return addressList;
        case EnvVarType.StringList:
            assert.isString(name, value);
            const stringList = (value as string).split(',');
            return stringList;
        case EnvVarType.WhitelistAllTokens:
            return '*';
        case EnvVarType.NonEmptyString:
            assert.isString(name, value);
            if (value === '') {
                throw new Error(`${name} must be supplied`);
            }
            return value;
        case EnvVarType.APIKeys:
            assert.isString(name, value);
            const apiKeys = (value as string).split(',');
            apiKeys.forEach((apiKey) => {
                const isValidUUID = validateUUID(apiKey);
                if (!isValidUUID) {
                    throw new Error(`API Key ${apiKey} isn't UUID compliant`);
                }
            });
            return apiKeys;
        case EnvVarType.JsonStringList:
            assert.isString(name, value);
            return JSON.parse(value);
        case EnvVarType.RfqMakerAssetOfferings:
            const offerings: RfqMakerAssetOfferings = JSON.parse(value);
            // tslint:disable-next-line:forin
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
        case EnvVarType.LiquidityProviderRegistry:
            const registry: LiquidityProviderRegistry = JSON.parse(value);
            // tslint:disable-next-line:forin
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

        default:
            throw new Error(`Unrecognised EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}
