import { BridgeProtocol, encodeBridgeSourceId, FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { AbiEncoder, BigNumber } from '@0x/utils';
import _ = require('lodash');

import { AssetSwapperContractAddresses, MarketOperation } from '../../types';

import { MAX_UINT256, ZERO_AMOUNT } from './constants';
import {
    AaveV2FillData,
    AggregationError,
    BalancerFillData,
    BalancerV2BatchSwapFillData,
    BalancerV2FillData,
    BancorFillData,
    CompoundFillData,
    CurveFillData,
    DexSample,
    DODOFillData,
    ERC20BridgeSource,
    Fill,
    FillData,
    FinalUniswapV3FillData,
    GenericRouterFillData,
    GMXFillData,
    KyberDmmFillData,
    LidoFillData,
    LiquidityProviderFillData,
    MakerPsmFillData,
    MooniswapFillData,
    MultiHopFillData,
    NativeFillData,
    NativeLimitOrderFillData,
    NativeOtcOrderFillData,
    NativeRfqOrderFillData,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    OptimizedMarketOrderBase,
    PlatypusFillData,
    ShellFillData,
    SynthetixFillData,
    UniswapV2FillData,
    UniswapV3FillData,
    UniswapV3PathAmount,
    VelodromeFillData,
    WOOFiFillData,
} from './types';

export interface CreateOrderFromPathOpts {
    side: MarketOperation;
    inputToken: string;
    outputToken: string;
    contractAddresses: AssetSwapperContractAddresses;
}

export function createOrdersFromTwoHopSample(
    sample: DexSample<MultiHopFillData>,
    opts: CreateOrderFromPathOpts,
): [OptimizedMarketOrder, OptimizedMarketOrder] {
    const [makerToken, takerToken] = getMakerTakerTokens(opts);
    const { firstHopSource, secondHopSource, intermediateToken } = sample.fillData;
    const firstHopFill: Fill = {
        sourcePathId: '',
        source: firstHopSource.source,
        type: FillQuoteTransformerOrderType.Bridge,
        input: opts.side === MarketOperation.Sell ? sample.input : ZERO_AMOUNT,
        output: opts.side === MarketOperation.Sell ? ZERO_AMOUNT : sample.output,
        adjustedOutput: opts.side === MarketOperation.Sell ? ZERO_AMOUNT : sample.output,
        fillData: firstHopSource.fillData,
        flags: BigInt(0),
        gas: 1,
    };
    const secondHopFill: Fill = {
        sourcePathId: '',
        source: secondHopSource.source,
        type: FillQuoteTransformerOrderType.Bridge,
        input: opts.side === MarketOperation.Sell ? MAX_UINT256 : sample.input,
        output: opts.side === MarketOperation.Sell ? sample.output : MAX_UINT256,
        adjustedOutput: opts.side === MarketOperation.Sell ? sample.output : MAX_UINT256,
        fillData: secondHopSource.fillData,
        flags: BigInt(0),
        gas: 1,
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
            return encodeBridgeSourceId(BridgeProtocol.BalancerV2Batch, 'BalancerV2');
        case ERC20BridgeSource.Bancor:
            return encodeBridgeSourceId(BridgeProtocol.Bancor, 'Bancor');
        case ERC20BridgeSource.Curve:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Curve');
        case ERC20BridgeSource.CryptoCom:
            return encodeBridgeSourceId(BridgeProtocol.CryptoCom, 'CryptoCom');
        case ERC20BridgeSource.Dodo:
            return encodeBridgeSourceId(BridgeProtocol.Dodo, 'Dodo');
        case ERC20BridgeSource.LiquidityProvider:
            // "LiquidityProvider" is too long to encode (17 characters).
            return encodeBridgeSourceId(BridgeProtocol.Unknown, 'LP');
        case ERC20BridgeSource.MakerPsm:
            return encodeBridgeSourceId(BridgeProtocol.MakerPsm, 'MakerPsm');
        case ERC20BridgeSource.Mooniswap:
            return encodeBridgeSourceId(BridgeProtocol.Mooniswap, 'Mooniswap');
        case ERC20BridgeSource.MStable:
            return encodeBridgeSourceId(BridgeProtocol.MStable, 'MStable');
        case ERC20BridgeSource.Shell:
            return encodeBridgeSourceId(BridgeProtocol.Shell, 'Shell');
        case ERC20BridgeSource.SushiSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SushiSwap');
        case ERC20BridgeSource.Uniswap:
            return encodeBridgeSourceId(BridgeProtocol.Uniswap, 'Uniswap');
        case ERC20BridgeSource.UniswapV2:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2');
        case ERC20BridgeSource.DodoV2:
            return encodeBridgeSourceId(BridgeProtocol.DodoV2, 'DodoV2');
        case ERC20BridgeSource.PancakeSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'PancakeSwap');
        case ERC20BridgeSource.PancakeSwapV2:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'PancakeSwapV2');
        case ERC20BridgeSource.BakerySwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'BakerySwap');
        case ERC20BridgeSource.Nerve:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'Nerve');
        case ERC20BridgeSource.Synapse:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'Synapse');
        case ERC20BridgeSource.Belt:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Belt');
        case ERC20BridgeSource.Ellipsis:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'Ellipsis');
        case ERC20BridgeSource.Component:
            return encodeBridgeSourceId(BridgeProtocol.Shell, 'Component');
        case ERC20BridgeSource.Saddle:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'Saddle');
        case ERC20BridgeSource.ApeSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'ApeSwap');
        case ERC20BridgeSource.UniswapV3:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV3, 'UniswapV3');
        case ERC20BridgeSource.KyberDmm:
            return encodeBridgeSourceId(BridgeProtocol.KyberDmm, 'KyberDmm');
        case ERC20BridgeSource.QuickSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'QuickSwap');
        case ERC20BridgeSource.Dfyn:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'Dfyn');
        case ERC20BridgeSource.CurveV2:
            return encodeBridgeSourceId(BridgeProtocol.CurveV2, 'CurveV2');
        case ERC20BridgeSource.WaultSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'WaultSwap');
        case ERC20BridgeSource.FirebirdOneSwap:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'FirebirdOneSwap');
        case ERC20BridgeSource.Lido:
            return encodeBridgeSourceId(BridgeProtocol.Lido, 'Lido');
        case ERC20BridgeSource.ShibaSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'ShibaSwap');
        case ERC20BridgeSource.IronSwap:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'IronSwap');
        case ERC20BridgeSource.ACryptos:
            return encodeBridgeSourceId(BridgeProtocol.Curve, 'ACryptoS');
        case ERC20BridgeSource.Pangolin:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'Pangolin');
        case ERC20BridgeSource.TraderJoe:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'TraderJoe');
        case ERC20BridgeSource.UbeSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UbeSwap');
        case ERC20BridgeSource.Beethovenx:
            return encodeBridgeSourceId(BridgeProtocol.BalancerV2, 'Beethovenx');
        case ERC20BridgeSource.SpiritSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SpiritSwap');
        case ERC20BridgeSource.SpookySwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SpookySwap');
        case ERC20BridgeSource.MorpheusSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'MorpheusSwap');
        case ERC20BridgeSource.Yoshi:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'Yoshi');
        case ERC20BridgeSource.AaveV2:
            return encodeBridgeSourceId(BridgeProtocol.AaveV2, 'AaveV2');
        case ERC20BridgeSource.Compound:
            return encodeBridgeSourceId(BridgeProtocol.Compound, 'Compound');
        case ERC20BridgeSource.MobiusMoney:
            return encodeBridgeSourceId(BridgeProtocol.Nerve, 'MobiusMoney');
        case ERC20BridgeSource.BiSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'BiSwap');
        case ERC20BridgeSource.MDex:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'MDex');
        case ERC20BridgeSource.KnightSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'KnightSwap');
        case ERC20BridgeSource.GMX:
            return encodeBridgeSourceId(BridgeProtocol.GMX, 'GMX');
        case ERC20BridgeSource.Platypus:
            return encodeBridgeSourceId(BridgeProtocol.Platypus, 'Platypus');
        case ERC20BridgeSource.MeshSwap:
            return encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'MeshSwap');
        case ERC20BridgeSource.BancorV3:
            return encodeBridgeSourceId(BridgeProtocol.BancorV3, 'BancorV3');
        case ERC20BridgeSource.Velodrome:
            return encodeBridgeSourceId(BridgeProtocol.Solidly, 'Velodrome');
        case ERC20BridgeSource.Synthetix:
            return encodeBridgeSourceId(BridgeProtocol.Synthetix, 'Synthetix');
        case ERC20BridgeSource.WOOFi:
            return encodeBridgeSourceId(BridgeProtocol.WOOFi, 'WOOFi');
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
        case ERC20BridgeSource.Nerve:
        case ERC20BridgeSource.Synapse:
        case ERC20BridgeSource.Belt:
        case ERC20BridgeSource.Ellipsis:
        case ERC20BridgeSource.Saddle:
        case ERC20BridgeSource.FirebirdOneSwap:
        case ERC20BridgeSource.IronSwap:
        case ERC20BridgeSource.ACryptos:
        case ERC20BridgeSource.MobiusMoney: {
            const curveFillData = (order as OptimizedMarketBridgeOrder<CurveFillData>).fillData;
            bridgeData = encoder.encode([
                curveFillData.pool.poolAddress,
                curveFillData.pool.exchangeFunctionSelector,
                curveFillData.fromTokenIdx,
                curveFillData.toTokenIdx,
            ]);
            break;
        }
        case ERC20BridgeSource.Balancer: {
            const balancerFillData = (order as OptimizedMarketBridgeOrder<BalancerFillData>).fillData;
            bridgeData = encoder.encode([balancerFillData.poolAddress]);
            break;
        }
        case ERC20BridgeSource.BalancerV2:
            {
                const balancerV2FillData = (order as OptimizedMarketBridgeOrder<BalancerV2BatchSwapFillData>).fillData;
                bridgeData = encoder.encode([
                    balancerV2FillData.vault,
                    balancerV2FillData.swapSteps,
                    balancerV2FillData.assets,
                ]);
            }
            break;
        case ERC20BridgeSource.Beethovenx: {
            const beethovenFillData = (order as OptimizedMarketBridgeOrder<BalancerV2FillData>).fillData;
            const { vault, poolId } = beethovenFillData;
            bridgeData = encoder.encode([vault, poolId]);
            break;
        }
        case ERC20BridgeSource.Bancor: {
            const bancorFillData = (order as OptimizedMarketBridgeOrder<BancorFillData>).fillData;
            bridgeData = encoder.encode([bancorFillData.networkAddress, bancorFillData.path]);
            break;
        }
        case ERC20BridgeSource.UniswapV2:
        case ERC20BridgeSource.SushiSwap:
        case ERC20BridgeSource.CryptoCom:
        case ERC20BridgeSource.PancakeSwap:
        case ERC20BridgeSource.PancakeSwapV2:
        case ERC20BridgeSource.BakerySwap:
        case ERC20BridgeSource.ApeSwap:
        case ERC20BridgeSource.QuickSwap:
        case ERC20BridgeSource.Dfyn:
        case ERC20BridgeSource.WaultSwap:
        case ERC20BridgeSource.ShibaSwap:
        case ERC20BridgeSource.Pangolin:
        case ERC20BridgeSource.TraderJoe:
        case ERC20BridgeSource.UbeSwap:
        case ERC20BridgeSource.SpiritSwap:
        case ERC20BridgeSource.SpookySwap:
        case ERC20BridgeSource.MorpheusSwap:
        case ERC20BridgeSource.BiSwap:
        case ERC20BridgeSource.MDex:
        case ERC20BridgeSource.KnightSwap:
        case ERC20BridgeSource.Yoshi:
        case ERC20BridgeSource.MeshSwap: {
            const uniswapV2FillData = (order as OptimizedMarketBridgeOrder<UniswapV2FillData>).fillData;
            bridgeData = encoder.encode([uniswapV2FillData.router, uniswapV2FillData.tokenAddressPath]);
            break;
        }
        case ERC20BridgeSource.Mooniswap: {
            const mooniswapFillData = (order as OptimizedMarketBridgeOrder<MooniswapFillData>).fillData;
            bridgeData = encoder.encode([mooniswapFillData.poolAddress]);
            break;
        }
        case ERC20BridgeSource.Dodo: {
            const dodoFillData = (order as OptimizedMarketBridgeOrder<DODOFillData>).fillData;
            bridgeData = encoder.encode([
                dodoFillData.helperAddress,
                dodoFillData.poolAddress,
                dodoFillData.isSellBase,
            ]);
            break;
        }
        case ERC20BridgeSource.DodoV2: {
            const dodoV2FillData = (order as OptimizedMarketBridgeOrder<DODOFillData>).fillData;
            bridgeData = encoder.encode([dodoV2FillData.poolAddress, dodoV2FillData.isSellBase]);
            break;
        }
        case ERC20BridgeSource.Shell:
        case ERC20BridgeSource.Component: {
            const shellFillData = (order as OptimizedMarketBridgeOrder<ShellFillData>).fillData;
            bridgeData = encoder.encode([shellFillData.poolAddress]);
            break;
        }
        case ERC20BridgeSource.LiquidityProvider: {
            const lpFillData = (order as OptimizedMarketBridgeOrder<LiquidityProviderFillData>).fillData;
            bridgeData = encoder.encode([lpFillData.poolAddress, tokenAddressEncoder.encode([order.takerToken])]);
            break;
        }
        case ERC20BridgeSource.Uniswap: {
            const uniFillData = (order as OptimizedMarketBridgeOrder<GenericRouterFillData>).fillData;
            bridgeData = encoder.encode([uniFillData.router]);
            break;
        }
        case ERC20BridgeSource.MStable: {
            const mStableFillData = (order as OptimizedMarketBridgeOrder<GenericRouterFillData>).fillData;
            bridgeData = encoder.encode([mStableFillData.router]);
            break;
        }
        case ERC20BridgeSource.MakerPsm: {
            const psmFillData = (order as OptimizedMarketBridgeOrder<MakerPsmFillData>).fillData;
            bridgeData = encoder.encode([psmFillData.psmAddress, psmFillData.gemTokenAddress]);
            break;
        }
        case ERC20BridgeSource.UniswapV3: {
            const uniswapV3FillData = (order as OptimizedMarketBridgeOrder<FinalUniswapV3FillData>).fillData;
            bridgeData = encoder.encode([uniswapV3FillData.router, uniswapV3FillData.uniswapPath]);
            break;
        }
        case ERC20BridgeSource.KyberDmm: {
            const kyberDmmFillData = (order as OptimizedMarketBridgeOrder<KyberDmmFillData>).fillData;
            bridgeData = encoder.encode([
                kyberDmmFillData.router,
                kyberDmmFillData.poolsPath,
                kyberDmmFillData.tokenAddressPath,
            ]);
            break;
        }
        case ERC20BridgeSource.Lido: {
            const lidoFillData = (order as OptimizedMarketBridgeOrder<LidoFillData>).fillData;
            bridgeData = encoder.encode([lidoFillData.stEthTokenAddress, lidoFillData.wstEthTokenAddress]);
            break;
        }
        case ERC20BridgeSource.AaveV2: {
            const aaveFillData = (order as OptimizedMarketBridgeOrder<AaveV2FillData>).fillData;
            bridgeData = encoder.encode([aaveFillData.lendingPool, aaveFillData.aToken]);
            break;
        }
        case ERC20BridgeSource.Compound: {
            const compoundFillData = (order as OptimizedMarketBridgeOrder<CompoundFillData>).fillData;
            bridgeData = encoder.encode([compoundFillData.cToken]);
            break;
        }
        case ERC20BridgeSource.GMX: {
            const gmxFillData = (order as OptimizedMarketBridgeOrder<GMXFillData>).fillData;
            bridgeData = encoder.encode([
                gmxFillData.router,
                gmxFillData.reader,
                gmxFillData.vault,
                gmxFillData.tokenAddressPath,
            ]);
            break;
        }
        case ERC20BridgeSource.Platypus: {
            const platypusFillData = (order as OptimizedMarketBridgeOrder<PlatypusFillData>).fillData;
            bridgeData = encoder.encode([
                platypusFillData.router,
                platypusFillData.pool,
                platypusFillData.tokenAddressPath,
            ]);
            break;
        }
        case ERC20BridgeSource.BancorV3: {
            const bancorV3FillData = (order as OptimizedMarketBridgeOrder<BancorFillData>).fillData;
            bridgeData = encoder.encode([bancorV3FillData.networkAddress, bancorV3FillData.path]);
            break;
        }
        case ERC20BridgeSource.Velodrome: {
            const velodromeFillData = (order as OptimizedMarketBridgeOrder<VelodromeFillData>).fillData;
            bridgeData = encoder.encode([velodromeFillData.router, velodromeFillData.stable]);
            break;
        }
        case ERC20BridgeSource.Synthetix: {
            const fillData = (order as OptimizedMarketBridgeOrder<SynthetixFillData>).fillData;
            bridgeData = encoder.encode([
                fillData.synthetix,
                fillData.takerTokenSymbolBytes32,
                fillData.makerTokenSymbolBytes32,
            ]);
            break;
        }
        case ERC20BridgeSource.WOOFi: {
            const woofiFillData = (order as OptimizedMarketBridgeOrder<WOOFiFillData>).fillData;
            bridgeData = encoder.encode([woofiFillData.poolAddress]);
            break;
        }
        default:
            throw new Error(AggregationError.NoBridgeForSource);
    }
    return bridgeData;
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
const gmxAddressPathEncoder = AbiEncoder.create('(address,address,address,address[])');
const platypusAddressPathEncoder = AbiEncoder.create('(address,address[],address[])');

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
    [ERC20BridgeSource.Nerve]: curveEncoder,
    [ERC20BridgeSource.Synapse]: curveEncoder,
    [ERC20BridgeSource.Belt]: curveEncoder,
    [ERC20BridgeSource.Ellipsis]: curveEncoder,
    [ERC20BridgeSource.Saddle]: curveEncoder,
    [ERC20BridgeSource.FirebirdOneSwap]: curveEncoder,
    [ERC20BridgeSource.IronSwap]: curveEncoder,
    [ERC20BridgeSource.ACryptos]: curveEncoder,
    [ERC20BridgeSource.MobiusMoney]: curveEncoder,
    // UniswapV2 like, (router, address[])
    [ERC20BridgeSource.Bancor]: routerAddressPathEncoder,
    [ERC20BridgeSource.BancorV3]: routerAddressPathEncoder,
    [ERC20BridgeSource.UniswapV2]: routerAddressPathEncoder,
    [ERC20BridgeSource.SushiSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.CryptoCom]: routerAddressPathEncoder,
    [ERC20BridgeSource.ShibaSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.Pangolin]: routerAddressPathEncoder,
    [ERC20BridgeSource.TraderJoe]: routerAddressPathEncoder,
    [ERC20BridgeSource.SpiritSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.SpookySwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.MorpheusSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.BiSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.MDex]: routerAddressPathEncoder,
    [ERC20BridgeSource.KnightSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.Yoshi]: routerAddressPathEncoder,
    [ERC20BridgeSource.MeshSwap]: routerAddressPathEncoder,
    // Avalanche
    [ERC20BridgeSource.GMX]: gmxAddressPathEncoder,
    [ERC20BridgeSource.Platypus]: platypusAddressPathEncoder,
    // Celo
    [ERC20BridgeSource.UbeSwap]: routerAddressPathEncoder,
    // BSC
    [ERC20BridgeSource.PancakeSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.PancakeSwapV2]: routerAddressPathEncoder,
    [ERC20BridgeSource.BakerySwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.ApeSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.WaultSwap]: routerAddressPathEncoder,
    // Polygon
    [ERC20BridgeSource.QuickSwap]: routerAddressPathEncoder,
    [ERC20BridgeSource.Dfyn]: routerAddressPathEncoder,
    // Generic pools
    [ERC20BridgeSource.Shell]: poolEncoder,
    [ERC20BridgeSource.Component]: poolEncoder,
    [ERC20BridgeSource.Mooniswap]: poolEncoder,
    [ERC20BridgeSource.MStable]: poolEncoder,
    [ERC20BridgeSource.Balancer]: poolEncoder,
    [ERC20BridgeSource.Uniswap]: poolEncoder,
    // Custom integrations
    [ERC20BridgeSource.MakerPsm]: makerPsmEncoder,
    [ERC20BridgeSource.BalancerV2]: AbiEncoder.create([
        { name: 'vault', type: 'address' },
        {
            name: 'swapSteps',
            type: 'tuple[]',
            components: [
                { name: 'poolId', type: 'bytes32' },
                { name: 'assetInIndex', type: 'uint256' },
                { name: 'assetOutIndex', type: 'uint256' },
                { name: 'amount', type: 'uint256' },
                { name: 'userData', type: 'bytes' },
            ],
        },
        { name: 'assets', type: 'address[]' },
    ]),
    [ERC20BridgeSource.Beethovenx]: balancerV2Encoder,
    [ERC20BridgeSource.UniswapV3]: AbiEncoder.create([
        { name: 'router', type: 'address' },
        { name: 'path', type: 'bytes' },
    ]),
    [ERC20BridgeSource.KyberDmm]: AbiEncoder.create('(address,address[],address[])'),
    [ERC20BridgeSource.Lido]: AbiEncoder.create('(address,address)'),
    [ERC20BridgeSource.AaveV2]: AbiEncoder.create('(address,address)'),
    [ERC20BridgeSource.Compound]: AbiEncoder.create('(address)'),
    [ERC20BridgeSource.Velodrome]: AbiEncoder.create('(address,bool)'),
    [ERC20BridgeSource.Synthetix]: AbiEncoder.create('(address,bytes32,bytes32)'),
    [ERC20BridgeSource.WOOFi]: AbiEncoder.create('(address)'),
};

