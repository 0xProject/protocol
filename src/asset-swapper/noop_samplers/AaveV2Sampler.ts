import { BigNumber } from '@0x/utils';

import { ZERO_AMOUNT } from '../constants';
export interface AaveInfo {
    lendingPool: string;
    aToken: string;
    underlyingToken: string;
}
export class AaveV2Sampler {
    public static sampleSellsFromAaveV2(
        aaveInfo: AaveInfo,
        takerToken: string,
        makerToken: string,
        takerTokenAmounts: BigNumber[],
    ): BigNumber[] {
        // Deposit/Withdrawal underlying <-> aToken is always 1:1
        if (
            (takerToken.toLowerCase() === aaveInfo.aToken.toLowerCase() &&
                makerToken.toLowerCase() === aaveInfo.underlyingToken.toLowerCase()) ||
            (takerToken.toLowerCase() === aaveInfo.underlyingToken.toLowerCase() &&
                makerToken.toLowerCase() === aaveInfo.aToken.toLowerCase())
        ) {
            return takerTokenAmounts;
        }

        // Not matching the reserve return 0 results
        const numSamples = takerTokenAmounts.length;

        const makerTokenAmounts = new Array(numSamples);
        makerTokenAmounts.fill(ZERO_AMOUNT);
        return makerTokenAmounts;
    }

    public static sampleBuysFromAaveV2(
        aaveInfo: AaveInfo,
        takerToken: string,
        makerToken: string,
        makerTokenAmounts: BigNumber[],
    ): BigNumber[] {
        // Deposit/Withdrawal underlying <-> aToken is always 1:1
        if (
            (takerToken.toLowerCase() === aaveInfo.aToken.toLowerCase() &&
                makerToken.toLowerCase() === aaveInfo.underlyingToken.toLowerCase()) ||
            (takerToken.toLowerCase() === aaveInfo.underlyingToken.toLowerCase() &&
                makerToken.toLowerCase() === aaveInfo.aToken.toLowerCase())
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
