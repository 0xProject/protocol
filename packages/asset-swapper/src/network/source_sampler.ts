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
}

export interface SamplerEthCall<
    TFillData,
    TSamplerFunction extends ContractFunction<TParams, TReturn>,
    TParams extends any[] = Parameters<TSamplerFunction>,
    TReturn = UnwrapContractFunctionReturnType<ReturnType<TSamplerFunction>>
> {
    args: Parameters<TSamplerFunction>;
    getDexSamplesFromResult(result: TReturn): Array<DexSample<TFillData>>;
}

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
    }

    public canConvertTokens(_tokenAddressPath: Address[]): boolean {
        return true;
    }

    public async getSellSamplesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const calls = await this._getSellQuoteCallsAsync(tokenAddressPath, takerFillAmounts);
        return Promise.all(
            calls.map(async c =>
                c
                    .getDexSamplesFromResult(
                        await this._sellContractHelper.ethCallAsync(this._sellContractFunction, c.args),
                    )
                    .filter(s => s.output),
            ),
        );
    }

    public async getBuySamplesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const calls = await this._getBuyQuoteCallsAsync(tokenAddressPath, makerFillAmounts);
        return Promise.all(
            calls.map(async c =>
                c
                    .getDexSamplesFromResult(
                        await this._buyContractHelper.ethCallAsync(this._buyContractFunction, c.args),
                    )
                    .filter(s => s.output),
            ),
        );
    }

    public async getMultiHopSellCallInfosAsync(
        tokenAddressPath: Address[],
        takerFillAmount: BigNumber,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): Promise<MultiHopCallInfo[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
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
                    callOpts,
                ),
            );
    }

    public async getMultiHopBuyCallInfosAsync(
        tokenAddressPath: Address[],
        makerFillAmount: BigNumber,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): Promise<MultiHopCallInfo[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
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
                    callOpts,
                ),
            );
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
        overrides: c.overrides || {},
        resultHandler: resultData => resultHandler(helper.decodeCallResult(fn, resultData)),
    };
}
