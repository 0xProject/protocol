import { ChainId } from '@0x/contract-addresses';
import { BigNumber, NULL_BYTES } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../../wrappers';
import { SamplerOverrides } from '../../types';
import { TokenAdjacencyGraph } from '../token_adjacency_graph';

import { BancorService } from './bancor_service';
import { PoolsCacheMap, SamplerOperations } from './sampler_operations';
import { BatchedOperation, LiquidityProviderRegistry } from './types';

/**
 * Generate sample amounts up to `maxFillAmount`.
 */
export function getSampleAmounts(maxFillAmount: BigNumber, numSamples: number, expBase = 1): BigNumber[] {
    const distribution = [...Array<BigNumber>(numSamples)].map((_v, i) => new BigNumber(expBase).pow(i));
    const distributionSum = BigNumber.sum(...distribution);
    const stepSizes = distribution.map((d) => d.div(distributionSum));
    const amounts = stepSizes.map((_s, i) => {
        if (i === numSamples - 1) {
            return maxFillAmount;
        }
        return maxFillAmount
            .times(BigNumber.sum(...[0, ...stepSizes.slice(0, i + 1)]))
            .integerValue(BigNumber.ROUND_UP);
    });
    return amounts;
}

type BatchedOperationResult<T> = T extends BatchedOperation<infer TResult> ? TResult : never;

/**
 * Encapsulates interactions with the `ERC20BridgeSampler` contract.
 */
export class DexOrderSampler extends SamplerOperations {
    constructor(
        public readonly chainId: ChainId,
        _samplerContract: ERC20BridgeSamplerContract,
        private readonly _samplerOverrides?: SamplerOverrides,
        poolsCaches?: PoolsCacheMap,
        tokenAdjacencyGraph?: TokenAdjacencyGraph,
        liquidityProviderRegistry?: LiquidityProviderRegistry,
        bancorServiceFn: () => Promise<BancorService | undefined> = async () => undefined,
    ) {
        super(chainId, _samplerContract, poolsCaches, tokenAdjacencyGraph, liquidityProviderRegistry, bancorServiceFn);
    }

    /* Type overloads for `executeAsync()`. Could skip this if we would upgrade TS. */

    // prettier-ignore
    public async executeAsync<
        T1
    >(...ops: [T1]): Promise<[
        BatchedOperationResult<T1>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2
    >(...ops: [T1, T2]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3
    >(...ops: [T1, T2, T3]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4
    >(...ops: [T1, T2, T3, T4]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5
    >(...ops: [T1, T2, T3, T4, T5]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6
    >(...ops: [T1, T2, T3, T4, T5, T6]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7
    >(...ops: [T1, T2, T3, T4, T5, T6, T7]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7, T8
    >(...ops: [T1, T2, T3, T4, T5, T6, T7, T8]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>,
        BatchedOperationResult<T8>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7, T8, T9
    >(...ops: [T1, T2, T3, T4, T5, T6, T7, T8, T9]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>,
        BatchedOperationResult<T8>,
        BatchedOperationResult<T9>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7, T8, T9, T10
    >(...ops: [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>,
        BatchedOperationResult<T8>,
        BatchedOperationResult<T9>,
        BatchedOperationResult<T10>,
    ]>;

    /**
     * Run a series of operations from `DexOrderSampler.ops` in a single transaction.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async executeAsync(...ops: any[]): Promise<any[]> {
        return this.executeBatchAsync(ops);
    }

    /**
     * Run a series of operations from `DexOrderSampler.ops` in a single transaction.
     * Takes an arbitrary length array, but is not typesafe.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async executeBatchAsync<T extends BatchedOperation<any>[]>(ops: T): Promise<any[]> {
        const callDatas = ops.map((o) => o.encodeCall());
        const { overrides, block } = this._samplerOverrides
            ? this._samplerOverrides
            : { overrides: undefined, block: undefined };

        // All operations are NOOPs
        if (callDatas.every((cd) => cd === NULL_BYTES)) {
            return callDatas.map((_callData, i) => ops[i].handleCallResults(NULL_BYTES));
        }
        // Execute all non-empty calldatas.
        const rawCallResults = await this._samplerContract
            .batchCall(callDatas.filter((cd) => cd !== NULL_BYTES))
            .callAsync({ overrides }, block);
        // Return the parsed results.
        let rawCallResultsIdx = 0;
        return callDatas.map((callData, i) => {
            const { data, success } =
                callData !== NULL_BYTES ? rawCallResults[rawCallResultsIdx++] : { success: true, data: NULL_BYTES };
            return success ? ops[i].handleCallResults(data) : ops[i].handleRevert(data);
        });
    }
}
