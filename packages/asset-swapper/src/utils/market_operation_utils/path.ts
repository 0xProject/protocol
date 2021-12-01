import { BigNumber } from '@0x/utils';

import { Address, MarketOperation } from '../../types';

import { POSITIVE_INF, ZERO_AMOUNT } from './constants';
import { ethToOutputAmount } from './fills';
import { createBridgeOrder, createNativeOptimizedOrder } from './orders';
import { getCompleteRate, getRate } from './rate_utils';
import {
    CollapsedGenericBridgeFill,
    CollapsedFill,
    CollapsedNativeOrderFill,
    ERC20BridgeSource,
    ExchangeProxyOverhead,
    Fill,
    OptimizedOrder,
} from './types';

// tslint:disable: prefer-for-of no-bitwise completed-docs

export interface PathSize {
    input: BigNumber;
    output: BigNumber;
}

export interface PathPenaltyOpts {
    outputAmountPerEth: BigNumber;
    inputAmountPerEth: BigNumber;
    exchangeProxyOverhead: ExchangeProxyOverhead;
    gasPrice: BigNumber;
}

export const DEFAULT_PATH_PENALTY_OPTS: PathPenaltyOpts = {
    outputAmountPerEth: ZERO_AMOUNT,
    inputAmountPerEth: ZERO_AMOUNT,
    exchangeProxyOverhead: () => ZERO_AMOUNT,
    gasPrice: ZERO_AMOUNT,
};

export class Path {
    public collapsedFills?: ReadonlyArray<CollapsedFill>;
    public orders?: OptimizedOrder[];
    public sourceFlags: bigint = BigInt(0);
    protected _size: PathSize = { input: ZERO_AMOUNT, output: ZERO_AMOUNT };
    protected _adjustedSize: PathSize = { input: ZERO_AMOUNT, output: ZERO_AMOUNT };
    private _fallbackFillsStartIndex: number = 0;

    public static create(
        side: MarketOperation,
        fills: ReadonlyArray<Fill>,
        targetInput: BigNumber = POSITIVE_INF,
        pathPenaltyOpts: PathPenaltyOpts = DEFAULT_PATH_PENALTY_OPTS,
    ): Path {
        const path = new Path(side, fills, targetInput, pathPenaltyOpts);
        fills.forEach(fill => {
            path.sourceFlags |= fill.flags;
            path._addFillSize(fill);
        });
        return path;
    }

    public static clone(base: Path): Path {
        const clonedPath = new Path(base.side, base.fills.slice(), base.targetInput, base.pathPenaltyOpts);
        clonedPath.sourceFlags = base.sourceFlags;
        clonedPath._size = { ...base._size };
        clonedPath._adjustedSize = { ...base._adjustedSize };
        clonedPath.collapsedFills = base.collapsedFills === undefined ? undefined : base.collapsedFills.slice();
        clonedPath.orders = base.orders === undefined ? undefined : base.orders.slice();
        return clonedPath;
    }

    protected constructor(
        protected readonly side: MarketOperation,
        public fills: ReadonlyArray<Fill>,
        protected readonly targetInput: BigNumber,
        public readonly pathPenaltyOpts: PathPenaltyOpts,
    ) {}

    public append(fill: Fill): this {
        (this.fills as Fill[]).push(fill);
        this.sourceFlags |= fill.flags;
        this._addFillSize(fill);
        return this;
    }

    /**
     * Add a fallback path to the current path
     * Fallback must contain exclusive fills that are
     * not present in this path
     */
    public addFallback(fallback: Path): this {
        // We pre-pend the sources which have a higher probability of failure
        // This allows us to continue on to the remaining fills
        // If the "flakey" sources like Native were at the end, we may have a failure
        // as the last fill and then either revert, or go back to a source we previously
        // filled against
        const nativeFills = this.fills.filter(f => f.source === ERC20BridgeSource.Native);
        const otherFills = this.fills.filter(f => f.source !== ERC20BridgeSource.Native);

        // Map to the unique source id and the index to represent a unique fill
        const fillToFillId = (fill: Fill) => `${fill.sourcePathId}${fill.index}`;
        const otherFillIds = otherFills.map(f => fillToFillId(f));

        this.fills = [
            // Append all of the native fills first
            ...nativeFills,
            // Add the other fills that are not native in the optimal path
            ...otherFills,
            // Add the fills to the end that aren't already included
            ...fallback.fills.filter(f => !otherFillIds.includes(fillToFillId(f))),
        ];
        this._fallbackFillsStartIndex = nativeFills.length + otherFills.length;
        // Recompute the source flags
        this.sourceFlags = this.fills.reduce((flags, fill) => flags | fill.flags, BigInt(0));
        return this;
    }

