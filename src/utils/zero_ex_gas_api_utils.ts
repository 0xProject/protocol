import { BigNumber } from '@0x/utils';

import { ZERO_EX_GAS_API_URL } from '../config';
import { ONE_SECOND_MS } from '../constants';

let previousGasInfo: GasInfoResponse | undefined;
let lastAccessed: number;
const CACHE_EXPIRY_SEC = 60;

interface GasInfoResponse {
    // gas prices in wei
    result: {
        fast: number;
        fastest: number;
    };
}

const getGasInfoAsync = async () => {
    const now = Date.now() / ONE_SECOND_MS;
    if (!previousGasInfo || now - CACHE_EXPIRY_SEC > lastAccessed) {
        try {
            const res = await fetch(ZERO_EX_GAS_API_URL);
            previousGasInfo = await res.json();
            lastAccessed = now;
        } catch (e) {
            throw new Error('Failed to fetch gas price from 0x gas api');
        }
    }
    return previousGasInfo;
};

export const zeroExGasApiUtils = {
    /** @returns gas price in wei. */
    getGasPriceOrThrowAsync: async (txConfirmationSpeed: 'fast' | 'fastest' = 'fast'): Promise<BigNumber> => {
        const gasInfo = await getGasInfoAsync();
        return new BigNumber(gasInfo!.result[txConfirmationSpeed]);
    },
};
