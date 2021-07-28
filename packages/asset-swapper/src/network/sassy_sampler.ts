import { BigNumber } from '@0x/utils';

import { constants } from '../constants';

import { Chain } from './chain';
import {
    BalancerSampler,
    BalancerV2Sampler,
    BancorSampler,
    CurveSampler,
    DodoV1Sampler,
    DodoV2Sampler,
    KyberDmmSampler,
    KyberSampler,
    LidoSampler,
    LiquidityProviderRegistry,
    LiquidityProviderSampler,
    MakerPsmSampler,
    MooniswapSampler,
    MStableSampler,
    OasisSampler,
    ShellSampler,
    SmoothySampler,
    UniswapV1Sampler,
    UniswapV2Sampler,
    UniswapV3Sampler,
} from './samplers';
import { SourceFilters } from './source_filters';
import { DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID } from './tokens';
import { TwoHopFillData, TwoHopSampler } from './two_hop_sampler';
import { Address, DexSample, ERC20BridgeSource, SourceSampler, SourceSamplerMap, TokenAdjacencyGraph } from './types';

const { ZERO_AMOUNT } = constants;

interface SassySamplerCreateFullOpts {
    chain: Chain;
    sources: ERC20BridgeSource[];
    tokenAdjacencyGraph: TokenAdjacencyGraph;
    liquidityProviderRegistry?: LiquidityProviderRegistry;
    maxPriceCacheAgeMs?: number;
}

type SassySamplerCreateOpts = Partial<SassySamplerCreateFullOpts> & { chain: Chain };

const DEFAULT_SOURCES = SourceFilters.all().exclude([ERC20BridgeSource.Native, ERC20BridgeSource.MultiHop]).sources;

export class SassySampler {
    public readonly availableSources: ERC20BridgeSource[];
    private readonly _priceCache: { [pairId: string]: { cacheTime: number; value: BigNumber } } = {};

    public static async createAsync(opts: SassySamplerCreateOpts): Promise<SassySampler> {
        const sources = opts.sources || DEFAULT_SOURCES;
        const samplers = Object.assign(
            {},
            ...(await Promise.all(sources.map(async s => createSourceSamplerAsync(s, opts)))).map((sampler, i) => ({
                [sources[i]]: sampler,
            })),
        );
        const twoHopSampler = await TwoHopSampler.createAsync(opts.chain, samplers);
        return new SassySampler(
            opts.chain,
            samplers,
            opts.tokenAdjacencyGraph || DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID[opts.chain.chainId],
            twoHopSampler,
            opts.maxPriceCacheAgeMs || 10e3,
        );
    }

    protected constructor(
        public readonly chain: Chain,
        private readonly _samplers: SourceSamplerMap,
        private readonly _tokenAdjacencyGraph: TokenAdjacencyGraph,
        private readonly _twoHopSampler: TwoHopSampler,
        private readonly _maxPriceCacheAgeMs: number,
    ) {
        this.availableSources = Object.keys(_samplers) as ERC20BridgeSource[];
    }

    public async getMedianSellRateAsync(
        sources: ERC20BridgeSource[],
        takerToken: Address,
        makerToken: Address,
        takerAmount: BigNumber,
    ): Promise<BigNumber> {
        if (takerToken.toLowerCase() === makerToken.toLowerCase()) {
            return new BigNumber(1);
        }
        if (takerAmount.eq(0)) {
            return ZERO_AMOUNT;
        }
        const cacheId = `${takerToken}/${makerToken}/${takerAmount.toString(10)}/${sources.join(',')}`;
        const cachedPrice = (this._priceCache[cacheId] = this._priceCache[cacheId] || {
            cacheTime: 0,
            value: ZERO_AMOUNT,
        });
        if (Date.now() - cachedPrice.cacheTime < this._maxPriceCacheAgeMs) {
            return cachedPrice.value;
        }
        let samples;
        try {
            samples = (
                await Promise.all(
                    sources.map(async s =>
                        this._sampleSellsFromSourceAsync(s, [takerToken, makerToken], [takerAmount]),
                    ),
                )
            ).flat(1);
        } catch {}
        cachedPrice.cacheTime = Date.now();
        if (!samples || samples.length === 0) {
            return (cachedPrice.value = ZERO_AMOUNT);
        }
        const flatSortedSamples = samples
            .flat(1)
            .map(v => v.output)
            .sort((a, b) => a.comparedTo(b));
        if (flatSortedSamples.length === 0) {
            return (cachedPrice.value = ZERO_AMOUNT);
        }
        const medianSample = flatSortedSamples[Math.floor(flatSortedSamples.length / 2)];
        return (cachedPrice.value = medianSample.div(takerAmount));
    }

