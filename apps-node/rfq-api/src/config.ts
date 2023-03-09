// tslint:disable:custom-no-magic-numbers max-file-line-count
import { HttpServiceConfig } from '@0x/api-utils';
import { assert } from '@0x/assert';
import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as validateUUID from 'uuid-validate';

import {
    DEFAULT_BACKGROUND_JOB_TYPES,
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
} from './core/constants';
import { schemas } from './core/schemas';
import { FeeModelVersion } from './core/types';
import { toPairString } from './core/pair_utils';
import { schemaUtils } from './core/schema_utils';

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
    zeroExClientBaseUrl: string;
    // Enables caching for maker balances on observed tokens
    enableMakerBalanceCache?: boolean;
    // Use this config to override the 0x Exchange Proxy contract address.
    // There might be a case when we want a different exchange
    // proxy contract than what is defined from @0x/contract-addresses repo.
    //
    // i.e. testing a new feature that hasn't been deployed to the official
    // contract yet
    exchangeProxyContractAddressOverride?: string;
    // Service configuration needs to be present to run the corresponding service.
    gasless?: {
        metaTransactionServiceUrl: string;
        feeEventTopic?: string;
        produceFeeEvent?: boolean;
    };
    rfqm?: {
        minExpiryDurationMs?: number;
        quoteReportTopic?: string;
        feeModelVersion?: FeeModelVersion;
        // Determines the percentage of RFQm traffic that goes through Gasless RFQt VIP workflow
        gaslessRfqtVipRolloutPercentage?: number;
    };
    rfqt?: {
        minExpiryDurationMs?: number;
        feeEventTopic?: string;
        feeModelVersion?: FeeModelVersion;
    };
    worker?: {
        // The value of the "tip" the worker will use when it starts
        // submitting transactions
        initialMaxPriorityFeePerGasGwei: number;
        // The max fee per gas (in gwei) the worker is willing to pay for a transaction
        maxFeePerGasCapGwei: number;
        // Use this config to change the sleep time between a transacion's on-chain status check.
        // You should set the sleep time close to the chain's block time.
        // The smaller sleep time, the more frequent a transaction is checked to see it has been
        // settled on-chain but it also consumes more RPC calls.
        transactionWatcherSleepTimeMs?: number;
        enableAccessList?: boolean;
    };
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

export interface ZeroExFeeConfigEntryBase {
    volumePercentage?: number;
    integratorSharePercentage?: number;
    // marginRakePercentage?: number; // for RFQ liqiduity
}

/**
 * 0x fee config entry for pairs.
 *
 * For example, this means the following pair take 10% volume fee.
 *  {
 *      kind: 'pair',
 *      pairs: [
 *          {
 *              tokenA: '0x123456...',
 *              tokenB: '0x654321...',
 *              label: 'token1-token2',
 *          },
 *          {
 *              tokenA: '0x13579...',
 *              tokenB: '0x24681...',
 *              label: 'token3-token4',
 *          }
 *      ],
 *      volumePercentage: 10
 *  }
 */
export interface Pairs extends ZeroExFeeConfigEntryBase {
    kind: 'pairs';
    pairs: {
        tokenA: string;
        tokenB: string;
        label: string;
    }[];
}

/**
 * 0x fee config entry for cartesian_product.
 *
 * For example, this means for any of the 4 combination between `setA` and `setB`, the pair takes 5% volume fee
 * {
 *      kind: 'cartesian_product',
 *      setA: [
 *          {
 *              token: '0x123455...',
 *              label: 'token5',
 *          },
 *          {
 *              token: '0x123457...',
 *              label: 'token6',
 *          }
 *      ],
 *      setB: [
 *          {
 *              token: '0x123458...',
 *              label: 'token7',
 *          },
 *          {
 *              token: '0x123459...',
 *              label: 'token8',
 *          }
 *      ],
 *      volumePercentage: 5
 * }
 */
export interface CartesianProduct extends ZeroExFeeConfigEntryBase {
    kind: 'cartesian_product';
    setA: {
        token: string;
        label: string;
    }[];
    setB: {
        token: string;
        label: string;
    }[];
}

/**
 * 0x fee config entry for tokens.
 *
 * For example, this means if token9 or token10 is either sell / buy token, there is a 2% volume fee
 * {
 *      kind: 'tokens',
 *      tokens: [
 *          {
 *              token: '0x1234510...',
 *              label: 'token9',
 *          },
 *          {
 *              token: '0x12345711...',
 *              label: 'token10',
 *          }
 *      ]
 *      volumePercentage: 2
 * }
 */
