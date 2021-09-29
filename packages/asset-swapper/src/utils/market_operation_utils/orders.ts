import { BridgeProtocol, encodeBridgeSourceId, FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { AbiEncoder, BigNumber } from '@0x/utils';

import { AssetSwapperContractAddresses, MarketOperation } from '../../types';

import { MAX_UINT256, NULL_BYTES, ZERO_AMOUNT } from './constants';
import {
    AggregationError,
    BalancerFillData,
    BalancerV2FillData,
    BancorFillData,
    CollapsedFill,
    CurveFillData,
    DexSample,
    DODOFillData,
    ERC20BridgeSource,
    FillData,
    FinalUniswapV3FillData,
    GenericRouterFillData,
    KyberDmmFillData,
    KyberFillData,
    LidoFillData,
    LiquidityProviderFillData,
    MakerPsmFillData,
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
    UniswapV2FillData,
    UniswapV3FillData,
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

export function getErc20BridgeSourceToBridgeSource(source: ERC20BridgeSource): string {
    switch (source) {
        case ERC20BridgeSource.Balancer:
            return encodeBridgeSourceId(BridgeProtocol.Balancer, 'Balancer');
        case ERC20BridgeSource.BalancerV2:
            return encodeBridgeSourceId(BridgeProtocol.BalancerV2, 'BalancerV2');
        case ERC20BridgeSource.Bancor:
            return encodeBridgeSourceId(BridgeProtocol.Bancor, 'Bancor');
        // case ERC20BridgeSource.CoFiX:
        //    return encodeBridgeSourceId(BridgeProtocol.CoFiX, 'CoFiX');
        case ERC20BridgeSource.Curve:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Curve');
        case ERC20BridgeSource.Cream:
            return encodeBridgeSourceId(BridgeProtocol.Balancer, 'Cream');
        case ERC20BridgeSource.CryptoCom:
            return encodeBridgeSourceId(BridgeProtocol.CryptoCom, 'CryptoCom');
        case ERC20BridgeSource.Dodo:
            return encodeBridgeSourceId(BridgeProtocol.Dodo, 'Dodo');
        case ERC20BridgeSource.Kyber:
            return encodeBridgeSourceId(BridgeProtocol.Kyber, 'Kyber');
        case ERC20BridgeSource.LiquidityProvider:
            // "LiquidityProvider" is too long to encode (17 characters).
            return encodeBridgeSourceId(BridgeProtocol.Unknown, 'LP');
        case ERC20BridgeSource.MakerPsm:
            return encodeBridgeSourceId(BridgeProtocol.MakerPsm, 'MakerPsm');
        case ERC20BridgeSource.Mooniswap:
            return encodeBridgeSourceId(BridgeProtocol.Mooniswap, 'Mooniswap');
        case ERC20BridgeSource.MStable:
            return encodeBridgeSourceId(BridgeProtocol.MStable, 'MStable');
        case ERC20BridgeSource.Eth2Dai:
            return encodeBridgeSourceId(BridgeProtocol.Oasis, 'Eth2Dai');
        case ERC20BridgeSource.Shell:
            return encodeBridgeSourceId(BridgeProtocol.Shell, 'Shell');
        case ERC20BridgeSource.SnowSwap:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'SnowSwap');
        case ERC20BridgeSource.SushiSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SushiSwap');
        case ERC20BridgeSource.Swerve:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Swerve');
        case ERC20BridgeSource.Uniswap:
            return encodeBridgeSourceId(BridgeProtocol.Uniswap, 'Uniswap');
        case ERC20BridgeSource.UniswapV2:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2');
        case ERC20BridgeSource.DodoV2:
            return encodeBridgeSourceId(BridgeProtocol.DodoV2, 'DodoV2');
        case ERC20BridgeSource.Linkswap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'Linkswap');
        case ERC20BridgeSource.PancakeSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'PancakeSwap');
        case ERC20BridgeSource.PancakeSwapV2:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'PancakeSwapV2');
        case ERC20BridgeSource.BakerySwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'BakerySwap');
        case ERC20BridgeSource.Nerve:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'Nerve');
        case ERC20BridgeSource.Belt:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Belt');
        case ERC20BridgeSource.Ellipsis:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Ellipsis');
        case ERC20BridgeSource.Component:
            return encodeBridgeSourceId(BridgeProtocol.Shell, 'Component');
        case ERC20BridgeSource.Smoothy:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Smoothy');
        case ERC20BridgeSource.Saddle:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'Saddle');
        case ERC20BridgeSource.XSigma:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'xSigma');
        case ERC20BridgeSource.ApeSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'ApeSwap');
        case ERC20BridgeSource.CafeSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'CafeSwap');
        case ERC20BridgeSource.CheeseSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'CheeseSwap');
        case ERC20BridgeSource.JulSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'JulSwap');
        case ERC20BridgeSource.UniswapV3:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV3, 'UniswapV3');
        case ERC20BridgeSource.KyberDmm:
            return encodeBridgeSourceId(BridgeProtocol.KyberDmm, 'KyberDmm');
        case ERC20BridgeSource.QuickSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'QuickSwap');
        case ERC20BridgeSource.ComethSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'ComethSwap');
        case ERC20BridgeSource.Dfyn:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'Dfyn');
        case ERC20BridgeSource.CurveV2:
            return encodeBridgeSourceId(BridgeProtocol.CurveV2, 'CurveV2');
        case ERC20BridgeSource.WaultSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'WaultSwap');
        case ERC20BridgeSource.Polydex:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'Polydex');
        case ERC20BridgeSource.FirebirdOneSwap:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'FirebirdOneSwap');
        case ERC20BridgeSource.Lido:
            return encodeBridgeSourceId(BridgeProtocol.Lido, 'Lido');
        case ERC20BridgeSource.ShibaSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'ShibaSwap');
        case ERC20BridgeSource.JetSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'JetSwap');
        case ERC20BridgeSource.IronSwap:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'IronSwap');
        case ERC20BridgeSource.ACryptos:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'ACryptoS');
        case ERC20BridgeSource.Pangolin:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'Pangolin');
        case ERC20BridgeSource.TraderJoe:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'TraderJoe');
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
        case ERC20BridgeSource.CurveV2:
        case ERC20BridgeSource.Swerve:
        case ERC20BridgeSource.SnowSwap:
        case ERC20BridgeSource.Nerve:
        case ERC20BridgeSource.Belt:
        case ERC20BridgeSource.Ellipsis:
        case ERC20BridgeSource.Smoothy:
        case ERC20BridgeSource.Saddle:
        case ERC20BridgeSource.XSigma:
        case ERC20BridgeSource.FirebirdOneSwap:
        case ERC20BridgeSource.IronSwap:
        case ERC20BridgeSource.ACryptos:
            const curveFillData = (order as OptimizedMarketBridgeOrder<CurveFillData>).fillData;
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
        case ERC20BridgeSource.BalancerV2:
            const balancerV2FillData = (order as OptimizedMarketBridgeOrder<BalancerV2FillData>).fillData;
            const { vault, poolId } = balancerV2FillData;
            bridgeData = encoder.encode([vault, poolId]);
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
        case ERC20BridgeSource.PancakeSwapV2:
        case ERC20BridgeSource.BakerySwap:
        case ERC20BridgeSource.ApeSwap:
        case ERC20BridgeSource.CafeSwap:
        case ERC20BridgeSource.CheeseSwap:
        case ERC20BridgeSource.JulSwap:
        case ERC20BridgeSource.QuickSwap:
        case ERC20BridgeSource.ComethSwap:
        case ERC20BridgeSource.Dfyn:
        case ERC20BridgeSource.WaultSwap:
        case ERC20BridgeSource.Polydex:
        case ERC20BridgeSource.ShibaSwap:
        case ERC20BridgeSource.JetSwap:
        case ERC20BridgeSource.Pangolin:
        case ERC20BridgeSource.TraderJoe:
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
        case ERC20BridgeSource.Component:
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
        case ERC20BridgeSource.MakerPsm:
            const psmFillData = (order as OptimizedMarketBridgeOrder<MakerPsmFillData>).fillData;
            bridgeData = encoder.encode([psmFillData.psmAddress, psmFillData.gemTokenAddress]);
            break;
        case ERC20BridgeSource.UniswapV3:
            const uniswapV3FillData = (order as OptimizedMarketBridgeOrder<FinalUniswapV3FillData>).fillData;
            bridgeData = encoder.encode([uniswapV3FillData.router, uniswapV3FillData.uniswapPath]);
            break;
        case ERC20BridgeSource.KyberDmm:
            const kyberDmmFillData = (order as OptimizedMarketBridgeOrder<KyberDmmFillData>).fillData;
            bridgeData = encoder.encode([
                kyberDmmFillData.router,
                kyberDmmFillData.poolsPath,
                kyberDmmFillData.tokenAddressPath,
            ]);
            break;
        case ERC20BridgeSource.Lido:
            const lidoFillData = (order as OptimizedMarketBridgeOrder<LidoFillData>).fillData;
            bridgeData = encoder.encode([lidoFillData.stEthTokenAddress]);
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
        fillData: createFinalBridgeOrderFillDataFromCollapsedFill(fill),
        source: fill.source,
        sourcePathId: fill.sourcePathId,
        type: FillQuoteTransformerOrderType.Bridge,
        fills: [fill],
    };
}