    public async getSellSamplesAsync(
        sources: ERC20BridgeSource[],
        takerToken: Address,
        makerToken: Address,
        takerAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        if (takerAmounts.every(a => a.eq(0))) {
            return [];
        }
        const tokenPaths = this._getExpandedTokenPaths(takerToken, makerToken);
        return (
            await Promise.all(
                sources.map(async s =>
                    Promise.all(tokenPaths.map(async p => this._sampleSellsFromSourceAsync(s, p, takerAmounts))),
                ),
            )
        ).flat(2);
    }

    public async getBuySamplesAsync(
        sources: ERC20BridgeSource[],
        takerToken: Address,
        makerToken: Address,
        makerAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        if (makerAmounts.every(a => a.eq(0))) {
            return [];
        }
        const tokenPaths = this._getExpandedTokenPaths(takerToken, makerToken);
        return (
            await Promise.all(
                sources.map(async s =>
                    Promise.all(tokenPaths.map(async p => this._sampleBuysFromSourceAsync(s, p, makerAmounts))),
                ),
            )
        ).flat(2);
    }

    public async getTwoHopSellSamplesAsync(
        sources: ERC20BridgeSource[],
        takerToken: Address,
        makerToken: Address,
        takerAmount: BigNumber,
    ): Promise<Array<DexSample<TwoHopFillData>>> {

        if (takerAmount.eq(0)) {
            return [];
        }
        const tokenPaths = this._getTwoHopTokenPaths(takerToken, makerToken);
        const hopResults = await Promise.all(
            tokenPaths.map(async tokenPath =>
                this._twoHopSampler.getTwoHopSellSampleAsync(sources, tokenPath, takerAmount),
            ),
        );
        return hopResults.filter(h => !!h) as Array<DexSample<TwoHopFillData>>;
    }

    public async getTwoHopBuySamplesAsync(
        sources: ERC20BridgeSource[],
        takerToken: Address,
        makerToken: Address,
        makerAmount: BigNumber,
    ): Promise<Array<DexSample<TwoHopFillData>>> {
        if (makerAmount.eq(0)) {
            return [];
        }
        const tokenPaths = this._getTwoHopTokenPaths(takerToken, makerToken);
        const hopResults = await Promise.all(
            tokenPaths.map(async tokenPath =>
                this._twoHopSampler.getTwoHopBuySampleAsync(sources, tokenPath, makerAmount),
            ),
        );
        return hopResults.filter(h => !!h) as Array<DexSample<TwoHopFillData>>;
    }

    private async _sampleSellsFromSourceAsync(
        source: ERC20BridgeSource,
        tokenPath: Address[],
        takerAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        if (takerAmounts.every(t => t.lte(0))) {
            return [];
        }
        const sampler = this._findSampler(source);
        if (!sampler) {
            return [];
        }
        let samples: DexSample[][] = [];
        try {
            samples = (await sampler.getSellSamplesAsync(tokenPath, takerAmounts)).filter(s => !!s.length);
        } catch (err) {
            // tslint:disable-next-line: no-console
            console.error(`Failed to fetch sell samples for ${source} (${tokenPath.join('->')}): ${err.message}`);
        }
        return samples;
    }

    private async _sampleBuysFromSourceAsync(
        source: ERC20BridgeSource,
        tokenPath: Address[],
        takerAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        if (takerAmounts.every(t => t.lte(0))) {
            return [];
        }
        const sampler = this._findSampler(source);
        if (!sampler) {
            return [];
        }
        let samples: DexSample[][] = [];
        try {
            samples = (await sampler.getBuySamplesAsync(tokenPath, takerAmounts)).filter(s => !!s.length);
        } catch (err) {
            // tslint:disable-next-line: no-console
            console.error(`Failed to fetch sell samples for ${source} (${tokenPath.join('->')}: ${err.message}`);
        }
        return samples;
    }

    private _getExpandedTokenPaths(takerToken: Address, makerToken: Address): Address[][] {
        return [
            // A -> B
            [takerToken, makerToken],
            // A -> C -> B
            ...this._getTwoHopTokenPaths(takerToken, makerToken),
        ].map(p => p.map(a => a.toLowerCase()));
    }

