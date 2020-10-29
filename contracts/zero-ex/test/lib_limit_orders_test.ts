import { blockchainTests, describe, expect } from '@0x/contracts-test-utils';

import { artifacts } from './artifacts';
import { getRandomLimitOrder, getRandomRfqOrder } from './utils/orders';
import { TestLibLimitOrderContract } from './wrappers';

blockchainTests('LibLimitOrder tests', env => {
    let testContract: TestLibLimitOrderContract;

    before(async () => {
        testContract = await TestLibLimitOrderContract.deployFrom0xArtifactAsync(
            artifacts.TestLibLimitOrder,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    });

    describe('getLimitOrderStructHash()', () => {
        it('returns the correct hash', async () => {
            const order = getRandomLimitOrder();
            const structHash = await testContract.getLimitOrderStructHash(order).callAsync();
            expect(structHash).to.eq(order.getStructHash());
        });
    });

    describe('getRfqOrderStructHash()', () => {
        it('returns the correct hash', async () => {
            const order = getRandomRfqOrder();
            const structHash = await testContract.getRfqOrderStructHash(order).callAsync();
            expect(structHash).to.eq(order.getStructHash());
        });
    });
});