function createFinalBridgeOrderFillDataFromCollapsedFill(fill: CollapsedFill): FillData {
    switch (fill.source) {
        case ERC20BridgeSource.UniswapV3: {
            const fd = fill.fillData as UniswapV3FillData;
            return {
                router: fd.router,
                tokenAddressPath: fd.tokenAddressPath,
                uniswapPath: getBestUniswapV3PathForInputAmount(fd, fill.input),
            };
        }
        default:
            break;
    }
    return fill.fillData;
}

function getBestUniswapV3PathForInputAmount(fillData: UniswapV3FillData, inputAmount: BigNumber): string {
    if (fillData.pathAmounts.length === 0) {
        throw new Error(`No Uniswap V3 paths`);
    }
    // Find the best path that can satisfy `inputAmount`.
    // Assumes `fillData.pathAmounts` is sorted ascending.
    for (const { inputAmount: pathInputAmount, uniswapPath } of fillData.pathAmounts) {
        if (pathInputAmount.gte(inputAmount)) {
            return uniswapPath;
        }
    }
    return fillData.pathAmounts[fillData.pathAmounts.length - 1].uniswapPath;
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
const makerPsmEncoder = AbiEncoder.create([
    { name: 'psmAddress', type: 'address' },
    { name: 'gemTokenAddress', type: 'address' },
]);
const balancerV2Encoder = AbiEncoder.create([
    { name: 'vault', type: 'address' },
    { name: 'poolId', type: 'bytes32' },
]);
const routerAddressPathEncoder = AbiEncoder.create('(address,address[])');
const tokenAddressEncoder = AbiEncoder.create([{ name: 'tokenAddress', type: 'address' }]);

export const BRIDGE_ENCODERS: {
    [key in Exclude<
        ERC20BridgeSource,
        ERC20BridgeSource.Native | ERC20BridgeSource.MultiHop | ERC20BridgeSource.MultiBridge
    >]: AbiEncoder.DataType;
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
    [ERC20BridgeSource.CurveV2]: curveEncoder,
    [ERC20BridgeSource.Swerve]: curveEncoder,
    [ERC20BridgeSource.SnowSwap]: curveEncoder,
    [ERC20BridgeSource.Nerve]: curveEncoder,
    [ERC20BridgeSource.Belt]: curveEncoder,
    [ERC20BridgeSource.Ellipsis]: curveEncoder,
    [ERC20BridgeSource.Smoothy]: curveEncoder,
    [ERC20BridgeSource.Saddle]: curveEncoder,
    [ERC20BridgeSource.XSigma]: curveEncoder,
    [ERC20BridgeSource.FirebirdOneSwap]: curveEncoder,
    [ERC20BridgeSource.IronSwap]: curveEncoder,
    [ERC20BridgeSource.ACryptos]: curveEncoder,
    // UniswapV2 like, (router, address[])
    [ERC20BridgeSource.Bancor]: routerAddressPathEncoder,
    [ERC20BridgeSource.UniswapV2]: routerAddressPathEncoder,
    [ERC20BridgeSource.SushiSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.CryptoCom]: routerAddressPathEncoder,
    [ERC20BridgeSource.Linkswap]: routerAddressPathEncoder,
    [ERC20BridgeSource.ShibaSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.Pangolin]: routerAddressPathEncoder,
    [ERC20BridgeSource.TraderJoe]: routerAddressPathEncoder,
    // BSC
    [ERC20BridgeSource.PancakeSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.PancakeSwapV2]: routerAddressPathEncoder,
    [ERC20BridgeSource.BakerySwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.ApeSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.CafeSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.CheeseSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.JulSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.WaultSwap]: routerAddressPathEncoder,
    // Polygon
    [ERC20BridgeSource.QuickSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.ComethSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.Dfyn]: routerAddressPathEncoder,
    [ERC20BridgeSource.Polydex]: routerAddressPathEncoder,
    [ERC20BridgeSource.JetSwap]: routerAddressPathEncoder,
    // Generic pools
    [ERC20BridgeSource.Shell]: poolEncoder,
    [ERC20BridgeSource.Component]: poolEncoder,
    [ERC20BridgeSource.Mooniswap]: poolEncoder,
    [ERC20BridgeSource.Eth2Dai]: poolEncoder,
    [ERC20BridgeSource.MStable]: poolEncoder,
    [ERC20BridgeSource.Balancer]: poolEncoder,
    [ERC20BridgeSource.Cream]: poolEncoder,
    [ERC20BridgeSource.Uniswap]: poolEncoder,
    // Custom integrations
    [ERC20BridgeSource.MakerPsm]: makerPsmEncoder,
    [ERC20BridgeSource.BalancerV2]: balancerV2Encoder,
    [ERC20BridgeSource.UniswapV3]: AbiEncoder.create([
        { name: 'router', type: 'address' },
        { name: 'path', type: 'bytes' },
    ]),
    [ERC20BridgeSource.KyberDmm]: AbiEncoder.create('(address,address[],address[])'),
    [ERC20BridgeSource.Lido]: AbiEncoder.create('(address)'),
};

function getFillTokenAmounts(fill: CollapsedFill, side: MarketOperation): [BigNumber, BigNumber] {
    return [
        // Maker asset amount.
        side === MarketOperation.Sell ? fill.output.integerValue(BigNumber.ROUND_DOWN) : fill.input,
        // Taker asset amount.
        side === MarketOperation.Sell ? fill.input : fill.output.integerValue(BigNumber.ROUND_UP),
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
