import { BigNumber } from '@0x/utils';
import _ = require('lodash');

import {
    MarketOperation,
    NativeFillData,
    OptimizedOrder,
    ERC20BridgeSource,
    ExchangeProxyOverhead,
    Fill,
} from '../../types';

import { ZERO_AMOUNT } from './constants';
import { ethToOutputAmount } from './fills';
import {
    createBridgeOrder,
    createNativeOptimizedOrder,
    CreateOrderFromPathOpts,
    createOrdersFromTwoHopSample,
    getMakerTakerTokens,
} from './orders';
import { getCompleteRate, getRate } from './rate_utils';
import { MultiHopFillData } from './types';

interface PathSize {
    input: BigNumber;
    output: BigNumber;
}

export interface PathPenaltyOpts {
    outputAmountPerEth: BigNumber;
    inputAmountPerEth: BigNumber;
    exchangeProxyOverhead: ExchangeProxyOverhead;
}

export class Path {
    public orders?: OptimizedOrder[];

    public static create(
        side: MarketOperation,
        fills: readonly Fill[],
        targetInput: BigNumber,
        pathPenaltyOpts: PathPenaltyOpts,
    ): Path {
        const sourceFlags = mergeSourceFlags(fills.map((fill) => fill.flags));
        return new Path(side, fills, targetInput, pathPenaltyOpts, sourceFlags, createAdjustedSize(targetInput, fills));
    }

    private constructor(
        protected readonly side: MarketOperation,
        public fills: readonly Fill[],
        protected readonly targetInput: BigNumber,
        public readonly pathPenaltyOpts: PathPenaltyOpts,
        public readonly sourceFlags: bigint,
        protected readonly adjustedSize: PathSize,
    ) {}

    /**
     * Finalizes this path, creating fillable orders with the information required
     * for settlement
     */
    public finalize(opts: CreateOrderFromPathOpts): FinalizedPath {
        const { makerToken, takerToken } = getMakerTakerTokens(opts);
        this.orders = [];
        for (const fill of this.fills) {
            // internal BigInt flag field is not supported JSON and is tricky
            // to remove upstream. Since it's not needed in a FinalizedPath we just drop it.
            const normalizedFill = _.omit(fill, 'flags') as Fill;
            if (fill.source === ERC20BridgeSource.Native) {
                this.orders.push(createNativeOptimizedOrder(normalizedFill as Fill<NativeFillData>, opts.side));
            } else if (fill.source === ERC20BridgeSource.MultiHop) {
                const [firstHopOrder, secondHopOrder] = createOrdersFromTwoHopSample(
                    normalizedFill as Fill<MultiHopFillData>,
                    opts,
                );
                this.orders.push(firstHopOrder);
                this.orders.push(secondHopOrder);
            } else {
                this.orders.push(createBridgeOrder(normalizedFill, makerToken, takerToken, opts.side));
            }
        }
        return this as FinalizedPath;
    }

    /**
     * Calculates the rate of this path, where the output has been
     * adjusted for penalties (e.g cost)
     */
    public adjustedRate(): BigNumber {
        const { input, output } = this.getExchangeProxyOverheadAppliedSize();
        return getRate(this.side, input, output);
    }

    /**
     * Compares two paths returning if this adjusted path
     * is better than the other adjusted path
     */
    public isAdjustedBetterThan(other: Path): boolean {
        if (!this.targetInput.isEqualTo(other.targetInput)) {
            throw new Error(`Target input mismatch: ${this.targetInput} !== ${other.targetInput}`);
        }
        const { targetInput } = this;
        const { input } = this.adjustedSize;
        const { input: otherInput } = other.adjustedSize;
        if (input.isLessThan(targetInput) || otherInput.isLessThan(targetInput)) {
            return input.isGreaterThan(otherInput);
        } else {
            return this.adjustedCompleteRate().isGreaterThan(other.adjustedCompleteRate());
        }
    }

    private getExchangeProxyOverheadAppliedSize(): PathSize {
        // Adjusted input/output has been adjusted by the cost of the DEX, but not by any
        // overhead added by the exchange proxy.
        const { input, output } = this.adjustedSize;
        const { exchangeProxyOverhead, outputAmountPerEth, inputAmountPerEth } = this.pathPenaltyOpts;
        // Calculate the additional penalty from the ways this path can be filled
        // by the exchange proxy, e.g VIPs (small) or FillQuoteTransformer (large)
        const gasOverhead = exchangeProxyOverhead(this.sourceFlags);
        const pathPenalty = ethToOutputAmount({
            input,
            output,
            inputAmountPerEth,
            outputAmountPerEth,
            ethAmount: gasOverhead,
        });
        return {
            input,
            output: this.side === MarketOperation.Sell ? output.minus(pathPenalty) : output.plus(pathPenalty),
        };
    }

    private adjustedCompleteRate(): BigNumber {
        const { input, output } = this.getExchangeProxyOverheadAppliedSize();
        return getCompleteRate(this.side, input, output, this.targetInput);
    }
}

interface FinalizedPath extends Path {
    readonly orders: OptimizedOrder[];
}

function createAdjustedSize(targetInput: BigNumber, fills: readonly Fill[]): PathSize {
    return fills.reduce(
        (currentSize, fill) => {
            if (currentSize.input.plus(fill.input).isGreaterThan(targetInput)) {
                const remainingInput = targetInput.minus(currentSize.input);
                const scaledFillOutput = fill.output.times(remainingInput.div(fill.input));
                // Penalty does not get interpolated.
                const penalty = fill.adjustedOutput.minus(fill.output);
                return {
                    input: targetInput,
                    output: currentSize.output.plus(scaledFillOutput).plus(penalty),
                };
            } else {
                return {
                    input: currentSize.input.plus(fill.input),
                    output: currentSize.output.plus(fill.adjustedOutput),
                };
            }
        },
        { input: ZERO_AMOUNT, output: ZERO_AMOUNT },
    );
}

function mergeSourceFlags(flags: bigint[]): bigint {
    return flags.reduce((mergedFlags, currentFlags) => mergedFlags | currentFlags, BigInt(0));
}