export interface Tokens extends ZeroExFeeConfigEntryBase {
    kind: 'tokens';
    tokens: {
        token: string;
        label: string;
    }[];
}

export type ZeroExFeeConigurationEntry = Pairs | CartesianProduct | Tokens;

// Raw 0x fee configuration read directly from config file
interface ZeroExFeeRawConfiguration {
    name: string; // human readable integrator name
    integratorId: string;
    chainId: number;
    feeOn: 'volume' | 'integrator_share' /* | 'price_improvement' */; // 'price_improvement' is for RFQ liquidity
    zeroEx: {
        // fee recipient and billing type for 0x fee
        feeRecipient: string | null;
        billingType: 'on-chain' | 'off-chain';
    };
    gas: {
        // fee recipient and billing type for gas fee
        feeRecipient: string | null;
        billingType: 'on-chain' | 'off-chain';
    };
    fees: ZeroExFeeConigurationEntry[];
}

type ZeroExFeeRawConfigurations = ZeroExFeeRawConfiguration[];

// Processed raw 0x fee configuration
export interface ZeroExFeeConfiguration {
    name: string;
    feeOn: 'volume' | 'integrator_share' /* | 'price_improvement' */; // 'price_improvement' is for RFQ liquidity
    zeroEx: {
        feeRecipient: string | null;
        billingType: 'on-chain' | 'off-chain';
    };
    gas: {
        feeRecipient: string | null;
        billingType: 'on-chain' | 'off-chain';
    };
    pairsFeeEntries: Map<string, BigNumber>; // tokenA-tokenB: <fee_parameter>; tokenA <= tokenB
    cartesianProductFeeEntries: {
        setA: Set<string>;
        setB: Set<string>;
        parameter: BigNumber;
    }[];
    tokensEntries: Map<string, BigNumber>; // tokenA-tokenB: <fee_parameter>; tokenA <= tokenB
}

export const ZERO_EX_FEE_CONFIGURATION_MAP: Map<string, Map<number, ZeroExFeeConfiguration>> = (() => {
    try {
        const zeroExFeeRawConfigurations = resolveEnvVar<ZeroExFeeRawConfigurations>(
            'ZERO_EX_FEE_CONFIGURATIONS',
            EnvVarType.JsonStringList,
            [],
        );
        schemaUtils.validateSchema(zeroExFeeRawConfigurations, schemas.zeroExFeeConfigurationsSchema);

        return zeroExFeeRawConfigurations.reduce((acc, curr) => {
            const { integratorId, chainId } = curr;
            if (!acc.get(integratorId)) {
                acc.set(integratorId, new Map<number, ZeroExFeeConfiguration>());
            }

            const pairsFeeEntries = new Map<string, BigNumber>();
            const cartesianProductFeeEntries: {
                setA: Set<string>;
                setB: Set<string>;
                parameter: BigNumber;
            }[] = [];
            const tokensEntries = new Map<string, BigNumber>();

            curr.fees.forEach((feeConfig) => {
                let feeParameter: BigNumber;
                switch (curr.feeOn) {
                    case 'volume':
                        if (feeConfig.volumePercentage === undefined) {
                            throw new Error(`volumePercentage not defined for ${curr.integratorId} for fee on volume`);
                        }
                        feeParameter = new BigNumber(feeConfig.volumePercentage);
                        break;
                    case 'integrator_share':
                        if (feeConfig.integratorSharePercentage === undefined) {
                            throw new Error(
                                `integratorSharePercentage not defined for ${curr.integratorId} for fee on volume`,
                            );
                        }
                        feeParameter = new BigNumber(feeConfig.integratorSharePercentage);
                        break;
                    default:
                        ((_x: never) => {
                            throw new Error('unreachable');
                        })(curr.feeOn);
                }

                if (feeConfig.kind === 'pairs') {
                    // parse config entries that are of kind `pairs`
                    feeConfig.pairs.forEach(({ tokenA, tokenB }) => {
                        pairsFeeEntries.set(toPairString(tokenA, tokenB), feeParameter);
                    });
                } else if (feeConfig.kind === 'cartesian_product') {
                    // parse config entries that are of kind `cartesian_product`
                    cartesianProductFeeEntries.push({
                        setA: new Set(feeConfig.setA.map((tokenAndLabel) => tokenAndLabel.token.toLocaleLowerCase())),
                        setB: new Set(feeConfig.setB.map((tokenAndLabel) => tokenAndLabel.token.toLocaleLowerCase())),
                        parameter: feeParameter,
                    });
                } else if (feeConfig.kind === 'tokens') {
                    // parse config entries that are of kind `tokens`
                    feeConfig.tokens.forEach((tokenAndLabel) => {
                        tokensEntries.set(tokenAndLabel.token.toLocaleLowerCase(), feeParameter);
                    });
                }
            });

            // Compiler can't track the state of TypeScript map. We need to perform a undefined check even if
            // the value has been set for the integratorId previously. More discussion: https://stackoverflow.com/a/70726571
            const feeConfigByChainId = acc.get(integratorId);
            if (!feeConfigByChainId) {
                // This should never happen
                throw new Error(`${integratorId} is not set`);
            }

            feeConfigByChainId.set(chainId, {
                name: curr.name,
                feeOn: curr.feeOn,
                zeroEx: {
                    feeRecipient: curr.zeroEx.feeRecipient,
                    billingType: curr.zeroEx.billingType,
                },
                gas: {
                    feeRecipient: curr.gas.feeRecipient,
                    billingType: curr.gas.billingType,
                },
                pairsFeeEntries,
                cartesianProductFeeEntries,
                tokensEntries,
            });
            return acc;
        }, new Map</* integratorId */ string, Map</* chainId */ number, ZeroExFeeConfiguration>>());
    } catch (e) {
        throw new Error(`ZERO_EX_FEE_CONFIGURATIONS was defined but is not valid JSON per the schema: ${e}`);
    }
})();

