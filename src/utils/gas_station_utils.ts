import { BigNumber } from '@0x/utils';

import { ETH_GAS_STATION_API_URL } from '../config';
import { ONE_SECOND_MS } from '../constants';

let previousGasInfo: GasInfoResponse;
let lastAccessed: number;
const CACHE_EXPIRY_SEC = 60;

interface GasInfoResponse {
    fast: number;
}

const getGasInfoAsync = async () => {
    const now = Date.now() / ONE_SECOND_MS;
    if (!previousGasInfo || now - CACHE_EXPIRY_SEC > lastAccessed) {
        try {
            const res = await fetch(ETH_GAS_STATION_API_URL);
            previousGasInfo = await res.json();
            lastAccessed = now;
        } catch (e) {
            throw new Error('Failed to fetch gas price from EthGasStation');
        }
    }
    return previousGasInfo;
};

export const ethGasStationUtils = {
    getGasPriceOrThrowAsync: async (): Promise<BigNumber> => {
        const gasInfo = await getGasInfoAsync();
        // Eth Gas Station result is gwei * 10
        // tslint:disable-next-line:custom-no-magic-numbers
        const BASE_TEN = 10;
        const gasPriceGwei = new BigNumber(gasInfo.fast / BASE_TEN);
        // tslint:disable-next-line:custom-no-magic-numbers
        const unit = new BigNumber(BASE_TEN).pow(9);
        const gasPriceWei = unit.times(gasPriceGwei);
        return gasPriceWei;
    },
};