function getFillTokenAmounts(fill: Fill, side: MarketOperation): [BigNumber, BigNumber] {
    return [
        // Maker asset amount.
        side === MarketOperation.Sell ? fill.output.integerValue(BigNumber.ROUND_DOWN) : fill.input,
        // Taker asset amount.
        side === MarketOperation.Sell ? fill.input : fill.output.integerValue(BigNumber.ROUND_UP),
    ];
}

export function createNativeOptimizedOrder(
    fill: Fill<NativeFillData>,
    side: MarketOperation,
):
    | OptimizedMarketOrderBase<NativeRfqOrderFillData>
    | OptimizedMarketOrderBase<NativeLimitOrderFillData>
    | OptimizedMarketOrderBase<NativeOtcOrderFillData> {
    const fillData = fill.fillData;
    const [makerAmount, takerAmount] = getFillTokenAmounts(fill, side);
    const base = {
        type: fill.type,
        source: ERC20BridgeSource.Native,
        makerToken: fillData.order.makerToken,
        takerToken: fillData.order.takerToken,
        makerAmount,
        takerAmount,
        fillData,
        fill: cleanFillForExport(fill),
    };
    switch (fill.type) {
        case FillQuoteTransformerOrderType.Rfq:
            return { ...base, type: FillQuoteTransformerOrderType.Rfq, fillData: fillData as NativeRfqOrderFillData };
        case FillQuoteTransformerOrderType.Limit:
            return {
                ...base,
                type: FillQuoteTransformerOrderType.Limit,
                fillData: fillData as NativeLimitOrderFillData,
            };
        case FillQuoteTransformerOrderType.Otc:
            return { ...base, type: FillQuoteTransformerOrderType.Otc, fillData: fillData as NativeOtcOrderFillData };
        case FillQuoteTransformerOrderType.Bridge:
            throw new Error('BridgeOrder is not a Native Order');
        default:
            ((_x: never) => {
                throw new Error('unreachable');
            })(fill.type);
    }
}

