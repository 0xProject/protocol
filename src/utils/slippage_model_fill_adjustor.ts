import { MarketOperation } from '@0x/types';

import { adjustOutput, BigNumber, Fill, FillAdjustor, FillData } from '../asset-swapper';

import { SlippageModelManager } from './slippage_model_manager';

export class SlippageModelFillAdjustor implements FillAdjustor {
    constructor(
        private readonly slippageModelManager: SlippageModelManager,
        private readonly sellToken: string,
        private readonly buyToken: string,
        private readonly maxSlippageRate: number,
    ) {}

    public adjustFills(side: MarketOperation, fills: Fill<FillData>[], _amount: BigNumber): Fill<FillData>[] {
        return fills.map((f) => {
            // Mostly negative, as in the trade experiences a worst price
            // e.g -0.02938
            const expectedSlippage = this.slippageModelManager.calculateExpectedSlippage(
                this.buyToken,
                this.sellToken,
                side === MarketOperation.Sell ? f.output : f.input,
                side === MarketOperation.Sell ? f.input : f.output,
                [{ name: f.source, proportion: new BigNumber(1) }],
                this.maxSlippageRate,
            );

            if (expectedSlippage === null) {
                return f;
            }

            const fill = { ...f };
            // Calculate the current penalty (gas) as we do not want to adjust
            // an already adjusted output (compounding the adjustment further)
            const previousPenalty = f.output.minus(f.adjustedOutput).absoluteValue();

            // 1000 * (1 + -0.02938) = 970
            const slippageAdjustedOutput = f.output
                .times(new BigNumber(1).plus(expectedSlippage))
                .integerValue(BigNumber.ROUND_UP);
            // Calculate the slippage as a positive amount, the difference from current output
            // and the slippage adjusted output
            const slippagePenalty = f.output.minus(slippageAdjustedOutput).absoluteValue();

            // Apply the penalties
            const newAdjustedOutput = adjustOutput(
                side,
                f.output,
                previousPenalty.plus(slippagePenalty),
            ).integerValue();

            fill.adjustedOutput = newAdjustedOutput;
            return fill;
        });
    }
}
