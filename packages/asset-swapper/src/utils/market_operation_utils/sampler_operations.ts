import { LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { SamplerCallResult, SignedNativeOrder } from '../../types';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { BalancerPoolsCache } from './balancer_utils';
import { BancorService } from './bancor_service';
import {
    LIQUIDITY_PROVIDER_REGISTRY,
    MAINNET_CRYPTO_COM_ROUTER,
    MAINNET_MOONISWAP_REGISTRY,
    MAINNET_MOONISWAP_V2_1_REGISTRY,
    MAINNET_MOONISWAP_V2_REGISTRY,
    MAINNET_SUSHI_SWAP_ROUTER,
    MAINNET_UNISWAP_V2_ROUTER,
    MAX_UINT256,
    NULL_BYTES,
    ZERO_AMOUNT,
} from './constants';
import { CreamPoolsCache } from './cream_utils';
import { getCurveInfosForPair, getSnowSwapInfosForPair, getSwerveInfosForPair } from './curve_utils';
import { getKyberOffsets, isAllowedKyberReserveId } from './kyber_utils';
import { getLiquidityProvidersForPair } from './liquidity_provider_utils';
import { getIntermediateTokens } from './multihop_utils';
import { SamplerContractOperation } from './sampler_contract_operation';
import { getShellsForPair } from './shell_utils';
import { SourceFilters } from './source_filters';
import {
    BalancerFillData,
    BancorFillData,
    BatchedOperation,
    CurveFillData,
    CurveInfo,
    DexSample,
    DODOFillData,
    ERC20BridgeSource,
    FillData,
    HopInfo,
    IntermediaryInfo,
    KyberFillData,
    LiquidityProviderFillData,
    LiquidityProviderRegistry,
    MooniswapFillData,
    MultiHopFillData,
    NativeFillData,
    ShellFillData,
    SnowSwapFillData,
    SnowSwapInfo,
    SourceQuoteOperation,
    SushiSwapFillData,
    SwerveFillData,
    SwerveInfo,
    TokenAdjacencyGraph,
    UniswapV2FillData,
} from './types';

/**
 * Source filters for `getTwoHopBuyQuotes()` and `getTwoHopSellQuotes()`.
 */
export const TWO_HOP_SOURCE_FILTERS = SourceFilters.all().exclude([
    ERC20BridgeSource.MultiHop,
    ERC20BridgeSource.Native,
]);
/**
 * Source filters for `getSellQuotes()` and `getBuyQuotes()`.
 */
export const BATCH_SOURCE_FILTERS = SourceFilters.all().exclude([ERC20BridgeSource.MultiHop, ERC20BridgeSource.Native]);

// tslint:disable:no-inferred-empty-object-type no-unbound-method

export const getUniqueIdFromSourceFillData = (source: ERC20BridgeSource, fillData: FillData) => {
    const defaultSourceId = [source, ...[fillData.takerToken, fillData.makerToken].sort()].join('-');
    switch (source) {
        case ERC20BridgeSource.UniswapV2:
        case ERC20BridgeSource.SushiSwap:
        case ERC20BridgeSource.CryptoCom:
            // TODO get the pair ID's and sort
            return defaultSourceId;
        case ERC20BridgeSource.Kyber:
            // TODO just get the reserve id
            return defaultSourceId;
        case ERC20BridgeSource.MultiBridge:
        case ERC20BridgeSource.MStable:
        case ERC20BridgeSource.Shell:
        case ERC20BridgeSource.Uniswap:
        case ERC20BridgeSource.Eth2Dai:
            return defaultSourceId;
        case ERC20BridgeSource.LiquidityProvider:
            return (fillData as LiquidityProviderFillData).poolAddress;
        case ERC20BridgeSource.Native:
            const nativeFillData = fillData as NativeFillData;
            return [nativeFillData.order.maker, nativeFillData.order.salt].join('-');
        case ERC20BridgeSource.Curve:
            // TODO handle impact of 3pool where the meta token actually trades
            // against the 3 pool which will iimpact its uniqueness
            return (fillData as CurveFillData).pool.poolAddress.toLowerCase();
        case ERC20BridgeSource.Swerve:
            return (fillData as SwerveFillData).pool.poolAddress;
        case ERC20BridgeSource.SnowSwap:
            return (fillData as SnowSwapFillData).pool.poolAddress;
        case ERC20BridgeSource.Balancer:
            return (fillData as BalancerFillData).poolAddress;
        case ERC20BridgeSource.Cream:
            return (fillData as BalancerFillData).poolAddress;
        case ERC20BridgeSource.Mooniswap:
            return (fillData as MooniswapFillData).poolAddress;
        case ERC20BridgeSource.Dodo:
            return (fillData as DODOFillData).poolAddress;
        case ERC20BridgeSource.Bancor:
            return [source, ...(fillData as BancorFillData).path.sort()].join('-');
        default:
            throw new Error(`No source id defined for ${source}`);
    }
};

/**
 * Composable operations that can be batched in a single transaction,
 * for use with `DexOrderSampler.executeAsync()`.
 */
export class SamplerOperations {
    protected _bancorService?: BancorService;
    public static constant<T>(result: T): BatchedOperation<T> {
        return {
            encodeCall: () => '0x',
            handleCallResults: _callResults => result,
            handleRevert: _callResults => result,
        };
    }

    constructor(
        protected readonly _samplerContract: ERC20BridgeSamplerContract,
        public readonly balancerPoolsCache: BalancerPoolsCache = new BalancerPoolsCache(),
        public readonly creamPoolsCache: CreamPoolsCache = new CreamPoolsCache(),
        public readonly tokenAdjacencyGraph: TokenAdjacencyGraph = { default: [] },
        public readonly liquidityProviderRegistry: LiquidityProviderRegistry = LIQUIDITY_PROVIDER_REGISTRY,
        bancorServiceFn: () => Promise<BancorService | undefined> = async () => undefined,
    ) {
        // Initialize the Bancor service, fetching paths in the background
        bancorServiceFn()
            .then(service => (this._bancorService = service))
            .catch(/* do nothing */);
    }

    public getTokenDecimals(tokens: string[]): BatchedOperation<BigNumber[]> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Native,
            contract: this._samplerContract,
            function: this._samplerContract.getTokenDecimals,
            params: [tokens],
        });
    }

    public isAddressContract(address: string): BatchedOperation<boolean> {
        return {
            encodeCall: () => this._samplerContract.isContract(address).getABIEncodedTransactionData(),
            handleCallResults: (callResults: string) =>
                this._samplerContract.getABIDecodedReturnData<boolean>('isContract', callResults),
            handleRevert: () => {
                /* should never happen */
                throw new Error('Invalid address for isAddressContract');
            },
        };
    }

    public getLimitOrderFillableTakerAmounts(
        orders: SignedNativeOrder[],
        exchangeAddress: string,
    ): BatchedOperation<BigNumber[]> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Native,
            contract: this._samplerContract,
            function: this._samplerContract.getLimitOrderFillableTakerAssetAmounts,
            // tslint:disable-next-line:no-unnecessary-type-assertion
            params: [orders.map(o => o.order as LimitOrderFields), orders.map(o => o.signature), exchangeAddress],
        });
    }

    public getLimitOrderFillableMakerAmounts(
        orders: SignedNativeOrder[],
        exchangeAddress: string,
    ): BatchedOperation<BigNumber[]> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Native,
            contract: this._samplerContract,
            function: this._samplerContract.getLimitOrderFillableMakerAssetAmounts,
            // tslint:disable-next-line:no-unnecessary-type-assertion
            params: [orders.map(o => o.order as LimitOrderFields), orders.map(o => o.signature), exchangeAddress],
        });
    }

    public getKyberSellQuotes(
        reserveOffset: BigNumber,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Kyber,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromKyberNetwork,
            params: [reserveOffset, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: KyberFillData): BigNumber[] => {
                const [reserveId, hint, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string, BigNumber[]]
                >('sampleSellsFromKyberNetwork', callResults);
                fillData.hint = hint;
                fillData.reserveId = reserveId;
                fillData.makerToken = makerToken;
                fillData.takerToken = takerToken;
                return isAllowedKyberReserveId(reserveId) ? samples : [];
            },
        });
    }

    public getKyberBuyQuotes(
        reserveOffset: BigNumber,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Kyber,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromKyberNetwork,
            params: [reserveOffset, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: KyberFillData): BigNumber[] => {
                const [reserveId, hint, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string, BigNumber[]]
                >('sampleBuysFromKyberNetwork', callResults);
                fillData.hint = hint;
                fillData.reserveId = reserveId;
                fillData.makerToken = makerToken;
                fillData.takerToken = takerToken;
                return isAllowedKyberReserveId(reserveId) ? samples : [];
            },
        });
    }

    public getUniswapSellQuotes(
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Uniswap,
            fillData: { makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromUniswap,
            params: [takerToken, makerToken, takerFillAmounts],
        });
    }

    public getUniswapBuyQuotes(
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Uniswap,
            fillData: { makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromUniswap,
            params: [takerToken, makerToken, makerFillAmounts],
        });
    }

    public getUniswapV2SellQuotes(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<UniswapV2FillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.UniswapV2,
            fillData: {
                tokenAddressPath,
                router: MAINNET_UNISWAP_V2_ROUTER,
                makerToken: tokenAddressPath[tokenAddressPath.length - 1],
                takerToken: tokenAddressPath[0],
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromUniswapV2,
            params: [MAINNET_UNISWAP_V2_ROUTER, tokenAddressPath, takerFillAmounts],
        });
    }

    public getUniswapV2BuyQuotes(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<UniswapV2FillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.UniswapV2,
            fillData: {
                tokenAddressPath,
                router: MAINNET_UNISWAP_V2_ROUTER,
                makerToken: tokenAddressPath[tokenAddressPath.length - 1],
                takerToken: tokenAddressPath[0],
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromUniswapV2,
            params: [MAINNET_UNISWAP_V2_ROUTER, tokenAddressPath, makerFillAmounts],
        });
    }

    public getLiquidityProviderSellQuotes(
        providerAddress: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<LiquidityProviderFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.LiquidityProvider,
            fillData: {
                poolAddress: providerAddress,
                gasCost: this.liquidityProviderRegistry[providerAddress].gasCost,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromLiquidityProvider,
            params: [providerAddress, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getLiquidityProviderBuyQuotes(
        providerAddress: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<LiquidityProviderFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.LiquidityProvider,
            fillData: {
                poolAddress: providerAddress,
                gasCost: this.liquidityProviderRegistry[providerAddress].gasCost,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromLiquidityProvider,
            params: [providerAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getEth2DaiSellQuotes(
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Eth2Dai,
            fillData: { makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromEth2Dai,
            params: [takerToken, makerToken, takerFillAmounts],
        });
    }

    public getEth2DaiBuyQuotes(
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Eth2Dai,
            fillData: { makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromEth2Dai,
            params: [takerToken, makerToken, makerFillAmounts],
        });
    }

    public getCurveSellQuotes(
        pool: CurveInfo,
        fromTokenIdx: number,
        toTokenIdx: number,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<CurveFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Curve,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromCurve,
            params: [
                {
                    poolAddress: pool.poolAddress,
                    sellQuoteFunctionSelector: pool.sellQuoteFunctionSelector,
                    buyQuoteFunctionSelector: pool.buyQuoteFunctionSelector,
                },
                new BigNumber(fromTokenIdx),
                new BigNumber(toTokenIdx),
                takerFillAmounts,
            ],
        });
    }

    public getCurveBuyQuotes(
        pool: CurveInfo,
        fromTokenIdx: number,
        toTokenIdx: number,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<CurveFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Curve,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromCurve,
            params: [
                {
                    poolAddress: pool.poolAddress,
                    sellQuoteFunctionSelector: pool.sellQuoteFunctionSelector,
                    buyQuoteFunctionSelector: pool.buyQuoteFunctionSelector,
                },
                new BigNumber(fromTokenIdx),
                new BigNumber(toTokenIdx),
                makerFillAmounts,
            ],
        });
    }

    public getSwerveSellQuotes(
        pool: SwerveInfo,
        fromTokenIdx: number,
        toTokenIdx: number,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SwerveFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Swerve,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromCurve,
            params: [
                {
                    poolAddress: pool.poolAddress,
                    sellQuoteFunctionSelector: pool.sellQuoteFunctionSelector,
                    buyQuoteFunctionSelector: pool.buyQuoteFunctionSelector,
                },
                new BigNumber(fromTokenIdx),
                new BigNumber(toTokenIdx),
                takerFillAmounts,
            ],
        });
    }

    public getSwerveBuyQuotes(
        pool: SwerveInfo,
        fromTokenIdx: number,
        toTokenIdx: number,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SwerveFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Swerve,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromCurve,
            params: [
                {
                    poolAddress: pool.poolAddress,
                    sellQuoteFunctionSelector: pool.sellQuoteFunctionSelector,
                    buyQuoteFunctionSelector: pool.buyQuoteFunctionSelector,
                },
                new BigNumber(fromTokenIdx),
                new BigNumber(toTokenIdx),
                makerFillAmounts,
            ],
        });
    }

    public getSnowSwapSellQuotes(
        pool: SnowSwapInfo,
        fromTokenIdx: number,
        toTokenIdx: number,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SnowSwapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.SnowSwap,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromCurve,
            params: [
                {
                    poolAddress: pool.poolAddress,
                    sellQuoteFunctionSelector: pool.sellQuoteFunctionSelector,
                    buyQuoteFunctionSelector: pool.buyQuoteFunctionSelector,
                },
                new BigNumber(fromTokenIdx),
                new BigNumber(toTokenIdx),
                takerFillAmounts,
            ],
        });
    }

    public getSnowSwapBuyQuotes(
        pool: SnowSwapInfo,
        fromTokenIdx: number,
        toTokenIdx: number,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SnowSwapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.SnowSwap,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
                makerToken,
                takerToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromCurve,
            params: [
                {
                    poolAddress: pool.poolAddress,
                    sellQuoteFunctionSelector: pool.sellQuoteFunctionSelector,
                    buyQuoteFunctionSelector: pool.buyQuoteFunctionSelector,
                },
                new BigNumber(fromTokenIdx),
                new BigNumber(toTokenIdx),
                makerFillAmounts,
            ],
        });
    }

    public getBalancerSellQuotes(
        poolAddress: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource,
    ): SourceQuoteOperation<BalancerFillData> {
        return new SamplerContractOperation({
            source,
            fillData: { poolAddress, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromBalancer,
            params: [poolAddress, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getBalancerBuyQuotes(
        poolAddress: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource,
    ): SourceQuoteOperation<BalancerFillData> {
        return new SamplerContractOperation({
            source,
            fillData: { poolAddress, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromBalancer,
            params: [poolAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public async getBalancerSellQuotesOffChainAsync(
        makerToken: string,
        takerToken: string,
        _takerFillAmounts: BigNumber[],
    ): Promise<Array<Array<DexSample<BalancerFillData>>>> {
        // Prime the cache but do not sample off chain
        await this.balancerPoolsCache.getPoolsForPairAsync(takerToken, makerToken);
        return [];
        // return pools.map(pool =>
        //    takerFillAmounts.map(amount => ({
        //        source: ERC20BridgeSource.Balancer,
        //        output: computeBalancerSellQuote(pool, amount),
        //        input: amount,
        //        fillData: { poolAddress: pool.id },
        //    })),
        // );
    }

    public async getBalancerBuyQuotesOffChainAsync(
        makerToken: string,
        takerToken: string,
        _makerFillAmounts: BigNumber[],
    ): Promise<Array<Array<DexSample<BalancerFillData>>>> {
        // Prime the pools but do not sample off chain
        // Prime the cache but do not sample off chain
        await this.balancerPoolsCache.getPoolsForPairAsync(takerToken, makerToken);
        return [];
        // return pools.map(pool =>
        //    makerFillAmounts.map(amount => ({
        //        source: ERC20BridgeSource.Balancer,
        //        output: computeBalancerBuyQuote(pool, amount),
        //        input: amount,
        //        fillData: { poolAddress: pool.id },
        //    })),
        // );
    }

    public async getCreamSellQuotesOffChainAsync(
        makerToken: string,
        takerToken: string,
        _takerFillAmounts: BigNumber[],
    ): Promise<Array<Array<DexSample<BalancerFillData>>>> {
        // Prime the cache but do not sample off chain
        await this.creamPoolsCache.getPoolsForPairAsync(takerToken, makerToken);
        return [];
        // return pools.map(pool =>
        //     takerFillAmounts.map(amount => ({
        //         source: ERC20BridgeSource.Cream,
        //         output: computeBalancerSellQuote(pool, amount),
        //         input: amount,
        //         fillData: { poolAddress: pool.id },
        //     })),
        // );
    }

    public async getCreamBuyQuotesOffChainAsync(
        makerToken: string,
        takerToken: string,
        _makerFillAmounts: BigNumber[],
    ): Promise<Array<Array<DexSample<BalancerFillData>>>> {
        // Prime the cache but do not sample off chain
        await this.creamPoolsCache.getPoolsForPairAsync(takerToken, makerToken);
        return [];
        // return pools.map(pool =>
        //    makerFillAmounts.map(amount => ({
        //        source: ERC20BridgeSource.Cream,
        //        output: computeBalancerBuyQuote(pool, amount),
        //        input: amount,
        //        fillData: { poolAddress: pool.id },
        //    })),
        // );
    }

    public getMStableSellQuotes(
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.MStable,
            fillData: { makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromMStable,
            params: [takerToken, makerToken, takerFillAmounts],
        });
    }

    public getMStableBuyQuotes(
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.MStable,
            fillData: { makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromMStable,
            params: [takerToken, makerToken, makerFillAmounts],
        });
    }

    public getBancorSellQuotes(
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<BancorFillData> {
        const paths = this._bancorService ? this._bancorService.getPaths(takerToken, makerToken) : [];
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Bancor,
            fillData: { networkAddress: NULL_BYTES, path: [], makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromBancor,
            params: [paths, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: BancorFillData): BigNumber[] => {
                const [networkAddress, path, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string[], BigNumber[]]
                >('sampleSellsFromBancor', callResults);
                fillData.networkAddress = networkAddress;
                fillData.path = path;
                return samples;
            },
        });
    }

    // Unimplemented
    public getBancorBuyQuotes(
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<BancorFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Bancor,
            fillData: { networkAddress: NULL_BYTES, path: [], makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromBancor,
            params: [[], takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: BancorFillData): BigNumber[] => {
                const [networkAddress, path, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string[], BigNumber[]]
                >('sampleSellsFromBancor', callResults);
                fillData.networkAddress = networkAddress;
                fillData.path = path;
                return samples;
            },
        });
    }

    public getMooniswapSellQuotes(
        registry: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<MooniswapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Mooniswap,
            fillData: { poolAddress: NULL_BYTES, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromMooniswap,
            params: [registry, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: MooniswapFillData): BigNumber[] => {
                const [poolAddress, samples] = this._samplerContract.getABIDecodedReturnData<[string, BigNumber[]]>(
                    'sampleSellsFromMooniswap',
                    callResults,
                );
                fillData.poolAddress = poolAddress;
                return samples;
            },
        });
    }

    public getMooniswapBuyQuotes(
        registry: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<MooniswapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Mooniswap,
            fillData: { poolAddress: NULL_BYTES, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromMooniswap,
            params: [registry, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: MooniswapFillData): BigNumber[] => {
                const [poolAddress, samples] = this._samplerContract.getABIDecodedReturnData<[string, BigNumber[]]>(
                    'sampleBuysFromMooniswap',
                    callResults,
                );
                fillData.poolAddress = poolAddress;
                return samples;
            },
        });
    }

    public getTwoHopSellQuotes(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        sellAmount: BigNumber,
    ): BatchedOperation<Array<DexSample<MultiHopFillData>>> {
        const _sources = TWO_HOP_SOURCE_FILTERS.getAllowed(sources);
        if (_sources.length === 0) {
            return SamplerOperations.constant([]);
        }
        const intermediateTokens = getIntermediateTokens(makerToken, takerToken, this.tokenAdjacencyGraph);
        const subOps = intermediateTokens.map(intermediateToken => {
            const firstHopOps = this._getSellQuoteOperations(_sources, intermediateToken, takerToken, [ZERO_AMOUNT]);
            const secondHopOps = this._getSellQuoteOperations(_sources, makerToken, intermediateToken, [ZERO_AMOUNT]);
            return new SamplerContractOperation({
                contract: this._samplerContract,
                source: ERC20BridgeSource.MultiHop,
                function: this._samplerContract.sampleTwoHopSell,
                params: [firstHopOps.map(op => op.encodeCall()), secondHopOps.map(op => op.encodeCall()), sellAmount],
                fillData: { intermediateToken } as MultiHopFillData, // tslint:disable-line:no-object-literal-type-assertion
                callback: (callResults: string, fillData: MultiHopFillData): BigNumber[] => {
                    const [firstHop, secondHop, buyAmount] = this._samplerContract.getABIDecodedReturnData<
                        [HopInfo, HopInfo, BigNumber]
                    >('sampleTwoHopSell', callResults);
                    // Ensure the hop sources are set even when the buy amount is zero
                    fillData.firstHopSource = { ...firstHopOps[firstHop.sourceIndex.toNumber()] };
                    fillData.secondHopSource = { ...secondHopOps[secondHop.sourceIndex.toNumber()] };
                    if (buyAmount.isZero()) {
                        return [ZERO_AMOUNT];
                    }
                    fillData.firstHopSource.handleCallResults(firstHop.returnData);
                    fillData.secondHopSource.handleCallResults(secondHop.returnData);
                    fillData.makerToken = makerToken;
                    fillData.takerToken = takerToken;
                    return [buyAmount];
                },
            });
        });
        return this._createBatch(
            subOps,
            (samples: BigNumber[][]) => {
                return subOps.map((op, i) => {
                    return {
                        source: op.source,
                        output: samples[i][0],
                        input: sellAmount,
                        fillData: op.fillData,
                    };
                });
            },
            () => [],
        );
    }

    public getTwoHopBuyQuotes(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        buyAmount: BigNumber,
    ): BatchedOperation<Array<DexSample<MultiHopFillData>>> {
        const _sources = TWO_HOP_SOURCE_FILTERS.getAllowed(sources);
        if (_sources.length === 0) {
            return SamplerOperations.constant([]);
        }
        const intermediateTokens = getIntermediateTokens(makerToken, takerToken, this.tokenAdjacencyGraph);
        const subOps = intermediateTokens.map(intermediateToken => {
            const firstHopOps = this._getBuyQuoteOperations(_sources, intermediateToken, takerToken, [
                new BigNumber(0),
            ]);
            const secondHopOps = this._getBuyQuoteOperations(_sources, makerToken, intermediateToken, [
                new BigNumber(0),
            ]);
            return new SamplerContractOperation({
                contract: this._samplerContract,
                source: ERC20BridgeSource.MultiHop,
                function: this._samplerContract.sampleTwoHopBuy,
                params: [firstHopOps.map(op => op.encodeCall()), secondHopOps.map(op => op.encodeCall()), buyAmount],
                fillData: { intermediateToken } as MultiHopFillData, // tslint:disable-line:no-object-literal-type-assertion
                callback: (callResults: string, fillData: MultiHopFillData): BigNumber[] => {
                    const [firstHop, secondHop, sellAmount] = this._samplerContract.getABIDecodedReturnData<
                        [HopInfo, HopInfo, BigNumber]
                    >('sampleTwoHopBuy', callResults);
                    if (sellAmount.isEqualTo(MAX_UINT256)) {
                        return [sellAmount];
                    }
                    fillData.firstHopSource = { ...firstHopOps[firstHop.sourceIndex.toNumber()] };
                    fillData.secondHopSource = { ...secondHopOps[secondHop.sourceIndex.toNumber()] };
                    fillData.firstHopSource.handleCallResults(firstHop.returnData);
                    fillData.secondHopSource.handleCallResults(secondHop.returnData);
                    fillData.makerToken = makerToken;
                    fillData.takerToken = takerToken;
                    return [sellAmount];
                },
            });
        });
        return this._createBatch(
            subOps,
            (samples: BigNumber[][]) => {
                return subOps.map((op, i) => {
                    return {
                        source: op.source,
                        output: samples[i][0],
                        input: buyAmount,
                        fillData: op.fillData,
                    };
                });
            },
            () => [],
        );
    }

    public getSushiSwapSellQuotes(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SushiSwapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.SushiSwap,
            fillData: {
                tokenAddressPath,
                router: MAINNET_SUSHI_SWAP_ROUTER,
                makerToken: tokenAddressPath[tokenAddressPath.length - 1],
                takerToken: tokenAddressPath[0],
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromSushiSwap,
            params: [MAINNET_SUSHI_SWAP_ROUTER, tokenAddressPath, takerFillAmounts],
        });
    }

    public getSushiSwapBuyQuotes(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SushiSwapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.SushiSwap,
            fillData: {
                tokenAddressPath,
                router: MAINNET_SUSHI_SWAP_ROUTER,
                makerToken: tokenAddressPath[tokenAddressPath.length - 1],
                takerToken: tokenAddressPath[0],
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromSushiSwap,
            params: [MAINNET_SUSHI_SWAP_ROUTER, tokenAddressPath, makerFillAmounts],
        });
    }

    public getCryptoComSellQuotes(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SushiSwapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.CryptoCom,
            fillData: {
                tokenAddressPath,
                router: MAINNET_CRYPTO_COM_ROUTER,
                makerToken: tokenAddressPath[tokenAddressPath.length - 1],
                takerToken: tokenAddressPath[0],
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromSushiSwap,
            params: [MAINNET_CRYPTO_COM_ROUTER, tokenAddressPath, takerFillAmounts],
        });
    }

    public getCryptoComBuyQuotes(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SushiSwapFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.CryptoCom,
            fillData: {
                tokenAddressPath,
                router: MAINNET_CRYPTO_COM_ROUTER,
                makerToken: tokenAddressPath[tokenAddressPath.length - 1],
                takerToken: tokenAddressPath[0],
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromSushiSwap,
            params: [MAINNET_CRYPTO_COM_ROUTER, tokenAddressPath, makerFillAmounts],
        });
    }

    public getShellSellQuotes(
        poolAddress: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<ShellFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Shell,
            fillData: { poolAddress, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromShell,
            params: [poolAddress, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getShellBuyQuotes(
        poolAddress: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Shell,
            fillData: { poolAddress, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromShell,
            params: [poolAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getDODOSellQuotes(
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<DODOFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Dodo,
            fillData: { isSellBase: false, poolAddress: NULL_BYTES, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromDODO,
            params: [takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): BigNumber[] => {
                const [isSellBase, pool, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[]]
                >('sampleSellsFromDODO', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                return samples;
            },
        });
    }

    public getDODOBuyQuotes(
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<DODOFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Dodo,
            fillData: { isSellBase: false, poolAddress: NULL_BYTES, makerToken, takerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromDODO,
            params: [takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): BigNumber[] => {
                const [isSellBase, pool, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[]]
                >('sampleBuysFromDODO', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                return samples;
            },
        });
    }

    public getMedianSellRate(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        takerFillAmount: BigNumber,
    ): BatchedOperation<BigNumber> {
        if (makerToken.toLowerCase() === takerToken.toLowerCase()) {
            return SamplerOperations.constant(new BigNumber(1));
        }
        const subOps = this._getSellQuoteOperations(sources, makerToken, takerToken, [takerFillAmount], {
            default: [],
        });
        return this._createBatch(
            subOps,
            (samples: BigNumber[][]) => {
                if (samples.length === 0) {
                    return ZERO_AMOUNT;
                }
                const flatSortedSamples = samples
                    .reduce((acc, v) => acc.concat(...v))
                    .filter(v => !v.isZero())
                    .sort((a, b) => a.comparedTo(b));
                if (flatSortedSamples.length === 0) {
                    return ZERO_AMOUNT;
                }
                const medianSample = flatSortedSamples[Math.floor(flatSortedSamples.length / 2)];
                return medianSample.div(takerFillAmount);
            },
            () => ZERO_AMOUNT,
        );
    }

    public getMedianSellRates(
        sources: ERC20BridgeSource[],
        buyTokens: string[],
        sellToken: string,
        takerFillAmount: BigNumber,
    ): BatchedOperation<BigNumber[]> {
        const subOps = buyTokens.map(a => this.getMedianSellRate(sources, a, sellToken, takerFillAmount));
        return {
            encodeCall: () => {
                const subCalls = subOps.map(op => op.encodeCall());
                return this._samplerContract.batchCall(subCalls).getABIEncodedTransactionData();
            },
            handleCallResults: callResults => {
                const rawSubCallResults = this._samplerContract.getABIDecodedReturnData<SamplerCallResult[]>(
                    'batchCall',
                    callResults,
                );
                const results = subOps.map((op, i) =>
                    rawSubCallResults[i].success
                        ? op.handleCallResults(rawSubCallResults[i].data)
                        : op.handleRevert(rawSubCallResults[i].data),
                );
                return results;
            },
            handleRevert: () => [],
        };
    }

    public getSellQuotes(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): BatchedOperation<DexSample[][]> {
        const subOps = this._getSellQuoteOperations(sources, makerToken, takerToken, takerFillAmounts);
        return this._createBatch(
            subOps,
            (samples: BigNumber[][]) => {
                return subOps.map((op, i) => {
                    return samples[i].map((output, j) => ({
                        source: op.source,
                        output,
                        input: takerFillAmounts[j],
                        fillData: op.fillData,
                    }));
                });
            },
            () => [],
        );
    }

    public getBuyQuotes(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): BatchedOperation<DexSample[][]> {
        const subOps = this._getBuyQuoteOperations(sources, makerToken, takerToken, makerFillAmounts);
        return this._createBatch(
            subOps,
            (samples: BigNumber[][]) => {
                return subOps.map((op, i) => {
                    return samples[i].map((output, j) => ({
                        source: op.source,
                        output,
                        input: makerFillAmounts[j],
                        fillData: op.fillData,
                    }));
                });
            },
            () => [],
        );
    }

    public getSellQuotesExtra(
        sources: ERC20BridgeSource[],
        _makerToken: string,
        _takerToken: string,
        weth: string,
        _takerFillAmounts: BigNumber[],
    ): BatchedOperation<DexSample[][]> {
        const _sources = BATCH_SOURCE_FILTERS.getAllowed(sources);
        // Use intermediate hops here just for a indicative price of the asset when looking for second + third hops
        // I.e we may not get a good price for WBTC->USDT directly, so make use of WBTC->ETH->USDT for a more approximate
        // price.
        // If used incorrectly this can cause collisions as you may get a WBTC->ETH->USDT and a WBTC->ETH and an ETH->USDT
        // from the same source
        const getOps = (
            makerToken: string,
            takerToken: string,
            takerFillAmounts: BigNumber[],
            tokenAdjacency: TokenAdjacencyGraph,
        ) => {
            return _.flatten(
                _sources.map(
                    (source): SourceQuoteOperation | SourceQuoteOperation[] => {
                        switch (source) {
                            case ERC20BridgeSource.Eth2Dai:
                                return this.getEth2DaiSellQuotes(makerToken, takerToken, takerFillAmounts);
                            case ERC20BridgeSource.Uniswap:
                                return this.getUniswapSellQuotes(makerToken, takerToken, takerFillAmounts);
                            case ERC20BridgeSource.UniswapV2:
                                return [
                                    this.getUniswapV2SellQuotes([takerToken, makerToken], takerFillAmounts),
                                    ...getIntermediateTokens(makerToken, takerToken, tokenAdjacency).map(i =>
                                        this.getUniswapV2SellQuotes([takerToken, i, makerToken], takerFillAmounts),
                                    ),
                                ];
                            case ERC20BridgeSource.SushiSwap:
                                return [
                                    this.getSushiSwapSellQuotes([takerToken, makerToken], takerFillAmounts),
                                    ...getIntermediateTokens(makerToken, takerToken, tokenAdjacency).map(i =>
                                        this.getSushiSwapSellQuotes([takerToken, i, makerToken], takerFillAmounts),
                                    ),
                                ];
                            case ERC20BridgeSource.CryptoCom:
                                return this.getCryptoComSellQuotes([takerToken, makerToken], takerFillAmounts);
                            case ERC20BridgeSource.Kyber:
                                // Skip the hidden Token->ETH->Token inside of Kyber
                                if (makerToken !== weth && takerToken !== weth) {
                                    return [];
                                }
                                return getKyberOffsets().map(offset =>
                                    this.getKyberSellQuotes(offset, makerToken, takerToken, takerFillAmounts),
                                );
                            case ERC20BridgeSource.Curve:
                                return getCurveInfosForPair(takerToken, makerToken).map(pool =>
                                    this.getCurveSellQuotes(
                                        pool,
                                        pool.tokens.indexOf(takerToken),
                                        pool.tokens.indexOf(makerToken),
                                        makerToken,
                                        takerToken,
                                        takerFillAmounts,
                                    ),
                                );
                            case ERC20BridgeSource.Swerve:
                                return getSwerveInfosForPair(takerToken, makerToken).map(pool =>
                                    this.getSwerveSellQuotes(
                                        pool,
                                        pool.tokens.indexOf(takerToken),
                                        pool.tokens.indexOf(makerToken),
                                        makerToken,
                                        takerToken,
                                        takerFillAmounts,
                                    ),
                                );
                            case ERC20BridgeSource.SnowSwap:
                                return getSnowSwapInfosForPair(takerToken, makerToken).map(pool =>
                                    this.getSnowSwapSellQuotes(
                                        pool,
                                        pool.tokens.indexOf(takerToken),
                                        pool.tokens.indexOf(makerToken),
                                        makerToken,
                                        takerToken,
                                        takerFillAmounts,
                                    ),
                                );
                            case ERC20BridgeSource.LiquidityProvider:
                                return getLiquidityProvidersForPair(
                                    this.liquidityProviderRegistry,
                                    takerToken,
                                    makerToken,
                                ).map(pool =>
                                    this.getLiquidityProviderSellQuotes(pool, makerToken, takerToken, takerFillAmounts),
                                );
                            case ERC20BridgeSource.MStable:
                                return this.getMStableSellQuotes(makerToken, takerToken, takerFillAmounts);
                            case ERC20BridgeSource.Mooniswap:
                                return [
                                    ...[
                                        MAINNET_MOONISWAP_REGISTRY,
                                        MAINNET_MOONISWAP_V2_REGISTRY,
                                        MAINNET_MOONISWAP_V2_1_REGISTRY,
                                    ].map(registry =>
                                        this.getMooniswapSellQuotes(registry, makerToken, takerToken, takerFillAmounts),
                                    ),
                                ];
                            case ERC20BridgeSource.Balancer:
                                return this.balancerPoolsCache
                                    .getCachedPoolAddressesForPair(takerToken, makerToken)!
                                    .map(poolAddress =>
                                        this.getBalancerSellQuotes(
                                            poolAddress,
                                            makerToken,
                                            takerToken,
                                            takerFillAmounts,
                                            ERC20BridgeSource.Balancer,
                                        ),
                                    );
                            case ERC20BridgeSource.Cream:
                                return this.creamPoolsCache
                                    .getCachedPoolAddressesForPair(takerToken, makerToken)!
                                    .map(poolAddress =>
                                        this.getBalancerSellQuotes(
                                            poolAddress,
                                            makerToken,
                                            takerToken,
                                            takerFillAmounts,
                                            ERC20BridgeSource.Cream,
                                        ),
                                    );
                            case ERC20BridgeSource.Shell:
                                return getShellsForPair(takerToken, makerToken).map(pool =>
                                    this.getShellSellQuotes(pool, makerToken, takerToken, takerFillAmounts),
                                );
                            case ERC20BridgeSource.Dodo:
                                return this.getDODOSellQuotes(makerToken, takerToken, takerFillAmounts);
                            case ERC20BridgeSource.Bancor:
                                return this.getBancorSellQuotes(makerToken, takerToken, takerFillAmounts);
                            default:
                                console.log(`Unsupported sell extra sample source: ${source}`);
                                return [];
                            // throw new Error(`Unsupported sell sample source: ${source}`);
                        }
                    },
                ),
            );
        };
        const emptyAdjacency: TokenAdjacencyGraph = { default: [] };
        const paths: { [i: string]: Set<string> } = {};
        // Find the adjacent tokens in the provided tooken adjacency graph,
        // e.g if this is DAI->USDC we may check for DAI->WETH->USDC
        const intermediateTokens = getIntermediateTokens(_makerToken, _takerToken, this.tokenAdjacencyGraph);
        intermediateTokens.forEach(i => {
            if (!paths[_takerToken]) {
                paths[_takerToken] = new Set();
            }
            if (!paths[i]) {
                paths[i] = new Set();
            }
            if (!paths[_makerToken]) {
                paths[_makerToken] = new Set();
            }
            // Example UNI->ZRX
            // UNI->ETH, taker->intermediary
            paths[_takerToken].add(i);
            // ETH->ZRX, intermediary->maker
            paths[i].add(_makerToken);
            // ETH->DAI, ETH->USDC, ETH->USDT, intermediary->intermediary
            intermediateTokens.forEach(ii => {
                if (i !== ii) {
                    paths[i].add(ii);
                }
            });
            // ZRX->ETH (if we feel like finding an arb), maker->intermediary
            paths[_makerToken].add(i);
        });
        // add the direct path, taker->maker
        paths[_takerToken].add(_makerToken);

        const subOps = _.flatten(
            Object.entries(paths).map(([token, iTokens]) => {
                return _.flatten(
                    Array.from(iTokens).map(intermediaryToken => {
                        // Direct trade, from the original taker token
                        // takerFillAmounts are relevant and do not need to be calculated
                        if (token === _takerToken) {
                            // Maker, taker, fillAmounts
                            return getOps(intermediaryToken, token, _takerFillAmounts, emptyAdjacency);
                        } else {
                            // Use the first hop of taker token (e.g UNI->ETH) with the original
                            // fill amounts to infer the size of the second hop
                            // Maker, taker, fillAmounts
                            const firstHopOps = getOps(
                                token,
                                _takerToken,
                                _takerFillAmounts,
                                // Explicitly use the token adjancency for the first hops as a oracle price
                                this.tokenAdjacencyGraph,
                            );
                            // The first encoding does the actual work, all others rely on the first result to decode
                            // all others are NOOPs in the sampler
                            // Second Hops, eg ETH->ZRX
                            const secondHopOps = getOps(intermediaryToken, token, [ZERO_AMOUNT], emptyAdjacency);
                            if (secondHopOps.length === 0) {
                                return [];
                            }
                            let intermediaryInfo: IntermediaryInfo[];
                            let intermediaryAmounts: BigNumber[];

                            // This operation performs the entire work
                            const firstSecondHopOp = new SamplerContractOperation({
                                contract: this._samplerContract,
                                source: secondHopOps[0].source,
                                fillData: secondHopOps[0].fillData,
                                function: this._samplerContract.sampleIntermediateSell,
                                params: [
                                    firstHopOps.map(op => op.encodeCall()),
                                    secondHopOps.map(op => op.encodeCall()),
                                    _takerFillAmounts,
                                ],
                                inputAmountOverride: () => intermediaryAmounts,
                                callback: (callResults: string, fillData: FillData): BigNumber[] => {
                                    const [
                                        _intermediaryInfo,
                                        _intermediaryAmounts,
                                    ] = this._samplerContract.getABIDecodedReturnData<
                                        [IntermediaryInfo[], BigNumber[]]
                                    >('sampleIntermediateSell', callResults);
                                    // Store in the above context for other results to parse
                                    intermediaryInfo = _intermediaryInfo;
                                    intermediaryAmounts = _intermediaryAmounts;
                                    // console.log({ intermediaryInfo });
                                    // Parse the extra fill data if required from the return data
                                    secondHopOps[0].handleCallResults(intermediaryInfo[0].returnData);
                                    // assign it to this fill data or something
                                    Object.assign(fillData, { ...secondHopOps[0].fillData });
                                    return intermediaryInfo[0].makerTokenAmounts;
                                },
                            });
                            return secondHopOps.map((op, i) =>
                                i === 0
                                    ? firstSecondHopOp
                                    : new SamplerContractOperation({
                                          contract: this._samplerContract,
                                          source: op.source,
                                          fillData: op.fillData,
                                          function: this._samplerContract.sampleIntermediateSell,
                                          encodeCallback: () => NULL_BYTES,
                                          params: [] as any,
                                          callback: (_callResults: string, _fillData: FillData): BigNumber[] => {
                                              // The first result has already decoded everything for us
                                              op.handleCallResults(intermediaryInfo[i].returnData);
                                              return intermediaryInfo[i].makerTokenAmounts;
                                          },
                                          inputAmountOverride: () => intermediaryAmounts,
                                      }),
                            );
                        }
                    }),
                );
            }),
        );

        console.log(paths);

        // ignore all of these samples
        subOps.forEach(s => {
            if (s.fillData) {
                s.fillData.shouldIgnore = true;
            }
        });
        return {
            encodeCall: () => {
                const subCalls = subOps.map(op => op.encodeCall());
                return this._samplerContract.batchCall(subCalls).getABIEncodedTransactionData();
            },
            handleCallResults: callResults => {
                const rawSubCallResults = this._samplerContract.getABIDecodedReturnData<SamplerCallResult[]>(
                    'batchCall',
                    callResults,
                );
                const results = subOps.map((op, i) =>
                    rawSubCallResults[i].success
                        ? op.handleCallResults(rawSubCallResults[i].data)
                        : op.handleRevert(rawSubCallResults[i].data),
                );
                return subOps.map((op, i) => {
                    return results[i].map((output, j) => ({
                        source: op.source,
                        output,
                        input: op.inputAmountOverride ? op.inputAmountOverride()[j] : _takerFillAmounts[j],
                        fillData: op.fillData,
                    }));
                });
            },
            handleRevert: callResults => {
                console.log(`Extra samples reverted ${callResults}`);
                return [];
            },
        };
    }

    private _getSellQuoteOperations(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        tokenAdjacencyGraph: TokenAdjacencyGraph = this.tokenAdjacencyGraph,
    ): SourceQuoteOperation[] {
        // Find the adjacent tokens in the provided tooken adjacency graph,
        // e.g if this is DAI->USDC we may check for DAI->WETH->USDC
        const intermediateTokens = getIntermediateTokens(makerToken, takerToken, tokenAdjacencyGraph);
        const _sources = BATCH_SOURCE_FILTERS.getAllowed(sources);
        return _.flatten(
            _sources.map(
                (source): SourceQuoteOperation | SourceQuoteOperation[] => {
                    switch (source) {
                        case ERC20BridgeSource.Eth2Dai:
                            return this.getEth2DaiSellQuotes(makerToken, takerToken, takerFillAmounts);
                        case ERC20BridgeSource.Uniswap:
                            return this.getUniswapSellQuotes(makerToken, takerToken, takerFillAmounts);
                        case ERC20BridgeSource.UniswapV2:
                            const ops = [this.getUniswapV2SellQuotes([takerToken, makerToken], takerFillAmounts)];
                            intermediateTokens.forEach(t => {
                                ops.push(this.getUniswapV2SellQuotes([takerToken, t, makerToken], takerFillAmounts));
                            });
                            return ops;
                        case ERC20BridgeSource.SushiSwap:
                            const sushiOps = [this.getSushiSwapSellQuotes([takerToken, makerToken], takerFillAmounts)];
                            intermediateTokens.forEach(t => {
                                sushiOps.push(
                                    this.getSushiSwapSellQuotes([takerToken, t, makerToken], takerFillAmounts),
                                );
                            });
                            return sushiOps;
                        case ERC20BridgeSource.CryptoCom:
                            const cryptoComOps = [
                                this.getCryptoComSellQuotes([takerToken, makerToken], takerFillAmounts),
                            ];
                            intermediateTokens.forEach(t => {
                                cryptoComOps.push(
                                    this.getCryptoComSellQuotes([takerToken, t, makerToken], takerFillAmounts),
                                );
                            });
                            return cryptoComOps;
                        case ERC20BridgeSource.Kyber:
                            return getKyberOffsets().map(offset =>
                                this.getKyberSellQuotes(offset, makerToken, takerToken, takerFillAmounts),
                            );
                        case ERC20BridgeSource.Curve:
                            return getCurveInfosForPair(takerToken, makerToken).map(pool =>
                                this.getCurveSellQuotes(
                                    pool,
                                    pool.tokens.indexOf(takerToken),
                                    pool.tokens.indexOf(makerToken),
                                    makerToken,
                                    takerToken,
                                    takerFillAmounts,
                                ),
                            );
                        case ERC20BridgeSource.Swerve:
                            return getSwerveInfosForPair(takerToken, makerToken).map(pool =>
                                this.getSwerveSellQuotes(
                                    pool,
                                    pool.tokens.indexOf(takerToken),
                                    pool.tokens.indexOf(makerToken),
                                    makerToken,
                                    takerToken,
                                    takerFillAmounts,
                                ),
                            );
                        case ERC20BridgeSource.SnowSwap:
                            return getSnowSwapInfosForPair(takerToken, makerToken).map(pool =>
                                this.getSnowSwapSellQuotes(
                                    pool,
                                    pool.tokens.indexOf(takerToken),
                                    pool.tokens.indexOf(makerToken),
                                    makerToken,
                                    takerToken,
                                    takerFillAmounts,
                                ),
                            );
                        case ERC20BridgeSource.LiquidityProvider:
                            return getLiquidityProvidersForPair(
                                this.liquidityProviderRegistry,
                                takerToken,
                                makerToken,
                            ).map(pool =>
                                this.getLiquidityProviderSellQuotes(pool, makerToken, takerToken, takerFillAmounts),
                            );
                        case ERC20BridgeSource.MStable:
                            return this.getMStableSellQuotes(makerToken, takerToken, takerFillAmounts);
                        case ERC20BridgeSource.Mooniswap:
                            return [
                                ...[
                                    MAINNET_MOONISWAP_REGISTRY,
                                    MAINNET_MOONISWAP_V2_REGISTRY,
                                    MAINNET_MOONISWAP_V2_1_REGISTRY,
                                ].map(registry =>
                                    this.getMooniswapSellQuotes(registry, makerToken, takerToken, takerFillAmounts),
                                ),
                            ];
                        case ERC20BridgeSource.Balancer:
                            return this.balancerPoolsCache
                                .getCachedPoolAddressesForPair(takerToken, makerToken)!
                                .map(poolAddress =>
                                    this.getBalancerSellQuotes(
                                        poolAddress,
                                        makerToken,
                                        takerToken,
                                        takerFillAmounts,
                                        ERC20BridgeSource.Balancer,
                                    ),
                                );
                        case ERC20BridgeSource.Cream:
                            return this.creamPoolsCache
                                .getCachedPoolAddressesForPair(takerToken, makerToken)!
                                .map(poolAddress =>
                                    this.getBalancerSellQuotes(
                                        poolAddress,
                                        makerToken,
                                        takerToken,
                                        takerFillAmounts,
                                        ERC20BridgeSource.Cream,
                                    ),
                                );
                        case ERC20BridgeSource.Shell:
                            return getShellsForPair(takerToken, makerToken).map(pool =>
                                this.getShellSellQuotes(pool, makerToken, takerToken, takerFillAmounts),
                            );
                        case ERC20BridgeSource.Dodo:
                            return this.getDODOSellQuotes(makerToken, takerToken, takerFillAmounts);
                        case ERC20BridgeSource.Bancor:
                            return this.getBancorSellQuotes(makerToken, takerToken, takerFillAmounts);
                        default:
                            throw new Error(`Unsupported sell sample source: ${source}`);
                    }
                },
            ),
        );
    }

    private _getBuyQuoteOperations(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation[] {
        // Find the adjacent tokens in the provided tooken adjacency graph,
        // e.g if this is DAI->USDC we may check for DAI->WETH->USDC
        const intermediateTokens = getIntermediateTokens(makerToken, takerToken, this.tokenAdjacencyGraph);
        const _sources = BATCH_SOURCE_FILTERS.getAllowed(sources);
        return _.flatten(
            _sources.map(
                (source): SourceQuoteOperation | SourceQuoteOperation[] => {
                    switch (source) {
                        case ERC20BridgeSource.Eth2Dai:
                            return this.getEth2DaiBuyQuotes(makerToken, takerToken, makerFillAmounts);
                        case ERC20BridgeSource.Uniswap:
                            return this.getUniswapBuyQuotes(makerToken, takerToken, makerFillAmounts);
                        case ERC20BridgeSource.UniswapV2:
                            const ops = [this.getUniswapV2BuyQuotes([takerToken, makerToken], makerFillAmounts)];
                            intermediateTokens.forEach(t => {
                                ops.push(this.getUniswapV2BuyQuotes([takerToken, t, makerToken], makerFillAmounts));
                            });
                            return ops;
                        case ERC20BridgeSource.SushiSwap:
                            const sushiOps = [this.getSushiSwapBuyQuotes([takerToken, makerToken], makerFillAmounts)];
                            intermediateTokens.forEach(t => {
                                sushiOps.push(
                                    this.getSushiSwapBuyQuotes([takerToken, t, makerToken], makerFillAmounts),
                                );
                            });
                            return sushiOps;
                        case ERC20BridgeSource.CryptoCom:
                            const cryptoComOps = [
                                this.getCryptoComBuyQuotes([takerToken, makerToken], makerFillAmounts),
                            ];
                            intermediateTokens.forEach(t => {
                                cryptoComOps.push(
                                    this.getCryptoComBuyQuotes([takerToken, t, makerToken], makerFillAmounts),
                                );
                            });
                            return cryptoComOps;
                        case ERC20BridgeSource.Kyber:
                            return getKyberOffsets().map(offset =>
                                this.getKyberBuyQuotes(offset, makerToken, takerToken, makerFillAmounts),
                            );
                        case ERC20BridgeSource.Curve:
                            return getCurveInfosForPair(takerToken, makerToken).map(pool =>
                                this.getCurveBuyQuotes(
                                    pool,
                                    pool.tokens.indexOf(takerToken),
                                    pool.tokens.indexOf(makerToken),
                                    makerToken,
                                    takerToken,
                                    makerFillAmounts,
                                ),
                            );
                        case ERC20BridgeSource.Swerve:
                            return getSwerveInfosForPair(takerToken, makerToken).map(pool =>
                                this.getSwerveBuyQuotes(
                                    pool,
                                    pool.tokens.indexOf(takerToken),
                                    pool.tokens.indexOf(makerToken),
                                    makerToken,
                                    takerToken,
                                    makerFillAmounts,
                                ),
                            );
                        case ERC20BridgeSource.SnowSwap:
                            return getSnowSwapInfosForPair(takerToken, makerToken).map(pool =>
                                this.getSnowSwapBuyQuotes(
                                    pool,
                                    pool.tokens.indexOf(takerToken),
                                    pool.tokens.indexOf(makerToken),
                                    makerToken,
                                    takerToken,
                                    makerFillAmounts,
                                ),
                            );
                        case ERC20BridgeSource.LiquidityProvider:
                            return getLiquidityProvidersForPair(
                                this.liquidityProviderRegistry,
                                takerToken,
                                makerToken,
                            ).map(pool =>
                                this.getLiquidityProviderBuyQuotes(pool, makerToken, takerToken, makerFillAmounts),
                            );
                        case ERC20BridgeSource.MStable:
                            return this.getMStableBuyQuotes(makerToken, takerToken, makerFillAmounts);
                        case ERC20BridgeSource.Mooniswap:
                            return [
                                ...[
                                    MAINNET_MOONISWAP_REGISTRY,
                                    MAINNET_MOONISWAP_V2_REGISTRY,
                                    MAINNET_MOONISWAP_V2_1_REGISTRY,
                                ].map(registry =>
                                    this.getMooniswapBuyQuotes(registry, makerToken, takerToken, makerFillAmounts),
                                ),
                            ];
                        case ERC20BridgeSource.Balancer:
                            return this.balancerPoolsCache
                                .getCachedPoolAddressesForPair(takerToken, makerToken)!
                                .map(poolAddress =>
                                    this.getBalancerBuyQuotes(
                                        poolAddress,
                                        makerToken,
                                        takerToken,
                                        makerFillAmounts,
                                        ERC20BridgeSource.Balancer,
                                    ),
                                );
                        case ERC20BridgeSource.Cream:
                            return this.creamPoolsCache
                                .getCachedPoolAddressesForPair(takerToken, makerToken)!
                                .map(poolAddress =>
                                    this.getBalancerBuyQuotes(
                                        poolAddress,
                                        makerToken,
                                        takerToken,
                                        makerFillAmounts,
                                        ERC20BridgeSource.Cream,
                                    ),
                                );
                        case ERC20BridgeSource.Shell:
                            return getShellsForPair(takerToken, makerToken).map(pool =>
                                this.getShellBuyQuotes(pool, makerToken, takerToken, makerFillAmounts),
                            );
                        case ERC20BridgeSource.Dodo:
                            return this.getDODOBuyQuotes(makerToken, takerToken, makerFillAmounts);
                        case ERC20BridgeSource.Bancor:
                            return this.getBancorBuyQuotes(makerToken, takerToken, makerFillAmounts);
                        default:
                            throw new Error(`Unsupported buy sample source: ${source}`);
                    }
                },
            ),
        );
    }

    /**
     * Wraps `subOps` operations into a batch call to the sampler
     * @param subOps An array of Sampler operations
     * @param resultHandler The handler of the parsed batch results
     * @param revertHandler The handle for when the batch operation reverts. The result data is provided as an argument
     */
    private _createBatch<T, TResult>(
        subOps: Array<BatchedOperation<TResult>>,
        resultHandler: (results: TResult[]) => T,
        revertHandler: (result: string) => T,
    ): BatchedOperation<T> {
        return {
            encodeCall: () => {
                const subCalls = subOps.map(op => op.encodeCall());
                return this._samplerContract.batchCall(subCalls).getABIEncodedTransactionData();
            },
            handleCallResults: callResults => {
                const rawSubCallResults = this._samplerContract.getABIDecodedReturnData<SamplerCallResult[]>(
                    'batchCall',
                    callResults,
                );
                const results = subOps.map((op, i) =>
                    rawSubCallResults[i].success
                        ? op.handleCallResults(rawSubCallResults[i].data)
                        : op.handleRevert(rawSubCallResults[i].data),
                );
                return resultHandler(results);
            },
            handleRevert: revertHandler,
        };
    }
}
// tslint:disable max-file-line-count