/**
 * Values read from configuration files which provide
 * per pair fee model constants.
 */
export interface FeeModelConfiguration {
    marginRakeRatio: number; // Rake based on margin between RFQm and AMM prices. E.g. marginRakeRatio = 0.5 if we want to charge 50% of the margin.
    tradeSizeBps: number; // Base points of fee based on trade size. 1 bps = 0.01%.
}

/**
 * This interface is used to represent an individual JSON object for a given chain and pair.
 * It is only used when we read the JSON object from a file, and should not be used elsewhere.
 */
interface FeeModelConfigurationWithKey extends FeeModelConfiguration {
    chainId: number;
    tokenA: string;
    tokenB: string;
}

export type FeeModelConfigurationMap = Map<number, Map<string, FeeModelConfiguration>>;

/**
 * A nested map providing fee model constants for each token pair.
 * Use chainId as first key and pair key as the second key.
 */
export const FEE_MODEL_CONFIGURATION_MAP: FeeModelConfigurationMap = (() => {
    try {
        const feeModelConfigurations: FeeModelConfigurationWithKey[] = resolveEnvVar<FeeModelConfigurationWithKey[]>(
            'FEE_MODEL_CONFIGURATIONS',
            EnvVarType.JsonStringList,
            [],
        );
        schemaUtils.validateSchema(feeModelConfigurations, schemas.feeModelConfigurationsSchema);

        return feeModelConfigurations.reduce((acc, curr) => {
            const { chainId, tokenA, tokenB, marginRakeRatio, tradeSizeBps } = curr;
            if (!acc.has(chainId)) {
                acc.set(chainId, new Map<string, FeeModelConfiguration>());
            }
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            acc.get(chainId)!.set(toPairString(tokenA, tokenB), { marginRakeRatio, tradeSizeBps });
            return acc;
        }, new Map</* chainId */ number, Map</* pairKey */ string, FeeModelConfiguration>>());
    } catch (e) {
        throw new Error(`FEE_MODEL_CONFIGURATIONS was defined but is not valid JSON per the schema: ${e}`);
    }
})();

export const DEFAULT_FEE_MODEL_CONFIGURATION: FeeModelConfiguration = { marginRakeRatio: 0, tradeSizeBps: 0 };

/**
 * A taker-integrator of the 0x API.
 */
