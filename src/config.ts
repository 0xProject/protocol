// tslint:disable:custom-no-magic-numbers
import { assert } from '@0x/assert';
import { ERC20BridgeSource, SwapQuoteRequestOpts } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import {
    DEFAULT_LOCAL_POSTGRES_URI,
    DEFAULT_LOGGER_INCLUDE_TIMESTAMP,
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    NULL_ADDRESS,
    NULL_BYTES,
} from './constants';
import { TokenMetadatasForChains } from './token_metadatas_for_networks';
import { ChainId } from './types';

enum EnvVarType {
    AddressList,
    Port,
    ChainId,
    ETHAddressHex,
    UnitAmount,
    Url,
    WhitelistAllTokens,
    Boolean,
    FeeAssetData,
}

// Network port to listen on
export const HTTP_PORT = _.isEmpty(process.env.HTTP_PORT)
    ? 3000
    : assertEnvVarType('HTTP_PORT', process.env.HTTP_PORT, EnvVarType.Port);
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

const sourceFees: { [key in ERC20BridgeSource]: BigNumber } = {
    [ERC20BridgeSource.Uniswap]: new BigNumber(2.5e5),
    [ERC20BridgeSource.Native]: new BigNumber(3e5),
    [ERC20BridgeSource.CurveUsdcDai]: new BigNumber(4e5),
    [ERC20BridgeSource.Eth2Dai]: new BigNumber(5e5),
    [ERC20BridgeSource.CurveUsdcDaiUsdt]: new BigNumber(5e5),
    [ERC20BridgeSource.CurveUsdcDaiUsdtTusd]: new BigNumber(8e5),
    [ERC20BridgeSource.CurveUsdcDaiUsdtBusd]: new BigNumber(8e5),
    [ERC20BridgeSource.Kyber]: new BigNumber(8e5),
    [ERC20BridgeSource.LiquidityProvider]: new BigNumber(8e5),
};

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS: Partial<SwapQuoteRequestOpts> = {
    noConflicts: true,
    excludedSources: EXCLUDED_SOURCES,
    runLimit: 2 ** 15,
    bridgeSlippage: DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    slippagePercentage: DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    dustFractionThreshold: 0.0025,
    numSamples: 13,
    sampleDistributionBase: 1.05,
    fees: sourceFees,
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
        case EnvVarType.WhitelistAllTokens:
            return '*';
        case EnvVarType.FeeAssetData:
            assert.isString(name, value);
            return value;
        default:
            throw new Error(`Unrecognised EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}
