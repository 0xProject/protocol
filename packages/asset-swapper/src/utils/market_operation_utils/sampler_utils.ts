import { BigNumber } from '@0x/utils';

/**
 * Generate sample amounts up to `maxFillAmount`.
 */
export function getSampleAmounts(maxFillAmount: BigNumber, numSamples: number, expBase: number = 1): BigNumber[] {
    const distribution = [...Array<BigNumber>(numSamples)].map((_v, i) => new BigNumber(expBase).pow(i));
    const stepSizes = distribution.map(d => d.div(BigNumber.sum(...distribution)));
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
