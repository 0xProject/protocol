import {
    BridgeSource,
    CommonOrderFields,
    FillQuoteTransformerOrderType,
    LimitOrder,
    LimitOrderFields,
    RfqOrder,
    RfqOrderFields,
    Signature,
} from '@0x/protocol-utils';
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
    KyberFillData,
    MooniswapFillData,
    MultiHopFillData,
    NativeCollapsedFill,
    NativeLimitOrderFillData,
    NativeOrderWithFillableAmounts,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    OptimizedMarketOrderBase,
    OrderDomain,
    ShellFillData,
    SnowSwapFillData,
    SushiSwapFillData,
    SwerveFillData,
    UniswapV2FillData,
} from './types';

// tslint:disable completed-docs no-unnecessary-type-assertion
export function getNativeOrderTokens(order: LimitOrder | RfqOrder): [string, string] {
    return [order.makerToken, order.takerToken];
}

export function convertNativeOrderToFullyFillableOptimizedOrders(
    order: LimitOrderFields & { signature: Signature },
): OptimizedMarketOrderBase<NativeLimitOrderFillData> {
    return {
        type: FillQuoteTransformerOrderType.Limit,
        makerToken: order.makerToken,
        takerToken: order.takerToken,
        fillData: {
            ...order,
            fillableMakerAmount: order.makerAmount,
            fillableTakerAmount: order.takerAmount,
            fillableTakerFeeAmount: order.takerTokenFeeAmount,
        },
        // TODO jacob
        fills: [],
        source: ERC20BridgeSource.Native,
        takerTokenAmount: order.takerAmount,
        makerTokenAmount: order.makerAmount,
    };
}

export function convertNativeRFQOrderToFullyFillableOptimizedOrders(
    order: RfqOrderFields & { signature: Signature },
): OptimizedMarketOrder {
    return {
        type: FillQuoteTransformerOrderType.Rfq,
        fillData: {
            ...order,
            fillableMakerAmount: order.makerAmount,
            fillableTakerAmount: order.takerAmount,
            fillableTakerFeeAmount: ZERO_AMOUNT,
        },
        makerToken: order.makerToken,
        takerToken: order.takerToken,
        source: ERC20BridgeSource.Native,
        takerTokenAmount: order.takerAmount,
        makerTokenAmount: order.makerAmount,
        // TODO jacob
        fills: [],
    };
}

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
    const { firstHopSource, secondHopSource, intermediateToken } = sample.fillData!;
    const firstHopFill: CollapsedFill = {
        sourcePathId: '',
        source: firstHopSource.source,
        input: opts.side === MarketOperation.Sell ? sample.input : ZERO_AMOUNT,
        output: opts.side === MarketOperation.Sell ? ZERO_AMOUNT : sample.output,
        subFills: [],
        fillData: firstHopSource.fillData,
    };
    const secondHopFill: CollapsedFill = {
        sourcePathId: '',
        source: secondHopSource.source,
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
        default:
            throw new Error(AggregationError.NoBridgeForSource);
    }
}

