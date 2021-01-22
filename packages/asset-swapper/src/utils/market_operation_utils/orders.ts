import {
    BridgeSource,
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
    LiquidityProviderFillData,
    MooniswapFillData,
    MultiHopFillData,
    NativeCollapsedFill,
    OptimizedLimitOrder,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    OptimizedRfqOrder,
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
    fill: NativeCollapsedFill,
): OptimizedLimitOrder {
    return {
        type: FillQuoteTransformerOrderType.Limit,
        makerToken: order.makerToken,
        takerToken: order.takerToken,
        fillData: {
            order,
            signature: order.signature,
            maxTakerTokenFillAmount: order.takerAmount,
        },
        fills: [fill],
        source: ERC20BridgeSource.Native,
        takerAmount: order.takerAmount,
        makerAmount: order.makerAmount,
    };
}

export function convertNativeRFQOrderToFullyFillableOptimizedOrders(
    order: RfqOrderFields & { signature: Signature },
): OptimizedRfqOrder {
    return {
        type: FillQuoteTransformerOrderType.Rfq,
        fillData: {
            order,
            signature: order.signature,
            maxTakerTokenFillAmount: order.takerAmount,
        },
        makerToken: order.makerToken,
        takerToken: order.takerToken,
        source: ERC20BridgeSource.Native,
        takerAmount: order.takerAmount,
        makerAmount: order.makerAmount,
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
                curveFillData.fromTokenIdx,
                curveFillData.toTokenIdx,
            );
            break;
        case ERC20BridgeSource.Balancer:
        case ERC20BridgeSource.Cream:
            const balancerFillData = (order as OptimizedMarketBridgeOrder<BalancerFillData>).fillData;
            bridgeData = createBalancerBridgeData(balancerFillData.poolAddress);
            break;
        case ERC20BridgeSource.Bancor:
            const bancorFillData = (order as OptimizedMarketBridgeOrder<BancorFillData>).fillData;
            bridgeData = createBancorBridgeData(bancorFillData.path, bancorFillData.networkAddress);
            break;
        case ERC20BridgeSource.UniswapV2:
        case ERC20BridgeSource.SushiSwap:
        case ERC20BridgeSource.CryptoCom:
            const uniswapV2FillData = (order as OptimizedMarketBridgeOrder<UniswapV2FillData | SushiSwapFillData>)
                .fillData;
            bridgeData = createUniswapV2BridgeData(uniswapV2FillData.tokenAddressPath, uniswapV2FillData.router);
            break;
        case ERC20BridgeSource.Kyber:
            const kyberFillData = (order as OptimizedMarketBridgeOrder<KyberFillData>).fillData;
            bridgeData = createKyberBridgeData('0x9AAb3f75489902f3a48495025729a0AF77d4b11e', kyberFillData.hint);
            break;
        case ERC20BridgeSource.Mooniswap:
            const mooniswapFillData = (order as OptimizedMarketBridgeOrder<MooniswapFillData>).fillData;
            bridgeData = createMooniswapBridgeData(mooniswapFillData.poolAddress);
            break;
        case ERC20BridgeSource.Dodo:
            const dodoFillData = (order as OptimizedMarketBridgeOrder<DODOFillData>).fillData;
            bridgeData = createDODOBridgeData(
                '0x533dA777aeDCE766CEAe696bf90f8541A4bA80Eb',
                dodoFillData.poolAddress,
                dodoFillData.isSellBase,
            );
            break;
        case ERC20BridgeSource.Shell:
            const shellFillData = (order as OptimizedMarketBridgeOrder<ShellFillData>).fillData;
            bridgeData = createShellBridgeData(shellFillData.poolAddress);
            break;
        case ERC20BridgeSource.LiquidityProvider:
            const lpFillData = (order as OptimizedMarketBridgeOrder<LiquidityProviderFillData>).fillData;
            bridgeData = createLiquidityProviderBridgeData(lpFillData.poolAddress, createBridgeData(order.takerToken));
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
    const [makerAmount, takerAmount] = getBridgeTokenAmounts(fill, side);
    return {
        makerToken,
        takerToken,
        makerAmount,
        takerAmount,
        fillData: fill.fillData!,
        source: fill.source,
        sourcePathId: fill.sourcePathId,
        type: FillQuoteTransformerOrderType.Bridge,
        // TODO jacob
        fills: [fill],
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

function createLiquidityProviderBridgeData(provider: string, data: string): string {
    const encoder = AbiEncoder.create([{ name: 'provider', type: 'address' }, { name: 'data', type: 'bytes' }]);
    return encoder.encode({ provider, data });
}

function createBalancerBridgeData(poolAddress: string): string {
    const encoder = AbiEncoder.create([{ name: 'poolAddress', type: 'address' }]);
    return encoder.encode([poolAddress]);
}

function createShellBridgeData(poolAddress: string): string {
    const encoder = AbiEncoder.create([{ name: 'poolAddress', type: 'address' }]);
    return encoder.encode([poolAddress]);
}

function createBancorBridgeData(path: string[], networkAddress: string): string {
    const encoder = AbiEncoder.create([
        { name: 'path', type: 'address[]' },
        { name: 'networkAddress', type: 'address' },
    ]);
    return encoder.encode([path, networkAddress]);
}

function createKyberBridgeData(kyberNetworkProxy: string, hint: string): string {
    const encoder = AbiEncoder.create([
        { name: 'kyberNetworkProxy', type: 'address' },
        { name: 'hint', type: 'bytes' },
    ]);
    return encoder.encode([kyberNetworkProxy, hint]);
}

function createMooniswapBridgeData(poolAddress: string): string {
    const encoder = AbiEncoder.create([{ name: 'poolAddress', type: 'address' }]);
    return encoder.encode([poolAddress]);
}

function createDODOBridgeData(helper: string, poolAddress: string, isSellBase: boolean): string {
    const encoder = AbiEncoder.create([
        { name: 'helper', type: 'address' },
        { name: 'poolAddress', type: 'address' },
        { name: 'isSellBase', type: 'bool' },
    ]);
    return encoder.encode([helper, poolAddress, isSellBase]);
}

function createCurveBridgeData(
    curveAddress: string,
    exchangeFunctionSelector: string,
    fromTokenIdx: number,
    toTokenIdx: number,
): string {
    const encoder = AbiEncoder.create([
        { name: 'curveAddress', type: 'address' },
        { name: 'exchangeFunctionSelector', type: 'bytes4' },
        { name: 'fromTokenIdx', type: 'int128' },
        { name: 'toTokenIdx', type: 'int128' },
    ]);
    return encoder.encode([curveAddress, exchangeFunctionSelector, fromTokenIdx, toTokenIdx]);
}

function createUniswapV2BridgeData(tokenAddressPath: string[], router: string): string {
    const encoder = AbiEncoder.create('(address,address[])');
    return encoder.encode([router, tokenAddressPath]);
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
    return convertNativeOrderToFullyFillableOptimizedOrders(
        (fill.fillData! as any) as LimitOrderFields & { signature: Signature },
        fill,
    ); // TODO (xianny): handle RFQ, fix fill data
}
