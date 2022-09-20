import { ZERO_EX_GAS_API_URL } from '../config';
import { ONE_SECOND_MS } from '../constants';

let previousGasInfo: GasInfoResponse | undefined;
let lastAccessed: number;
const CACHE_EXPIRY_SEC = 60;

// Gas prices in wei
interface GasPrices {
    fast: number;
    l1CalldataPricePerUnit?: number;
}

interface GasInfoResponse {
    result: GasPrices;
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
    /** @returns gas prices or default gas prices.*/
    getGasPricesOrDefault: async (defaultGasPrices: GasPrices): Promise<GasPrices> => {
        const gasInfo = await getGasInfoAsync();
        if (gasInfo !== undefined) {
            return {
                ...defaultGasPrices,
                ...gasInfo.result,
            };
        }

        return defaultGasPrices;
    },
};