export function createBridgeOrder(
    fill: Fill,
    makerToken: string,
    takerToken: string,
    side: MarketOperation,
): OptimizedMarketBridgeOrder {
    const [makerAmount, takerAmount] = getFillTokenAmounts(fill, side);
    return {
        type: FillQuoteTransformerOrderType.Bridge,
        source: fill.source,
        makerToken,
        takerToken,
        makerAmount,
        takerAmount,
        fillData: createFinalBridgeOrderFillDataFromCollapsedFill(fill),
        fill: cleanFillForExport(fill),
        sourcePathId: fill.sourcePathId,
    };
}

function cleanFillForExport(fill: Fill): Fill {
    return _.omit(fill, ['flags', 'fillData', 'sourcePathId', 'source', 'type']) as Fill;
}

function createFinalBridgeOrderFillDataFromCollapsedFill(fill: Fill): FillData {
    switch (fill.source) {
        case ERC20BridgeSource.UniswapV3: {
            const fd = fill.fillData as UniswapV3FillData;
            const { uniswapPath, gasUsed } = getBestUniswapV3PathAmountForInputAmount(fd, fill.input);
            const finalFillData: FinalUniswapV3FillData = {
                router: fd.router,
                tokenAddressPath: fd.tokenAddressPath,
                uniswapPath,
                gasUsed,
            };
            return finalFillData;
        }
        default:
            break;
    }
    return fill.fillData;
}

function getBestUniswapV3PathAmountForInputAmount(
    fillData: UniswapV3FillData,
    inputAmount: BigNumber,
): UniswapV3PathAmount {
    if (fillData.pathAmounts.length === 0) {
        throw new Error(`No Uniswap V3 paths`);
    }
    // Find the best path that can satisfy `inputAmount`.
    // Assumes `fillData.pathAmounts` is sorted ascending.
    for (const pathAmount of fillData.pathAmounts) {
        if (pathAmount.inputAmount.gte(inputAmount)) {
            return pathAmount;
        }
    }
    return fillData.pathAmounts[fillData.pathAmounts.length - 1];
}

export function getMakerTakerTokens(opts: CreateOrderFromPathOpts): [string, string] {
    const makerToken = opts.side === MarketOperation.Sell ? opts.outputToken : opts.inputToken;
    const takerToken = opts.side === MarketOperation.Sell ? opts.inputToken : opts.outputToken;
    return [makerToken, takerToken];
}
