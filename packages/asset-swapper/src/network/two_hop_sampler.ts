import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../wrappers';

import { Chain } from './chain';
import { MAX_UINT256, ZERO_AMOUNT } from './constants';
import {
    Address,
    DexSample,
    ERC20BridgeSource,
    FillData,
    MultiHopCallInfo,
    SourceSampler,
    SourceSamplerMap,
} from './types';
import { ContractHelper, createContractWrapperAndHelper } from './utils';

export interface TwoHopFillData extends FillData {
    firstHop: DexSample;
    secondHop: DexSample;
    intermediateToken: Address;
}

export class TwoHopSampler {
    protected readonly _sellContract: ERC20BridgeSamplerContract;
    protected readonly _buyContract: ERC20BridgeSamplerContract;
    protected readonly _sellContractHelper: ContractHelper<ERC20BridgeSamplerContract>;
    protected readonly _buyContractHelper: ContractHelper<ERC20BridgeSamplerContract>;

    public static async createAsync(chain: Chain, subSamplers: SourceSamplerMap): Promise<TwoHopSampler> {
        return new TwoHopSampler(chain, subSamplers);
    }

    protected constructor(public readonly chain: Chain, private readonly _samplers: SourceSamplerMap) {
        [this._sellContract, this._sellContractHelper] = createContractWrapperAndHelper(
            this.chain,
            ERC20BridgeSamplerContract,
            'ERC20BridgeSampler',
        );
        [this._buyContract, this._buyContractHelper] = createContractWrapperAndHelper(
            this.chain,
            ERC20BridgeSamplerContract,
            'ERC20BridgeSampler',
        );
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        return tokenAddressPath.length === 3;
    }

    public async getTwoHopSellSampleAsync(
        sources: ERC20BridgeSource[],
        tokenAddressPath: Address[],
        takerFillAmount: BigNumber,
    ): Promise<DexSample<TwoHopFillData> | null> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return null;
        }
        const [firstHopPath, secondHopPath] = [tokenAddressPath.slice(0, 2), tokenAddressPath.slice(1)];
        const firstHopCalls = await this._getMultiHopSellCallInfosAsync(sources, firstHopPath);
        const secondHopCalls = await this._getMultiHopSellCallInfosAsync(sources, secondHopPath);

        const result = await this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleTwoHopSell,
            [
                firstHopCalls.map(c => ({
                    data: c.quoterData,
                    to: c.quoterTarget,
                })),
                secondHopCalls.map(c => ({
                    data: c.quoterData,
                    to: c.quoterTarget,
                })),
                takerFillAmount,
            ],
            {
                overrides: {
                    ...Object.assign({}, ...[...firstHopCalls, ...secondHopCalls].map(c => c.overrides)),
                },
            },
        );

        if (result.outputAmount.eq(0)) {
            return null;
        }

        const firstHop = firstHopCalls[result.firstHopIndex.toNumber()].resultHandler(result.firstHopResult);
        const secondHop = secondHopCalls[result.secondHopIndex.toNumber()].resultHandler(result.secondHopResult);
        if (!firstHop || !secondHop) {
            return null;
        }

        return {
            fillData: {
                firstHop,
                secondHop,
                intermediateToken: tokenAddressPath[1],
            },
            input: takerFillAmount,
            output: result.outputAmount,
            source: ERC20BridgeSource.MultiHop,
        };
    }

    public async getTwoHopBuySampleAsync(
        sources: ERC20BridgeSource[],
        tokenAddressPath: Address[],
        makerFillAmount: BigNumber,
    ): Promise<DexSample<TwoHopFillData> | null> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return null;
        }
        const [firstHopPath, secondHopPath] = [tokenAddressPath.slice(0, 2), tokenAddressPath.slice(1)];
        const firstHopCalls = await this._getMultiHopBuyCallInfosAsync(sources, firstHopPath);
        const secondHopCalls = await this._getMultiHopBuyCallInfosAsync(sources, secondHopPath);

        const result = await this._buyContractHelper.ethCallAsync(
            this._buyContract.sampleTwoHopBuy,
            [
                firstHopCalls.map(c => ({
                    data: c.quoterData,
                    to: c.quoterTarget,
                })),
                secondHopCalls.map(c => ({
                    data: c.quoterData,
                    to: c.quoterTarget,
                })),
                makerFillAmount,
            ],
            {
                overrides: {
                    ...Object.assign({}, ...[...firstHopCalls, ...secondHopCalls].map(c => c.overrides)),
                },
            },
        );

        if (result.outputAmount.eq(MAX_UINT256)) {
            return null;
        }

        return {
            fillData: {
                firstHop: firstHopCalls[result.firstHopIndex.toNumber()].resultHandler(result.firstHopResult),
                secondHop: secondHopCalls[result.secondHopIndex.toNumber()].resultHandler(result.secondHopResult),
                intermediateToken: tokenAddressPath[1],
            },
            input: makerFillAmount,
            output: result.outputAmount,
            source: ERC20BridgeSource.MultiHop,
        };
    }

    private async _getMultiHopSellCallInfosAsync(
        sources: ERC20BridgeSource[],
        tokenAddressPath: Address[],
    ): Promise<MultiHopCallInfo[]> {
        const samplers = this._getEligibleSamplers(sources);
        return (
            await Promise.all(samplers.map(async s => s.getMultiHopSellCallInfosAsync(tokenAddressPath, ZERO_AMOUNT)))
        ).flat(2);
    }

    private async _getMultiHopBuyCallInfosAsync(
        sources: ERC20BridgeSource[],
        tokenAddressPath: Address[],
    ): Promise<MultiHopCallInfo[]> {
        const samplers = this._getEligibleSamplers(sources);
        return (
            await Promise.all(samplers.map(async s => s.getMultiHopBuyCallInfosAsync(tokenAddressPath, ZERO_AMOUNT)))
        ).flat(2);
    }

    private _getEligibleSamplers(sources: ERC20BridgeSource[]): SourceSampler[] {
        return Object.keys(this._samplers)
            .filter(k => sources.includes(k as ERC20BridgeSource))
            .map(k => this._samplers[k]);
    }
}
