import {
    BigNumber,
    ERC20BridgeSource,
    FillData,
    FillQuoteTransformerOrderType,
    UniswapV2FillData,
} from '../../../src/asset-swapper';
import {
    AffiliateFeeAmount,
    AffiliateFeeType,
    FillBase,
    IPath,
    MarketOperation,
    MarketSellSwapQuote,
    OptimizedMarketBridgeOrder,
    OptimizedOrdersByType,
} from '../../../src/asset-swapper/types';
import { VelodromeFillData } from '../../../src/asset-swapper/utils/market_operation_utils/types';
import { NULL_ADDRESS } from '../../constants';

export const ONE_ETHER = new BigNumber(1e18);

export const NO_AFFILIATE_FEE: AffiliateFeeAmount = {
    feeType: AffiliateFeeType.None,
    recipient: NULL_ADDRESS,
    buyTokenFeeAmount: new BigNumber(0),
    sellTokenFeeAmount: new BigNumber(0),
};

const testConstants = {
    UNISWAP_V2_ROUTER: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
    SUSHI_SWAP_ROUTER: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
    VELODROME_ROUTER: '0xa132dab612db5cb9fc9ac426a0cc215a3423f9c9',
};

function createFillData({
    source,
    takerToken,
    makerToken,
}: {
    source: ERC20BridgeSource;
    takerToken: string;
    makerToken: string;
}): FillData {
    switch (source) {
        case ERC20BridgeSource.UniswapV2:
        case ERC20BridgeSource.SushiSwap: {
            const fillData: UniswapV2FillData = {
                tokenAddressPath: [takerToken, makerToken],
                router:
                    source === ERC20BridgeSource.UniswapV2
                        ? testConstants.UNISWAP_V2_ROUTER
                        : testConstants.SUSHI_SWAP_ROUTER,
            };
            return fillData;
        }
        case ERC20BridgeSource.Velodrome: {
            const fillData: VelodromeFillData = {
                router: testConstants.VELODROME_ROUTER,
                stable: false,
            };
            return fillData;
        }

        default:
            throw new Error(`createFillData: unimplemented source: ${source}`);
    }
}

function createBridgeOrder({
    source,
    takerToken,
    makerToken,
    takerAmount,
    makerAmount,
}: {
    source: ERC20BridgeSource;
    takerToken: string;
    makerToken: string;
    takerAmount: BigNumber;
    makerAmount: BigNumber;
}): OptimizedMarketBridgeOrder {
    return {
        source,
        takerToken,
        makerToken,
        takerAmount,
        makerAmount,
        type: FillQuoteTransformerOrderType.Bridge,
        fillData: createFillData({ source, takerToken, makerToken }),
        // Currently unused by the tests that depends.
        fill: undefined as unknown as FillBase,
    };
}

function createPath(ordersByType: OptimizedOrdersByType): IPath {
    const { bridgeOrders, nativeOrders, twoHopOrders } = ordersByType;
    const twoHopIndividualOrders = twoHopOrders.flatMap(({ firstHopOrder, secondHopOrder }) => [
        firstHopOrder,
        secondHopOrder,
    ]);
    0;
    const orders = [...bridgeOrders, ...nativeOrders, ...twoHopIndividualOrders];
    return {
        getOrders: () => orders,
        getSlippedOrders: () => orders,
        getOrdersByType: () => ordersByType,
        getSlippedOrdersByType: () => ordersByType,
        hasTwoHop: () => ordersByType.twoHopOrders.length > 0,
    };
}

export function createSimpleSellSwapQuoteWithBridgeOrder({
    source,
    takerToken,
    makerToken,
    takerAmount,
    makerAmount,
    slippage,
}: {
    source: ERC20BridgeSource;
    takerToken: string;
    makerToken: string;
    takerAmount: BigNumber;
    makerAmount: BigNumber;
    slippage: number;
}): MarketSellSwapQuote {
    // NOTES: consider using `slippage` to generate different amounts for `worstCaseQuoteInfo` and
    // slipped orders of `path`.
    return {
        type: MarketOperation.Sell,
        takerTokenFillAmount: takerAmount,
        takerToken,
        makerToken,
        gasPrice: new BigNumber(42000000),
        path: createPath({
            bridgeOrders: [createBridgeOrder({ source, takerToken, makerToken, takerAmount, makerAmount })],
            nativeOrders: [],
            twoHopOrders: [],
        }),
        bestCaseQuoteInfo: {
            takerAmount,
            makerAmount,
            totalTakerAmount: takerAmount,
            protocolFeeInWeiAmount: new BigNumber(0),
            gas: 42,
            slippage: 0,
        },
        worstCaseQuoteInfo: {
            takerAmount,
            makerAmount,
            totalTakerAmount: takerAmount,
            protocolFeeInWeiAmount: new BigNumber(0),
            gas: 42,
            slippage,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceBreakdown: {} as any,
        makerTokenDecimals: 18,
        takerTokenDecimals: 18,
        takerAmountPerEth: new BigNumber(0),
        makerAmountPerEth: new BigNumber(0),
        blockNumber: 424242,
    };
}
