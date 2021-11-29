import { BridgeProtocol, encodeBridgeSourceId, FillQuoteTransformerOrderType } from '@0x/protocol-utils';

import { Address, MarketOperation } from '../../types';

import {
    AggregationError,
    CollapsedGenericBridgeFill,
    ERC20BridgeSource,
    CollapsedNativeOrderFill,
    OptimizedGenericBridgeOrder,
    OptimizedLimitOrder,
    OptimizedRfqOrder,
} from './types';

// tslint:disable completed-docs

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
    fill: CollapsedGenericBridgeFill,
    inputToken: Address,
    outputToken: Address,
): OptimizedGenericBridgeOrder {
    return {
        inputToken,
        outputToken,
        inputAmount: fill.input,
        outputAmount: fill.output,
        fillData: fill.data,
        source: fill.source,
        sourcePathId: fill.sourcePathId,
        type: FillQuoteTransformerOrderType.Bridge,
        fills: [fill],
        gasCost: fill.gasCost,
        isFallback: fill.isFallback,
        ...((fill as any).metadata !== undefined ? { metadata: (fill as any).metadata } : {}),
    };
}

export function getMakerTakerTokens(side: MarketOperation, inputToken: Address, outputToken: Address): [Address, Address] {
    const makerToken = side === MarketOperation.Sell ? outputToken : inputToken;
    const takerToken = side === MarketOperation.Sell ? inputToken : outputToken;
    return [makerToken, takerToken];
}

export function createNativeOptimizedOrder(
    fill: CollapsedNativeOrderFill,
    side: MarketOperation,
): OptimizedLimitOrder | OptimizedRfqOrder {
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
