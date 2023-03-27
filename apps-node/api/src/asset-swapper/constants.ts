import { ChainId } from '@0x/contract-addresses';
import { SignatureType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import {
    ExchangeProxyContractOpts,
    OrderPrunerOpts,
    OrderPrunerPermittedFeeTypes,
    RfqRequestOpts,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
} from './types';
import {
    DEFAULT_GET_MARKET_ORDERS_OPTS,
    DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID,
    DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID,
} from './utils/market_operation_utils/constants';

const ZERO_EX_GAS_API_URL = 'https://gas.api.0x.org/source/median';
const NULL_BYTES = '0x';
const NULL_ERC20_ASSET_DATA = '0xf47261b00000000000000000000000000000000000000000000000000000000000000000';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAINNET_CHAIN_ID = 1;
const ONE_SECOND_MS = 1000;
const ONE_MINUTE_SECS = 60;
const ONE_MINUTE_MS = ONE_SECOND_MS * ONE_MINUTE_SECS;
const DEFAULT_PER_PAGE = 1000;
const ALT_MM_IMPUTED_INDICATIVE_EXPIRY_SECONDS = 180;

const DEFAULT_ORDER_PRUNER_OPTS: OrderPrunerOpts = {
    expiryBufferMs: 120000, // 2 minutes
    permittedOrderFeeTypes: new Set<OrderPrunerPermittedFeeTypes>([OrderPrunerPermittedFeeTypes.NoFees]), // Default asset-swapper for CFL oriented fee types
};

const PROTOCOL_FEE_MULTIPLIER = new BigNumber(0);

// default 50% buffer for selecting native orders to be aggregated with other sources
const MARKET_UTILS_AMOUNT_BUFFER_PERCENTAGE = 0.5;

const ZERO_AMOUNT = new BigNumber(0);
const DEFAULT_SWAP_QUOTER_OPTS: SwapQuoterOpts = {
    chainId: ChainId.Mainnet,
    orderRefreshIntervalMs: 10000, // 10 seconds
    ...DEFAULT_ORDER_PRUNER_OPTS,
    samplerGasLimit: 500e6,
    rfqt: {
        integratorsWhitelist: [],
    },
    tokenAdjacencyGraph: DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID[ChainId.Mainnet],
};

const DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS: ExchangeProxyContractOpts = {
    isFromETH: false,
    isToETH: false,
    sellTokenAffiliateFees: [],
    buyTokenAffiliateFees: [],
    refundReceiver: NULL_ADDRESS,
    shouldSellEntireBalance: false,
};

const DEFAULT_SWAP_QUOTE_REQUEST_OPTS: SwapQuoteRequestOpts = {
    ...DEFAULT_GET_MARKET_ORDERS_OPTS,
};

const DEFAULT_RFQT_REQUEST_OPTS: Partial<RfqRequestOpts> = {
    makerEndpointMaxResponseTimeMs: 1000,
};

const EMPTY_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const INVALID_SIGNATURE = { signatureType: SignatureType.Invalid, v: 1, r: EMPTY_BYTES32, s: EMPTY_BYTES32 };

export const POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS = new BigNumber(30000);

export const constants = {
    ZERO_EX_GAS_API_URL,
    PROTOCOL_FEE_MULTIPLIER,
    POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS,
    NULL_BYTES,
    ZERO_AMOUNT,
    NULL_ADDRESS,
    MAINNET_CHAIN_ID,
    DEFAULT_ORDER_PRUNER_OPTS,
    ETHER_TOKEN_DECIMALS: 18,
    ONE_AMOUNT: new BigNumber(1),
    ONE_SECOND_MS,
    ONE_MINUTE_MS,
    DEFAULT_SWAP_QUOTER_OPTS,
    DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID,
    DEFAULT_SWAP_QUOTE_REQUEST_OPTS,
    DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
    DEFAULT_PER_PAGE,
    DEFAULT_RFQT_REQUEST_OPTS,
    NULL_ERC20_ASSET_DATA,
    MARKET_UTILS_AMOUNT_BUFFER_PERCENTAGE,
    BRIDGE_ASSET_DATA_PREFIX: '0xdc1600f3',
    EMPTY_BYTES32,
    ALT_MM_IMPUTED_INDICATIVE_EXPIRY_SECONDS,
};
