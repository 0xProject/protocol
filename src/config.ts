// tslint:disable:custom-no-magic-numbers max-file-line-count
import { assert } from '@0x/assert';
import {
    BlockParamLiteral,
    ERC20BridgeSource,
    LiquidityProviderRegistry,
    OrderPrunerPermittedFeeTypes,
    RfqtMakerAssetOfferings,
    SamplerOverrides,
    SOURCE_FLAGS,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
} from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';
import * as validateUUID from 'uuid-validate';

import {
    DEFAULT_ETH_GAS_STATION_API_URL,
    DEFAULT_EXPECTED_MINED_SEC,
    DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    DEFAULT_LOCAL_POSTGRES_URI,
    DEFAULT_LOGGER_INCLUDE_TIMESTAMP,
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    NULL_ADDRESS,
    NULL_BYTES,
    QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    TX_BASE_GAS,
} from './constants';
import { TokenMetadatasForChains } from './token_metadatas_for_networks';
import { ChainId, HttpServiceConfig, MetaTransactionRateLimitConfig } from './types';
import { parseUtils } from './utils/parse_utils';
import { getTokenMetadataIfExists } from './utils/token_metadata_utils';

enum EnvVarType {
    AddressList,
    StringList,
    Integer,
    Port,
    KeepAliveTimeout,
    ChainId,
    ETHAddressHex,
    UnitAmount,
    Url,
    UrlList,
    WhitelistAllTokens,
    Boolean,
    FeeAssetData,
    NonEmptyString,
    APIKeys,
    PrivateKeys,
    RfqtMakerAssetOfferings,
    RateLimitConfig,
    LiquidityProviderRegistry,
    JsonStringList,
}

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
    ? TokenMetadatasForChains.map(tm => tm.tokenAddresses[CHAIN_ID])
    : assertEnvVarType('WHITELIST_ALL_TOKENS', process.env.WHITELIST_ALL_TOKENS, EnvVarType.WhitelistAllTokens);

// Ignored addresses. These are ignored at the ingress (Mesh) level and are never stored.
export const MESH_IGNORED_ADDRESSES: string[] = _.isEmpty(process.env.MESH_IGNORED_ADDRESSES)
    ? []
    : assertEnvVarType('MESH_IGNORED_ADDRESSES', process.env.MESH_IGNORED_ADDRESSES, EnvVarType.AddressList);

// Ignored addresses only for Swap endpoints (still present in database and SRA).
export const SWAP_IGNORED_ADDRESSES: string[] = _.isEmpty(process.env.SWAP_IGNORED_ADDRESSES)
    ? []
    : assertEnvVarType('SWAP_IGNORED_ADDRESSES', process.env.SWAP_IGNORED_ADDRESSES, EnvVarType.AddressList);

// MMer addresses whose orders should be pinned to the Mesh node
export const PINNED_POOL_IDS: string[] = _.isEmpty(process.env.PINNED_POOL_IDS)
    ? []
    : assertEnvVarType('PINNED_POOL_IDS', process.env.PINNED_POOL_IDS, EnvVarType.StringList);

// MMer addresses whose orders should be pinned to the Mesh node
export const PINNED_MM_ADDRESSES: string[] = _.isEmpty(process.env.PINNED_MM_ADDRESSES)
    ? []
    : assertEnvVarType('PINNED_MM_ADDRESSES', process.env.PINNED_MM_ADDRESSES, EnvVarType.AddressList);

