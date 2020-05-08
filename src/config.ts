// tslint:disable:custom-no-magic-numbers
import { assert } from '@0x/assert';
import { ERC20BridgeSource, RfqtMakerAssetOfferings, SwapQuoteRequestOpts } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';
import * as validateUUID from 'uuid-validate';

import {
    DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    DEFAULT_LOCAL_POSTGRES_URI,
    DEFAULT_LOGGER_INCLUDE_TIMESTAMP,
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    DEFAULT_RFQT_SKIP_BUY_REQUESTS,
    NULL_ADDRESS,
    NULL_BYTES,
} from './constants';
import { TokenMetadatasForChains } from './token_metadatas_for_networks';
import { ChainId } from './types';

enum EnvVarType {
    AddressList,
    StringList,
    Port,
    KeepAliveTimeout,
    ChainId,
    ETHAddressHex,
    UnitAmount,
    Url,
    WhitelistAllTokens,
    Boolean,
    FeeAssetData,
    NonEmptyString,
    APIKeys,
    RfqtMakerAssetOfferings,
}

// Network port to listen on
export const HTTP_PORT = _.isEmpty(process.env.HTTP_PORT)
    ? 3000
    : assertEnvVarType('HTTP_PORT', process.env.HTTP_PORT, EnvVarType.Port);

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
// Should the logger include time field in the output logs, defaults to true.
export const LOGGER_INCLUDE_TIMESTAMP = _.isEmpty(process.env.LOGGER_INCLUDE_TIMESTAMP)
    ? DEFAULT_LOGGER_INCLUDE_TIMESTAMP
    : assertEnvVarType('LOGGER_INCLUDE_TIMESTAMP', process.env.LOGGER_INCLUDE_TIMESTAMP, EnvVarType.Boolean);

export const LIQUIDITY_POOL_REGISTRY_ADDRESS: string | undefined = _.isEmpty(
    process.env.LIQUIDITY_POOL_REGISTRY_ADDRESS,
)
    ? undefined
    : assertEnvVarType(
          'LIQUIDITY_POOL_REGISTRY_ADDRESS',
          process.env.LIQUIDITY_POOL_REGISTRY_ADDRESS,
          EnvVarType.ETHAddressHex,
      );

export const RFQT_API_KEY_WHITELIST: string[] = _.isEmpty(process.env.RFQT_API_KEY_WHITELIST)
    ? []
    : assertEnvVarType('RFQT_API_KEY_WHITELIST', process.env.RFQT_API_KEY_WHITELIST, EnvVarType.StringList);

export const RFQT_MAKER_ASSET_OFFERINGS: RfqtMakerAssetOfferings = _.isEmpty(process.env.RFQT_MAKER_ASSET_OFFERINGS)
    ? {}
    : assertEnvVarType(
          'RFQT_MAKER_ASSET_OFFERINGS',
          process.env.RFQT_MAKER_ASSET_OFFERINGS,
          EnvVarType.RfqtMakerAssetOfferings,
      );

// tslint:disable-next-line:boolean-naming
export const RFQT_SKIP_BUY_REQUESTS: boolean = _.isEmpty(process.env.RFQT_SKIP_BUY_REQUESTS)
    ? DEFAULT_RFQT_SKIP_BUY_REQUESTS
    : assertEnvVarType('RFQT_SKIP_BUY_REQUESTS', process.env.RFQT_SKIP_BUY_REQUESTS, EnvVarType.Boolean);

// Whitelisted 0x API keys that can use the meta-txn /submit endpoint
export const WHITELISTED_API_KEYS_META_TXN_SUBMIT: string[] =
    process.env.WHITELISTED_API_KEYS_META_TXN_SUBMIT === undefined
        ? []
        : assertEnvVarType(
              'WHITELISTED_API_KEYS_META_TXN_SUBMIT',
              process.env.WHITELISTED_API_KEYS_META_TXN_SUBMIT,
              EnvVarType.APIKeys,
          );

