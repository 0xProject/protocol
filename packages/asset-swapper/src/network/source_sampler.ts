import { BigNumber } from '@0x/utils';

import { Chain, ChainEthCallOpts } from './chain';
import { Address, DexSample, FillData, MultiHopCallInfo, SourceSampler } from './types';
import {
    ContractFunction,
    ContractHelper,
    ContractWrapperType,
    createContractWrapperAndHelper,
    GeneratedContract,
    UnwrapContractFunctionReturnType,
} from './utils';

export abstract class SourceSamplerBase implements SourceSampler {
    protected constructor() {}

    public canConvertTokens(_tokenAddressPath: Address[]): boolean {
        return true;
    }

    public abstract getSellSamplesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]>;

    public abstract getBuySamplesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]>;

    public abstract getMultiHopSellCallInfosAsync(
        tokenAddressPath: Address[],
        takerFillAmount: BigNumber,
    ): Promise<MultiHopCallInfo[]>;

    public abstract getMultiHopBuyCallInfosAsync(
        tokenAddressPath: Address[],
        makerFillAmount: BigNumber,
    ): Promise<MultiHopCallInfo[]>;

    public abstract pump(tokenAddressPath: Address[]): void;
    public abstract dump(tokenAddressPath: Address[]): void;
}

interface OnChainSourceSamplerOptions<
    TSellSamplerContract extends GeneratedContract,
    TBuySamplerContract extends GeneratedContract,
    TSellSamplerFunctionName = keyof TSellSamplerContract,
    TBuySamplerFunctionName = keyof TBuySamplerContract
> {
    chain: Chain;
    sellSamplerContractArtifactName?: string;
    buySamplerContractArtifactName?: string;
    sellSamplerContractType: ContractWrapperType<TSellSamplerContract>;
    buySamplerContractType: ContractWrapperType<TBuySamplerContract>;
    sellContractSellFunctionName: TSellSamplerFunctionName;
    buyContractBuyFunctionName: TBuySamplerFunctionName;
    maxCacheAgeMs?: number;
}

export interface SamplerEthCall<
    TFillData,
    TSamplerFunction extends ContractFunction<TParams, TReturn>,
    TParams extends any[] = Parameters<TSamplerFunction>,
    TReturn = UnwrapContractFunctionReturnType<ReturnType<TSamplerFunction>>
> {
    args: Parameters<TSamplerFunction>;
    gas?: number;
    getDexSamplesFromResult(result: TReturn): Array<DexSample<TFillData>>;
}

interface LiquidtyScore {
    lastTouchedBlock: number;
    chance: number;
}

const DEFAULT_MAX_CACHE_AGE_MS = 12e3;

// Base class for a standard sampler with on-chain quote functions.
export abstract class OnChainSourceSampler<
    TSellSamplerContract extends GeneratedContract,
    TBuySamplerContract extends GeneratedContract,
    TSellSamplerFunction extends ContractFunction<TSellSamplerFunctionArgs, TSellSamplerFunctionReturn>,
    TBuySamplerFunction extends ContractFunction<TBuySamplerFunctionArgs, TBuySamplerFunctionReturn>,
    TFillData extends FillData,
    TSellSamplerFunctionName extends keyof TSellSamplerContract = keyof TSellSamplerContract,
    TBuySamplerFunctionName extends keyof TBuySamplerContract = keyof TBuySamplerContract,
    TSellSamplerFunctionArgs extends any[] = Parameters<TSellSamplerFunction>,
    TBuySamplerFunctionArgs extends any[] = Parameters<TBuySamplerFunction>,
    TSellSamplerFunctionReturn = UnwrapContractFunctionReturnType<ReturnType<TSellSamplerFunction>>,
    TBuySamplerFunctionReturn = UnwrapContractFunctionReturnType<ReturnType<TBuySamplerFunction>>,
    TOpts extends OnChainSourceSamplerOptions<
        TSellSamplerContract,
        TBuySamplerContract,
        TSellSamplerFunctionName,
        TBuySamplerFunctionName
    > = OnChainSourceSamplerOptions<
        TSellSamplerContract,
        TBuySamplerContract,
        TSellSamplerFunctionName,
        TBuySamplerFunctionName
    >
