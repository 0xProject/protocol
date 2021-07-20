import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../wrappers';

import { Chain } from './chain';
import { ZERO_AMOUNT } from './constants';
import {
    Address,
    Bytes,
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

interface MultiHopCallInfoWithSampler extends MultiHopCallInfo {
    sampler: SourceSampler;
}

interface HopResult {
    outputAmount: BigNumber;
    resultData: Bytes;
}

const DEFAULT_SAMPLE_GAS = 500e3;
const GAS_PER_SAMPLE = 25e3;
const BASE_GAS = 100e3;
const DEFAULT_MAX_CACHE_AGE_MS = 10e3;

export class TwoHopSampler {
    protected readonly _sellContract: ERC20BridgeSamplerContract;
    protected readonly _buyContract: ERC20BridgeSamplerContract;
    protected readonly _sellContractHelper: ContractHelper<ERC20BridgeSamplerContract>;
    protected readonly _buyContractHelper: ContractHelper<ERC20BridgeSamplerContract>;

    public static async createAsync(
        chain: Chain,
        subSamplers: SourceSamplerMap,
        maxCacheAgeMs?: number,
    ): Promise<TwoHopSampler> {
        return new TwoHopSampler(chain, subSamplers, maxCacheAgeMs);
    }

    protected constructor(
        public readonly chain: Chain,
        private readonly _samplers: SourceSamplerMap,
        private readonly _maxCacheAgeMs: number = DEFAULT_MAX_CACHE_AGE_MS,
    ) {
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
        if (!this.canConvertTokens(tokenAddressPath) || takerFillAmount.eq(0)) {
            return null;
        }
        const [firstHopPath, secondHopPath] = [tokenAddressPath.slice(0, 2), tokenAddressPath.slice(1)];
        const firstHopCalls = await this._getMultiHopSellCallInfosAsync(sources, firstHopPath);
        const secondHopCalls = await this._getMultiHopSellCallInfosAsync(sources, secondHopPath);
        if (firstHopCalls.length === 0 || secondHopCalls.length === 0) {
            return null;
        }
        const totalGas = [...firstHopCalls, ...secondHopCalls]
            .map(c => c.gas || DEFAULT_SAMPLE_GAS)
            .reduce((a, v) => a + v, 0);

        let firstHopResults: HopResult[];
        let secondHopResults: HopResult[];
        try {
            [firstHopResults, secondHopResults] = await this._sellContractHelper.ethCallAsync(
                this._sellContract.sampleTwoHopSell,
                [
                    firstHopCalls.map(c => ({
                        data: c.quoterData,
                        to: c.quoterTarget,
                        gas: new BigNumber(c.gas || DEFAULT_SAMPLE_GAS),
                    })),
                    secondHopCalls.map(c => ({
                        data: c.quoterData,
                        to: c.quoterTarget,
                        gas: new BigNumber(c.gas || DEFAULT_SAMPLE_GAS),
                    })),
                    takerFillAmount,
                ],
                {
                    gas: totalGas + BASE_GAS + GAS_PER_SAMPLE * (firstHopCalls.length + secondHopCalls.length),
                    overrides: {
                        ...Object.assign({}, ...[...firstHopCalls, ...secondHopCalls].map(c => c.overrides)),
                    },
                    maxCacheAgeMs: this._maxCacheAgeMs,
                },
            );
        } catch (err) {
            // tslint:disable-next-line: no-console
            console.error(
                `Failed to fetch two-hop sell samples for ${tokenAddressPath.join('->')}, with ${sources.join(', ')}: ${
                    err.message
                }`,
            );
            return null;
        }

        // Work out the hops from the results and score liquidity sources along
        // the way.

        let bestFirstHopIndex = 0;
        for (let i = 0; i < firstHopCalls.length; ++i) {
            const { sampler } = firstHopCalls[i];
            const r = firstHopResults[i];
            if (r.outputAmount.gt(0)) {
                sampler.pump(firstHopPath);
                if (firstHopResults[bestFirstHopIndex].outputAmount.lt(r.outputAmount)) {
                    bestFirstHopIndex = i;
                }
            } else {
                sampler.dump(firstHopPath);
            }
        }

        if (firstHopResults[bestFirstHopIndex].outputAmount.eq(0)) {
            return null;
        }

        let bestSecondHopIndex = 0;
        for (let i = 0; i < secondHopCalls.length; ++i) {
            const { sampler } = secondHopCalls[i];
            const r = secondHopResults[i];
            if (r.outputAmount.gt(0)) {
                sampler.pump(secondHopPath);
                if (secondHopResults[bestSecondHopIndex].outputAmount.lt(r.outputAmount)) {
                    bestSecondHopIndex = i;
                }
            } else {
                sampler.dump(secondHopPath);
            }
        }

        if (secondHopResults[bestSecondHopIndex].outputAmount.eq(0)) {
            return null;
        }

        const firstHop = firstHopCalls[bestFirstHopIndex].resultHandler(firstHopResults[bestFirstHopIndex].resultData);
        const secondHop = secondHopCalls[bestSecondHopIndex].resultHandler(
            secondHopResults[bestSecondHopIndex].resultData,
        );
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
            output: secondHopResults[bestSecondHopIndex].outputAmount,
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
        if (firstHopCalls.length === 0 || secondHopCalls.length === 0) {
            return null;
        }
        const totalGas = [...firstHopCalls, ...secondHopCalls]
            .map(c => c.gas || DEFAULT_SAMPLE_GAS)
            .reduce((a, v) => a + v, 0);

        let firstHopResults: HopResult[], secondHopResults: HopResult[];
        try {
            [firstHopResults, secondHopResults] = await this._buyContractHelper.ethCallAsync(
                this._buyContract.sampleTwoHopBuy,
                [
                    firstHopCalls.map(c => ({
                        data: c.quoterData,
                        to: c.quoterTarget,
                        gas: new BigNumber(c.gas || DEFAULT_SAMPLE_GAS),
                    })),
                    secondHopCalls.map(c => ({
                        data: c.quoterData,
                        to: c.quoterTarget,
                        gas: new BigNumber(c.gas || DEFAULT_SAMPLE_GAS),
                    })),
                    makerFillAmount,
                ],
                {
                    gas: totalGas + BASE_GAS + GAS_PER_SAMPLE * (firstHopCalls.length + secondHopCalls.length),
                    overrides: {
                        ...Object.assign({}, ...[...firstHopCalls, ...secondHopCalls].map(c => c.overrides)),
                    },
                    maxCacheAgeMs: this._maxCacheAgeMs,
                },
            );
        } catch (err) {
            // tslint:disable-next-line: no-console
            console.error(
                `Failed to fetch two-hop buy samples for ${tokenAddressPath.join('->')}, with ${sources.join(', ')}: ${
                    err.message
                }`,
            );
            return null;
        }

        // Work out the hops from the results and score liquidity sources along
        // the way.

        let bestSecondHopIndex = 0;
        for (let i = 0; i < secondHopCalls.length; ++i) {
            const { sampler } = secondHopCalls[i];
            const r = secondHopResults[i];
            if (r.outputAmount.gt(0)) {
                sampler.pump(secondHopPath);
                if (secondHopResults[bestSecondHopIndex].outputAmount.gt(r.outputAmount)) {
                    bestSecondHopIndex = i;
                }
            } else {
                sampler.dump(secondHopPath);
            }
        }

        if (secondHopResults[bestSecondHopIndex].outputAmount.eq(0)) {
            return null;
        }

        let bestFirstHopIndex = 0;
        for (let i = 0; i < firstHopCalls.length; ++i) {
            const { sampler } = firstHopCalls[i];
            const r = firstHopResults[i];
            if (r.outputAmount.gt(0)) {
                sampler.pump(firstHopPath);
                if (firstHopResults[bestFirstHopIndex].outputAmount.gt(r.outputAmount)) {
                    bestFirstHopIndex = i;
                }
            } else {
                sampler.dump(firstHopPath);
            }
        }

        if (firstHopResults[bestFirstHopIndex].outputAmount.eq(0)) {
            return null;
        }

        const firstHop = firstHopCalls[bestFirstHopIndex].resultHandler(firstHopResults[bestFirstHopIndex].resultData);
        const secondHop = secondHopCalls[bestSecondHopIndex].resultHandler(
            secondHopResults[bestSecondHopIndex].resultData,
        );
        if (!firstHop || !secondHop) {
            return null;
        }

        return {
            fillData: {
                firstHop,
                secondHop,
                intermediateToken: tokenAddressPath[1],
            },
            input: makerFillAmount,
            output: firstHopResults[bestFirstHopIndex].outputAmount,
            source: ERC20BridgeSource.MultiHop,
        };
    }

    private async _getMultiHopSellCallInfosAsync(
        availableSources: ERC20BridgeSource[],
        tokenAddressPath: Address[],
    ): Promise<MultiHopCallInfoWithSampler[]> {
        const samplers = this._getEligibleSamplers(availableSources);
        return (
            await Promise.all(
                samplers.map(async s => {
                    return (await s.getMultiHopSellCallInfosAsync(tokenAddressPath, ZERO_AMOUNT)).map(c => ({
                        sampler: s,
                        ...c,
                    }));
                }),
            )
        ).flat(2);
    }

    private async _getMultiHopBuyCallInfosAsync(
        availableSources: ERC20BridgeSource[],
        tokenAddressPath: Address[],
    ): Promise<MultiHopCallInfoWithSampler[]> {
        const samplers = this._getEligibleSamplers(availableSources);
        return (
            await Promise.all(
                samplers.map(async s => {
                    return (await s.getMultiHopBuyCallInfosAsync(tokenAddressPath, ZERO_AMOUNT)).map(c => ({
                        sampler: s,
                        ...c,
                    }));
                }),
            )
        ).flat(2);
    }

    private _getEligibleSamplers(sources: ERC20BridgeSource[]): SourceSampler[] {
        return Object.keys(this._samplers)
            .filter(k => sources.includes(k as ERC20BridgeSource))
            .map(k => this._samplers[k]);
    }
}