// The meta-txn relay sender address
export const META_TXN_RELAY_ADDRESS = _.isEmpty(process.env.META_TXN_RELAY_ADDRESS)
    ? NULL_ADDRESS
    : assertEnvVarType('META_TXN_RELAY_ADDRESS', process.env.META_TXN_RELAY_ADDRESS, EnvVarType.ETHAddressHex);

// The meta-txn relay sender private key
export const META_TXN_RELAY_PRIVATE_KEY = _.isEmpty(process.env.META_TXN_RELAY_PRIVATE_KEY)
    ? undefined
    : assertEnvVarType('META_TXN_RELAY_PRIVATE_KEY', process.env.META_TXN_RELAY_PRIVATE_KEY, EnvVarType.NonEmptyString);

// Max number of entities per page
export const MAX_PER_PAGE = 1000;
// Default ERC20 token precision
export const DEFAULT_ERC20_TOKEN_PRECISION = 18;

const EXCLUDED_SOURCES = (() => {
    switch (CHAIN_ID) {
        case ChainId.Mainnet:
            return [];
        case ChainId.Kovan:
            return [ERC20BridgeSource.Kyber];
        default:
            return [ERC20BridgeSource.Eth2Dai, ERC20BridgeSource.Kyber, ERC20BridgeSource.Uniswap];
    }
})();

const gasSchedule: { [key in ERC20BridgeSource]: number } = {
    [ERC20BridgeSource.Native]: 1.5e5,
    [ERC20BridgeSource.Uniswap]: 3e5,
    [ERC20BridgeSource.LiquidityProvider]: 3e5,
    [ERC20BridgeSource.Eth2Dai]: 5.5e5,
    [ERC20BridgeSource.Kyber]: 8e5,
    [ERC20BridgeSource.CurveUsdcDai]: 9e5,
    [ERC20BridgeSource.CurveUsdcDaiUsdt]: 9e5,
    [ERC20BridgeSource.CurveUsdcDaiUsdtTusd]: 10e5,
    [ERC20BridgeSource.CurveUsdcDaiUsdtBusd]: 10e5,
    [ERC20BridgeSource.CurveUsdcDaiUsdtSusd]: 6e5,
};

const feeSchedule: { [key in ERC20BridgeSource]: BigNumber } = Object.assign(
    {},
    ...(Object.keys(gasSchedule) as ERC20BridgeSource[]).map(k => ({
        [k]: new BigNumber(gasSchedule[k] + 1.5e5),
    })),
);

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS: Partial<SwapQuoteRequestOpts> = {
    excludedSources: EXCLUDED_SOURCES,
    bridgeSlippage: DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    maxFallbackSlippage: DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    numSamples: 13,
    sampleDistributionBase: 1.05,
    feeSchedule,
    gasSchedule,
};

function assertEnvVarType(name: string, value: any, expectedType: EnvVarType): any {
    let returnValue;
    switch (expectedType) {
        case EnvVarType.Port:
            try {
                returnValue = parseInt(value, 10);
                const isWithinRange = returnValue >= 0 && returnValue <= 65535;
                if (!isWithinRange) {
                    throw new Error();
                }
            } catch (err) {
                throw new Error(`${name} must be between 0 to 65535, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.KeepAliveTimeout:
            try {
                returnValue = parseInt(value, 10);
            } catch (err) {
                throw new Error(`${name} must be a valid integer, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.ChainId:
            try {
                returnValue = parseInt(value, 10);
            } catch (err) {
                throw new Error(`${name} must be a valid integer, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.ETHAddressHex:
            assert.isETHAddressHex(name, value);
            return value;
        case EnvVarType.Url:
            assert.isUri(name, value);
            return value;
        case EnvVarType.Boolean:
            return value === 'true';
        case EnvVarType.UnitAmount:
            try {
                returnValue = new BigNumber(parseFloat(value));
                if (returnValue.isNegative()) {
                    throw new Error();
                }
            } catch (err) {
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

        default:
            throw new Error(`Unrecognised EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}