> extends SourceSamplerBase {
    protected readonly _chain: Chain;
    protected readonly _sellContract: TSellSamplerContract;
    protected readonly _buyContract: TBuySamplerContract;
    protected readonly _sellContractHelper: ContractHelper<TSellSamplerContract>;
    protected readonly _buyContractHelper: ContractHelper<TBuySamplerContract>;
    protected readonly _sellContractFunction: ContractFunction<TSellSamplerFunctionArgs, TSellSamplerFunctionReturn>;
    protected readonly _buyContractFunction: ContractFunction<TBuySamplerFunctionArgs, TBuySamplerFunctionReturn>;
    protected readonly _maxCacheAgeMs: number;
    protected readonly _liquidityScores: { [tokenPathId: string]: LiquidtyScore | undefined } = {};

    protected constructor(opts: TOpts) {
        super();
        this._chain = opts.chain;
        [this._sellContract, this._sellContractHelper] = createContractWrapperAndHelper(
            opts.chain,
            opts.sellSamplerContractType,
            opts.sellSamplerContractType.contractName || opts.sellSamplerContractArtifactName!,
        );
        [this._buyContract, this._buyContractHelper] = createContractWrapperAndHelper(
            opts.chain,
            opts.buySamplerContractType,
            opts.buySamplerContractType.contractName || opts.buySamplerContractArtifactName!,
        );
        // HACK: Is there a way to restrict `TSellSamplerContract[TSellSamplerFunctionName] = TSellSamplerFunction`?
        this._sellContractFunction = (this._sellContract[
            opts.sellContractSellFunctionName
        ] as any) as TSellSamplerFunction;
        this._buyContractFunction = (this._buyContract[opts.buyContractBuyFunctionName] as any) as TBuySamplerFunction;
        this._maxCacheAgeMs = opts.maxCacheAgeMs === undefined ? DEFAULT_MAX_CACHE_AGE_MS : opts.maxCacheAgeMs;
        // Heal liquidity scores by 1% every 10 seconds.
        setInterval(() => this._healLiquidityScores(0.01), 10e3);
    }

    public canConvertTokens(_tokenAddressPath: Address[]): boolean {
        return true;
    }

    public async getSellSamplesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        const tokenPathId = getTokenPathId(tokenAddressPath);
        if (!this.canConvertTokens(tokenAddressPath) || !this._isLuckyForPath(tokenPathId)) {
            return [];
        }
        const calls = await this._getSellQuoteCallsAsync(tokenAddressPath, takerFillAmounts);
        let samples: DexSample[][] = [];
        try {
            samples = await Promise.all(
                calls.map(async c =>
                    c
                        .getDexSamplesFromResult(
                            await this._sellContractHelper.ethCallAsync(this._sellContractFunction, c.args, {
                                gas: c.gas,
                                maxCacheAgeMs: this._maxCacheAgeMs,
                            }),
                        )
                        .filter(s => s.output),
                ),
            );
        } catch (err) {
            // Only allow reverts to be scored.
            if (!err.message.includes('reverted')) {
                return [];
            }
        }
        this._scoreLiquidity(tokenPathId, samples);
        return samples;
    }

    public async getBuySamplesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        const tokenPathId = getTokenPathId(tokenAddressPath);
        if (!this.canConvertTokens(tokenAddressPath) || !this._isLuckyForPath(tokenPathId)) {
            return [];
        }
        const calls = await this._getBuyQuoteCallsAsync(tokenAddressPath, makerFillAmounts);
        let samples: DexSample[][] = [];
        try {
            samples = await Promise.all(
                calls.map(async c =>
                    c
                        .getDexSamplesFromResult(
                            await this._buyContractHelper.ethCallAsync(this._buyContractFunction, c.args, {
                                gas: c.gas,
                                maxCacheAgeMs: this._maxCacheAgeMs,
                            }),
                        )
                        .filter(s => s.output),
                ),
            );
        } catch (err) {
            // Only allow reverts to be scored.
            if (!err.message.includes('reverted')) {
                return [];
            }
        }
        this._scoreLiquidity(tokenPathId, samples);
        return samples;
    }

    public async getMultiHopSellCallInfosAsync(
        tokenAddressPath: Address[],
        takerFillAmount: BigNumber,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): Promise<MultiHopCallInfo[]> {
        const tokenPathId = getTokenPathId(tokenAddressPath);
        if (!this.canConvertTokens(tokenAddressPath) || !this._isLuckyForPath(tokenPathId)) {
            return [];
        }
        const calls = await this._getSellQuoteCallsAsync(tokenAddressPath, [takerFillAmount]);
        return calls
            .flat(1)
            .map(c =>
                createMultiHopCallInfo(
                    this._sellContractHelper,
                    this._sellContractFunction,
                    c.args,
                    (...args) => c.getDexSamplesFromResult(...args)[0],
                    { ...callOpts, gas: c.gas },
                ),
            );
    }

    public async getMultiHopBuyCallInfosAsync(
        tokenAddressPath: Address[],
        makerFillAmount: BigNumber,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): Promise<MultiHopCallInfo[]> {
        const tokenPathId = getTokenPathId(tokenAddressPath);
        if (!this.canConvertTokens(tokenAddressPath) || !this._isLuckyForPath(tokenPathId)) {
            return [];
        }
        const calls = await this._getBuyQuoteCallsAsync(tokenAddressPath, [makerFillAmount]);
        return calls
            .flat(1)
            .map(c =>
                createMultiHopCallInfo(
                    this._buyContractHelper,
                    this._buyContractFunction,
                    c.args,
                    (...args) => c.getDexSamplesFromResult(...args)[0],
                    { ...callOpts, gas: c.gas },
                ),
            );
    }

    public pump(tokenPathOrId: Address[] | string): void {
        const tokenPathId = typeof tokenPathOrId === 'string' ? tokenPathOrId : getTokenPathId(tokenPathOrId);
        const ls = this._getLiquidityScoreByPathId(tokenPathId);
        if (ls.lastTouchedBlock === this._chain.blockNumber) {
            // Only pump or dump once per block.
            return;
        }
        // Restore to 100%.
        ls.lastTouchedBlock = this._chain.blockNumber;
        ls.chance = 1;
    }

    public dump(tokenPathOrId: Address[] | string): void {
        const tokenPathId = typeof tokenPathOrId === 'string' ? tokenPathOrId : getTokenPathId(tokenPathOrId);
        const ls = this._getLiquidityScoreByPathId(tokenPathId);
        if (ls.lastTouchedBlock === this._chain.blockNumber) {
            // Only pump or dump once per block.
            return;
        }
        // Half the current score.
        // Lowest it can go is 5%.
        ls.lastTouchedBlock = this._chain.blockNumber;
        ls.chance = Math.max(ls.chance / 2, 0.05);
    }

    protected abstract _getSellQuoteCallsAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<
        Array<SamplerEthCall<TFillData, ContractFunction<TSellSamplerFunctionArgs, TSellSamplerFunctionReturn>>>
    >;

    protected abstract _getBuyQuoteCallsAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<Array<SamplerEthCall<TFillData, ContractFunction<TBuySamplerFunctionArgs, TBuySamplerFunctionReturn>>>>;

    protected _isLuckyForPath(tokenPathOrId: Address[] | string): boolean {
        const tokenPathId = typeof tokenPathOrId === 'string' ? tokenPathOrId : getTokenPathId(tokenPathOrId);
        const ls = this._getLiquidityScoreByPathId(tokenPathId);
        return Math.random() < ls.chance;
    }

    private _healLiquidityScores(healAmount: number): void {
        for (const pathId in this._liquidityScores) {
            const ls = this._liquidityScores[pathId]!;
            ls.chance = Math.min(ls?.chance || 1 + healAmount, 1);
        }
    }

    private _getLiquidityScoreByPathId(pathId: string): LiquidtyScore {
        return (this._liquidityScores[pathId] = this._liquidityScores[pathId] || {
            lastTouchedBlock: 0,
            chance: 1.0,
        });
    }

    private _scoreLiquidity(tokenPathId: string, samples: DexSample[][]): void {
        if (areSamplesEmpty(samples)) {
            this.dump(tokenPathId);
        } else {
            this.pump(tokenPathId);
        }
    }
}

function getTokenPathId(tokenPath: Address[]): string {
    return tokenPath.join(':');
}

function areSamplesEmpty(samples: DexSample[][]): boolean {
    return samples.every(s => s.every(ss => ss.output.eq(0)));
}

function createMultiHopCallInfo<TContract extends GeneratedContract, TArgs extends any[], TReturn, TFillData>(
    helper: ContractHelper<TContract>,
    fn: ContractFunction<TArgs, TReturn>,
    args: TArgs,
    resultHandler: (result: TReturn) => DexSample<TFillData>,
    callOpts: Partial<ChainEthCallOpts> = {},
): MultiHopCallInfo {
    const c = helper.encodeCall(fn, args, callOpts);
    return {
        quoterData: c.data,
        quoterTarget: c.to,
        gas: c.gas,
        overrides: c.overrides || {},
        resultHandler: resultData => resultHandler(helper.decodeCallResult(fn, resultData)),
    };
}