// Ethereum RPC Url
export const ETHEREUM_RPC_URL = assertEnvVarType('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL, EnvVarType.Url);

// Mesh Endpoint
export const MESH_WEBSOCKET_URI = _.isEmpty(process.env.MESH_WEBSOCKET_URI)
    ? 'ws://localhost:60557'
    : assertEnvVarType('MESH_WEBSOCKET_URI', process.env.MESH_WEBSOCKET_URI, EnvVarType.Url);
export const MESH_HTTP_URI = _.isEmpty(process.env.MESH_HTTP_URI)
    ? undefined
    : assertEnvVarType('assertEnvVarType', process.env.MESH_HTTP_URI, EnvVarType.Url);
// The fee recipient for orders
export const FEE_RECIPIENT_ADDRESS = _.isEmpty(process.env.FEE_RECIPIENT_ADDRESS)
    ? NULL_ADDRESS
    : assertEnvVarType('FEE_RECIPIENT_ADDRESS', process.env.FEE_RECIPIENT_ADDRESS, EnvVarType.ETHAddressHex);
// A flat fee that should be charged to the order maker
export const MAKER_FEE_UNIT_AMOUNT = _.isEmpty(process.env.MAKER_FEE_UNIT_AMOUNT)
    ? new BigNumber(0)
    : assertEnvVarType('MAKER_FEE_UNIT_AMOUNT', process.env.MAKER_FEE_UNIT_AMOUNT, EnvVarType.UnitAmount);
// A flat fee that should be charged to the order taker
export const TAKER_FEE_UNIT_AMOUNT = _.isEmpty(process.env.TAKER_FEE_UNIT_AMOUNT)
    ? new BigNumber(0)
    : assertEnvVarType('TAKER_FEE_UNIT_AMOUNT', process.env.TAKER_FEE_UNIT_AMOUNT, EnvVarType.UnitAmount);
// The maker fee token encoded as asset data
export const MAKER_FEE_ASSET_DATA = _.isEmpty(process.env.MAKER_FEE_ASSET_DATA)
    ? NULL_BYTES
    : assertEnvVarType('MAKER_FEE_ASSET_DATA', process.env.MAKER_FEE_ASSET_DATA, EnvVarType.FeeAssetData);
// The taker fee token encoded as asset data
export const TAKER_FEE_ASSET_DATA = _.isEmpty(process.env.TAKER_FEE_ASSET_DATA)
    ? NULL_BYTES
    : assertEnvVarType('TAKER_FEE_ASSET_DATA', process.env.TAKER_FEE_ASSET_DATA, EnvVarType.FeeAssetData);

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

export const RFQT_REGISTRY_PASSWORDS: string[] = _.isEmpty(process.env.RFQT_REGISTRY_PASSWORDS)
    ? []
    : assertEnvVarType('RFQT_REGISTRY_PASSWORDS', process.env.RFQT_REGISTRY_PASSWORDS, EnvVarType.JsonStringList);

export const RFQT_API_KEY_WHITELIST: string[] = _.isEmpty(process.env.RFQT_API_KEY_WHITELIST_JSON)
    ? []
    : assertEnvVarType(
          'RFQT_API_KEY_WHITELIST_JSON',
          process.env.RFQT_API_KEY_WHITELIST_JSON,
          EnvVarType.JsonStringList,
      );

export const PLP_API_KEY_WHITELIST: string[] = _.isEmpty(process.env.PLP_API_KEY_WHITELIST_JSON)
    ? []
    : assertEnvVarType('PLP_API_KEY_WHITELIST_JSON', process.env.PLP_API_KEY_WHITELIST_JSON, EnvVarType.JsonStringList);

export const RFQT_MAKER_ASSET_OFFERINGS: RfqtMakerAssetOfferings = _.isEmpty(process.env.RFQT_MAKER_ASSET_OFFERINGS)
    ? {}
    : assertEnvVarType(
          'RFQT_MAKER_ASSET_OFFERINGS',
          process.env.RFQT_MAKER_ASSET_OFFERINGS,
          EnvVarType.RfqtMakerAssetOfferings,
      );

// tslint:disable-next-line:boolean-naming
export const RFQT_REQUEST_MAX_RESPONSE_MS = 600;

// Whitelisted 0x API keys that can post orders to the SRA and have them persist indefinitely
export const SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS: string[] =
    process.env.SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS === undefined
        ? []
        : assertEnvVarType(
              'SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS',
              process.env.SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS,
              EnvVarType.APIKeys,
          );

// Whitelisted 0x API keys that can use the meta-txn /submit endpoint
export const META_TXN_SUBMIT_WHITELISTED_API_KEYS: string[] =
    process.env.META_TXN_SUBMIT_WHITELISTED_API_KEYS === undefined
        ? []
        : assertEnvVarType(
              'META_TXN_SUBMIT_WHITELISTED_API_KEYS',
              process.env.META_TXN_SUBMIT_WHITELISTED_API_KEYS,
              EnvVarType.APIKeys,
          );

// The meta-txn relay sender private keys managed by the TransactionWatcher
export const META_TXN_RELAY_PRIVATE_KEYS: string[] = _.isEmpty(process.env.META_TXN_RELAY_PRIVATE_KEYS)
    ? []
    : assertEnvVarType('META_TXN_RELAY_PRIVATE_KEYS', process.env.META_TXN_RELAY_PRIVATE_KEYS, EnvVarType.StringList);

// The expected time for a meta-txn to be included in a block.
export const META_TXN_RELAY_EXPECTED_MINED_SEC: number = _.isEmpty(process.env.META_TXN_RELAY_EXPECTED_MINED_SEC)
    ? DEFAULT_EXPECTED_MINED_SEC
    : assertEnvVarType(
          'META_TXN_RELAY_EXPECTED_MINED_SEC',
          process.env.META_TXN_RELAY_EXPECTED_MINED_SEC,
          EnvVarType.Integer,
      );
// Should TransactionWatcherSignerService sign transactions
// tslint:disable-next-line:boolean-naming
export const META_TXN_SIGNING_ENABLED: boolean = _.isEmpty(process.env.META_TXN_SIGNING_ENABLED)
    ? true
    : assertEnvVarType('META_TXN_SIGNING_ENABLED', process.env.META_TXN_SIGNING_ENABLED, EnvVarType.Boolean);
// The maximum gas price (in gwei) the service will allow
export const META_TXN_MAX_GAS_PRICE_GWEI: BigNumber = _.isEmpty(process.env.META_TXN_MAX_GAS_PRICE_GWEI)
    ? new BigNumber(50)
    : assertEnvVarType('META_TXN_MAX_GAS_PRICE_GWEI', process.env.META_TXN_MAX_GAS_PRICE_GWEI, EnvVarType.UnitAmount);

export const META_TXN_RATE_LIMITER_CONFIG: MetaTransactionRateLimitConfig | undefined = _.isEmpty(
    process.env.META_TXN_RATE_LIMIT_TYPE,
)
    ? undefined
    : assertEnvVarType(
          'META_TXN_RATE_LIMITER_CONFIG',
          process.env.META_TXN_RATE_LIMITER_CONFIG,
          EnvVarType.RateLimitConfig,
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

// If true, Price-Aware RFQ feature will be enabled for RFQ-enabled requests
// tslint:disable-next-line:boolean-naming
export const FIRM_PRICE_AWARE_RFQ_ENABLED: boolean = _.isEmpty(process.env.FIRM_PRICE_AWARE_RFQ_ENABLED)
    ? false
    : assertEnvVarType('FIRM_PRICE_AWARE_RFQ_ENABLED', process.env.FIRM_PRICE_AWARE_RFQ_ENABLED, EnvVarType.Boolean);

// tslint:disable-next-line: boolean-naming
export const INDICATIVE_PRICE_AWARE_RFQ_ENABLED: boolean = _.isEmpty(process.env.INDICATIVE_PRICE_AWARE_RFQ_ENABLED)
    ? false
    : assertEnvVarType(
          'INDICATIVE_PRICE_AWARE_RFQ_ENABLED',
          process.env.INDICATIVE_PRICE_AWARE_RFQ_ENABLED,
          EnvVarType.Boolean,
      );

// Max number of entities per page
export const MAX_PER_PAGE = 1000;
// Default ERC20 token precision
export const DEFAULT_ERC20_TOKEN_PRECISION = 18;

export const PROTOCOL_FEE_MULTIPLIER = new BigNumber(70000);

export const RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER = 1.2;

const EXCLUDED_SOURCES = (() => {
    const allERC20BridgeSources = Object.values(ERC20BridgeSource);
    switch (CHAIN_ID) {
        case ChainId.Mainnet:
            return [ERC20BridgeSource.MultiBridge];
        case ChainId.Kovan:
            return allERC20BridgeSources.filter(
                s => s !== ERC20BridgeSource.Native && s !== ERC20BridgeSource.UniswapV2,
            );
        default:
            return allERC20BridgeSources.filter(s => s !== ERC20BridgeSource.Native);
    }
})();

const EXCLUDED_FEE_SOURCES = (() => {
    switch (CHAIN_ID) {
        case ChainId.Mainnet:
            return [];
        case ChainId.Kovan:
            return [ERC20BridgeSource.Uniswap];
        default:
            return [ERC20BridgeSource.Uniswap, ERC20BridgeSource.UniswapV2];
    }
})();

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS: Partial<SwapQuoteRequestOpts> = {
    excludedSources: EXCLUDED_SOURCES,
    excludedFeeSources: EXCLUDED_FEE_SOURCES,
    bridgeSlippage: DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    maxFallbackSlippage: DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    numSamples: 13,
    sampleDistributionBase: 1.05,
    exchangeProxyOverhead: (sourceFlags: number) => {
        if ([SOURCE_FLAGS.Uniswap_V2, SOURCE_FLAGS.SushiSwap].includes(sourceFlags)) {
            return TX_BASE_GAS;
        } else if (SOURCE_FLAGS.LiquidityProvider === sourceFlags) {
            return TX_BASE_GAS.plus(10e3);
        } else {
            return new BigNumber(150e3);
        }
    },
    runLimit: 2 ** 8,
    shouldGenerateQuoteReport: false,
};

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP: Partial<SwapQuoteRequestOpts> = {
    ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    exchangeProxyOverhead: () => new BigNumber(150e3),
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

export const DEFAULT_INTERMEDIATE_TOKENS = [
    getTokenMetadataIfExists('WETH', CHAIN_ID)?.tokenAddress,
    getTokenMetadataIfExists('DAI', CHAIN_ID)?.tokenAddress,
    getTokenMetadataIfExists('USDC', CHAIN_ID)?.tokenAddress,
    getTokenMetadataIfExists('USDT', CHAIN_ID)?.tokenAddress,
    getTokenMetadataIfExists('WBTC', CHAIN_ID)?.tokenAddress,
].filter(t => t) as string[];

export const SWAP_QUOTER_OPTS: Partial<SwapQuoterOpts> = {
    chainId: CHAIN_ID,
    expiryBufferMs: QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    rfqt: {
        takerApiKeyWhitelist: RFQT_API_KEY_WHITELIST,
        makerAssetOfferings: RFQT_MAKER_ASSET_OFFERINGS,
    },
    ethGasStationUrl: ETH_GAS_STATION_API_URL,
    permittedOrderFeeTypes: new Set([OrderPrunerPermittedFeeTypes.NoFees]),
    samplerOverrides: SAMPLER_OVERRIDES,
    tokenAdjacencyGraph: { default: DEFAULT_INTERMEDIATE_TOKENS },
    liquidityProviderRegistry: LIQUIDITY_PROVIDER_REGISTRY,
};

export const defaultHttpServiceConfig: HttpServiceConfig = {
    httpPort: HTTP_PORT,
    healthcheckHttpPort: HEALTHCHECK_HTTP_PORT,
    ethereumRpcUrl: ETHEREUM_RPC_URL,
    httpKeepAliveTimeout: HTTP_KEEP_ALIVE_TIMEOUT,
    httpHeadersTimeout: HTTP_HEADERS_TIMEOUT,
    enablePrometheusMetrics: ENABLE_PROMETHEUS_METRICS,
    prometheusPort: PROMETHEUS_PORT,
    meshWebsocketUri: MESH_WEBSOCKET_URI,
    meshHttpUri: MESH_HTTP_URI,
};

export const defaultHttpServiceWithRateLimiterConfig: HttpServiceConfig = {
    ...defaultHttpServiceConfig,
    metaTxnRateLimiters: META_TXN_RATE_LIMITER_CONFIG,
};

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
        case EnvVarType.AddressList:
            assert.isString(name, value);
            const addressList = (value as string).split(',').map(a => a.toLowerCase());
            addressList.forEach((a, i) => assert.isETHAddressHex(`${name}[${i}]`, a));
            return addressList;
        case EnvVarType.StringList:
            assert.isString(name, value);
            const stringList = (value as string).split(',');
            return stringList;
        case EnvVarType.WhitelistAllTokens:
            return '*';
        case EnvVarType.FeeAssetData:
            assert.isString(name, value);
            return value;
        case EnvVarType.NonEmptyString:
            assert.isString(name, value);
            if (value === '') {
                throw new Error(`${name} must be supplied`);
            }
            return value;
        case EnvVarType.RateLimitConfig:
            assert.isString(name, value);
            return parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(value);
        case EnvVarType.APIKeys:
            assert.isString(name, value);
            const apiKeys = (value as string).split(',');
            apiKeys.forEach(apiKey => {
                const isValidUUID = validateUUID(apiKey);
                if (!isValidUUID) {
                    throw new Error(`API Key ${apiKey} isn't UUID compliant`);
                }
            });
            return apiKeys;
        case EnvVarType.JsonStringList:
            assert.isString(name, value);
            return JSON.parse(value);
        case EnvVarType.RfqtMakerAssetOfferings:
            const offerings: RfqtMakerAssetOfferings = JSON.parse(value);
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

                const { tokens, gasCost } = registry[liquidityProvider];
                assert.isArray(`token list for liquidity provider ${liquidityProvider}`, tokens);
                tokens.forEach((token, i) => {
                    assert.isETHAddressHex(`address of token ${i} for liquidity provider ${liquidityProvider}`, token);
                });
                assert.isNumber(`gas cost for liquidity provider ${liquidityProvider}`, gasCost);
            }
            return registry;

        default:
            throw new Error(`Unrecognised EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}
