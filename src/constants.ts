import { ERC20BridgeSource, SwapQuoteRequestOpts } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';

import { CHAIN_ID } from './config';
import { ChainId } from './types';

// tslint:disable:custom-no-magic-numbers

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_BYTES = '0x';
export const ZRX_DECIMALS = 18;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const ZERO = new BigNumber(0);
export const MAX_TOKEN_SUPPLY_POSSIBLE = new BigNumber(2).pow(256);
export const DEFAULT_LOCAL_POSTGRES_URI = 'postgresql://api:api@localhost/api';
export const DEFAULT_LOGGER_INCLUDE_TIMESTAMP = true;
export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = ONE_SECOND_MS * 60;
export const TEN_MINUTES_MS = ONE_MINUTE_MS * 10;

// Swap Quoter
export const QUOTE_ORDER_EXPIRATION_BUFFER_MS = ONE_SECOND_MS * 30; // Ignore orders that expire in 30 seconds
export const DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE = 0.2; // 20% Slippage
export const ETH_SYMBOL = 'ETH';
export const ADDRESS_HEX_LENGTH = 42;
export const DEFAULT_TOKEN_DECIMALS = 18;
export const FIRST_PAGE = 1;
export const ASSET_SWAPPER_MARKET_ORDERS_OPTS: Partial<SwapQuoteRequestOpts> = {
    noConflicts: true,
    excludedSources:
        CHAIN_ID === ChainId.Mainnet
            ? []
            : [ERC20BridgeSource.Eth2Dai, ERC20BridgeSource.Kyber, ERC20BridgeSource.Uniswap],
    numSamples: 10,
    runLimit: 4096,
    bridgeSlippage: 0.0005,
};

// API namespaces
export const SRA_PATH = '/sra/v3';
export const STAKING_PATH = '/staking/v0';
export const SWAP_PATH = '/swap/v0';
