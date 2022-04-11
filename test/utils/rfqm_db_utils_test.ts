// tslint:disable:custom-no-magic-numbers
// tslint:disable:max-file-line-count

import { BigNumber } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { OtcOrder } from '@0x/protocol-utils';

import { ZERO } from '../../src/constants';
import { otcOrderToStoredOtcOrder, storedOtcOrderToOtcOrder } from '../../src/utils/rfqm_db_utils';

describe('RFQM DB utils', () => {
    describe('storedOtcOrderToOtcOrder and otcOrderToStoredOtcOrder', () => {
        it('should map there and back without data corruption', () => {
            // it's expired if it's over 9000
            const expiry = new BigNumber(9000);
            const nonce = new BigNumber(1637085289);
            const chainId = 1;
            const order = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: '0x1111111111111111111111111111111111111111',
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, nonce),
                chainId,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const processedOrder = storedOtcOrderToOtcOrder(otcOrderToStoredOtcOrder(order));
            expect(processedOrder).to.deep.eq(order);
        });
    });
});
