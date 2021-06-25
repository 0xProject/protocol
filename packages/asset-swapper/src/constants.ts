import { ChainId } from '@0x/contract-addresses';
import { SignatureType } from '@0x/protocol-utils';
import { BigNumber, logUtils } from '@0x/utils';

import {
    AffiliateFeeType,
    ExchangeProxyContractOpts,
    LogFunction,
    OrderPrunerOpts,
    OrderPrunerPermittedFeeTypes,
    RfqRequestOpts,
    SwapQuoteGetOutputOpts,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
} from './types';
import {
    DEFAULT_GET_MARKET_ORDERS_OPTS,
    DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID,
    DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID,
} from './utils/market_operation_utils/constants';

const ETH_GAS_STATION_API_URL = 'https://ethgasstation.info/api/ethgasAPI.json';
const NULL_BYTES = '0x';
const NULL_ERC20_ASSET_DATA = '0xf47261b00000000000000000000000000000000000000000000000000000000000000000';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAINNET_CHAIN_ID = 1;
const ONE_SECOND_MS = 1000;
const ONE_MINUTE_SECS = 60;
const ONE_MINUTE_MS = ONE_SECOND_MS * ONE_MINUTE_SECS;
const DEFAULT_PER_PAGE = 1000;
const ZERO_AMOUNT = new BigNumber(0);
const ALT_MM_IMPUTED_INDICATIVE_EXPIRY_SECONDS = 180;

const DEFAULT_ORDER_PRUNER_OPTS: OrderPrunerOpts = {
    expiryBufferMs: 120000, // 2 minutes
    permittedOrderFeeTypes: new Set<OrderPrunerPermittedFeeTypes>([OrderPrunerPermittedFeeTypes.NoFees]), // Default asset-swapper for CFL oriented fee types
};

// 6 seconds polling interval
const PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS = 6000;
const PROTOCOL_FEE_MULTIPLIER = new BigNumber(70000);

// default 50% buffer for selecting native orders to be aggregated with other sources
const MARKET_UTILS_AMOUNT_BUFFER_PERCENTAGE = 0.5;

const DEFAULT_SWAP_QUOTER_OPTS: SwapQuoterOpts = {
    chainId: ChainId.Mainnet,
    orderRefreshIntervalMs: 10000, // 10 seconds
    ...DEFAULT_ORDER_PRUNER_OPTS,
    samplerGasLimit: 500e7,
    ethGasStationUrl: ETH_GAS_STATION_API_URL,
    rfqt: {
        takerApiKeyWhitelist: [],
        makerAssetOfferings: {},
        txOriginBlacklist: new Set(),
    },
    tokenAdjacencyGraph: DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID[ChainId.Mainnet],
};

const DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS: ExchangeProxyContractOpts = {
    isFromETH: false,
    isToETH: false,
    affiliateFee: {
        feeType: AffiliateFeeType.None,
        recipient: NULL_ADDRESS,
        buyTokenFeeAmount: ZERO_AMOUNT,
        sellTokenFeeAmount: ZERO_AMOUNT,
    },
    refundReceiver: NULL_ADDRESS,
    isMetaTransaction: false,
    shouldSellEntireBalance: false,
};

const DEFAULT_EXCHANGE_PROXY_SWAP_QUOTE_GET_OPTS: SwapQuoteGetOutputOpts = {
    extensionContractOpts: DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
};

const DEFAULT_SWAP_QUOTE_REQUEST_OPTS: SwapQuoteRequestOpts = {
    ...DEFAULT_GET_MARKET_ORDERS_OPTS,
};

const DEFAULT_RFQT_REQUEST_OPTS: Partial<RfqRequestOpts> = {
    makerEndpointMaxResponseTimeMs: 1000,
};

export const DEFAULT_INFO_LOGGER: LogFunction = (obj, msg) =>
    logUtils.log(`${msg ? `${msg}: ` : ''}${JSON.stringify(obj)}`);
export const DEFAULT_WARNING_LOGGER: LogFunction = (obj, msg) =>
    logUtils.warn(`${msg ? `${msg}: ` : ''}${JSON.stringify(obj)}`);

const EMPTY_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const INVALID_SIGNATURE = { signatureType: SignatureType.Invalid, v: 1, r: EMPTY_BYTES32, s: EMPTY_BYTES32 };

export const POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS = new BigNumber(30000);

// tslint:disable-next-line: custom-no-magic-numbers
export const KEEP_ALIVE_TTL = 5 * 60 * ONE_SECOND_MS;

export const constants = {
    ETH_GAS_STATION_API_URL,
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
    DEFAULT_EXCHANGE_PROXY_SWAP_QUOTE_GET_OPTS,
    DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
    DEFAULT_PER_PAGE,
    DEFAULT_RFQT_REQUEST_OPTS,
    NULL_ERC20_ASSET_DATA,
    PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
    MARKET_UTILS_AMOUNT_BUFFER_PERCENTAGE,
    BRIDGE_ASSET_DATA_PREFIX: '0xdc1600f3',
    DEFAULT_INFO_LOGGER,
    DEFAULT_WARNING_LOGGER,
    EMPTY_BYTES32,
    ALT_MM_IMPUTED_INDICATIVE_EXPIRY_SECONDS,
};
