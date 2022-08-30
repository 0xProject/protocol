import { ChainId } from '@0x/contract-addresses';
import { LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber, logUtils } from '@0x/utils';
import { formatBytes32String } from '@ethersproject/strings';
import * as _ from 'lodash';

import { ERC20BridgeSamplerContract } from '../../../wrappers';
import { AaveV2Sampler } from '../../noop_samplers/AaveV2Sampler';
import { GeistSampler } from '../../noop_samplers/GeistSampler';
import { SamplerCallResult, SignedNativeOrder } from '../../types';
import { TokenAdjacencyGraph } from '../token_adjacency_graph';

import { AaveV2ReservesCache } from './aave_reserves_cache';
import { BancorService } from './bancor_service';
import {
    getCurveLikeInfosForPair,
    getDodoV2Offsets,
    getPlatypusInfoForPair,
    getShellLikeInfosForPair,
    isBadTokenForSource,
    isValidAddress,
    uniswapV2LikeRouterAddress,
} from './bridge_source_utils';
import { CompoundCTokenCache } from './compound_ctoken_cache';
import {
    AAVE_V2_SUBGRAPH_URL_BY_CHAIN_ID,
    AVALANCHE_TOKENS,
    BALANCER_V2_VAULT_ADDRESS_BY_CHAIN,
    BANCORV3_NETWORK_BY_CHAIN_ID,
    BANCORV3_NETWORK_INFO_BY_CHAIN_ID,
    BANCOR_REGISTRY_BY_CHAIN_ID,
    BEETHOVEN_X_VAULT_ADDRESS_BY_CHAIN,
    COMPOUND_API_URL_BY_CHAIN_ID,
    DODOV1_CONFIG_BY_CHAIN_ID,
    DODOV2_FACTORIES_BY_CHAIN_ID,
    GMX_READER_BY_CHAIN_ID,
    GMX_ROUTER_BY_CHAIN_ID,
    GMX_VAULT_BY_CHAIN_ID,
    KYBER_DMM_ROUTER_BY_CHAIN_ID,
    LIDO_INFO_BY_CHAIN,
    LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID,
    MAINNET_TOKENS,
    MAKER_PSM_INFO_BY_CHAIN_ID,
    MAX_UINT256,
    MOONISWAP_REGISTRIES_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
    NULL_ADDRESS,
    PLATYPUS_ROUTER_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
    SYNTHETIX_CURRENCY_KEYS_BY_CHAIN_ID,
    SYNTHETIX_READ_PROXY_BY_CHAIN_ID,
    UNISWAPV1_ROUTER_BY_CHAIN_ID,
    UNISWAPV3_CONFIG_BY_CHAIN_ID,
    VELODROME_ROUTER_BY_CHAIN_ID,
    WOOFI_POOL_BY_CHAIN_ID,
    WOOFI_SUPPORTED_TOKENS,
    ZERO_AMOUNT,
} from './constants';
import { getGeistInfoForPair } from './geist_utils';
import { getLiquidityProvidersForPair } from './liquidity_provider_utils';
import { BalancerPoolsCache, BalancerV2PoolsCache, PoolsCache } from './pools_cache';
import { BalancerV2SwapInfoCache } from './pools_cache/balancer_v2_swap_info_cache';
import { SamplerContractOperation } from './sampler_contract_operation';
import { SamplerNoOperation } from './sampler_no_operation';
import { SourceFilters } from './source_filters';
import {
    AaveV2FillData,
    AaveV2Info,
    BalancerFillData,
    BalancerSwapInfo,
    BalancerV2BatchSwapFillData,
    BalancerV2FillData,
    BalancerV2PoolInfo,
    BancorFillData,
    BatchedOperation,
    CompoundFillData,
    CurveFillData,
    CurveInfo,
    DexSample,
    DODOFillData,
    ERC20BridgeSource,
    FeeSchedule,
    GeistFillData,
    GeistInfo,
    GenericRouterFillData,
    GMXFillData,
    HopInfo,
    KyberDmmFillData,
    LidoFillData,
    LidoInfo,
    LiquidityProviderFillData,
    LiquidityProviderRegistry,
    MakerPsmFillData,
    MooniswapFillData,
    MultiHopFillData,
    PlatypusFillData,
    PsmInfo,
    ShellFillData,
    SourceQuoteOperation,
    SynthetixFillData,
    UniswapV2FillData,
    UniswapV3FillData,
    VelodromeFillData,
    WOOFiFillData,
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

export interface PoolsCacheMap {
    [ERC20BridgeSource.Balancer]: PoolsCache;
    [ERC20BridgeSource.BalancerV2]: BalancerV2SwapInfoCache | undefined;
    [ERC20BridgeSource.Beethovenx]: PoolsCache;
}

/**
 * Composable operations that can be batched in a single transaction,
 * for use with `DexOrderSampler.executeAsync()`.
 */
export class SamplerOperations {
    public readonly liquidityProviderRegistry: LiquidityProviderRegistry;
    public readonly poolsCaches: PoolsCacheMap;
    public readonly aaveReservesCache: AaveV2ReservesCache | undefined;
    public readonly compoundCTokenCache: CompoundCTokenCache | undefined;
    protected _bancorService?: BancorService;
    public static constant<T>(result: T): BatchedOperation<T> {
        return {
            encodeCall: () => '0x',
            handleCallResults: (_callResults) => result,
            handleRevert: (_callResults) => result,
        };
    }

    constructor(
        public readonly chainId: ChainId,
        protected readonly _samplerContract: ERC20BridgeSamplerContract,
        poolsCaches?: PoolsCacheMap,
        protected readonly tokenAdjacencyGraph: TokenAdjacencyGraph = TokenAdjacencyGraph.getEmptyGraph(),
        liquidityProviderRegistry: LiquidityProviderRegistry = {},
        bancorServiceFn: () => Promise<BancorService | undefined> = async () => undefined,
    ) {
        this.liquidityProviderRegistry = {
            ...LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID[chainId],
            ...liquidityProviderRegistry,
        };
        this.poolsCaches = poolsCaches
            ? poolsCaches
            : {
                  [ERC20BridgeSource.Beethovenx]: BalancerV2PoolsCache.createBeethovenXPoolCache(chainId),
                  [ERC20BridgeSource.Balancer]: BalancerPoolsCache.create(chainId),
                  [ERC20BridgeSource.BalancerV2]:
                      BALANCER_V2_VAULT_ADDRESS_BY_CHAIN[chainId] === NULL_ADDRESS
                          ? undefined
                          : new BalancerV2SwapInfoCache(chainId),
              };

        const aaveSubgraphUrl = AAVE_V2_SUBGRAPH_URL_BY_CHAIN_ID[chainId];
        if (aaveSubgraphUrl) {
            this.aaveReservesCache = new AaveV2ReservesCache(aaveSubgraphUrl);
        }

        const compoundApiUrl = COMPOUND_API_URL_BY_CHAIN_ID[chainId];
        if (compoundApiUrl) {
            this.compoundCTokenCache = new CompoundCTokenCache(
                compoundApiUrl,
                NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId],
            );
        }
        // Initialize the Bancor service, fetching paths in the background
        bancorServiceFn()
            .then((service) => (this._bancorService = service))
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

    public getGasLeft(): BatchedOperation<BigNumber> {
        return {
            encodeCall: () => this._samplerContract.getGasLeft().getABIEncodedTransactionData(),
            handleCallResults: (callResults: string) =>
                this._samplerContract.getABIDecodedReturnData<BigNumber>('getGasLeft', callResults),
            handleRevert: () => {
                /* should never happen */
                throw new Error('Invalid result for getGasLeft');
            },
        };
    }

    public getBlockNumber(): BatchedOperation<BigNumber> {
        return {
            encodeCall: () => this._samplerContract.getBlockNumber().getABIEncodedTransactionData(),
            handleCallResults: (callResults: string) =>
                this._samplerContract.getABIDecodedReturnData<BigNumber>('getBlockNumber', callResults),
            handleRevert: () => {
                /* should never happen */
                throw new Error('Invalid result for getBlockNumber');
            },
        };
    }

    public getLimitOrderFillableTakerAmounts(
        orders: SignedNativeOrder[],
        exchangeAddress: string,
    ): BatchedOperation<BigNumber[]> {
        // Skip checking empty or invalid orders on-chain, returning a constant
        if (orders.length === 0) {
            return SamplerOperations.constant<BigNumber[]>([]);
        }
        if (orders.length === 1 && orders[0].order.maker === NULL_ADDRESS) {
            return SamplerOperations.constant<BigNumber[]>([ZERO_AMOUNT]);
        }
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Native,
            contract: this._samplerContract,
            function: this._samplerContract.getLimitOrderFillableTakerAssetAmounts,
            params: [orders.map((o) => o.order as LimitOrderFields), orders.map((o) => o.signature), exchangeAddress],
        });
    }

    public getLimitOrderFillableMakerAmounts(
        orders: SignedNativeOrder[],
        exchangeAddress: string,
    ): BatchedOperation<BigNumber[]> {
        // Skip checking empty or invalid orders on-chain, returning a constant
        if (orders.length === 0) {
            return SamplerOperations.constant<BigNumber[]>([]);
        }
        if (orders.length === 1 && orders[0].order.maker === NULL_ADDRESS) {
            return SamplerOperations.constant<BigNumber[]>([ZERO_AMOUNT]);
        }
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Native,
            contract: this._samplerContract,
            function: this._samplerContract.getLimitOrderFillableMakerAssetAmounts,
            params: [orders.map((o) => o.order as LimitOrderFields), orders.map((o) => o.signature), exchangeAddress],
        });
    }

    public getKyberDmmSellQuotes(
        router: string,
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<KyberDmmFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.KyberDmm,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromKyberDmm,
            params: [router, tokenAddressPath, takerFillAmounts],
            callback: (callResults: string, fillData: KyberDmmFillData): BigNumber[] => {
                const [pools, samples] = this._samplerContract.getABIDecodedReturnData<[string[], BigNumber[]]>(
                    'sampleSellsFromKyberDmm',
                    callResults,
                );
                fillData.poolsPath = pools;
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                return samples;
            },
        });
    }

    public getKyberDmmBuyQuotes(
        router: string,
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<KyberDmmFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.KyberDmm,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromKyberDmm,
            params: [router, tokenAddressPath, makerFillAmounts],
            callback: (callResults: string, fillData: KyberDmmFillData): BigNumber[] => {
                const [pools, samples] = this._samplerContract.getABIDecodedReturnData<[string[], BigNumber[]]>(
                    'sampleBuysFromKyberDmm',
                    callResults,
                );
                fillData.poolsPath = pools;
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                return samples;
            },
        });
    }

    public getUniswapSellQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GenericRouterFillData> {
        // Uniswap uses ETH instead of WETH, represented by address(0)
        const uniswapTakerToken = takerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : takerToken;
        const uniswapMakerToken = makerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : makerToken;
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Uniswap,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromUniswap,
            params: [router, uniswapTakerToken, uniswapMakerToken, takerFillAmounts],
        });
    }

    public getUniswapBuyQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GenericRouterFillData> {
        // Uniswap uses ETH instead of WETH, represented by address(0)
        const uniswapTakerToken = takerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : takerToken;
        const uniswapMakerToken = makerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : makerToken;
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Uniswap,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromUniswap,
            params: [router, uniswapTakerToken, uniswapMakerToken, makerFillAmounts],
        });
    }

    public getUniswapV2SellQuotes(
        router: string,
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.UniswapV2,
    ): SourceQuoteOperation<UniswapV2FillData> {
        return new SamplerContractOperation({
            source,
            fillData: { tokenAddressPath, router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromUniswapV2,
            params: [router, tokenAddressPath, takerFillAmounts],
        });
    }

    public getUniswapV2BuyQuotes(
        router: string,
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.UniswapV2,
    ): SourceQuoteOperation<UniswapV2FillData> {
        return new SamplerContractOperation({
            source,
            fillData: { tokenAddressPath, router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromUniswapV2,
            params: [router, tokenAddressPath, makerFillAmounts],
        });
    }

    public getLiquidityProviderSellQuotes(
        providerAddress: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        gasCost: number,
        source: ERC20BridgeSource = ERC20BridgeSource.LiquidityProvider,
    ): SourceQuoteOperation<LiquidityProviderFillData> {
        return new SamplerContractOperation({
            source,
            fillData: {
                poolAddress: providerAddress,
                gasCost,
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
        gasCost: number,
        source: ERC20BridgeSource = ERC20BridgeSource.LiquidityProvider,
    ): SourceQuoteOperation<LiquidityProviderFillData> {
        return new SamplerContractOperation({
            source,
            fillData: {
                poolAddress: providerAddress,
                gasCost,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromLiquidityProvider,
            params: [providerAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getCurveSellQuotes(
        pool: CurveInfo,
        fromTokenIdx: number,
        toTokenIdx: number,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.Curve,
    ): SourceQuoteOperation<CurveFillData> {
        return new SamplerContractOperation({
            source,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
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
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.Curve,
    ): SourceQuoteOperation<CurveFillData> {
        return new SamplerContractOperation({
            source,
            fillData: {
                pool,
                fromTokenIdx,
                toTokenIdx,
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

    public getBalancerV2MultihopSellQuotes(
        vault: string,
        quoteSwaps: BalancerSwapInfo, // Should always be sell swap steps.
        fillSwaps: BalancerSwapInfo, // Should always be sell swap steps.
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource,
    ): SourceQuoteOperation<BalancerV2BatchSwapFillData> {
        const quoteSwapSteps = quoteSwaps.swapSteps.map((s) => ({
            ...s,
            assetInIndex: new BigNumber(s.assetInIndex),
            assetOutIndex: new BigNumber(s.assetOutIndex),
        }));
        return new SamplerContractOperation({
            source,
            fillData: { vault, swapSteps: fillSwaps.swapSteps, assets: fillSwaps.assets },
            contract: this._samplerContract,
            function: this._samplerContract.sampleMultihopSellsFromBalancerV2,
            params: [vault, quoteSwapSteps, quoteSwaps.assets, takerFillAmounts],
        });
    }

    public getBalancerV2MultihopBuyQuotes(
        vault: string,
        quoteSwaps: BalancerSwapInfo, // Should always be buy swap steps.
        fillSwaps: BalancerSwapInfo, // Should always be a sell quote.
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource,
    ): SourceQuoteOperation<BalancerV2BatchSwapFillData> {
        const quoteSwapSteps = quoteSwaps.swapSteps.map((s) => ({
            ...s,
            assetInIndex: new BigNumber(s.assetInIndex),
            assetOutIndex: new BigNumber(s.assetOutIndex),
        }));
        return new SamplerContractOperation({
            source,
            // NOTE: fillData is set up for sells but quote function is set up for buys.
            fillData: { vault, swapSteps: fillSwaps.swapSteps, assets: fillSwaps.assets },
            contract: this._samplerContract,
            function: this._samplerContract.sampleMultihopBuysFromBalancerV2,
            params: [vault, quoteSwapSteps, quoteSwaps.assets, makerFillAmounts],
        });
    }

    public getBalancerV2SellQuotes(
        poolInfo: BalancerV2PoolInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource,
    ): SourceQuoteOperation<BalancerV2FillData> {
        return new SamplerContractOperation({
            source,
            fillData: poolInfo,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromBalancerV2,
            params: [poolInfo, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getBalancerV2BuyQuotes(
        poolInfo: BalancerV2PoolInfo,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource,
    ): SourceQuoteOperation<BalancerV2FillData> {
        return new SamplerContractOperation({
            source,
            fillData: poolInfo,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromBalancerV2,
            params: [poolInfo, takerToken, makerToken, makerFillAmounts],
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
            fillData: { poolAddress },
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
            fillData: { poolAddress },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromBalancer,
            params: [poolAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getMStableSellQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GenericRouterFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.MStable,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromMStable,
            params: [router, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getMStableBuyQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GenericRouterFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.MStable,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromMStable,
            params: [router, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getBancorSellQuotes(
        registry: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<BancorFillData> {
        const paths = this._bancorService ? this._bancorService.getPaths(takerToken, makerToken) : [];
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Bancor,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromBancor,
            params: [{ registry, paths }, takerToken, makerToken, takerFillAmounts],
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
        registry: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<BancorFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Bancor,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromBancor,
            params: [{ registry, paths: [] }, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: BancorFillData): BigNumber[] => {
                const [networkAddress, path, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string[], BigNumber[]]
                >('sampleBuysFromBancor', callResults);
                fillData.networkAddress = networkAddress;
                fillData.path = path;
                return samples;
            },
        });
    }

    public getBancorV3SellQuotes(
        networkAddress: string,
        networkInfoAddress: string,
        path: string[],
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<BancorFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.BancorV3,
            fillData: { networkAddress, path },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromBancorV3,
            params: [MAINNET_TOKENS.WETH, networkInfoAddress, path, takerFillAmounts],
        });
    }

    public getBancorV3BuyQuotes(
        networkAddress: string,
        networkInfoAddress: string,
        path: string[],
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<BancorFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.BancorV3,
            fillData: { networkAddress, path },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromBancorV3,
            params: [MAINNET_TOKENS.WETH, networkInfoAddress, path, makerFillAmounts],
        });
    }

    public getMooniswapSellQuotes(
        registry: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<MooniswapFillData> {
        // Mooniswap uses ETH instead of WETH, represented by address(0)
        const mooniswapTakerToken =
            takerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : takerToken;
        const mooniswapMakerToken =
            makerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : makerToken;
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Mooniswap,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromMooniswap,
            params: [registry, mooniswapTakerToken, mooniswapMakerToken, takerFillAmounts],
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
        // Mooniswap uses ETH instead of WETH, represented by address(0)
        const mooniswapTakerToken =
            takerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : takerToken;
        const mooniswapMakerToken =
            makerToken === NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId] ? NULL_ADDRESS : makerToken;
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Mooniswap,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromMooniswap,
            params: [registry, mooniswapTakerToken, mooniswapMakerToken, makerFillAmounts],
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

    public getUniswapV3SellQuotes(
        router: string,
        quoter: string,
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.UniswapV3,
    ): SourceQuoteOperation<UniswapV3FillData> {
        return new SamplerContractOperation({
            source,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromUniswapV3,
            params: [quoter, tokenAddressPath, takerFillAmounts],
            callback: (callResults: string, fillData: UniswapV3FillData): BigNumber[] => {
                const [paths, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string[], BigNumber[], BigNumber[]]
                >('sampleSellsFromUniswapV3', callResults);
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                fillData.pathAmounts = paths.map((uniswapPath, i) => ({
                    uniswapPath,
                    inputAmount: takerFillAmounts[i],
                    gasUsed: gasUsed[i].toNumber(),
                }));

                return samples;
            },
        });
    }

    public getUniswapV3BuyQuotes(
        router: string,
        quoter: string,
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.UniswapV3,
    ): SourceQuoteOperation<UniswapV3FillData> {
        return new SamplerContractOperation({
            source,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromUniswapV3,
            params: [quoter, tokenAddressPath, makerFillAmounts],
            callback: (callResults: string, fillData: UniswapV3FillData): BigNumber[] => {
                const [paths, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string[], BigNumber[], BigNumber[]]
                >('sampleBuysFromUniswapV3', callResults);
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                fillData.pathAmounts = paths.map((uniswapPath, i) => ({
                    uniswapPath,
                    inputAmount: makerFillAmounts[i],
                    gasUsed: gasUsed[i].toNumber(),
                }));
                return samples;
            },
        });
    }

    public getTwoHopSellQuotes(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        sellAmount: BigNumber,
    ): BatchedOperation<DexSample<MultiHopFillData>[]> {
        const _sources = TWO_HOP_SOURCE_FILTERS.getAllowed(sources);
        if (_sources.length === 0) {
            return SamplerOperations.constant([]);
        }
        const intermediateTokens = this.tokenAdjacencyGraph.getIntermediateTokens(makerToken, takerToken);
        const subOps = intermediateTokens.map((intermediateToken) => {
            const firstHopOps = this._getSellQuoteOperations(_sources, intermediateToken, takerToken, [ZERO_AMOUNT]);
            const secondHopOps = this._getSellQuoteOperations(_sources, makerToken, intermediateToken, [ZERO_AMOUNT]);
            return new SamplerContractOperation({
                contract: this._samplerContract,
                source: ERC20BridgeSource.MultiHop,
                function: this._samplerContract.sampleTwoHopSell,
                params: [
                    firstHopOps.map((op) => op.encodeCall()),
                    secondHopOps.map((op) => op.encodeCall()),
                    sellAmount,
                ],
                fillData: { intermediateToken } as MultiHopFillData,
                callback: (callResults: string, fillData: MultiHopFillData): BigNumber[] => {
                    const [firstHop, secondHop, buyAmount] = this._samplerContract.getABIDecodedReturnData<
                        [HopInfo, HopInfo, BigNumber]
                    >('sampleTwoHopSell', callResults);
                    // Ensure the hop sources are set even when the buy amount is zero
                    fillData.firstHopSource = firstHopOps[firstHop.sourceIndex.toNumber()];
                    fillData.secondHopSource = secondHopOps[secondHop.sourceIndex.toNumber()];
                    if (buyAmount.isZero()) {
                        return [ZERO_AMOUNT];
                    }
                    fillData.firstHopSource.handleCallResults(firstHop.returnData);
                    fillData.secondHopSource.handleCallResults(secondHop.returnData);
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
            () => {
                logUtils.warn('SamplerContractOperation: Two hop sampler reverted');
                return [];
            },
        );
    }

    public getTwoHopBuyQuotes(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        buyAmount: BigNumber,
    ): BatchedOperation<DexSample<MultiHopFillData>[]> {
        const _sources = TWO_HOP_SOURCE_FILTERS.getAllowed(sources);
        if (_sources.length === 0) {
            return SamplerOperations.constant([]);
        }
        const intermediateTokens = this.tokenAdjacencyGraph.getIntermediateTokens(makerToken, takerToken);
        const subOps = intermediateTokens.map((intermediateToken) => {
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
                params: [
                    firstHopOps.map((op) => op.encodeCall()),
                    secondHopOps.map((op) => op.encodeCall()),
                    buyAmount,
                ],
                fillData: { intermediateToken } as MultiHopFillData,
                callback: (callResults: string, fillData: MultiHopFillData): BigNumber[] => {
                    const [firstHop, secondHop, sellAmount] = this._samplerContract.getABIDecodedReturnData<
                        [HopInfo, HopInfo, BigNumber]
                    >('sampleTwoHopBuy', callResults);
                    if (sellAmount.isEqualTo(MAX_UINT256)) {
                        return [sellAmount];
                    }
                    fillData.firstHopSource = firstHopOps[firstHop.sourceIndex.toNumber()];
                    fillData.secondHopSource = secondHopOps[secondHop.sourceIndex.toNumber()];
                    fillData.firstHopSource.handleCallResults(firstHop.returnData);
                    fillData.secondHopSource.handleCallResults(secondHop.returnData);
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
            () => {
                logUtils.warn('SamplerContractOperation: Two hop sampler reverted');
                return [];
            },
        );
    }

    public getShellSellQuotes(
        poolAddress: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.Shell,
    ): SourceQuoteOperation<ShellFillData> {
        return new SamplerContractOperation({
            source,
            fillData: { poolAddress },
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
        source: ERC20BridgeSource = ERC20BridgeSource.Shell,
    ): SourceQuoteOperation {
        return new SamplerContractOperation({
            source,
            fillData: { poolAddress },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromShell,
            params: [poolAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getDODOSellQuotes(
        opts: { registry: string; helper: string },
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<DODOFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Dodo,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromDODO,
            params: [opts, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): BigNumber[] => {
                const [isSellBase, pool, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[]]
                >('sampleSellsFromDODO', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                fillData.helperAddress = opts.helper;
                return samples;
            },
        });
    }

    public getDODOBuyQuotes(
        opts: { registry: string; helper: string },
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<DODOFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Dodo,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromDODO,
            params: [opts, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): BigNumber[] => {
                const [isSellBase, pool, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[]]
                >('sampleBuysFromDODO', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                fillData.helperAddress = opts.helper;
                return samples;
            },
        });
    }

    public getDODOV2SellQuotes(
        registry: string,
        offset: BigNumber,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<DODOFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.DodoV2,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromDODOV2,
            params: [registry, offset, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): BigNumber[] => {
                const [isSellBase, pool, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[]]
                >('sampleSellsFromDODOV2', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                return samples;
            },
        });
    }

    public getDODOV2BuyQuotes(
        registry: string,
        offset: BigNumber,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<DODOFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.DodoV2,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromDODOV2,
            params: [registry, offset, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): BigNumber[] => {
                const [isSellBase, pool, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[]]
                >('sampleSellsFromDODOV2', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                return samples;
            },
        });
    }

    public getMakerPsmSellQuotes(
        psmInfo: PsmInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<MakerPsmFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.MakerPsm,
            fillData: {
                isSellOperation: true,
                takerToken,
                makerToken,
                ...psmInfo,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromMakerPsm,
            params: [psmInfo, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getMakerPsmBuyQuotes(
        psmInfo: PsmInfo,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<MakerPsmFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.MakerPsm,
            fillData: {
                isSellOperation: false,
                takerToken,
                makerToken,
                ...psmInfo,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromMakerPsm,
            params: [psmInfo, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getLidoSellQuotes(
        lidoInfo: LidoInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<LidoFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Lido,
            fillData: {
                makerToken,
                takerToken,
                stEthTokenAddress: lidoInfo.stEthToken,
                wstEthTokenAddress: lidoInfo.wstEthToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromLido,
            params: [lidoInfo, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getLidoBuyQuotes(
        lidoInfo: LidoInfo,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<LidoFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Lido,
            fillData: {
                makerToken,
                takerToken,
                stEthTokenAddress: lidoInfo.stEthToken,
                wstEthTokenAddress: lidoInfo.wstEthToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromLido,
            params: [lidoInfo, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getAaveV2SellQuotes(
        aaveInfo: AaveV2Info,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<AaveV2FillData> {
        return new SamplerNoOperation({
            source: ERC20BridgeSource.AaveV2,
            fillData: { ...aaveInfo, takerToken },
            callback: () => AaveV2Sampler.sampleSellsFromAaveV2(aaveInfo, takerToken, makerToken, takerFillAmounts),
        });
    }

    public getAaveV2BuyQuotes(
        aaveInfo: AaveV2Info,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<AaveV2FillData> {
        return new SamplerNoOperation({
            source: ERC20BridgeSource.AaveV2,
            fillData: { ...aaveInfo, takerToken },
            callback: () => AaveV2Sampler.sampleBuysFromAaveV2(aaveInfo, takerToken, makerToken, makerFillAmounts),
        });
    }

    public getGeistSellQuotes(
        geistInfo: GeistInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GeistFillData> {
        return new SamplerNoOperation({
            source: ERC20BridgeSource.Geist,
            fillData: { ...geistInfo, takerToken },
            callback: () => GeistSampler.sampleSellsFromGeist(geistInfo, takerToken, makerToken, takerFillAmounts),
        });
    }

    public getGeistBuyQuotes(
        geistInfo: GeistInfo,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GeistFillData> {
        return new SamplerNoOperation({
            source: ERC20BridgeSource.Geist,
            fillData: { ...geistInfo, takerToken },
            callback: () => GeistSampler.sampleBuysFromGeist(geistInfo, takerToken, makerToken, makerFillAmounts),
        });
    }

    public getCompoundSellQuotes(
        cToken: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<CompoundFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Compound,
            fillData: { cToken, takerToken, makerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromCompound,
            params: [cToken, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getCompoundBuyQuotes(
        cToken: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<CompoundFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Compound,
            fillData: { cToken, takerToken, makerToken },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromCompound,
            params: [cToken, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getGMXSellQuotes(
        router: string,
        reader: string,
        vault: string,
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GMXFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.GMX,
            fillData: { router, reader, vault, tokenAddressPath },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromGMX,
            params: [reader, vault, tokenAddressPath, takerFillAmounts],
        });
    }
    public getGMXBuyQuotes(
        router: string,
        reader: string,
        vault: string,
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<GMXFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.GMX,
            fillData: { router, reader, vault, tokenAddressPath },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromGMX,
            params: [reader, vault, tokenAddressPath, makerFillAmounts],
        });
    }

    public getPlatypusSellQuotes(
        router: string,
        pool: string[],
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<PlatypusFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Platypus,
            fillData: { router, pool, tokenAddressPath },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromPlatypus,
            params: [pool[0], tokenAddressPath, takerFillAmounts],
        });
    }

    public getPlatypusBuyQuotes(
        router: string,
        pool: string[],
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<PlatypusFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Platypus,
            fillData: { router, pool, tokenAddressPath },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromPlatypus,
            params: [pool[0], tokenAddressPath, makerFillAmounts],
        });
    }

    public getVelodromeSellQuotes(
        router: string,
        takerToken: string,
        makerToken: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<VelodromeFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Velodrome,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromVelodrome,
            params: [router, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: VelodromeFillData): BigNumber[] => {
                const [isStable, samples] = this._samplerContract.getABIDecodedReturnData<[boolean, BigNumber[]]>(
                    'sampleSellsFromVelodrome',
                    callResults,
                );
                fillData.router = router;
                fillData.stable = isStable;
                return samples;
            },
        });
    }

    public getVelodromeBuyQuotes(
        router: string,
        takerToken: string,
        makerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<VelodromeFillData> {
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Velodrome,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromVelodrome,
            params: [router, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: VelodromeFillData): BigNumber[] => {
                const [isStable, samples] = this._samplerContract.getABIDecodedReturnData<[boolean, BigNumber[]]>(
                    'sampleBuysFromVelodrome',
                    callResults,
                );
                fillData.router = router;
                fillData.stable = isStable;
                return samples;
            },
        });
    }

    public getSynthetixSellQuotes(
        readProxy: string,
        takerTokenSymbol: string,
        makerTokenSymbol: string,
        takerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SynthetixFillData> {
        const takerTokenSymbolBytes32 = formatBytes32String(takerTokenSymbol);
        const makerTokenSymbolBytes32 = formatBytes32String(makerTokenSymbol);
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Synthetix,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromSynthetix,
            params: [readProxy, takerTokenSymbolBytes32, makerTokenSymbolBytes32, takerFillAmounts],
            callback: (callResults: string, fillData: SynthetixFillData): BigNumber[] => {
                const [synthetix, samples] = this._samplerContract.getABIDecodedReturnData<[string, BigNumber[]]>(
                    'sampleSellsFromSynthetix',
                    callResults,
                );
                fillData.synthetix = synthetix;
                fillData.takerTokenSymbolBytes32 = takerTokenSymbolBytes32;
                fillData.makerTokenSymbolBytes32 = makerTokenSymbolBytes32;
                fillData.chainId = this.chainId;
                return samples;
            },
        });
    }

    public getSynthetixBuyQuotes(
        readProxy: string,
        takerTokenSymbol: string,
        makerTokenSymbol: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<SynthetixFillData> {
        const takerTokenSymbolBytes32 = formatBytes32String(takerTokenSymbol);
        const makerTokenSymbolBytes32 = formatBytes32String(makerTokenSymbol);
        return new SamplerContractOperation({
            source: ERC20BridgeSource.Synthetix,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromSynthetix,
            params: [readProxy, takerTokenSymbolBytes32, makerTokenSymbolBytes32, makerFillAmounts],
            callback: (callResults: string, fillData: SynthetixFillData): BigNumber[] => {
                const [synthetix, samples] = this._samplerContract.getABIDecodedReturnData<[string, BigNumber[]]>(
                    'sampleBuysFromSynthetix',
                    callResults,
                );
                fillData.synthetix = synthetix;
                fillData.takerTokenSymbolBytes32 = takerTokenSymbolBytes32;
                fillData.makerTokenSymbolBytes32 = makerTokenSymbolBytes32;
                fillData.chainId = this.chainId;
                return samples;
            },
        });
    }
    public getWOOFiSellQuotes(
        poolAddress: string,
        takerToken: string,
        makerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<WOOFiFillData> {
        const chainId = this.chainId;
        return new SamplerContractOperation({
            fillData: { poolAddress, takerToken, makerToken, chainId },
            source: ERC20BridgeSource.WOOFi,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromWooPP,
            params: [poolAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getWOOFiBuyQuotes(
        poolAddress: string,
        takerToken: string,
        makerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation<WOOFiFillData> {
        const chainId = this.chainId;
        return new SamplerContractOperation({
            fillData: { poolAddress, takerToken, makerToken, chainId },
            source: ERC20BridgeSource.WOOFi,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromWooPP,
            params: [poolAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    /**
     * Returns the best price for the native token
     * Best is calculated according to the fee schedule, so the price of the
     * best source, fee adjusted, will be returned.
     */
    public getBestNativeTokenSellRate(
        sources: ERC20BridgeSource[],
        makerToken: string,
        nativeToken: string,
        nativeFillAmount: BigNumber,
        feeSchedule: FeeSchedule,
    ): BatchedOperation<BigNumber> {
        if (makerToken.toLowerCase() === nativeToken.toLowerCase()) {
            return SamplerOperations.constant(new BigNumber(1));
        }
        const subOps = this._getSellQuoteOperations(
            sources,
            makerToken,
            nativeToken,
            [nativeFillAmount],
            TokenAdjacencyGraph.getEmptyGraph(),
        );
        return this._createBatch(
            subOps,
            (samples: BigNumber[][]) => {
                if (samples.length === 0) {
                    return ZERO_AMOUNT;
                }

                const adjustedPrices = subOps.map((s, i) => {
                    // If the source gave us nothing, skip it and return a default
                    if (samples[i].length === 0 || samples[i][0].isZero()) {
                        return { adjustedPrice: ZERO_AMOUNT, source: s.source, price: ZERO_AMOUNT };
                    }
                    const v = samples[i][0];
                    const price = v.dividedBy(nativeFillAmount);
                    // Create an adjusted price to avoid selecting the following:
                    // * a source that is too expensive to arbitrage given the gas environment
                    // * when a number of sources are poorly priced or liquidity is low

                    // Fee is already gas * gasPrice
                    const fee = feeSchedule[subOps[i].source]
                        ? feeSchedule[subOps[i].source]!(subOps[i].fillData).fee
                        : ZERO_AMOUNT;
                    const adjustedNativeAmount = nativeFillAmount.plus(fee);
                    const adjustedPrice = v.div(adjustedNativeAmount);
                    return {
                        adjustedPrice,
                        source: subOps[i].source,
                        price,
                    };
                });

                const sortedPrices = adjustedPrices.sort((a, b) => a.adjustedPrice.comparedTo(b.adjustedPrice));
                const selectedPrice = sortedPrices[sortedPrices.length - 1].price;

                return selectedPrice;
            },
            () => ZERO_AMOUNT,
        );
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

    private _getSellQuoteOperations(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        tokenAdjacencyGraph: TokenAdjacencyGraph = this.tokenAdjacencyGraph,
    ): SourceQuoteOperation[] {
        // Find the adjacent tokens in the provided token adjacency graph,
        // e.g if this is DAI->USDC we may check for DAI->WETH->USDC
        const intermediateTokens = tokenAdjacencyGraph.getIntermediateTokens(makerToken, takerToken);
        // Drop out MultiHop and Native as we do not query those here.
        const _sources = SELL_SOURCE_FILTER_BY_CHAIN_ID[this.chainId]
            .exclude([ERC20BridgeSource.MultiHop, ERC20BridgeSource.Native])
            .getAllowed(sources);
        const allOps = _.flatten(
            _sources.map((source): SourceQuoteOperation | SourceQuoteOperation[] => {
                if (isBadTokenForSource(makerToken, source) || isBadTokenForSource(takerToken, source)) {
                    return [];
                }
                switch (source) {
                    case ERC20BridgeSource.Uniswap:
                        return isValidAddress(UNISWAPV1_ROUTER_BY_CHAIN_ID[this.chainId])
                            ? this.getUniswapSellQuotes(
                                  UNISWAPV1_ROUTER_BY_CHAIN_ID[this.chainId],
                                  makerToken,
                                  takerToken,
                                  takerFillAmounts,
                              )
                            : [];
                    case ERC20BridgeSource.UniswapV2:
                    case ERC20BridgeSource.SushiSwap:
                    case ERC20BridgeSource.CryptoCom:
                    case ERC20BridgeSource.PancakeSwap:
                    case ERC20BridgeSource.PancakeSwapV2:
                    case ERC20BridgeSource.BakerySwap:
                    case ERC20BridgeSource.ApeSwap:
                    case ERC20BridgeSource.CheeseSwap:
                    case ERC20BridgeSource.QuickSwap:
                    case ERC20BridgeSource.Dfyn:
                    case ERC20BridgeSource.WaultSwap:
                    case ERC20BridgeSource.ShibaSwap:
                    case ERC20BridgeSource.Pangolin:
                    case ERC20BridgeSource.TraderJoe:
                    case ERC20BridgeSource.UbeSwap:
                    case ERC20BridgeSource.SpiritSwap:
                    case ERC20BridgeSource.SpookySwap:
                    case ERC20BridgeSource.Yoshi:
                    case ERC20BridgeSource.MorpheusSwap:
                    case ERC20BridgeSource.BiSwap:
                    case ERC20BridgeSource.MDex:
                    case ERC20BridgeSource.KnightSwap:
                    case ERC20BridgeSource.MeshSwap:
                        const uniLikeRouter = uniswapV2LikeRouterAddress(this.chainId, source);
                        if (!isValidAddress(uniLikeRouter)) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            ...intermediateTokens.map((t) => [takerToken, t, makerToken]),
                        ].map((path) => this.getUniswapV2SellQuotes(uniLikeRouter, path, takerFillAmounts, source));
                    case ERC20BridgeSource.KyberDmm:
                        const kyberDmmRouter = KYBER_DMM_ROUTER_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(kyberDmmRouter)) {
                            return [];
                        }
                        return this.getKyberDmmSellQuotes(kyberDmmRouter, [takerToken, makerToken], takerFillAmounts);
                    case ERC20BridgeSource.Curve:
                    case ERC20BridgeSource.CurveV2:
                    case ERC20BridgeSource.Nerve:
                    case ERC20BridgeSource.Synapse:
                    case ERC20BridgeSource.Belt:
                    case ERC20BridgeSource.Ellipsis:
                    case ERC20BridgeSource.Saddle:
                    case ERC20BridgeSource.XSigma:
                    case ERC20BridgeSource.FirebirdOneSwap:
                    case ERC20BridgeSource.IronSwap:
                    case ERC20BridgeSource.ACryptos:
                    case ERC20BridgeSource.MobiusMoney:
                        return getCurveLikeInfosForPair(this.chainId, takerToken, makerToken, source).map((pool) =>
                            this.getCurveSellQuotes(
                                pool,
                                pool.takerTokenIdx,
                                pool.makerTokenIdx,
                                takerFillAmounts,
                                source,
                            ),
                        );
                    case ERC20BridgeSource.Shell:
                    case ERC20BridgeSource.Component:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map((pool) =>
                            this.getShellSellQuotes(pool, makerToken, takerToken, takerFillAmounts, source),
                        );
                    case ERC20BridgeSource.LiquidityProvider:
                        return getLiquidityProvidersForPair(this.liquidityProviderRegistry, takerToken, makerToken).map(
                            ({ providerAddress, gasCost }) =>
                                this.getLiquidityProviderSellQuotes(
                                    providerAddress,
                                    makerToken,
                                    takerToken,
                                    takerFillAmounts,
                                    gasCost,
                                ),
                        );
                    case ERC20BridgeSource.MStable:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map((pool) =>
                            this.getMStableSellQuotes(pool, makerToken, takerToken, takerFillAmounts),
                        );
                    case ERC20BridgeSource.Mooniswap:
                        return [
                            ...MOONISWAP_REGISTRIES_BY_CHAIN_ID[this.chainId]
                                .filter((r) => isValidAddress(r))
                                .map((registry) =>
                                    this.getMooniswapSellQuotes(registry, makerToken, takerToken, takerFillAmounts),
                                ),
                        ];
                    case ERC20BridgeSource.Balancer:
                        return this.poolsCaches[ERC20BridgeSource.Balancer]
                            .getPoolAddressesForPair(takerToken, makerToken)
                            .map((balancerPool) =>
                                this.getBalancerSellQuotes(
                                    balancerPool,
                                    makerToken,
                                    takerToken,
                                    takerFillAmounts,
                                    ERC20BridgeSource.Balancer,
                                ),
                            );
                    case ERC20BridgeSource.BalancerV2: {
                        const cache = this.poolsCaches[source];
                        if (!cache) {
                            return [];
                        }

                        const swaps = cache.getCachedSwapInfoForPair(takerToken, makerToken);
                        const vault = BALANCER_V2_VAULT_ADDRESS_BY_CHAIN[this.chainId];
                        if (!swaps || vault === NULL_ADDRESS) {
                            return [];
                        }
                        // Changed to retrieve queryBatchSwap for swap steps > 1 of length
                        return swaps.swapInfoExactIn.map((swapInfo) =>
                            this.getBalancerV2MultihopSellQuotes(vault, swapInfo, swapInfo, takerFillAmounts, source),
                        );
                    }
                    case ERC20BridgeSource.Beethovenx: {
                        const cache = this.poolsCaches[source];
                        const poolAddresses = cache.getPoolAddressesForPair(takerToken, makerToken);
                        const vault = BEETHOVEN_X_VAULT_ADDRESS_BY_CHAIN[this.chainId];
                        if (vault === NULL_ADDRESS) {
                            return [];
                        }
                        return poolAddresses.map((poolAddress) =>
                            this.getBalancerV2SellQuotes(
                                { poolId: poolAddress, vault },
                                makerToken,
                                takerToken,
                                takerFillAmounts,
                                source,
                            ),
                        );
                    }
                    case ERC20BridgeSource.Dodo:
                        if (!isValidAddress(DODOV1_CONFIG_BY_CHAIN_ID[this.chainId].registry)) {
                            return [];
                        }
                        return this.getDODOSellQuotes(
                            DODOV1_CONFIG_BY_CHAIN_ID[this.chainId],
                            makerToken,
                            takerToken,
                            takerFillAmounts,
                        );
                    case ERC20BridgeSource.DodoV2:
                        return _.flatten(
                            DODOV2_FACTORIES_BY_CHAIN_ID[this.chainId]
                                .filter((factory) => isValidAddress(factory))
                                .map((factory) =>
                                    getDodoV2Offsets().map((offset) =>
                                        this.getDODOV2SellQuotes(
                                            factory,
                                            offset,
                                            makerToken,
                                            takerToken,
                                            takerFillAmounts,
                                        ),
                                    ),
                                ),
                        );
                    case ERC20BridgeSource.Bancor:
                        if (!isValidAddress(BANCOR_REGISTRY_BY_CHAIN_ID[this.chainId])) {
                            return [];
                        }
                        return this.getBancorSellQuotes(
                            BANCOR_REGISTRY_BY_CHAIN_ID[this.chainId],
                            makerToken,
                            takerToken,
                            takerFillAmounts,
                        );
                    case ERC20BridgeSource.MakerPsm:
                        const psmInfo = MAKER_PSM_INFO_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(psmInfo.psmAddress)) {
                            return [];
                        }
                        return this.getMakerPsmSellQuotes(psmInfo, makerToken, takerToken, takerFillAmounts);
                    case ERC20BridgeSource.UniswapV3: {
                        const { quoter, router } = UNISWAPV3_CONFIG_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(router) || !isValidAddress(quoter)) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            ...intermediateTokens.map((t) => [takerToken, t, makerToken]),
                        ].map((path) => this.getUniswapV3SellQuotes(router, quoter, path, takerFillAmounts));
                    }
                    case ERC20BridgeSource.Lido: {
                        if (!this._isLidoSupported(takerToken, makerToken)) {
                            return [];
                        }
                        const lidoInfo = LIDO_INFO_BY_CHAIN[this.chainId];
                        return this.getLidoSellQuotes(lidoInfo, makerToken, takerToken, takerFillAmounts);
                    }
                    case ERC20BridgeSource.AaveV2: {
                        if (!this.aaveReservesCache) {
                            return [];
                        }
                        const reserve = this.aaveReservesCache.get(takerToken, makerToken);
                        if (!reserve) {
                            return [];
                        }

                        const info: AaveV2Info = {
                            lendingPool: reserve.pool.lendingPool,
                            aToken: reserve.aToken.id,
                            underlyingToken: reserve.underlyingAsset,
                        };
                        return this.getAaveV2SellQuotes(info, makerToken, takerToken, takerFillAmounts);
                    }
                    case ERC20BridgeSource.Geist: {
                        const info: GeistInfo | undefined = getGeistInfoForPair(takerToken, makerToken);
                        if (!info) {
                            return [];
                        }
                        return this.getGeistSellQuotes(info, makerToken, takerToken, takerFillAmounts);
                    }
                    case ERC20BridgeSource.Compound: {
                        if (!this.compoundCTokenCache) {
                            return [];
                        }

                        const cToken = this.compoundCTokenCache.get(takerToken, makerToken);
                        if (!cToken) {
                            return [];
                        }
                        return this.getCompoundSellQuotes(
                            cToken.tokenAddress,
                            makerToken,
                            takerToken,
                            takerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.GMX: {
                        // MIM has no liquidity.
                        if (takerToken === AVALANCHE_TOKENS.MIM || makerToken === AVALANCHE_TOKENS.MIM) {
                            return [];
                        }
                        return this.getGMXSellQuotes(
                            GMX_ROUTER_BY_CHAIN_ID[this.chainId],
                            GMX_READER_BY_CHAIN_ID[this.chainId],
                            GMX_VAULT_BY_CHAIN_ID[this.chainId],
                            [takerToken, makerToken],
                            takerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.Platypus: {
                        return getPlatypusInfoForPair(this.chainId, takerToken, makerToken).map((pool) =>
                            this.getPlatypusSellQuotes(
                                PLATYPUS_ROUTER_BY_CHAIN_ID[this.chainId],
                                [pool.poolAddress],
                                [takerToken, makerToken],
                                takerFillAmounts,
                            ),
                        );
                    }
                    case ERC20BridgeSource.BancorV3: {
                        return this.getBancorV3SellQuotes(
                            BANCORV3_NETWORK_BY_CHAIN_ID[this.chainId],
                            BANCORV3_NETWORK_INFO_BY_CHAIN_ID[this.chainId],
                            [takerToken, makerToken],
                            takerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.Velodrome: {
                        return this.getVelodromeSellQuotes(
                            VELODROME_ROUTER_BY_CHAIN_ID[this.chainId],
                            takerToken,
                            makerToken,
                            takerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.Synthetix: {
                        const readProxy = SYNTHETIX_READ_PROXY_BY_CHAIN_ID[this.chainId];
                        const currencyKeyMap = SYNTHETIX_CURRENCY_KEYS_BY_CHAIN_ID[this.chainId];
                        const takerTokenSymbol = currencyKeyMap.get(takerToken.toLowerCase());
                        const makerTokenSymbol = currencyKeyMap.get(makerToken.toLowerCase());
                        if (takerTokenSymbol === undefined || makerTokenSymbol === undefined) {
                            return [];
                        }
                        return this.getSynthetixSellQuotes(
                            readProxy,
                            takerTokenSymbol,
                            makerTokenSymbol,
                            takerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.WOOFi: {
                        if (!(WOOFI_SUPPORTED_TOKENS.has(takerToken) && WOOFI_SUPPORTED_TOKENS.has(makerToken))) {
                            return [];
                        }
                        return this.getWOOFiSellQuotes(
                            WOOFI_POOL_BY_CHAIN_ID[this.chainId],
                            takerToken,
                            makerToken,
                            takerFillAmounts,
                        );
                    }
                    default:
                        throw new Error(`Unsupported sell sample source: ${source}`);
                }
            }),
        );
        return allOps;
    }

    private _isLidoSupported(takerTokenAddress: string, makerTokenAddress: string): boolean {
        const lidoInfo = LIDO_INFO_BY_CHAIN[this.chainId];
        if (lidoInfo.wethToken === NULL_ADDRESS) {
            return false;
        }
        const takerToken = takerTokenAddress.toLowerCase();
        const makerToken = makerTokenAddress.toLowerCase();
        const wethToken = lidoInfo.wethToken.toLowerCase();
        const stEthToken = lidoInfo.stEthToken.toLowerCase();
        const wstEthToken = lidoInfo.wstEthToken.toLowerCase();

        if (takerToken === wethToken && makerToken === stEthToken) {
            return true;
        }

        return _.difference([stEthToken, wstEthToken], [takerToken, makerToken]).length === 0;
    }

    private _getBuyQuoteOperations(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): SourceQuoteOperation[] {
        // Find the adjacent tokens in the provided token adjacency graph,
        // e.g if this is DAI->USDC we may check for DAI->WETH->USDC
        const intermediateTokens = this.tokenAdjacencyGraph.getIntermediateTokens(makerToken, takerToken);
        const _sources = BATCH_SOURCE_FILTERS.getAllowed(sources);
        return _.flatten(
            _sources.map((source): SourceQuoteOperation | SourceQuoteOperation[] => {
                switch (source) {
                    case ERC20BridgeSource.Uniswap:
                        return isValidAddress(UNISWAPV1_ROUTER_BY_CHAIN_ID[this.chainId])
                            ? this.getUniswapBuyQuotes(
                                  UNISWAPV1_ROUTER_BY_CHAIN_ID[this.chainId],
                                  makerToken,
                                  takerToken,
                                  makerFillAmounts,
                              )
                            : [];
                    case ERC20BridgeSource.UniswapV2:
                    case ERC20BridgeSource.SushiSwap:
                    case ERC20BridgeSource.CryptoCom:
                    case ERC20BridgeSource.PancakeSwap:
                    case ERC20BridgeSource.PancakeSwapV2:
                    case ERC20BridgeSource.BakerySwap:
                    case ERC20BridgeSource.ApeSwap:
                    case ERC20BridgeSource.CheeseSwap:
                    case ERC20BridgeSource.QuickSwap:
                    case ERC20BridgeSource.Dfyn:
                    case ERC20BridgeSource.WaultSwap:
                    case ERC20BridgeSource.ShibaSwap:
                    case ERC20BridgeSource.Pangolin:
                    case ERC20BridgeSource.TraderJoe:
                    case ERC20BridgeSource.UbeSwap:
                    case ERC20BridgeSource.SpiritSwap:
                    case ERC20BridgeSource.SpookySwap:
                    case ERC20BridgeSource.Yoshi:
                    case ERC20BridgeSource.MorpheusSwap:
                    case ERC20BridgeSource.BiSwap:
                    case ERC20BridgeSource.MDex:
                    case ERC20BridgeSource.KnightSwap:
                    case ERC20BridgeSource.MeshSwap:
                        const uniLikeRouter = uniswapV2LikeRouterAddress(this.chainId, source);
                        if (!isValidAddress(uniLikeRouter)) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            ...intermediateTokens.map((t) => [takerToken, t, makerToken]),
                        ].map((path) => this.getUniswapV2BuyQuotes(uniLikeRouter, path, makerFillAmounts, source));
                    case ERC20BridgeSource.KyberDmm:
                        const kyberDmmRouter = KYBER_DMM_ROUTER_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(kyberDmmRouter)) {
                            return [];
                        }
                        return this.getKyberDmmBuyQuotes(kyberDmmRouter, [takerToken, makerToken], makerFillAmounts);
                    case ERC20BridgeSource.Curve:
                    case ERC20BridgeSource.CurveV2:
                    case ERC20BridgeSource.Nerve:
                    case ERC20BridgeSource.Synapse:
                    case ERC20BridgeSource.Belt:
                    case ERC20BridgeSource.Ellipsis:
                    case ERC20BridgeSource.Saddle:
                    case ERC20BridgeSource.XSigma:
                    case ERC20BridgeSource.FirebirdOneSwap:
                    case ERC20BridgeSource.IronSwap:
                    case ERC20BridgeSource.ACryptos:
                    case ERC20BridgeSource.MobiusMoney:
                        return getCurveLikeInfosForPair(this.chainId, takerToken, makerToken, source).map((pool) =>
                            this.getCurveBuyQuotes(
                                pool,
                                pool.takerTokenIdx,
                                pool.makerTokenIdx,
                                makerFillAmounts,
                                source,
                            ),
                        );
                    case ERC20BridgeSource.Shell:
                    case ERC20BridgeSource.Component:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map((pool) =>
                            this.getShellBuyQuotes(pool, makerToken, takerToken, makerFillAmounts, source),
                        );
                    case ERC20BridgeSource.LiquidityProvider:
                        return getLiquidityProvidersForPair(this.liquidityProviderRegistry, takerToken, makerToken).map(
                            ({ providerAddress, gasCost }) =>
                                this.getLiquidityProviderBuyQuotes(
                                    providerAddress,
                                    makerToken,
                                    takerToken,
                                    makerFillAmounts,
                                    gasCost,
                                ),
                        );
                    case ERC20BridgeSource.MStable:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map((pool) =>
                            this.getMStableBuyQuotes(pool, makerToken, takerToken, makerFillAmounts),
                        );
                    case ERC20BridgeSource.Mooniswap:
                        return [
                            ...MOONISWAP_REGISTRIES_BY_CHAIN_ID[this.chainId]
                                .filter((r) => isValidAddress(r))
                                .map((registry) =>
                                    this.getMooniswapBuyQuotes(registry, makerToken, takerToken, makerFillAmounts),
                                ),
                        ];
                    case ERC20BridgeSource.Balancer:
                        return this.poolsCaches[ERC20BridgeSource.Balancer]
                            .getPoolAddressesForPair(takerToken, makerToken)
                            .map((poolAddress) =>
                                this.getBalancerBuyQuotes(
                                    poolAddress,
                                    makerToken,
                                    takerToken,
                                    makerFillAmounts,
                                    ERC20BridgeSource.Balancer,
                                ),
                            );
                    case ERC20BridgeSource.BalancerV2: {
                        const cache = this.poolsCaches[source];
                        if (!cache) {
                            return [];
                        }

                        const swaps = cache.getCachedSwapInfoForPair(takerToken, makerToken);
                        const vault = BALANCER_V2_VAULT_ADDRESS_BY_CHAIN[this.chainId];
                        if (!swaps || vault === NULL_ADDRESS) {
                            return [];
                        }
                        // Changed to retrieve queryBatchSwap for swap steps > 1 of length
                        return swaps.swapInfoExactOut.map((quoteSwapInfo, i) =>
                            this.getBalancerV2MultihopBuyQuotes(
                                vault,
                                quoteSwapInfo,
                                swaps.swapInfoExactIn[i],
                                makerFillAmounts,
                                source,
                            ),
                        );
                    }
                    case ERC20BridgeSource.Beethovenx: {
                        const cache = this.poolsCaches[source];
                        const poolIds = cache.getPoolAddressesForPair(takerToken, makerToken) || [];
                        const vault = BEETHOVEN_X_VAULT_ADDRESS_BY_CHAIN[this.chainId];
                        if (vault === NULL_ADDRESS) {
                            return [];
                        }
                        return poolIds.map((poolId) =>
                            this.getBalancerV2BuyQuotes(
                                { poolId, vault },
                                makerToken,
                                takerToken,
                                makerFillAmounts,
                                source,
                            ),
                        );
                    }
                    case ERC20BridgeSource.Dodo:
                        if (!isValidAddress(DODOV1_CONFIG_BY_CHAIN_ID[this.chainId].registry)) {
                            return [];
                        }
                        return this.getDODOBuyQuotes(
                            DODOV1_CONFIG_BY_CHAIN_ID[this.chainId],
                            makerToken,
                            takerToken,
                            makerFillAmounts,
                        );
                    case ERC20BridgeSource.DodoV2:
                        return _.flatten(
                            DODOV2_FACTORIES_BY_CHAIN_ID[this.chainId]
                                .filter((factory) => isValidAddress(factory))
                                .map((factory) =>
                                    getDodoV2Offsets().map((offset) =>
                                        this.getDODOV2BuyQuotes(
                                            factory,
                                            offset,
                                            makerToken,
                                            takerToken,
                                            makerFillAmounts,
                                        ),
                                    ),
                                ),
                        );
                    case ERC20BridgeSource.Bancor:
                        // Unimplemented
                        // return this.getBancorBuyQuotes(makerToken, takerToken, makerFillAmounts);
                        return [];
                    case ERC20BridgeSource.MakerPsm:
                        const psmInfo = MAKER_PSM_INFO_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(psmInfo.psmAddress)) {
                            return [];
                        }
                        return this.getMakerPsmBuyQuotes(psmInfo, makerToken, takerToken, makerFillAmounts);
                    case ERC20BridgeSource.UniswapV3: {
                        const { quoter, router } = UNISWAPV3_CONFIG_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(router) || !isValidAddress(quoter)) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            ...intermediateTokens.map((t) => [takerToken, t, makerToken]),
                        ].map((path) => this.getUniswapV3BuyQuotes(router, quoter, path, makerFillAmounts));
                    }
                    case ERC20BridgeSource.Lido: {
                        if (!this._isLidoSupported(takerToken, makerToken)) {
                            return [];
                        }
                        const lidoInfo = LIDO_INFO_BY_CHAIN[this.chainId];
                        return this.getLidoBuyQuotes(lidoInfo, makerToken, takerToken, makerFillAmounts);
                    }
                    case ERC20BridgeSource.AaveV2: {
                        if (!this.aaveReservesCache) {
                            return [];
                        }
                        const reserve = this.aaveReservesCache.get(takerToken, makerToken);
                        if (!reserve) {
                            return [];
                        }
                        const info: AaveV2Info = {
                            lendingPool: reserve.pool.lendingPool,
                            aToken: reserve.aToken.id,
                            underlyingToken: reserve.underlyingAsset,
                        };
                        return this.getAaveV2BuyQuotes(info, makerToken, takerToken, makerFillAmounts);
                    }
                    case ERC20BridgeSource.Geist: {
                        const info: GeistInfo | undefined = getGeistInfoForPair(takerToken, makerToken);
                        if (!info) {
                            return [];
                        }
                        return this.getGeistBuyQuotes(info, makerToken, takerToken, makerFillAmounts);
                    }
                    case ERC20BridgeSource.Compound: {
                        if (!this.compoundCTokenCache) {
                            return [];
                        }

                        const cToken = this.compoundCTokenCache.get(takerToken, makerToken);
                        if (!cToken) {
                            return [];
                        }
                        return this.getCompoundBuyQuotes(cToken.tokenAddress, makerToken, takerToken, makerFillAmounts);
                    }
                    case ERC20BridgeSource.GMX: {
                        // MIM has no liquidity.
                        if (takerToken === AVALANCHE_TOKENS.MIM || makerToken === AVALANCHE_TOKENS.MIM) {
                            return [];
                        }
                        return this.getGMXBuyQuotes(
                            GMX_ROUTER_BY_CHAIN_ID[this.chainId],
                            GMX_READER_BY_CHAIN_ID[this.chainId],
                            GMX_VAULT_BY_CHAIN_ID[this.chainId],
                            [takerToken, makerToken],
                            makerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.Platypus: {
                        return getPlatypusInfoForPair(this.chainId, takerToken, makerToken).map((pool) =>
                            this.getPlatypusBuyQuotes(
                                PLATYPUS_ROUTER_BY_CHAIN_ID[this.chainId],
                                [pool.poolAddress],
                                [takerToken, makerToken],
                                makerFillAmounts,
                            ),
                        );
                    }
                    case ERC20BridgeSource.BancorV3: {
                        return this.getBancorV3BuyQuotes(
                            BANCORV3_NETWORK_BY_CHAIN_ID[this.chainId],
                            BANCORV3_NETWORK_INFO_BY_CHAIN_ID[this.chainId],
                            [takerToken, makerToken],
                            makerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.Velodrome: {
                        return this.getVelodromeBuyQuotes(
                            VELODROME_ROUTER_BY_CHAIN_ID[this.chainId],
                            takerToken,
                            makerToken,
                            makerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.Synthetix: {
                        const readProxy = SYNTHETIX_READ_PROXY_BY_CHAIN_ID[this.chainId];
                        const currencyKeyMap = SYNTHETIX_CURRENCY_KEYS_BY_CHAIN_ID[this.chainId];
                        const takerTokenSymbol = currencyKeyMap.get(takerToken.toLowerCase());
                        const makerTokenSymbol = currencyKeyMap.get(makerToken.toLowerCase());
                        if (takerTokenSymbol === undefined || makerTokenSymbol === undefined) {
                            return [];
                        }
                        return this.getSynthetixBuyQuotes(
                            readProxy,
                            takerTokenSymbol,
                            makerTokenSymbol,
                            makerFillAmounts,
                        );
                    }
                    case ERC20BridgeSource.WOOFi: {
                        if (!(WOOFI_SUPPORTED_TOKENS.has(takerToken) && WOOFI_SUPPORTED_TOKENS.has(makerToken))) {
                            return [];
                        }
                        return this.getWOOFiBuyQuotes(
                            WOOFI_POOL_BY_CHAIN_ID[this.chainId],
                            takerToken,
                            makerToken,
                            makerFillAmounts,
                        );
                    }
                    default:
                        throw new Error(`Unsupported buy sample source: ${source}`);
                }
            }),
        );
    }

    /**
     * Wraps `subOps` operations into a batch call to the sampler
     * @param subOps An array of Sampler operations
     * @param resultHandler The handler of the parsed batch results
     * @param revertHandler The handle for when the batch operation reverts. The result data is provided as an argument
     */
    private _createBatch<T, TResult>(
        subOps: BatchedOperation<TResult>[],
        resultHandler: (results: TResult[]) => T,
        revertHandler: (result: string) => T,
    ): BatchedOperation<T> {
        return {
            encodeCall: () => {
                const subCalls = subOps.map((op) => op.encodeCall());
                return this._samplerContract.batchCall(subCalls).getABIEncodedTransactionData();
            },
            handleCallResults: (callResults) => {
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
