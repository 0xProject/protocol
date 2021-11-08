import { BridgeProtocol, encodeBridgeSourceId, FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { AbiEncoder, BigNumber } from '@0x/utils';

import { AssetSwapperContractAddresses, MarketOperation } from '../../types';

import { MAX_UINT256, ZERO_AMOUNT } from './constants';
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
    sample: DexSample,
    opts: CreateOrderFromPathOpts,
): OptimizedMarketOrder[] {
    throw new Error(`Not implemented`);
    // const [makerToken, takerToken] = getMakerTakerTokens(opts);
    // const { firstHopSource, secondHopSource, intermediateToken } = sample.fillData;
    // const firstHopFill: CollapsedFill = {
    //     sourcePathId: '',
    //     source: firstHopSource.source,
    //     type: FillQuoteTransformerOrderType.Bridge,
    //     input: opts.side === MarketOperation.Sell ? sample.input : ZERO_AMOUNT,
    //     output: opts.side === MarketOperation.Sell ? ZERO_AMOUNT : sample.output,
    //     subFills: [],
    //     fillData: firstHopSource.fillData,
    // };
    // const secondHopFill: CollapsedFill = {
    //     sourcePathId: '',
    //     source: secondHopSource.source,
    //     type: FillQuoteTransformerOrderType.Bridge,
    //     input: opts.side === MarketOperation.Sell ? MAX_UINT256 : sample.input,
    //     output: opts.side === MarketOperation.Sell ? sample.output : MAX_UINT256,
    //     subFills: [],
    //     fillData: secondHopSource.fillData,
    // };
    // return [
    //     createBridgeOrder(firstHopFill, intermediateToken, takerToken, opts.side),
    //     createBridgeOrder(secondHopFill, makerToken, intermediateToken, opts.side),
    // ];
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
        case ERC20BridgeSource.SpiritSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SpiritSwap');
        case ERC20BridgeSource.SpookySwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SpookySwap');
        default:
            throw new Error(AggregationError.NoBridgeForSource);
    }
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
        encodedFillData: fill.encodedFillData,
        source: fill.source,
        sourcePathId: fill.sourcePathId,
        type: FillQuoteTransformerOrderType.Bridge,
        fills: [fill],
        gasCost: fill.gasCost,
    };
}

export function getMakerTakerTokens(opts: CreateOrderFromPathOpts): [string, string] {
    const makerToken = opts.side === MarketOperation.Sell ? opts.outputToken : opts.inputToken;
    const takerToken = opts.side === MarketOperation.Sell ? opts.inputToken : opts.outputToken;
    return [makerToken, takerToken];
}

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
): OptimizedMarketOrderBase | OptimizedMarketOrderBase {
    throw new Error(`No implementado`);
    // const fillData = fill.fillData;
    // const [makerAmount, takerAmount] = getFillTokenAmounts(fill, side);
    // const base = {
    //     type: fill.type,
    //     source: ERC20BridgeSource.Native,
    //     makerToken: fillData.order.makerToken,
    //     takerToken: fillData.order.takerToken,
    //     makerAmount,
    //     takerAmount,
    //     fills: [fill],
    //     fillData,
    // };
    // return fill.type === FillQuoteTransformerOrderType.Rfq
    //     ? { ...base, type: FillQuoteTransformerOrderType.Rfq, fillData: fillData as NativeRfqOrderFillData }
    //     : { ...base, type: FillQuoteTransformerOrderType.Limit, fillData: fillData as NativeLimitOrderFillData };
}
