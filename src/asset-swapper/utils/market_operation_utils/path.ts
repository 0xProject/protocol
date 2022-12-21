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

import { POSITIVE_INF, ZERO_AMOUNT } from './constants';
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
    public sourceFlags = BigInt(0);
    protected _size: PathSize = { input: ZERO_AMOUNT, output: ZERO_AMOUNT };
    protected _adjustedSize: PathSize = { input: ZERO_AMOUNT, output: ZERO_AMOUNT };

    public static create(
        side: MarketOperation,
        fills: ReadonlyArray<Fill>,
        targetInput: BigNumber,
        pathPenaltyOpts: PathPenaltyOpts,
    ): Path {
        const path = new Path(side, fills, targetInput, pathPenaltyOpts);
        fills.forEach((fill) => {
            path.sourceFlags |= fill.flags;
            path._addFillSize(fill);
        });
        return path;
    }

    protected constructor(
        protected readonly side: MarketOperation,
        public fills: ReadonlyArray<Fill>,
        protected readonly targetInput: BigNumber,
        public readonly pathPenaltyOpts: PathPenaltyOpts,
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

    public adjustedSize(): PathSize {
        // Adjusted input/output has been adjusted by the cost of the DEX, but not by any
        // overhead added by the exchange proxy.
        const { input, output } = this._adjustedSize;
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

    public adjustedCompleteRate(): BigNumber {
        const { input, output } = this.adjustedSize();
        return getCompleteRate(this.side, input, output, this.targetInput);
    }

    /**
     * Calculates the rate of this path, where the output has been
     * adjusted for penalties (e.g cost)
     */
    public adjustedRate(): BigNumber {
        const { input, output } = this.adjustedSize();
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
        const { input } = this._size;
        const { input: otherInput } = other._size;
        if (input.isLessThan(targetInput) || otherInput.isLessThan(targetInput)) {
            return input.isGreaterThan(otherInput);
        } else {
            return this.adjustedCompleteRate().isGreaterThan(other.adjustedCompleteRate());
        }
    }

    private _addFillSize(fill: Fill): void {
        if (this._size.input.plus(fill.input).isGreaterThan(this.targetInput)) {
            const remainingInput = this.targetInput.minus(this._size.input);
            const scaledFillOutput = fill.output.times(remainingInput.div(fill.input));
            this._size.input = this.targetInput;
            this._size.output = this._size.output.plus(scaledFillOutput);
            // Penalty does not get interpolated.
            const penalty = fill.adjustedOutput.minus(fill.output);
            this._adjustedSize.input = this.targetInput;
            this._adjustedSize.output = this._adjustedSize.output.plus(scaledFillOutput).plus(penalty);
        } else {
            this._size.input = this._size.input.plus(fill.input);
            this._size.output = this._size.output.plus(fill.output);
            this._adjustedSize.input = this._adjustedSize.input.plus(fill.input);
            this._adjustedSize.output = this._adjustedSize.output.plus(fill.adjustedOutput);
        }
    }
}

interface FinalizedPath extends Path {
    readonly orders: OptimizedOrder[];
}