    public collapse(opts: { side: MarketOperation, inputToken: Address; outputToken: Address; }): CollapsedPath {
        const collapsedFills = this.collapsedFills === undefined ? this._collapseFills() : this.collapsedFills;
        this.orders = [];
        for (let i = 0; i < collapsedFills.length; ++i) {
            if (collapsedFills[i].source === ERC20BridgeSource.Native) {
                this.orders.push(createNativeOptimizedOrder(collapsedFills[i] as CollapsedNativeOrderFill, opts.side));
                continue;
            }
            this.orders.push(createBridgeOrder(
                collapsedFills[i] as CollapsedGenericBridgeFill,
                opts.inputToken,
                opts.outputToken,
            ));
        }
        return this as CollapsedPath;
    }

    public size(): PathSize {
        return this._size;
    }

    public adjustedSize(): PathSize {
        const { input, output } = this._adjustedSize;
        const { exchangeProxyOverhead, outputAmountPerEth, inputAmountPerEth } = this.pathPenaltyOpts;
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

    public adjustedRate(): BigNumber {
        const { input, output } = this.adjustedSize();
        return getRate(this.side, input, output);
    }

    /**
     * Returns the best possible rate this path can offer, given the fills.
     */
    public bestRate(): BigNumber {
        const best = this.fills.reduce((prevRate, curr) => {
            const currRate = getRate(this.side, curr.input, curr.output);
            return prevRate.isLessThan(currRate) ? currRate : prevRate;
        }, new BigNumber(0));
        return best;
    }

    public adjustedSlippage(maxRate: BigNumber): number {
        if (maxRate.eq(0)) {
            return 0;
        }
        const totalRate = this.adjustedRate();
        const rateChange = maxRate.minus(totalRate);
        return rateChange.div(maxRate).toNumber();
    }

    public isBetterThan(other: Path): boolean {
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
        // if (otherInput.isLessThan(targetInput)) {
        //     return input.isGreaterThan(otherInput);
        // } else if (input.isGreaterThanOrEqualTo(targetInput)) {
        //     return this.adjustedCompleteRate().isGreaterThan(other.adjustedCompleteRate());
        // }
        // return false;
    }

    public isComplete(): boolean {
        const { input } = this._size;
        return input.gte(this.targetInput);
    }

    public isValid(quick: boolean = false): boolean {
        for (let i = 0; i < this.fills.length; ++i) {
            // Fill must immediately follow its parent.
            if (this.fills[i].parent) {
                if (i === 0 || this.fills[i - 1] !== this.fills[i].parent) {
                    return false;
                }
            }
            if (!quick) {
                // Fill must not be duplicated.
                // Fills must all have the same input and output tokens.
                for (let j = 0; j < i; ++j) {
                    if (this.fills[i] === this.fills[j]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public isValidNextFill(fill: Fill): boolean {
        if (this.fills.length === 0) {
            return !fill.parent;
        }
        if (this.fills[this.fills.length - 1] === fill.parent) {
            return true;
        }
        if (fill.parent) {
            return false;
        }
        return true;
    }

    private _collapseFills(): ReadonlyArray<CollapsedFill> {
        this.collapsedFills = [];
        for (const [i, fill] of this.fills.entries()) {
            const source = fill.source;
            if (this.collapsedFills.length !== 0 && source !== ERC20BridgeSource.Native) {
                const prevFill = this.collapsedFills[this.collapsedFills.length - 1];
                // If the last fill is from the same source, merge them.
                if (prevFill.sourcePathId === fill.sourcePathId) {
                    prevFill.input = prevFill.input.plus(fill.input);
                    prevFill.output = prevFill.output.plus(fill.output);
                    prevFill.data = fill.data;
                    prevFill.subFills.push(fill);
                    prevFill.gasCost;
                    continue;
                }
            }
            (this.collapsedFills as CollapsedFill[]).push({
                sourcePathId: fill.sourcePathId,
                source: fill.source,
                type: fill.type,
                data: fill.data,
                input: fill.input,
                output: fill.output,
                subFills: [fill],
                gasCost: fill.gasCost,
                isFallback: this._fallbackFillsStartIndex > 0 ? i >= this._fallbackFillsStartIndex : false,
            });
        }
        return this.collapsedFills;
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

export interface CollapsedPath extends Path {
    readonly collapsedFills: ReadonlyArray<CollapsedFill>;
    readonly orders: OptimizedOrder[];
}