export function createBridgeDataForBridgeOrder(order: OptimizedMarketBridgeOrder): string {
    let bridgeData: string;

    switch (order.source) {
        case ERC20BridgeSource.Curve:
        case ERC20BridgeSource.Swerve:
        case ERC20BridgeSource.SnowSwap:
            const curveFillData = (order as OptimizedMarketBridgeOrder<
                CurveFillData | SwerveFillData | SnowSwapFillData
            >).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createCurveBridgeData(
                curveFillData.pool.poolAddress,
                curveFillData.pool.exchangeFunctionSelector,
                order.takerToken,
                curveFillData.fromTokenIdx,
                curveFillData.toTokenIdx,
            );
            break;
        case ERC20BridgeSource.Balancer:
        case ERC20BridgeSource.Cream:
            const balancerFillData = (order as OptimizedMarketBridgeOrder<BalancerFillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createBalancerBridgeData(order.takerToken, balancerFillData.poolAddress);
            break;
        case ERC20BridgeSource.Bancor:
            const bancorFillData = (order as OptimizedMarketBridgeOrder<BancorFillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createBancorBridgeData(bancorFillData.path, bancorFillData.networkAddress);
            break;
        case ERC20BridgeSource.UniswapV2:
            const uniswapV2FillData = (order as OptimizedMarketBridgeOrder<UniswapV2FillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createUniswapV2BridgeData(uniswapV2FillData.tokenAddressPath);
            break;
        case ERC20BridgeSource.SushiSwap:
        case ERC20BridgeSource.CryptoCom:
            const sushiSwapFillData = (order as OptimizedMarketBridgeOrder<SushiSwapFillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createSushiSwapBridgeData(sushiSwapFillData.tokenAddressPath, sushiSwapFillData.router);
            break;
        case ERC20BridgeSource.Kyber:
            const kyberFillData = (order as OptimizedMarketBridgeOrder<KyberFillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createKyberBridgeData(order.takerToken, kyberFillData.hint);
            break;
        case ERC20BridgeSource.Mooniswap:
            const mooniswapFillData = (order as OptimizedMarketBridgeOrder<MooniswapFillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createMooniswapBridgeData(order.takerToken, mooniswapFillData.poolAddress);
            break;
        case ERC20BridgeSource.Dodo:
            const dodoFillData = (order as OptimizedMarketBridgeOrder<DODOFillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createDODOBridgeData(order.takerToken, dodoFillData.poolAddress, dodoFillData.isSellBase);
            break;
        case ERC20BridgeSource.Shell:
            const shellFillData = (order as OptimizedMarketBridgeOrder<ShellFillData>).fillData!; // tslint:disable-line:no-non-null-assertion
            bridgeData = createShellBridgeData(order.takerToken, shellFillData.poolAddress);
            break;
        default:
            // TODO PLP
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
    const [makerTokenAmount, takerTokenAmount] = getBridgeTokenAmounts(fill, side);
    return {
        makerToken,
        takerToken,
        makerTokenAmount,
        takerTokenAmount,
        fillData: fill.fillData!,
        source: fill.source,
        sourcePathId: fill.sourcePathId,
        type: FillQuoteTransformerOrderType.Bridge,
        // TODO jacob
        fills: [],
        // fillableMakerAssetAmount: slippedMakerAssetAmount,
        // fillableTakerAssetAmount: slippedTakerAssetAmount,
    };
}

export function getMakerTakerTokens(opts: CreateOrderFromPathOpts): [string, string] {
    const makerToken = opts.side === MarketOperation.Sell ? opts.outputToken : opts.inputToken;
    const takerToken = opts.side === MarketOperation.Sell ? opts.inputToken : opts.outputToken;
    return [makerToken, takerToken];
}

function createBridgeData(tokenAddress: string): string {
    const encoder = AbiEncoder.create([{ name: 'tokenAddress', type: 'address' }]);
    return encoder.encode({ tokenAddress });
}

function createBalancerBridgeData(takerToken: string, poolAddress: string): string {
    const encoder = AbiEncoder.create([
        { name: 'takerToken', type: 'address' },
        { name: 'poolAddress', type: 'address' },
    ]);
    return encoder.encode({ takerToken, poolAddress });
}

function createShellBridgeData(takerToken: string, poolAddress: string): string {
    const encoder = AbiEncoder.create([
        { name: 'takerToken', type: 'address' },
        { name: 'poolAddress', type: 'address' },
    ]);
    return encoder.encode({ takerToken, poolAddress });
}

function createBancorBridgeData(path: string[], networkAddress: string): string {
    const encoder = AbiEncoder.create([
        { name: 'path', type: 'address[]' },
        { name: 'networkAddress', type: 'address' },
    ]);
    return encoder.encode({ path, networkAddress });
}

function createKyberBridgeData(fromTokenAddress: string, hint: string): string {
    const encoder = AbiEncoder.create([{ name: 'fromTokenAddress', type: 'address' }, { name: 'hint', type: 'bytes' }]);
    return encoder.encode({ fromTokenAddress, hint });
}

function createMooniswapBridgeData(takerToken: string, poolAddress: string): string {
    const encoder = AbiEncoder.create([
        { name: 'takerToken', type: 'address' },
        { name: 'poolAddress', type: 'address' },
    ]);
    return encoder.encode({ takerToken, poolAddress });
}

function createDODOBridgeData(takerToken: string, poolAddress: string, isSellBase: boolean): string {
    const encoder = AbiEncoder.create([
        { name: 'takerToken', type: 'address' },
        { name: 'poolAddress', type: 'address' },
        { name: 'isSellBase', type: 'bool' },
    ]);
    return encoder.encode({ takerToken, poolAddress, isSellBase });
}

function createCurveBridgeData(
    curveAddress: string,
    exchangeFunctionSelector: string,
    takerToken: string,
    fromTokenIdx: number,
    toTokenIdx: number,
): string {
    const encoder = AbiEncoder.create([
        { name: 'curveAddress', type: 'address' },
        { name: 'exchangeFunctionSelector', type: 'bytes4' },
        { name: 'fromTokenAddress', type: 'address' },
        { name: 'fromTokenIdx', type: 'int128' },
        { name: 'toTokenIdx', type: 'int128' },
    ]);
    return encoder.encode([curveAddress, exchangeFunctionSelector, takerToken, fromTokenIdx, toTokenIdx]);
}

function createUniswapV2BridgeData(tokenAddressPath: string[]): string {
    const encoder = AbiEncoder.create('(address[])');
    return encoder.encode([tokenAddressPath]);
}

function createSushiSwapBridgeData(tokenAddressPath: string[], router: string): string {
    const encoder = AbiEncoder.create('(address[],address)');
    return encoder.encode([tokenAddressPath, router]);
}

function getSlippedBridgeAssetAmounts(fill: CollapsedFill, opts: CreateOrderFromPathOpts): [BigNumber, BigNumber] {
    return [
        // Maker asset amount.
        opts.side === MarketOperation.Sell
            ? fill.output.times(1 - opts.bridgeSlippage).integerValue(BigNumber.ROUND_DOWN)
            : fill.input,
        // Taker asset amount.
        opts.side === MarketOperation.Sell
            ? fill.input
            : BigNumber.min(fill.output.times(opts.bridgeSlippage + 1).integerValue(BigNumber.ROUND_UP), MAX_UINT256),
    ];
}

function getBridgeTokenAmounts(fill: CollapsedFill, side: MarketOperation): [BigNumber, BigNumber] {
    return [
        // Maker asset amount.
        side === MarketOperation.Sell ? fill.output : fill.input,
        // Taker asset amount.
        side === MarketOperation.Sell ? fill.input : fill.output,
    ];
}

export function createNativeOrder(fill: NativeCollapsedFill): OptimizedMarketOrder {
    return convertNativeOrderToFullyFillableOptimizedOrders(fill.fillData!);
}
