import { BridgeSource, FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { AbiEncoder, BigNumber } from '@0x/utils';

import { AssetSwapperContractAddresses, MarketOperation } from '../../types';

import { MAX_UINT256, ZERO_AMOUNT } from './constants';
import {
    AggregationError,
    BalancerFillData,
    BancorFillData,
    CollapsedFill,
    CurveFillData,
    DexSample,
    DODOFillData,
    ERC20BridgeSource,
    GenericRouterFillData,
    KyberFillData,
    LiquidityProviderFillData,
    MooniswapFillData,
    MultiHopFillData,
    NativeCollapsedFill,
    NativeLimitOrderFillData,
    NativeRfqOrderFillData,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    OptimizedMarketOrderBase,
    OrderDomain,
    ShellFillData,
    SnowSwapFillData,
    SwerveFillData,
    UniswapV2FillData,
} from './types';

// tslint:disable completed-docs

export interface CreateOrderFromPathOpts {
    side: MarketOperation;
    inputToken: string;
    outputToken: string;
    orderDomain: OrderDomain;
    contractAddresses: AssetSwapperContractAddresses;
    bridgeSlippage: number;
}

export function createOrdersFromTwoHopSample(
    sample: DexSample<MultiHopFillData>,
    opts: CreateOrderFromPathOpts,
): OptimizedMarketOrder[] {
    const [makerToken, takerToken] = getMakerTakerTokens(opts);
    const { firstHopSource, secondHopSource, intermediateToken } = sample.fillData;
    const firstHopFill: CollapsedFill = {
        sourcePathId: '',
        source: firstHopSource.source,
        type: FillQuoteTransformerOrderType.Bridge,
        input: opts.side === MarketOperation.Sell ? sample.input : ZERO_AMOUNT,
        output: opts.side === MarketOperation.Sell ? ZERO_AMOUNT : sample.output,
        subFills: [],
        fillData: firstHopSource.fillData,
    };
    const secondHopFill: CollapsedFill = {
        sourcePathId: '',
        source: secondHopSource.source,
        type: FillQuoteTransformerOrderType.Bridge,
        input: opts.side === MarketOperation.Sell ? MAX_UINT256 : sample.input,
        output: opts.side === MarketOperation.Sell ? sample.output : MAX_UINT256,
        subFills: [],
        fillData: secondHopSource.fillData,
    };
    return [
        createBridgeOrder(firstHopFill, intermediateToken, takerToken, opts.side),
        createBridgeOrder(secondHopFill, makerToken, intermediateToken, opts.side),
    ];
}

export function getERC20BridgeSourceToBridgeSource(source: ERC20BridgeSource): BridgeSource {
    switch (source) {
        case ERC20BridgeSource.Balancer:
            return BridgeSource.Balancer;
        case ERC20BridgeSource.Bancor:
            return BridgeSource.Bancor;
        // case ERC20BridgeSource.CoFiX:
        //    return BridgeSource.CoFiX;
        case ERC20BridgeSource.Curve:
            return BridgeSource.Curve;
        case ERC20BridgeSource.Cream:
            return BridgeSource.Cream;
        case ERC20BridgeSource.CryptoCom:
            return BridgeSource.CryptoCom;
        case ERC20BridgeSource.Dodo:
            return BridgeSource.Dodo;
        case ERC20BridgeSource.Kyber:
            return BridgeSource.Kyber;
        case ERC20BridgeSource.LiquidityProvider:
            return BridgeSource.LiquidityProvider;
        case ERC20BridgeSource.Mooniswap:
            return BridgeSource.Mooniswap;
        case ERC20BridgeSource.MStable:
            return BridgeSource.MStable;
        case ERC20BridgeSource.Eth2Dai:
            return BridgeSource.Oasis;
        case ERC20BridgeSource.Shell:
            return BridgeSource.Shell;
        case ERC20BridgeSource.SnowSwap:
            return BridgeSource.Snowswap;
        case ERC20BridgeSource.SushiSwap:
            return BridgeSource.Sushiswap;
        case ERC20BridgeSource.Swerve:
            return BridgeSource.Swerve;
        case ERC20BridgeSource.Uniswap:
            return BridgeSource.Uniswap;
        case ERC20BridgeSource.UniswapV2:
            return BridgeSource.UniswapV2;
        case ERC20BridgeSource.DodoV2:
            return BridgeSource.DodoV2;
        case ERC20BridgeSource.Linkswap:
            return BridgeSource.Linkswap;
        case ERC20BridgeSource.PancakeSwap:
        case ERC20BridgeSource.BakerySwap:
            return BridgeSource.UniswapV2;
        default:
            throw new Error(AggregationError.NoBridgeForSource);
    }
}

export function createBridgeDataForBridgeOrder(order: OptimizedMarketBridgeOrder): string {
    let bridgeData: string;
    if (
        order.source === ERC20BridgeSource.MultiHop ||
        order.source === ERC20BridgeSource.MultiBridge ||
        order.source === ERC20BridgeSource.Native
    ) {
        throw new Error('Invalid order to encode for Bridge Data');
    }
    const encoder = BRIDGE_ENCODERS[order.source];

    if (!encoder) {
        throw new Error(AggregationError.NoBridgeForSource);
    }

    switch (order.source) {
        case ERC20BridgeSource.Curve:
        case ERC20BridgeSource.Swerve:
        case ERC20BridgeSource.SnowSwap:
            const curveFillData = (order as OptimizedMarketBridgeOrder<
                CurveFillData | SwerveFillData | SnowSwapFillData
            >).fillData;
            bridgeData = encoder.encode([
                curveFillData.pool.poolAddress,
                curveFillData.pool.exchangeFunctionSelector,
                curveFillData.fromTokenIdx,
                curveFillData.toTokenIdx,
            ]);
            break;
        case ERC20BridgeSource.Balancer:
        case ERC20BridgeSource.Cream:
            const balancerFillData = (order as OptimizedMarketBridgeOrder<BalancerFillData>).fillData;
            bridgeData = encoder.encode([balancerFillData.poolAddress]);
            break;
        case ERC20BridgeSource.Bancor:
            const bancorFillData = (order as OptimizedMarketBridgeOrder<BancorFillData>).fillData;
            bridgeData = encoder.encode([bancorFillData.networkAddress, bancorFillData.path]);
            break;
        case ERC20BridgeSource.UniswapV2:
        case ERC20BridgeSource.SushiSwap:
        case ERC20BridgeSource.CryptoCom:
        case ERC20BridgeSource.Linkswap:
        case ERC20BridgeSource.PancakeSwap:
        case ERC20BridgeSource.BakerySwap:
            const uniswapV2FillData = (order as OptimizedMarketBridgeOrder<UniswapV2FillData>).fillData;
            bridgeData = encoder.encode([uniswapV2FillData.router, uniswapV2FillData.tokenAddressPath]);
            break;
        case ERC20BridgeSource.Kyber:
            const kyberFillData = (order as OptimizedMarketBridgeOrder<KyberFillData>).fillData;
            bridgeData = encoder.encode([kyberFillData.networkProxy, kyberFillData.hint]);
            break;
        case ERC20BridgeSource.Mooniswap:
            const mooniswapFillData = (order as OptimizedMarketBridgeOrder<MooniswapFillData>).fillData;
            bridgeData = encoder.encode([mooniswapFillData.poolAddress]);
            break;
        case ERC20BridgeSource.Dodo:
            const dodoFillData = (order as OptimizedMarketBridgeOrder<DODOFillData>).fillData;
            bridgeData = encoder.encode([
                dodoFillData.helperAddress,
                dodoFillData.poolAddress,
                dodoFillData.isSellBase,
            ]);
            break;
        case ERC20BridgeSource.DodoV2:
            const dodoV2FillData = (order as OptimizedMarketBridgeOrder<DODOFillData>).fillData;
            bridgeData = encoder.encode([dodoV2FillData.poolAddress, dodoV2FillData.isSellBase]);
            break;
        case ERC20BridgeSource.Shell:
            const shellFillData = (order as OptimizedMarketBridgeOrder<ShellFillData>).fillData;
            bridgeData = encoder.encode([shellFillData.poolAddress]);
            break;
        case ERC20BridgeSource.LiquidityProvider:
            const lpFillData = (order as OptimizedMarketBridgeOrder<LiquidityProviderFillData>).fillData;
            bridgeData = encoder.encode([lpFillData.poolAddress, tokenAddressEncoder.encode([order.takerToken])]);
            break;
        case ERC20BridgeSource.Uniswap:
            const uniFillData = (order as OptimizedMarketBridgeOrder<GenericRouterFillData>).fillData;
            bridgeData = encoder.encode([uniFillData.router]);
            break;
        case ERC20BridgeSource.Eth2Dai:
            const oasisFillData = (order as OptimizedMarketBridgeOrder<GenericRouterFillData>).fillData;
            bridgeData = encoder.encode([oasisFillData.router]);
            break;
        case ERC20BridgeSource.MStable:
            const mStableFillData = (order as OptimizedMarketBridgeOrder<GenericRouterFillData>).fillData;
            bridgeData = encoder.encode([mStableFillData.router]);
            break;
        default:
            throw new Error(AggregationError.NoBridgeForSource);
    }
    return bridgeData;
}

export function createBridgeOrder(
    fill: CollapsedFill,
    makerToken: string,
    takerToken: string,
    side: MarketOperation,
): OptimizedMarketBridgeOrder {
    const [makerAmount, takerAmount] = getFillTokenAmounts(fill, side);
    return {
        makerToken,
        takerToken,
        makerAmount,
        takerAmount,
        fillData: fill.fillData,
        source: fill.source,
        sourcePathId: fill.sourcePathId,
        type: FillQuoteTransformerOrderType.Bridge,
        fills: [fill],
    };
}

export function getMakerTakerTokens(opts: CreateOrderFromPathOpts): [string, string] {
    const makerToken = opts.side === MarketOperation.Sell ? opts.outputToken : opts.inputToken;
    const takerToken = opts.side === MarketOperation.Sell ? opts.inputToken : opts.outputToken;
    return [makerToken, takerToken];
}

export const poolEncoder = AbiEncoder.create([{ name: 'poolAddress', type: 'address' }]);
const curveEncoder = AbiEncoder.create([
    { name: 'curveAddress', type: 'address' },
    { name: 'exchangeFunctionSelector', type: 'bytes4' },
    { name: 'fromTokenIdx', type: 'int128' },
    { name: 'toTokenIdx', type: 'int128' },
]);
const routerAddressPathEncoder = AbiEncoder.create('(address,address[])');
const tokenAddressEncoder = AbiEncoder.create([{ name: 'tokenAddress', type: 'address' }]);

export const BRIDGE_ENCODERS: {
    [key in Exclude<
        ERC20BridgeSource,
        ERC20BridgeSource.Native | ERC20BridgeSource.MultiHop | ERC20BridgeSource.MultiBridge
    >]: AbiEncoder.DataType
} = {
    [ERC20BridgeSource.LiquidityProvider]: AbiEncoder.create([
        { name: 'provider', type: 'address' },
        { name: 'data', type: 'bytes' },
    ]),
    [ERC20BridgeSource.Kyber]: AbiEncoder.create([
        { name: 'kyberNetworkProxy', type: 'address' },
        { name: 'hint', type: 'bytes' },
    ]),
    [ERC20BridgeSource.Dodo]: AbiEncoder.create([
        { name: 'helper', type: 'address' },
        { name: 'poolAddress', type: 'address' },
        { name: 'isSellBase', type: 'bool' },
    ]),
    [ERC20BridgeSource.DodoV2]: AbiEncoder.create([
        { name: 'poolAddress', type: 'address' },
        { name: 'isSellBase', type: 'bool' },
    ]),
    // Curve like
    [ERC20BridgeSource.Curve]: curveEncoder,
    [ERC20BridgeSource.Swerve]: curveEncoder,
    [ERC20BridgeSource.SnowSwap]: curveEncoder,
    // UniswapV2 like, (router, address[])
    [ERC20BridgeSource.Bancor]: routerAddressPathEncoder,
    [ERC20BridgeSource.UniswapV2]: routerAddressPathEncoder,
    [ERC20BridgeSource.SushiSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.CryptoCom]: routerAddressPathEncoder,
    [ERC20BridgeSource.Linkswap]: routerAddressPathEncoder,
    // Generic pools
    [ERC20BridgeSource.Shell]: poolEncoder,
    [ERC20BridgeSource.Mooniswap]: poolEncoder,
    [ERC20BridgeSource.Eth2Dai]: poolEncoder,
    [ERC20BridgeSource.MStable]: poolEncoder,
    [ERC20BridgeSource.Balancer]: poolEncoder,
    [ERC20BridgeSource.Cream]: poolEncoder,
    [ERC20BridgeSource.Uniswap]: poolEncoder,
    // BSC
    [ERC20BridgeSource.PancakeSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.BakerySwap]: routerAddressPathEncoder,
};

function getFillTokenAmounts(fill: CollapsedFill, side: MarketOperation): [BigNumber, BigNumber] {
    return [
        // Maker asset amount.
        side === MarketOperation.Sell ? fill.output : fill.input,
        // Taker asset amount.
        side === MarketOperation.Sell ? fill.input : fill.output,
    ];
}

export function createNativeOptimizedOrder(
    fill: NativeCollapsedFill,
    side: MarketOperation,
): OptimizedMarketOrderBase<NativeLimitOrderFillData> | OptimizedMarketOrderBase<NativeRfqOrderFillData> {
    const fillData = fill.fillData;
    const [makerAmount, takerAmount] = getFillTokenAmounts(fill, side);
    const base = {
        type: fill.type,
        source: ERC20BridgeSource.Native,
        makerToken: fillData.order.makerToken,
        takerToken: fillData.order.takerToken,
        makerAmount,
        takerAmount,
        fills: [fill],
        fillData,
    };
    return fill.type === FillQuoteTransformerOrderType.Rfq
        ? { ...base, type: FillQuoteTransformerOrderType.Rfq, fillData: fillData as NativeRfqOrderFillData }
        : { ...base, type: FillQuoteTransformerOrderType.Limit, fillData: fillData as NativeLimitOrderFillData };
}
