import { BigNumber } from '@0x/utils';

import { ZERO_AMOUNT } from '../constants';
export interface GeistInfo {
    lendingPool: string;
    gToken: string;
    underlyingToken: string;
}
export class GeistSampler {
    public static sampleSellsFromGeist(
        geistInfo: GeistInfo,
        takerToken: string,
        makerToken: string,
        takerTokenAmounts: BigNumber[],
    ): BigNumber[] {
        // Deposit/Withdrawal underlying <-> gToken is always 1:1
        if (
            (takerToken.toLowerCase() === geistInfo.gToken.toLowerCase() &&
                makerToken.toLowerCase() === geistInfo.underlyingToken.toLowerCase()) ||
            (takerToken.toLowerCase() === geistInfo.underlyingToken.toLowerCase() &&
                makerToken.toLowerCase() === geistInfo.gToken.toLowerCase())
        ) {
            return takerTokenAmounts;
        }

        // Not matching the reserve return 0 results
        const numSamples = takerTokenAmounts.length;

        const makerTokenAmounts = new Array(numSamples);
        makerTokenAmounts.fill(ZERO_AMOUNT);
        return makerTokenAmounts;
    }

    public static sampleBuysFromGeist(
        geistInfo: GeistInfo,
        takerToken: string,
        makerToken: string,
        makerTokenAmounts: BigNumber[],
    ): BigNumber[] {
        // Deposit/Withdrawal underlying <-> gToken is always 1:1
        if (
            (takerToken.toLowerCase() === geistInfo.gToken.toLowerCase() &&
                makerToken.toLowerCase() === geistInfo.underlyingToken.toLowerCase()) ||
            (takerToken.toLowerCase() === geistInfo.underlyingToken.toLowerCase() &&
                makerToken.toLowerCase() === geistInfo.gToken.toLowerCase())
        ) {
            return makerTokenAmounts;
        }

        // Not matching the reserve return 0 results
        const numSamples = makerTokenAmounts.length;
        const takerTokenAmounts = new Array(numSamples);
        takerTokenAmounts.fill(ZERO_AMOUNT);
        return takerTokenAmounts;
    }
}
