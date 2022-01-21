import { expect } from '@0x/contracts-test-utils';
import 'mocha';
import { Connection } from 'typeorm';

import { BlockedAddressEntity } from '../../src/entities/BlockedAddressEntity';
import { RfqBlockedAddressUtils } from '../../src/utils/rfq_blocked_address_utils';

import { initDBConnectionAsync } from './db_connection';
import { setupDependenciesAsync, teardownDependenciesAsync } from './deployment';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../../src/app')];

const SUITE_NAME = 'rfqBlockedAddressUtils';
const ttlMs = 50;

describe(SUITE_NAME, () => {
    let connection: Connection;
    let rfqBlacklistUtils: RfqBlockedAddressUtils;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        connection = await initDBConnectionAsync();
        rfqBlacklistUtils = new RfqBlockedAddressUtils(connection, new Set(), ttlMs);
    });

    after(async () => {
        // reset DB
        connection = await initDBConnectionAsync();
        await teardownDependenciesAsync(SUITE_NAME);
    });

    beforeEach(async () => {
        // reset DB
        connection = await initDBConnectionAsync();
        rfqBlacklistUtils = new RfqBlockedAddressUtils(connection, new Set(), ttlMs);
    });

    describe('blocked_addresses table', () => {
        it('should only allow lower case insertions', async () => {
            const sampleBadAddress = '0xA10612Ee5432B6395d1F0d6fB2601299a1c64274';

            try {
                await connection.getRepository(BlockedAddressEntity).save({
                    address: sampleBadAddress,
                });
                expect.fail('should throw');
            } catch (err) {
                expect(err.message).to.match(/violates check constraint/);
            }

            try {
                await connection.getRepository(BlockedAddressEntity).save({
                    address: sampleBadAddress.toLowerCase(),
                });
            } catch (err) {
                expect.fail('lower case should not throw');
            }
        });
    });

    it('should use stale values via isBlocked', async () => {
        const sampleBadAddress = '0xA10612Ee5432B6395d1F0d6fB2601299a1c64274';
        expect(rfqBlacklistUtils.isBlocked(sampleBadAddress)).to.be.false();

        // Add it to the blocked list
        await connection.getRepository(BlockedAddressEntity).save({
            address: sampleBadAddress.toLowerCase(),
        });

        expect(rfqBlacklistUtils.isBlocked(sampleBadAddress)).to.be.false();
    });

    it('should use fresh values after the update is complete', async () => {
        const sampleBadAddress = '0xB10612Ee5432B6395d1F0d6fB2601299a1c64274';

        // Add it to the blocked list
        await connection.getRepository(BlockedAddressEntity).save({
            address: sampleBadAddress.toLowerCase(),
        });

        // Initally not blocked
        const isBlocked_t0 = rfqBlacklistUtils.isBlocked(sampleBadAddress);
        expect(isBlocked_t0).to.be.false();

        // Await for the update to complete
        await rfqBlacklistUtils.completeUpdateAsync();

        // Now should be blocked
        const isBlocked_t1 = rfqBlacklistUtils.isBlocked(sampleBadAddress);
        expect(isBlocked_t1).to.be.true();
    });

    it('should be case insensitive', async () => {
        const sampleBadAddress = '0xC10612Ee5432B6395d1F0d6fB2601299a1c64274';
        await connection.getRepository(BlockedAddressEntity).save({
            address: sampleBadAddress.toLowerCase(),
        });

        // Trigger the update and wait for completion
        rfqBlacklistUtils.isBlocked(sampleBadAddress);
        await rfqBlacklistUtils.completeUpdateAsync();

        const isChecksumBlocked = rfqBlacklistUtils.isBlocked(sampleBadAddress);
        const isLowerCaseBlocked = rfqBlacklistUtils.isBlocked(sampleBadAddress.toLowerCase());
        const isUpperCaseBlocked = rfqBlacklistUtils.isBlocked(sampleBadAddress.toUpperCase());

        expect(isChecksumBlocked).to.be.true();
        expect(isLowerCaseBlocked).to.be.true();
        expect(isUpperCaseBlocked).to.be.true();
    });
});
// tslint:disable-line:max-file-line-count
