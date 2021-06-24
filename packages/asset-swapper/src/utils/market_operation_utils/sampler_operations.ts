import { ChainId } from '@0x/contract-addresses';
import { LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber, logUtils } from '@0x/utils';
import * as _ from 'lodash';

import { SamplerCallResult, SignedNativeOrder } from '../../types';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { BancorService } from './bancor_service';
import {
    CurveDetailedInfo,
    getCurveLikeInfosForPair,
    getDodoV2Offsets,
    getKyberOffsets,
    getShellLikeInfosForPair,
    isAllowedKyberReserveId,
    isBadTokenForSource,
    isValidAddress,
    uniswapV2LikeRouterAddress,
} from './bridge_source_utils';
import {
    BALANCER_V2_VAULT_ADDRESS_BY_CHAIN,
    BANCOR_REGISTRY_BY_CHAIN_ID,
    DODOV1_CONFIG_BY_CHAIN_ID,
    DODOV2_FACTORIES_BY_CHAIN_ID,
    KYBER_CONFIG_BY_CHAIN_ID,
    KYBER_DMM_ROUTER_BY_CHAIN_ID,
    LIDO_INFO_BY_CHAIN,
    LINKSWAP_ROUTER_BY_CHAIN_ID,
    LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID,
    MAINNET_TOKENS,
    MAKER_PSM_INFO_BY_CHAIN_ID,
    MAX_UINT256,
    MOONISWAP_REGISTRIES_BY_CHAIN_ID,
    NULL_ADDRESS,
    NULL_BYTES,
    OASIS_ROUTER_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
    UNISWAPV1_ROUTER_BY_CHAIN_ID,
    UNISWAPV3_CONFIG_BY_CHAIN_ID,
    ZERO_AMOUNT,
} from './constants';
import { getLiquidityProvidersForPair } from './liquidity_provider_utils';
import { MeasuredSamplerContractOperation } from './measured_sampler_contract_operation';
import { getIntermediateTokens } from './multihop_utils';
import { BalancerPoolsCache, BalancerV2PoolsCache, CreamPoolsCache, PoolsCache } from './pools_cache';
import { SamplerContractOperation } from './sampler_contract_operation';
import { SourceFilters } from './source_filters';
import {
    BalancerFillData,
    BalancerV2FillData,
    BalancerV2PoolInfo,
    BancorFillData,
    BatchedOperation,
    CurveFillData,
    DexSample,
    DODOFillData,
    ERC20BridgeSource,
    GenericRouterFillData,
    HopInfo,
    KyberDmmFillData,
    KyberFillData,
    KyberSamplerOpts,
    LidoFillData,
    LidoInfo,
    LiquidityProviderFillData,
    LiquidityProviderRegistry,
    MakerPsmFillData,
    MeasuredSamplerResult,
    MeasuredSourceQuoteOperation,
    MooniswapFillData,
    MultiHopFillData,
    PsmInfo,
    ShellFillData,
    SourcesWithPoolsCache,
    TokenAdjacencyGraph,
    UniswapV2FillData,
    UniswapV3FillData,
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

/**
 * Composable operations that can be batched in a single transaction,
 * for use with `DexOrderSampler.executeAsync()`.
 */
export class SamplerOperations {
    public readonly liquidityProviderRegistry: LiquidityProviderRegistry;
    public readonly poolsCaches: { [key in SourcesWithPoolsCache]: PoolsCache };
    protected _bancorService?: BancorService;
    public static constant<T>(result: T): BatchedOperation<T> {
        return {
            encodeCall: () => '0x',
            handleCallResults: _callResults => result,
            handleRevert: _callResults => result,
        };
    }

    constructor(
        public readonly chainId: ChainId,
        protected readonly _samplerContract: ERC20BridgeSamplerContract,
        poolsCaches?: { [key in SourcesWithPoolsCache]: PoolsCache },
        public readonly tokenAdjacencyGraph: TokenAdjacencyGraph = { default: [] },
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
                  [ERC20BridgeSource.BalancerV2]: new BalancerV2PoolsCache(),
                  [ERC20BridgeSource.Balancer]: new BalancerPoolsCache(),
                  [ERC20BridgeSource.Cream]: new CreamPoolsCache(),
              };
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

    public getCode(address: string): BatchedOperation<string> {
        return {
            encodeCall: () => this._samplerContract.getCode(address).getABIEncodedTransactionData(),
            handleCallResults: (callResults: string) =>
                this._samplerContract.getABIDecodedReturnData<string>('getCode', callResults),
            handleRevert: (data: string) => {
                throw new Error(`getCode for ${address} reverted: ${data}`);
            },
        };
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

    public getBalanceOf(tokens: string[], address: string): BatchedOperation<BigNumber[]> {
        return {
            encodeCall: () => this._samplerContract.getBalanceOf(tokens, address).getABIEncodedTransactionData(),
            handleCallResults: (callResults: string) =>
                this._samplerContract.getABIDecodedReturnData<BigNumber[]>('getBalanceOf', callResults),
            handleRevert: () => {
                /* should never happen */
                throw new Error('balanceOf reverted');
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
            // tslint:disable-next-line:no-unnecessary-type-assertion
            params: [orders.map(o => o.order as LimitOrderFields), orders.map(o => o.signature), exchangeAddress],
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
            // tslint:disable-next-line:no-unnecessary-type-assertion
            params: [orders.map(o => o.order as LimitOrderFields), orders.map(o => o.signature), exchangeAddress],
        });
    }

    public getKyberSellQuotes(
        kyberOpts: KyberSamplerOpts,
        reserveOffset: BigNumber,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<KyberFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.Kyber,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromKyberNetwork,
            params: [{ ...kyberOpts, reserveOffset, hint: NULL_BYTES }, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: KyberFillData): MeasuredSamplerResult => {
                const [reserveId, hint, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string, BigNumber[], BigNumber[]]
                >('sampleSellsFromKyberNetwork', callResults);
                fillData.hint = hint;
                fillData.reserveId = reserveId;
                fillData.networkProxy = kyberOpts.networkProxy;
                return isAllowedKyberReserveId(reserveId) ? { gasUsed, samples } : { gasUsed: [], samples: [] };
            },
        });
    }

    public getKyberBuyQuotes(
        kyberOpts: KyberSamplerOpts,
        reserveOffset: BigNumber,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<KyberFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Kyber,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromKyberNetwork,
            params: [{ ...kyberOpts, reserveOffset, hint: NULL_BYTES }, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: KyberFillData): MeasuredSamplerResult => {
                const [reserveId, hint, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string, BigNumber[], BigNumber[]]
                >('sampleBuysFromKyberNetwork', callResults);
                fillData.hint = hint;
                fillData.reserveId = reserveId;
                fillData.networkProxy = kyberOpts.networkProxy;
                return isAllowedKyberReserveId(reserveId) ? { gasUsed, samples } : { gasUsed: [], samples: [] };
            },
        });
    }

    public getKyberDmmSellQuotes(
        router: string,
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<KyberDmmFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.KyberDmm,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromKyberDmm,
            params: [router, tokenAddressPath, takerFillAmounts],
            callback: (callResults: string, fillData: KyberDmmFillData): MeasuredSamplerResult => {
                const [pools, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string[], BigNumber[], BigNumber[]]
                >('sampleSellsFromKyberDmm', callResults);
                fillData.poolsPath = pools;
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                return { gasUsed, samples };
            },
        });
    }

    public getKyberDmmBuyQuotes(
        router: string,
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<KyberDmmFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.KyberDmm,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromKyberDmm,
            params: [router, tokenAddressPath, makerFillAmounts],
            callback: (callResults: string, fillData: KyberDmmFillData): MeasuredSamplerResult => {
                const [pools, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string[], BigNumber[], BigNumber[]]
                >('sampleBuysFromKyberDmm', callResults);
                fillData.poolsPath = pools;
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                return { gasUsed, samples };
            },
        });
    }

    public getUniswapSellQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<GenericRouterFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.Uniswap,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromUniswap,
            params: [router, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getUniswapBuyQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<GenericRouterFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Uniswap,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromUniswap,
            params: [router, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getUniswapV2SellQuotes(
        router: string,
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.UniswapV2,
    ): MeasuredSourceQuoteOperation<UniswapV2FillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
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
    ): MeasuredSourceQuoteOperation<UniswapV2FillData> {
        return new MeasuredSamplerContractOperation({
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
    ): MeasuredSourceQuoteOperation<LiquidityProviderFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.LiquidityProvider,
            fillData: {
                poolAddress: providerAddress,
                // TODO jacob remove this gasCost with SwapRevertSampling
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
    ): MeasuredSourceQuoteOperation<LiquidityProviderFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.LiquidityProvider,
            fillData: {
                poolAddress: providerAddress,
                // TODO jacob remove this gasCost with SwapRevertSampling
                gasCost,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromLiquidityProvider,
            params: [providerAddress, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getEth2DaiSellQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<GenericRouterFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.Eth2Dai,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromEth2Dai,
            params: [router, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getEth2DaiBuyQuotes(
        router: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<GenericRouterFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Eth2Dai,
            fillData: { router },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromEth2Dai,
            params: [router, takerToken, makerToken, makerFillAmounts],
        });
    }

    public getCurveSellQuotes(
        pool: CurveDetailedInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.Curve,
    ): MeasuredSourceQuoteOperation<CurveFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source,
            fillData: {
                pool,
                fromTokenIdx: pool.takerTokenIdx,
                toTokenIdx: pool.makerTokenIdx,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromCurve,
            params: [
                {
                    curveAddress: pool.poolAddress,
                    exchangeFunctionSelector: pool.exchangeFunctionSelector,
                    fromCoinIdx: new BigNumber(pool.takerTokenIdx),
                    toCoinIdx: new BigNumber(pool.makerTokenIdx),
                },
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
        });
    }

    public getCurveV2SellQuotes(
        pool: CurveDetailedInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.Curve,
    ): MeasuredSourceQuoteOperation<CurveFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source,
            fillData: {
                pool,
                fromTokenIdx: pool.takerTokenIdx,
                toTokenIdx: pool.makerTokenIdx,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromCurveV2,
            params: [
                {
                    curveAddress: pool.poolAddress,
                    exchangeFunctionSelector: pool.exchangeFunctionSelector,
                    fromCoinIdx: new BigNumber(pool.takerTokenIdx),
                    toCoinIdx: new BigNumber(pool.makerTokenIdx),
                },
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
        });
    }

    public getCurveV2BuyQuotes(
        pool: CurveDetailedInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.Curve,
    ): MeasuredSourceQuoteOperation<CurveFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source,
            fillData: {
                pool,
                fromTokenIdx: pool.takerTokenIdx,
                toTokenIdx: pool.makerTokenIdx,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromCurveV2,
            params: [
                {
                    curveAddress: pool.poolAddress,
                    exchangeFunctionSelector: pool.exchangeFunctionSelector,
                    fromCoinIdx: new BigNumber(pool.takerTokenIdx),
                    toCoinIdx: new BigNumber(pool.makerTokenIdx),
                },
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
        });
    }

    public getCurveBuyQuotes(
        pool: CurveDetailedInfo,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.Curve,
    ): MeasuredSourceQuoteOperation<CurveFillData> {
        return new MeasuredSamplerContractOperation({
            source,
            fillData: {
                pool,
                fromTokenIdx: pool.takerTokenIdx,
                toTokenIdx: pool.makerTokenIdx,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromCurve,
            params: [
                {
                    curveAddress: pool.poolAddress,
                    exchangeFunctionSelector: pool.exchangeFunctionSelector,
                    fromCoinIdx: new BigNumber(pool.takerTokenIdx),
                    toCoinIdx: new BigNumber(pool.makerTokenIdx),
                },
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
        });
    }

    public getBalancerV2SellQuotes(
        poolInfo: BalancerV2PoolInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource,
    ): MeasuredSourceQuoteOperation<BalancerV2FillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: false,
            source,
            fillData: { ...poolInfo },
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
    ): MeasuredSourceQuoteOperation<BalancerV2FillData> {
        return new MeasuredSamplerContractOperation({
            source,
            fillData: { ...poolInfo },
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
    ): MeasuredSourceQuoteOperation<BalancerFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: false,
            log: true,
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
    ): MeasuredSourceQuoteOperation<BalancerFillData> {
        return new MeasuredSamplerContractOperation({
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
    ): MeasuredSourceQuoteOperation<GenericRouterFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
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
    ): MeasuredSourceQuoteOperation<GenericRouterFillData> {
        return new MeasuredSamplerContractOperation({
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
    ): MeasuredSourceQuoteOperation<BancorFillData> {
        const paths = this._bancorService ? this._bancorService.getPaths(takerToken, makerToken) : [];
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.Bancor,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromBancor,
            params: [{ registry, paths }, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: BancorFillData): MeasuredSamplerResult => {
                const [networkAddress, path, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string[], BigNumber[], BigNumber[]]
                >('sampleSellsFromBancor', callResults);
                fillData.networkAddress = networkAddress;
                fillData.path = path;
                return { gasUsed, samples };
            },
        });
    }

    // Unimplemented
    public getBancorBuyQuotes(
        registry: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<BancorFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Bancor,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromBancor,
            params: [{ registry, paths: [] }, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: BancorFillData): MeasuredSamplerResult => {
                const [networkAddress, path, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, string[], BigNumber[], BigNumber[]]
                >('sampleBuysFromBancor', callResults);
                fillData.networkAddress = networkAddress;
                fillData.path = path;
                return { gasUsed, samples };
            },
        });
    }

    public getMooniswapSellQuotes(
        registry: string,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<MooniswapFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.Mooniswap,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromMooniswap,
            params: [registry, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: MooniswapFillData): MeasuredSamplerResult => {
                const [poolAddress, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, BigNumber[], BigNumber[]]
                >('sampleSellsFromMooniswap', callResults);
                fillData.poolAddress = poolAddress;
                return { gasUsed, samples };
            },
        });
    }

    public getMooniswapBuyQuotes(
        registry: string,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<MooniswapFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Mooniswap,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromMooniswap,
            params: [registry, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: MooniswapFillData): MeasuredSamplerResult => {
                const [poolAddress, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string, BigNumber[], BigNumber[]]
                >('sampleBuysFromMooniswap', callResults);
                fillData.poolAddress = poolAddress;
                return { gasUsed, samples };
            },
        });
    }

    public getUniswapV3SellQuotes(
        router: string,
        quoter: string,
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.UniswapV3,
    ): MeasuredSourceQuoteOperation<UniswapV3FillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            log: true,
            source,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromUniswapV3,
            params: [quoter, router, tokenAddressPath, takerFillAmounts],
            callback: (callResults: string, fillData: UniswapV3FillData): MeasuredSamplerResult => {
                const [paths, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string[], BigNumber[], BigNumber[]]
                >('sampleSellsFromUniswapV3', callResults);
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                fillData.pathAmounts = paths.map((uniswapPath, i) => ({
                    uniswapPath,
                    inputAmount: takerFillAmounts[i],
                }));
                return { gasUsed, samples };
            },
        });
    }

    public getUniswapV3BuyQuotes(
        router: string,
        quoter: string,
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
        source: ERC20BridgeSource = ERC20BridgeSource.UniswapV3,
    ): MeasuredSourceQuoteOperation<UniswapV3FillData> {
        return new MeasuredSamplerContractOperation({
            source,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromUniswapV3,
            params: [quoter, router, tokenAddressPath, makerFillAmounts],
            callback: (callResults: string, fillData: UniswapV3FillData): MeasuredSamplerResult => {
                const [paths, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [string[], BigNumber[], BigNumber[]]
                >('sampleBuysFromUniswapV3', callResults);
                fillData.router = router;
                fillData.tokenAddressPath = tokenAddressPath;
                fillData.pathAmounts = paths.map((uniswapPath, i) => ({
                    uniswapPath,
                    inputAmount: makerFillAmounts[i],
                }));
                return { gasUsed, samples };
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
            return new MeasuredSamplerContractOperation({
                deregisterable: false,
                contract: this._samplerContract,
                source: ERC20BridgeSource.MultiHop,
                function: this._samplerContract.sampleTwoHopSell,
                params: [firstHopOps.map(op => op.encodeCall()), secondHopOps.map(op => op.encodeCall()), sellAmount],
                fillData: { intermediateToken } as MultiHopFillData, // tslint:disable-line:no-object-literal-type-assertion
                callback: (callResults: string, fillData: MultiHopFillData): MeasuredSamplerResult => {
                    const [
                        firstHop,
                        secondHop,
                        _intermediateAmount,
                        buyAmount,
                    ] = this._samplerContract.getABIDecodedReturnData<[HopInfo, HopInfo, BigNumber, BigNumber]>(
                        'sampleTwoHopSell',
                        callResults,
                    );
                    // Ensure the hop sources are set even when the buy amount is zero
                    fillData.firstHopSource = firstHopOps[firstHop.sourceIndex.toNumber()];
                    fillData.secondHopSource = secondHopOps[secondHop.sourceIndex.toNumber()];
                    if (buyAmount.isZero()) {
                        return { gasUsed: [ZERO_AMOUNT], samples: [ZERO_AMOUNT] };
                    }
                    const firstHopResult = fillData.firstHopSource.handleCallResults(firstHop.returnData);
                    const secondHopResult = fillData.secondHopSource.handleCallResults(secondHop.returnData);
                    const gasUsed = (firstHopResult.gasUsed[0] || ZERO_AMOUNT).plus(
                        secondHopResult.gasUsed[0] || ZERO_AMOUNT,
                    );
                    return { gasUsed: [gasUsed], samples: [buyAmount] };
                },
            });
        });
        return this._createBatch(
            subOps,
            (result: MeasuredSamplerResult[]) => {
                return subOps.map((op, i) => {
                    return {
                        source: op.source,
                        output: result[i].samples[0],
                        input: sellAmount,
                        fillData: op.fillData,
                        gasUsed: result[i].gasUsed[0],
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
            return new MeasuredSamplerContractOperation({
                deregisterable: false,
                contract: this._samplerContract,
                source: ERC20BridgeSource.MultiHop,
                function: this._samplerContract.sampleTwoHopBuy,
                params: [firstHopOps.map(op => op.encodeCall()), secondHopOps.map(op => op.encodeCall()), buyAmount],
                fillData: { intermediateToken } as MultiHopFillData, // tslint:disable-line:no-object-literal-type-assertion
                callback: (callResults: string, fillData: MultiHopFillData): MeasuredSamplerResult => {
                    const [firstHop, secondHop, sellAmount] = this._samplerContract.getABIDecodedReturnData<
                        [HopInfo, HopInfo, BigNumber]
                    >('sampleTwoHopBuy', callResults);
                    if (sellAmount.isEqualTo(MAX_UINT256)) {
                        return { gasUsed: [ZERO_AMOUNT], samples: [ZERO_AMOUNT] };
                    }
                    fillData.firstHopSource = firstHopOps[firstHop.sourceIndex.toNumber()];
                    fillData.secondHopSource = secondHopOps[secondHop.sourceIndex.toNumber()];
                    const firstHopResult = fillData.firstHopSource.handleCallResults(firstHop.returnData);
                    const secondHopResult = fillData.secondHopSource.handleCallResults(secondHop.returnData);
                    const gasUsed = (firstHopResult.gasUsed[0] || ZERO_AMOUNT).plus(
                        secondHopResult.gasUsed[0] || ZERO_AMOUNT,
                    );
                    return { gasUsed: [gasUsed], samples: [buyAmount] };
                },
            });
        });
        return this._createBatch(
            subOps,
            (result: MeasuredSamplerResult[]) => {
                return subOps.map((op, i) => {
                    return {
                        source: op.source,
                        output: result[i].samples[0],
                        input: buyAmount,
                        fillData: op.fillData,
                        gasUsed: result[i].gasUsed[0],
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
    ): MeasuredSourceQuoteOperation<ShellFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source,
            fillData: { poolAddress, gasUsed: [] },
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
    ): MeasuredSourceQuoteOperation<ShellFillData> {
        return new MeasuredSamplerContractOperation({
            source,
            fillData: { poolAddress, gasUsed: [] },
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
    ): MeasuredSourceQuoteOperation<DODOFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.Dodo,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromDODO,
            params: [opts, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): MeasuredSamplerResult => {
                const [isSellBase, pool, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[], BigNumber[]]
                >('sampleSellsFromDODO', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                fillData.helperAddress = opts.helper;
                return { gasUsed, samples };
            },
        });
    }

    public getDODOBuyQuotes(
        opts: { registry: string; helper: string },
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<DODOFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Dodo,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromDODO,
            params: [opts, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): MeasuredSamplerResult => {
                const [isSellBase, pool, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[], BigNumber[]]
                >('sampleBuysFromDODO', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                fillData.helperAddress = opts.helper;
                return { gasUsed, samples };
            },
        });
    }

    public getDODOV2SellQuotes(
        registry: string,
        offset: BigNumber,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<DODOFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
            source: ERC20BridgeSource.DodoV2,
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromDODOV2,
            params: [registry, offset, takerToken, makerToken, takerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): MeasuredSamplerResult => {
                const [isSellBase, pool, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[], BigNumber[]]
                >('sampleSellsFromDODOV2', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                return { gasUsed, samples };
            },
        });
    }

    public getDODOV2BuyQuotes(
        registry: string,
        offset: BigNumber,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<DODOFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.DodoV2,
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromDODOV2,
            params: [registry, offset, takerToken, makerToken, makerFillAmounts],
            callback: (callResults: string, fillData: DODOFillData): MeasuredSamplerResult => {
                const [isSellBase, pool, gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<
                    [boolean, string, BigNumber[], BigNumber[]]
                >('sampleSellsFromDODOV2', callResults);
                fillData.isSellBase = isSellBase;
                fillData.poolAddress = pool;
                return { gasUsed, samples };
            },
        });
    }

    public getMakerPsmSellQuotes(
        psmInfo: PsmInfo,
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<MakerPsmFillData> {
        return new MeasuredSamplerContractOperation({
            deregisterable: true,
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
    ): MeasuredSourceQuoteOperation<MakerPsmFillData> {
        return new MeasuredSamplerContractOperation({
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
    ): MeasuredSourceQuoteOperation<LidoFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Lido,
            fillData: {
                takerToken,
                stEthTokenAddress: lidoInfo.stEthToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleSellsFromLido,
            params: [lidoInfo.stEthToken, takerToken, makerToken, takerFillAmounts],
        });
    }

    public getLidoBuyQuotes(
        lidoInfo: LidoInfo,
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation<LidoFillData> {
        return new MeasuredSamplerContractOperation({
            source: ERC20BridgeSource.Lido,
            fillData: {
                takerToken,
                stEthTokenAddress: lidoInfo.stEthToken,
            },
            contract: this._samplerContract,
            function: this._samplerContract.sampleBuysFromLido,
            params: [lidoInfo.stEthToken, takerToken, makerToken, makerFillAmounts],
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
            (results: MeasuredSamplerResult[]) => {
                if (results.length === 0) {
                    return ZERO_AMOUNT;
                }
                const flatSortedSamples = results
                    .map(r => r.samples)
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

    public getSellQuotes(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        takerFillAmounts: BigNumber[],
    ): BatchedOperation<DexSample[][]> {
        const subOps = this._getSellQuoteOperations(sources, makerToken, takerToken, takerFillAmounts);
        return this._createBatch(
            subOps,
            (results: MeasuredSamplerResult[]) => {
                return subOps.map((op, i) => {
                    const dexSamples = results[i].samples.map((output, j) => ({
                        source: op.source,
                        output,
                        input: takerFillAmounts[j],
                        fillData: op.fillData,
                        gasUsed: results[i].gasUsed[j],
                    }));
                    return dexSamples;
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
            (results: MeasuredSamplerResult[]) => {
                return subOps.map((op, i) => {
                    return results[i].samples.map((output, j) => ({
                        source: op.source,
                        output,
                        input: makerFillAmounts[j],
                        fillData: op.fillData,
                        gasUsed: results[i].gasUsed[j],
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
    ): MeasuredSourceQuoteOperation[] {
        // Find the adjacent tokens in the provided tooken adjacency graph,
        // e.g if this is DAI->USDC we may check for DAI->WETH->USDC
        const intermediateTokens = getIntermediateTokens(makerToken, takerToken, tokenAdjacencyGraph);
        // Drop out MultiHop and Native as we do not query those here.
        const _sources = SELL_SOURCE_FILTER_BY_CHAIN_ID[this.chainId]
            .exclude([ERC20BridgeSource.MultiHop, ERC20BridgeSource.Native])
            .getAllowed(sources);
        const allOps = _.flatten(
            _sources.map((source): MeasuredSourceQuoteOperation | MeasuredSourceQuoteOperation[] => {
                if (isBadTokenForSource(makerToken, source) || isBadTokenForSource(takerToken, source)) {
                    return [];
                }
                switch (source) {
                    case ERC20BridgeSource.Eth2Dai:
                        return isValidAddress(OASIS_ROUTER_BY_CHAIN_ID[this.chainId])
                            ? this.getEth2DaiSellQuotes(
                                  OASIS_ROUTER_BY_CHAIN_ID[this.chainId],
                                  makerToken,
                                  takerToken,
                                  takerFillAmounts,
                              )
                            : [];
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
                    case ERC20BridgeSource.CafeSwap:
                    case ERC20BridgeSource.CheeseSwap:
                    case ERC20BridgeSource.JulSwap:
                    case ERC20BridgeSource.QuickSwap:
                    case ERC20BridgeSource.ComethSwap:
                    case ERC20BridgeSource.Dfyn:
                    case ERC20BridgeSource.WaultSwap:
                    case ERC20BridgeSource.Polydex:
                        const uniLikeRouter = uniswapV2LikeRouterAddress(this.chainId, source);
                        if (!isValidAddress(uniLikeRouter)) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            ...intermediateTokens.map(t => [takerToken, t, makerToken]),
                        ].map(path => this.getUniswapV2SellQuotes(uniLikeRouter, path, takerFillAmounts, source));
                    case ERC20BridgeSource.KyberDmm:
                        const kyberDmmRouter = KYBER_DMM_ROUTER_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(kyberDmmRouter)) {
                            return [];
                        }
                        return this.getKyberDmmSellQuotes(kyberDmmRouter, [takerToken, makerToken], takerFillAmounts);
                    case ERC20BridgeSource.Kyber:
                        return getKyberOffsets().map(offset =>
                            this.getKyberSellQuotes(
                                KYBER_CONFIG_BY_CHAIN_ID[this.chainId],
                                offset,
                                makerToken,
                                takerToken,
                                takerFillAmounts,
                            ),
                        );
                    case ERC20BridgeSource.Curve:
                    case ERC20BridgeSource.Swerve:
                    case ERC20BridgeSource.SnowSwap:
                    case ERC20BridgeSource.Nerve:
                    case ERC20BridgeSource.Belt:
                    case ERC20BridgeSource.Ellipsis:
                    case ERC20BridgeSource.Saddle:
                    case ERC20BridgeSource.XSigma:
                    case ERC20BridgeSource.FirebirdOneSwap:
                    case ERC20BridgeSource.Smoothy:
                        return getCurveLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getCurveSellQuotes(pool, makerToken, takerToken, takerFillAmounts, source),
                        );
                    case ERC20BridgeSource.CurveV2:
                        return getCurveLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getCurveV2SellQuotes(pool, makerToken, takerToken, takerFillAmounts, source),
                        );
                    case ERC20BridgeSource.Shell:
                    case ERC20BridgeSource.Component:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getShellSellQuotes(pool, makerToken, takerToken, takerFillAmounts, source),
                        );
                    case ERC20BridgeSource.LiquidityProvider:
                        return getLiquidityProvidersForPair(
                            this.liquidityProviderRegistry,
                            takerToken,
                            makerToken,
                        ).map(({ providerAddress, gasCost }) =>
                            this.getLiquidityProviderSellQuotes(
                                providerAddress,
                                makerToken,
                                takerToken,
                                takerFillAmounts,
                                gasCost,
                            ),
                        );
                    case ERC20BridgeSource.MStable:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getMStableSellQuotes(pool, makerToken, takerToken, takerFillAmounts),
                        );
                    case ERC20BridgeSource.Mooniswap:
                        return [
                            ...MOONISWAP_REGISTRIES_BY_CHAIN_ID[this.chainId]
                                .filter(r => isValidAddress(r))
                                .map(registry =>
                                    this.getMooniswapSellQuotes(registry, makerToken, takerToken, takerFillAmounts),
                                ),
                        ];
                    case ERC20BridgeSource.Balancer:
                        return (
                            this.poolsCaches[ERC20BridgeSource.Balancer].getCachedPoolAddressesForPair(
                                takerToken,
                                makerToken,
                            ) || []
                        ).map(poolAddress =>
                            this.getBalancerSellQuotes(
                                poolAddress,
                                makerToken,
                                takerToken,
                                takerFillAmounts,
                                ERC20BridgeSource.Balancer,
                            ),
                        );
                    case ERC20BridgeSource.BalancerV2:
                        const poolIds =
                            this.poolsCaches[ERC20BridgeSource.BalancerV2].getCachedPoolAddressesForPair(
                                takerToken,
                                makerToken,
                            ) || [];

                        const vault = BALANCER_V2_VAULT_ADDRESS_BY_CHAIN[this.chainId];
                        if (vault === NULL_ADDRESS) {
                            return [];
                        }
                        return poolIds.map(poolId =>
                            this.getBalancerV2SellQuotes(
                                { poolId, vault },
                                makerToken,
                                takerToken,
                                takerFillAmounts,
                                ERC20BridgeSource.BalancerV2,
                            ),
                        );

                    case ERC20BridgeSource.Cream:
                        return (
                            this.poolsCaches[ERC20BridgeSource.Cream].getCachedPoolAddressesForPair(
                                takerToken,
                                makerToken,
                            ) || []
                        ).map(poolAddress =>
                            this.getBalancerSellQuotes(
                                poolAddress,
                                makerToken,
                                takerToken,
                                takerFillAmounts,
                                ERC20BridgeSource.Cream,
                            ),
                        );
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
                                .filter(factory => isValidAddress(factory))
                                .map(factory =>
                                    getDodoV2Offsets().map(offset =>
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
                    case ERC20BridgeSource.Linkswap:
                        if (!isValidAddress(LINKSWAP_ROUTER_BY_CHAIN_ID[this.chainId])) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            ...getIntermediateTokens(makerToken, takerToken, {
                                default: [MAINNET_TOKENS.LINK, MAINNET_TOKENS.WETH],
                            }).map(t => [takerToken, t, makerToken]),
                        ].map(path =>
                            this.getUniswapV2SellQuotes(
                                LINKSWAP_ROUTER_BY_CHAIN_ID[this.chainId],
                                path,
                                takerFillAmounts,
                                ERC20BridgeSource.Linkswap,
                            ),
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
                            ...intermediateTokens.map(t => [takerToken, t, makerToken]),
                        ].map(path => this.getUniswapV3SellQuotes(router, quoter, path, takerFillAmounts));
                    }
                    case ERC20BridgeSource.Lido: {
                        const lidoInfo = LIDO_INFO_BY_CHAIN[this.chainId];
                        if (
                            lidoInfo.stEthToken === NULL_ADDRESS ||
                            lidoInfo.wethToken === NULL_ADDRESS ||
                            takerToken.toLowerCase() !== lidoInfo.wethToken.toLowerCase() ||
                            makerToken.toLowerCase() !== lidoInfo.stEthToken.toLowerCase()
                        ) {
                            return [];
                        }

                        return this.getLidoSellQuotes(lidoInfo, makerToken, takerToken, takerFillAmounts);
                    }
                    default:
                        throw new Error(`Unsupported sell sample source: ${source}`);
                }
            }),
        );
        const registeredOpts = allOps.filter(op => op.isDeregistered && !op.isDeregistered());
        return registeredOpts;
    }

    private _getBuyQuoteOperations(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        makerFillAmounts: BigNumber[],
    ): MeasuredSourceQuoteOperation[] {
        // Find the adjacent tokens in the provided tooken adjacency graph,
        // e.g if this is DAI->USDC we may check for DAI->WETH->USDC
        const intermediateTokens = getIntermediateTokens(makerToken, takerToken, this.tokenAdjacencyGraph);
        const _sources = BATCH_SOURCE_FILTERS.getAllowed(sources);
        return _.flatten(
            _sources.map((source): MeasuredSourceQuoteOperation | MeasuredSourceQuoteOperation[] => {
                switch (source) {
                    case ERC20BridgeSource.Eth2Dai:
                        return isValidAddress(OASIS_ROUTER_BY_CHAIN_ID[this.chainId])
                            ? this.getEth2DaiBuyQuotes(
                                  OASIS_ROUTER_BY_CHAIN_ID[this.chainId],
                                  makerToken,
                                  takerToken,
                                  makerFillAmounts,
                              )
                            : [];
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
                    case ERC20BridgeSource.CafeSwap:
                    case ERC20BridgeSource.CheeseSwap:
                    case ERC20BridgeSource.JulSwap:
                    case ERC20BridgeSource.QuickSwap:
                    case ERC20BridgeSource.ComethSwap:
                    case ERC20BridgeSource.Dfyn:
                    case ERC20BridgeSource.WaultSwap:
                    case ERC20BridgeSource.Polydex:
                        const uniLikeRouter = uniswapV2LikeRouterAddress(this.chainId, source);
                        if (!isValidAddress(uniLikeRouter)) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            ...intermediateTokens.map(t => [takerToken, t, makerToken]),
                        ].map(path => this.getUniswapV2BuyQuotes(uniLikeRouter, path, makerFillAmounts, source));
                    case ERC20BridgeSource.KyberDmm:
                        const kyberDmmRouter = KYBER_DMM_ROUTER_BY_CHAIN_ID[this.chainId];
                        if (!isValidAddress(kyberDmmRouter)) {
                            return [];
                        }
                        return this.getKyberDmmBuyQuotes(kyberDmmRouter, [takerToken, makerToken], makerFillAmounts);
                    case ERC20BridgeSource.Kyber:
                        return getKyberOffsets().map(offset =>
                            this.getKyberBuyQuotes(
                                KYBER_CONFIG_BY_CHAIN_ID[this.chainId],
                                offset,
                                makerToken,
                                takerToken,
                                makerFillAmounts,
                            ),
                        );
                    case ERC20BridgeSource.Curve:
                    case ERC20BridgeSource.Swerve:
                    case ERC20BridgeSource.SnowSwap:
                    case ERC20BridgeSource.Nerve:
                    case ERC20BridgeSource.Belt:
                    case ERC20BridgeSource.Ellipsis:
                    case ERC20BridgeSource.Saddle:
                    case ERC20BridgeSource.XSigma:
                    case ERC20BridgeSource.FirebirdOneSwap:
                    case ERC20BridgeSource.Smoothy:
                        return getCurveLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getCurveBuyQuotes(pool, takerToken, makerToken, makerFillAmounts, source),
                        );
                    case ERC20BridgeSource.CurveV2:
                        return getCurveLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getCurveV2BuyQuotes(pool, takerToken, makerToken, makerFillAmounts, source),
                        );
                    case ERC20BridgeSource.Shell:
                    case ERC20BridgeSource.Component:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getShellBuyQuotes(pool, makerToken, takerToken, makerFillAmounts, source),
                        );
                    case ERC20BridgeSource.LiquidityProvider:
                        return getLiquidityProvidersForPair(
                            this.liquidityProviderRegistry,
                            takerToken,
                            makerToken,
                        ).map(({ providerAddress, gasCost }) =>
                            this.getLiquidityProviderBuyQuotes(
                                providerAddress,
                                makerToken,
                                takerToken,
                                makerFillAmounts,
                                gasCost,
                            ),
                        );
                    case ERC20BridgeSource.MStable:
                        return getShellLikeInfosForPair(this.chainId, takerToken, makerToken, source).map(pool =>
                            this.getMStableBuyQuotes(pool, makerToken, takerToken, makerFillAmounts),
                        );
                    case ERC20BridgeSource.Mooniswap:
                        return [
                            ...MOONISWAP_REGISTRIES_BY_CHAIN_ID[this.chainId]
                                .filter(r => isValidAddress(r))
                                .map(registry =>
                                    this.getMooniswapBuyQuotes(registry, makerToken, takerToken, makerFillAmounts),
                                ),
                        ];
                    case ERC20BridgeSource.Balancer:
                        return (
                            this.poolsCaches[ERC20BridgeSource.Balancer].getCachedPoolAddressesForPair(
                                takerToken,
                                makerToken,
                            ) || []
                        ).map(poolAddress =>
                            this.getBalancerBuyQuotes(
                                poolAddress,
                                makerToken,
                                takerToken,
                                makerFillAmounts,
                                ERC20BridgeSource.Balancer,
                            ),
                        );
                    case ERC20BridgeSource.BalancerV2:
                        const poolIds =
                            this.poolsCaches[ERC20BridgeSource.BalancerV2].getCachedPoolAddressesForPair(
                                takerToken,
                                makerToken,
                            ) || [];

                        const vault = BALANCER_V2_VAULT_ADDRESS_BY_CHAIN[this.chainId];
                        if (vault === NULL_ADDRESS) {
                            return [];
                        }
                        return poolIds.map(poolId =>
                            this.getBalancerV2BuyQuotes(
                                { poolId, vault },
                                makerToken,
                                takerToken,
                                makerFillAmounts,
                                ERC20BridgeSource.BalancerV2,
                            ),
                        );
                    case ERC20BridgeSource.Cream:
                        return (
                            this.poolsCaches[ERC20BridgeSource.Cream].getCachedPoolAddressesForPair(
                                takerToken,
                                makerToken,
                            ) || []
                        ).map(poolAddress =>
                            this.getBalancerBuyQuotes(
                                poolAddress,
                                makerToken,
                                takerToken,
                                makerFillAmounts,
                                ERC20BridgeSource.Cream,
                            ),
                        );
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
                                .filter(factory => isValidAddress(factory))
                                .map(factory =>
                                    getDodoV2Offsets().map(offset =>
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
                    case ERC20BridgeSource.Linkswap:
                        if (!isValidAddress(LINKSWAP_ROUTER_BY_CHAIN_ID[this.chainId])) {
                            return [];
                        }
                        return [
                            [takerToken, makerToken],
                            // LINK is the base asset in many of the pools on Linkswap
                            ...getIntermediateTokens(makerToken, takerToken, {
                                default: [MAINNET_TOKENS.LINK, MAINNET_TOKENS.WETH],
                            }).map(t => [takerToken, t, makerToken]),
                        ].map(path =>
                            this.getUniswapV2BuyQuotes(
                                LINKSWAP_ROUTER_BY_CHAIN_ID[this.chainId],
                                path,
                                makerFillAmounts,
                                ERC20BridgeSource.Linkswap,
                            ),
                        );
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
                            ...intermediateTokens.map(t => [takerToken, t, makerToken]),
                        ].map(path => this.getUniswapV3BuyQuotes(router, quoter, path, makerFillAmounts));
                    }
                    case ERC20BridgeSource.Lido: {
                        const lidoInfo = LIDO_INFO_BY_CHAIN[this.chainId];

                        if (
                            lidoInfo.stEthToken === NULL_ADDRESS ||
                            lidoInfo.wethToken === NULL_ADDRESS ||
                            takerToken.toLowerCase() !== lidoInfo.wethToken.toLowerCase() ||
                            makerToken.toLowerCase() !== lidoInfo.stEthToken.toLowerCase()
                        ) {
                            return [];
                        }

                        return this.getLidoBuyQuotes(lidoInfo, makerToken, takerToken, makerFillAmounts);
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
