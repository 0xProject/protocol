import { BigNumber } from '@0x/utils';

import { createSwapId } from '../src/logger';

describe('logger', () => {
    describe('createSwapId', () => {
        it('creates a swap id', () => {
            const swapParms = {
                buyAmount: new BigNumber(10000),
                buyToken: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                sellToken: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3',
                takerAddress: '0x4Ea754349AcE5303c82f0d1D491041e042f2ad22',
            };

            const swapId = createSwapId(swapParms);

            expect(swapId).not.toBeNull();
            if (!swapId) {
                throw new Error();
            }
            expect(swapId).toHaveLength(16);
            expect(/[0-9A-Fa-f]{16}/.test(swapId)).toBeTruthy();
        });

        it('returns null if no taker address is present', () => {
            const swapParms = {
                buyAmount: new BigNumber(10000),
                buyToken: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                sellToken: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3',
            };

            const swapId = createSwapId(swapParms);

            expect(swapId).toBeNull();
        });
    });
});
