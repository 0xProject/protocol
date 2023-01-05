import { BigNumber } from '@0x/utils';
import _ = require('lodash');

import {
    MarketOperation,
    NativeFillData,
    OptimizedOrder,
    ERC20BridgeSource,
    ExchangeProxyOverhead,
    Fill,
    IPath,
} from '../../types';

import { MAX_UINT256, SOURCE_FLAGS, ZERO_AMOUNT } from './constants';
import { ethToOutputAmount } from './fills';
import {
    createBridgeOrder,
    createNativeOptimizedOrder,
    createOrdersFromTwoHopSample,
    getMakerTakerTokens,
} from './orders';
import { getCompleteRate, getRate } from './rate_utils';
import { MultiHopFillData, PathContext } from './types';

interface PathSize {
    input: BigNumber;
    output: BigNumber;
}

export interface PathPenaltyOpts {
    outputAmountPerEth: BigNumber;
    inputAmountPerEth: BigNumber;
    exchangeProxyOverhead: ExchangeProxyOverhead;
}

export class Path implements IPath {
    public static create(
        context: PathContext,
        fills: readonly Fill[],
        targetInput: BigNumber,
        pathPenaltyOpts: PathPenaltyOpts,
    ): Path {
        const sourceFlags = mergeSourceFlags(fills.map((fill) => fill.flags));
        return new Path(
            context,
            fills,
            createOrders(fills, context),
            targetInput,
            pathPenaltyOpts,
            sourceFlags,
            createAdjustedSize(targetInput, fills),
        );
    }

    private constructor(
        private readonly context: PathContext,
        public readonly fills: readonly Fill[],
        private readonly orders: readonly OptimizedOrder[],
        protected readonly targetInput: BigNumber,
        public readonly pathPenaltyOpts: PathPenaltyOpts,
        public readonly sourceFlags: bigint,
        protected readonly adjustedSize: PathSize,
    ) {}

    public hasTwoHop(): boolean {
        return (this.sourceFlags & SOURCE_FLAGS[ERC20BridgeSource.MultiHop]) > 0;
    }

    public getOrders(): readonly OptimizedOrder[] {
        return this.orders;
    }

    /**
     * Returns `OptimizedOrder`s with slippage applied (Native orders do not have slippage).
     * @param maxSlippage maximum slippage. It must be [0, 1].
     * @returns orders with slippage applied.
     */
    public getSlippedOrders(maxSlippage: number): OptimizedOrder[] {
        if (maxSlippage < 0 || maxSlippage > 1) {
            throw new Error(`slippage must be [0, 1]. Given: ${maxSlippage}`);
        }

        return this.getOrders().map((order) => {
            if (order.source === ERC20BridgeSource.Native || maxSlippage === 0) {
                return order;
            }

            return {
                ...order,
                ...(this.context.side === MarketOperation.Sell
                    ? {
                          makerAmount: order.makerAmount.eq(MAX_UINT256)
                              ? MAX_UINT256
                              : order.makerAmount.times(1 - maxSlippage).integerValue(BigNumber.ROUND_DOWN),
                      }
                    : {
                          takerAmount: order.takerAmount.eq(MAX_UINT256)
                              ? MAX_UINT256
                              : order.takerAmount.times(1 + maxSlippage).integerValue(BigNumber.ROUND_UP),
                      }),
            };
        });
    }

    /**
     * Calculates the rate of this path, where the output has been
     * adjusted for penalties (e.g cost)
     */
    public adjustedRate(): BigNumber {
        const { input, output } = this.getExchangeProxyOverheadAppliedSize();
        return getRate(this.context.side, input, output);
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
            output: this.context.side === MarketOperation.Sell ? output.minus(pathPenalty) : output.plus(pathPenalty),
        };
    }

    private adjustedCompleteRate(): BigNumber {
        const { input, output } = this.getExchangeProxyOverheadAppliedSize();
        return getCompleteRate(this.context.side, input, output, this.targetInput);
    }
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

function createOrders(fills: readonly Fill[], context: PathContext): readonly OptimizedOrder[] {
    const { makerToken, takerToken } = getMakerTakerTokens(context);
    return _.flatMap(fills, (fill) => {
        // Internal BigInt flag field is not supported JSON and is tricky to remove upstream.
        const normalizedFill = _.omit(fill, 'flags') as Fill;
        if (fill.source === ERC20BridgeSource.Native) {
            return [createNativeOptimizedOrder(normalizedFill as Fill<NativeFillData>, context.side)];
        } else if (fill.source === ERC20BridgeSource.MultiHop) {
            const [firstHopOrder, secondHopOrder] = createOrdersFromTwoHopSample(
                normalizedFill as Fill<MultiHopFillData>,
                context,
            );
            return [firstHopOrder, secondHopOrder];
        } else {
            return [createBridgeOrder(normalizedFill, makerToken, takerToken, context.side)];
        }
    });
}
