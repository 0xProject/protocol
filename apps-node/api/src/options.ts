import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import {
    BlockParamLiteral,
    DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID,
    OrderPrunerPermittedFeeTypes,
    SamplerOverrides,
    SOURCE_FLAGS,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
    SwapQuoterRfqOpts,
} from './asset-swapper';
import {
    CHAIN_ID,
    RFQT_INTEGRATORS,
    RFQT_TX_ORIGIN_BLACKLIST,
    SAMPLE_DISTRIBUTION_BASE,
    ZERO_EX_GAS_API_URL,
} from './config';
import { DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE, QUOTE_ORDER_EXPIRATION_BUFFER_MS, TX_BASE_GAS } from './constants';

const FILL_QUOTE_TRANSFORMER_GAS_OVERHEAD = new BigNumber(150e3);
const EXCHANGE_PROXY_OVERHEAD_NO_VIP = () => FILL_QUOTE_TRANSFORMER_GAS_OVERHEAD;
const MULTIPLEX_BATCH_FILL_SOURCE_FLAGS =
    SOURCE_FLAGS.Uniswap_V2 |
    SOURCE_FLAGS.SushiSwap |
    SOURCE_FLAGS.RfqOrder |
    SOURCE_FLAGS.Uniswap_V3 |
    SOURCE_FLAGS.OtcOrder;
const MULTIPLEX_MULTIHOP_FILL_SOURCE_FLAGS = SOURCE_FLAGS.Uniswap_V2 | SOURCE_FLAGS.SushiSwap | SOURCE_FLAGS.Uniswap_V3;
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
    } else if (SOURCE_FLAGS.RfqOrder === sourceFlags) {
        // RFQ VIP
        return TX_BASE_GAS.plus(5e3);
    } else if (SOURCE_FLAGS.OtcOrder === sourceFlags) {
        // OtcOrder VIP
        // NOTE: Should be 15k cheaper after the first tx from txOrigin than RfqOrder
        // Use 5k less for now as not to over bias
        return TX_BASE_GAS;
    } else if ((MULTIPLEX_BATCH_FILL_SOURCE_FLAGS | sourceFlags) === MULTIPLEX_BATCH_FILL_SOURCE_FLAGS) {
        if ((sourceFlags & SOURCE_FLAGS.OtcOrder) === SOURCE_FLAGS.OtcOrder) {
            // Multiplex that has OtcOrder
            return TX_BASE_GAS.plus(10e3);
        }
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

const NUM_SAMPLES = 40;
// TODO(kimpers): Due to an issue with the Rust router we want to use equidistant samples when using the Rust router

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS: Partial<SwapQuoteRequestOpts> = {
    bridgeSlippage: DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    numSamples: NUM_SAMPLES,
    sampleDistributionBase: SAMPLE_DISTRIBUTION_BASE,
    neonRouterNumSamples: NUM_SAMPLES + 1,
    exchangeProxyOverhead: EXCHANGE_PROXY_OVERHEAD_FULLY_FEATURED,
    shouldGenerateQuoteReport: true,
};

export const ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP: Partial<SwapQuoteRequestOpts> = {
    ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    exchangeProxyOverhead: EXCHANGE_PROXY_OVERHEAD_NO_VIP,
};

const SAMPLER_OVERRIDES: SamplerOverrides | undefined = (() => {
    switch (CHAIN_ID) {
        case ChainId.Ganache:
            return { overrides: {}, block: BlockParamLiteral.Latest };
        default:
            return undefined;
    }
})();

const SWAP_QUOTER_RFQT_OPTS: SwapQuoterRfqOpts = {
    integratorsWhitelist: RFQT_INTEGRATORS,
    txOriginBlacklist: RFQT_TX_ORIGIN_BLACKLIST,
};

export const SWAP_QUOTER_OPTS: Partial<SwapQuoterOpts> = {
    chainId: CHAIN_ID,
    expiryBufferMs: QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    rfqt: SWAP_QUOTER_RFQT_OPTS,
    zeroExGasApiUrl: ZERO_EX_GAS_API_URL,
    permittedOrderFeeTypes: new Set([OrderPrunerPermittedFeeTypes.NoFees]),
    samplerOverrides: SAMPLER_OVERRIDES,
    tokenAdjacencyGraph: DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID[CHAIN_ID],
};