export interface Integrator {
    affiliateAddress?: string; // Used if present and no affiliate address is sent in the quote request
    apiKeys: string[];
    integratorId: string;
    /* IDs for chains the integrator is allowed to access RFQ liquidity on */
    allowedChainIds: number[];
    whitelistIntegratorUrls?: string[];
    whitelistMakerIds?: string[];
    label: string;
    plp: boolean;
    rfqm: boolean;
    rfqt: boolean;
    gaslessRfqtVip?: boolean;
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
    ? ChainId.Mainnet
    : assertEnvVarType('CHAIN_ID', process.env.CHAIN_ID, EnvVarType.ChainId);

export const KAFKA_BROKERS = _.isEmpty(process.env.KAFKA_BROKERS)
    ? undefined
    : assertEnvVarType('KAFKA_BROKERS', process.env.KAFKA_BROKERS, EnvVarType.StringList);

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

// API Key for Defined.fi's token price API
export const DEFINED_FI_API_KEY: string = _.isEmpty(process.env.DEFINED_FI_API_KEY)
    ? ''
    : assertEnvVarType('DEFINED_FI_API_KEY', process.env.DEFINED_FI_API_KEY, EnvVarType.NonEmptyString);

// Endpoint for Defined.fi's token price API, default to https://api.defined.fi
export const DEFINED_FI_ENDPOINT: string = _.isEmpty(process.env.DEFINED_FI_ENDPOINT)
    ? 'https://api.defined.fi'
    : assertEnvVarType('DEFINED_FI_ENDPOINT', process.env.DEFINED_FI_ENDPOINT, EnvVarType.NonEmptyString);

// API Key for 0x API (for ZeroExApiClient)
export const ZERO_EX_API_KEY: string = _.isEmpty(process.env.ZERO_EX_API_KEY)
    ? ''
    : assertEnvVarType('ZERO_EX_API_KEY', process.env.ZERO_EX_API_KEY, EnvVarType.NonEmptyString);

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const TOKEN_PRICE_ORACLE_TIMEOUT: number = 1000;

// Sampling rate of traces reported to Sentry. Should be a number between 0.0 and 1.0 (inclusive).
export const SENTRY_TRACES_SAMPLE_RATE = _.isEmpty(process.env.SENTRY_TRACES_SAMPLE_RATE)
    ? 0
    : assertEnvVarType('SENTRY_TRACES_SAMPLE_RATE', process.env.SENTRY_TRACES_SAMPLE_RATE, EnvVarType.Rate);

export const REDIS_URI = _.isEmpty(process.env.REDIS_URI) ? DEFAULT_LOCAL_REDIS_URI : process.env.REDIS_URI;

export const REDIS_BACKGROUND_JOB_URI = _.isEmpty(process.env.REDIS_BACKGROUND_JOB_URI)
    ? DEFAULT_LOCAL_REDIS_URI
    : process.env.REDIS_BACKGROUND_JOB_URI;

export const BACKGROUND_JOB_TYPES = _.isEmpty(process.env.BACKGROUND_JOB_TYPES)
    ? DEFAULT_BACKGROUND_JOB_TYPES
    : process.env.BACKGROUND_JOB_TYPES;

// Should the logger include time field in the output logs, defaults to true.
export const LOGGER_INCLUDE_TIMESTAMP = _.isEmpty(process.env.LOGGER_INCLUDE_TIMESTAMP)
    ? DEFAULT_LOGGER_INCLUDE_TIMESTAMP
    : assertEnvVarType('LOGGER_INCLUDE_TIMESTAMP', process.env.LOGGER_INCLUDE_TIMESTAMP, EnvVarType.Boolean);

export const ALT_RFQ_MM_ENDPOINT: string | undefined = _.isEmpty(process.env.ALT_RFQ_MM_ENDPOINT)
    ? undefined
    : assertEnvVarType('ALT_RFQ_MM_ENDPOINT', process.env.ALT_RFQ_MM_ENDPOINT, EnvVarType.Url);
export const ALT_RFQ_MM_API_KEY: string | undefined = _.isEmpty(process.env.ALT_RFQ_MM_API_KEY)
    ? undefined
    : assertEnvVarType('ALT_RFQ_MM_API_KEY', process.env.ALT_RFQ_MM_API_KEY, EnvVarType.NonEmptyString);
export const ALT_RFQ_MM_PROFILE: string | undefined = _.isEmpty(process.env.ALT_RFQ_MM_PROFILE)
    ? undefined
    : assertEnvVarType('ALT_RFQ_MM_PROFILE', process.env.ALT_RFQ_MM_PROFILE, EnvVarType.NonEmptyString);

export const RFQM_API_KEY_WHITELIST: Set<string> = new Set(getApiKeyWhitelistFromIntegratorsAcl('rfqm'));

export const ADMIN_API_KEY: string | undefined = _.isEmpty(process.env.ADMIN_API_KEY)
    ? undefined
    : assertEnvVarType('ADMIN_API_KEY', process.env.ADMIN_API_KEY, EnvVarType.NonEmptyString);

export const REASON_ON_STATUS_ERROR_RESPONSE_ENABLED: boolean = _.isEmpty(
    process.env.REASON_ON_STATUS_ERROR_RESPONSE_ENABLED,
)
    ? false
    : assertEnvVarType(
          'REASON_ON_STATUS_ERROR_RESPONSE_ENABLED',
          process.env.REASON_ON_STATUS_ERROR_RESPONSE_ENABLED,
          EnvVarType.Boolean,
      );

export const TAKER_SPECIFIED_SIDE_ENABLED: boolean = _.isEmpty(process.env.TAKER_SPECIFIED_SIDE_ENABLED)
    ? false
    : assertEnvVarType('TAKER_SPECIFIED_SIDE_ENABLED', process.env.TAKER_SPECIFIED_SIDE_ENABLED, EnvVarType.Boolean);

export const RFQM_MAKER_ID_SET: MakerIdSet = getMakerIdSetForOrderType('any', 'rfqm');
export const RFQT_MAKER_ID_SET_FOR_RFQ_ORDER: MakerIdSet = getMakerIdSetForOrderType('rfq', 'rfqt');
export const RFQT_MAKER_ID_SET_FOR_OTC_ORDER: MakerIdSet = getMakerIdSetForOrderType('otc', 'rfqt');
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

export const RFQM_WORKER_GROUP_INDEX: number | undefined = _.isEmpty(process.env.RFQM_WORKER_GROUP_INDEX)
    ? undefined
    : assertEnvVarType('RFQM_WORKER_GROUP_INDEX', process.env.RFQM_WORKER_GROUP_INDEX, EnvVarType.Integer);

export const RFQM_WORKER_GROUP_SIZE: number | undefined = _.isEmpty(process.env.RFQM_WORKER_GROUP_SIZE)
    ? undefined
    : assertEnvVarType('RFQM_WORKER_GROUP_SIZE', process.env.RFQM_WORKER_GROUP_SIZE, EnvVarType.Integer);

// If set to TRUE, system health will change to MAINTENANCE and integrators will be told to not
// send RFQM orders.
// tslint:disable-next-line boolean-naming
export const RFQM_MAINTENANCE_MODE: boolean = _.isEmpty(process.env.RFQM_MAINTENANCE_MODE)
    ? false
    : assertEnvVarType('RFQM_MAINTENANCE_MODE', process.env.RFQM_MAINTENANCE_MODE, EnvVarType.Boolean);

export const RFQ_PRICE_ENDPOINT_TIMEOUT_MS: number = _.isEmpty(process.env.RFQ_PRICE_ENDPOINT_TIMEOUT_MS)
    ? 1000
    : assertEnvVarType('RFQ_PRICE_ENDPOINT_TIMEOUT_MS', process.env.RFQ_PRICE_ENDPOINT_TIMEOUT_MS, EnvVarType.Integer);

export const RFQ_SIGN_ENDPOINT_TIMEOUT_MS = _.isEmpty(process.env.RFQ_SIGN_ENDPOINT_TIMEOUT_MS)
    ? 2000
    : assertEnvVarType('RFQ_SIGN_ENDPOINT_TIMEOUT_MS', process.env.RFQ_SIGN_ENDPOINT_TIMEOUT_MS, EnvVarType.Integer);

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

// tslint:disable-next-line boolean-naming
export const ENABLE_LLR_COOLDOWN: boolean = _.isEmpty(process.env.ENABLE_LLR_COOLDOWN)
    ? false
    : assertEnvVarType('ENABLE_LLR_COOLDOWN', process.env.ENABLE_LLR_COOLDOWN, EnvVarType.Boolean);

export const LLR_COOLDOWN_DURATION_SECONDS: number = _.isEmpty(process.env.LLR_COOLDOWN_DURATION_SECONDS)
    ? 60
    : assertEnvVarType('LLR_COOLDOWN_DURATION_SECONDS', process.env.LLR_COOLDOWN_DURATION_SECONDS, EnvVarType.Integer);

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

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertEnvVarType(name: string, value: any, expectedType: EnvVarType): any {
    let returnValue;
    switch (expectedType) {
        case EnvVarType.Port:
            returnValue = parseInt(value, 10);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line no-case-declarations
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
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line no-case-declarations
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
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line no-case-declarations
            const addressList = (value as string).split(',').map((a) => a.toLowerCase());
            addressList.forEach((a, i) => assert.isETHAddressHex(`${name}[${i}]`, a));
            return addressList;
        case EnvVarType.StringList:
            assert.isString(name, value);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line no-case-declarations
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
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line no-case-declarations
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

        default:
            throw new Error(`Unrecognized EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}