    private _getTwoHopTokenPaths(takerToken: Address, makerToken: Address): Address[][] {
        return this._getIntermediateTokens(takerToken, makerToken).map(t => [takerToken, t, makerToken]);
    }

    private _getIntermediateTokens(takerToken: Address, makerToken: Address): Address[] {
        return getIntermediateTokens(takerToken, makerToken, this._tokenAdjacencyGraph);
    }

    private _findSampler(source: ERC20BridgeSource): SourceSampler | undefined {
        return this._samplers[source];
    }
}

interface CreateSourceSamplerOpts {
    chain: Chain;
    liquidityProviderRegistry?: LiquidityProviderRegistry;
}

async function createSourceSamplerAsync(
    source: ERC20BridgeSource,
    opts: CreateSourceSamplerOpts,
): Promise<SourceSampler> {
    const { chain } = opts;
    switch (source) {
        default:
            break;
        case ERC20BridgeSource.Balancer:
        case ERC20BridgeSource.Cream:
            return BalancerSampler.createAsync(chain, source);
        case ERC20BridgeSource.BalancerV2:
            return BalancerV2Sampler.createAsync(chain);
        case ERC20BridgeSource.Bancor:
            return BancorSampler.createAsync(chain);
        case ERC20BridgeSource.Curve:
        case ERC20BridgeSource.Swerve:
        case ERC20BridgeSource.SnowSwap:
        case ERC20BridgeSource.Nerve:
        case ERC20BridgeSource.Belt:
        case ERC20BridgeSource.Ellipsis:
        case ERC20BridgeSource.Saddle:
        case ERC20BridgeSource.XSigma:
        case ERC20BridgeSource.CurveV2:
        case ERC20BridgeSource.FirebirdOneSwap:
        case ERC20BridgeSource.IronSwap:
        case ERC20BridgeSource.ACryptos:
            return CurveSampler.createAsync(chain, source);
        case ERC20BridgeSource.Dodo:
            return DodoV1Sampler.createAsync(chain);
        case ERC20BridgeSource.DodoV2:
            return DodoV2Sampler.createAsync(chain);
        case ERC20BridgeSource.KyberDmm:
            return KyberDmmSampler.createAsync(chain);
        case ERC20BridgeSource.Kyber:
            return KyberSampler.createAsync(chain);
        case ERC20BridgeSource.Lido:
            return LidoSampler.createAsync(chain);
        case ERC20BridgeSource.LiquidityProvider:
            return LiquidityProviderSampler.createAsync(chain, opts.liquidityProviderRegistry);
        case ERC20BridgeSource.MakerPsm:
            return MakerPsmSampler.createAsync(chain);
        case ERC20BridgeSource.Mooniswap:
            return MooniswapSampler.createAsync(chain);
        case ERC20BridgeSource.MStable:
            return MStableSampler.createAsync(chain);
        case ERC20BridgeSource.Eth2Dai:
            return OasisSampler.createAsync(chain);
        case ERC20BridgeSource.Shell:
        case ERC20BridgeSource.Component:
            return ShellSampler.createAsync(chain, source);
        case ERC20BridgeSource.Smoothy:
            return SmoothySampler.createAsync(chain, source);
        case ERC20BridgeSource.Uniswap:
            return UniswapV1Sampler.createAsync(chain);
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
        case ERC20BridgeSource.Linkswap:
        case ERC20BridgeSource.WaultSwap:
        case ERC20BridgeSource.Polydex:
        case ERC20BridgeSource.ShibaSwap:
        case ERC20BridgeSource.JetSwap:
            return UniswapV2Sampler.createAsync(chain, source);
        case ERC20BridgeSource.UniswapV3:
            return UniswapV3Sampler.createAsync(chain);
    }
    throw new Error(`I don't know how to create sampler for source: ${source}`);
}

function getIntermediateTokens(
    takerToken: Address,
    makerToken: Address,
    tokenAdjacencyGraph: TokenAdjacencyGraph,
): Address[] {
    const tokens = [takerToken, makerToken].map(t => t.toLowerCase());
    const takerIntermediateTokens = tokenAdjacencyGraph[tokens[0]] || tokenAdjacencyGraph.default;
    const makerIntermediateTokens = tokenAdjacencyGraph[tokens[1]] || tokenAdjacencyGraph.default;
    // Filter intermediate tokens common to both.
    const intermediateTokens = takerIntermediateTokens.filter(t => makerIntermediateTokens.includes(t));
    // Select unique ones that aren't the maker or taker token.
    return [...new Set(intermediateTokens)].filter(t => !tokens.includes(t));
}
