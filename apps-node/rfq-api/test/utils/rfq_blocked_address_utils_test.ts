import { expect } from 'chai';
import { DataSource } from 'typeorm';

import { ONE_MINUTE_MS } from '../../src/core/constants';
import { BlockedAddressEntity } from '../../src/entities/BlockedAddressEntity';
import { RfqBlockedAddressUtils } from '../../src/utils/rfq_blocked_address_utils';
import { setupDependenciesAsync, TeardownDependenciesFunctionHandle } from '../test_utils/deployment';
import { initDbDataSourceAsync } from '../test_utils/initDbDataSourceAsync';

const ttlMs = 50;

jest.setTimeout(ONE_MINUTE_MS * 2);
let teardownDependencies: TeardownDependenciesFunctionHandle;

describe('rfqBlockedAddressUtils', () => {
    let dataSource: DataSource;
    let rfqBlacklistUtils: RfqBlockedAddressUtils;

    beforeAll(async () => {
        teardownDependencies = await setupDependenciesAsync(['postgres']);
        dataSource = await initDbDataSourceAsync();
        rfqBlacklistUtils = new RfqBlockedAddressUtils(dataSource, new Set(), ttlMs);
    });

    afterAll(async () => {
        const wasKilled = teardownDependencies();
        if (!wasKilled) {
            throw new Error('Dependencies failed to shut down');
        }
    });

    beforeEach(async () => {
        rfqBlacklistUtils = new RfqBlockedAddressUtils(dataSource, new Set(), ttlMs);
    });

    afterEach(async () => {
        await dataSource.query('TRUNCATE TABLE blocked_addresses CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_jobs CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_quotes CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_transaction_submissions CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_jobs CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_quotes CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_transaction_submissions CASCADE;');
    });

    describe('blocked_addresses table', () => {
        it('should only allow lower case insertions', async () => {
            const sampleBadAddress = '0xA10612Ee5432B6395d1F0d6fB2601299a1c64274';

            try {
                await dataSource.getRepository(BlockedAddressEntity).save({
                    address: sampleBadAddress,
                });
                expect.fail('should throw');
            } catch (err) {
                expect(err.message).to.match(/violates check constraint/);
            }

            try {
                await dataSource.getRepository(BlockedAddressEntity).save({
                    address: sampleBadAddress.toLowerCase(),
                });
            } catch (err) {
                expect.fail('lower case should not throw');
            }
        });
    });

    it('should use stale values via isBlocked', async () => {
        const sampleBadAddress = '0xA10612Ee5432B6395d1F0d6fB2601299a1c64274';
        expect(rfqBlacklistUtils.isBlocked(sampleBadAddress)).to.equal(false);

        // Add it to the blocked list
        await dataSource.getRepository(BlockedAddressEntity).save({
            address: sampleBadAddress.toLowerCase(),
        });

        expect(rfqBlacklistUtils.isBlocked(sampleBadAddress)).to.equal(false);
    });

    it('should use fresh values after the update is complete', async () => {
        const sampleBadAddress = '0xB10612Ee5432B6395d1F0d6fB2601299a1c64274';

        // Add it to the blocked list
        await dataSource.getRepository(BlockedAddressEntity).save({
            address: sampleBadAddress.toLowerCase(),
        });

        // Initally not blocked
        const isBlocked_t0 = rfqBlacklistUtils.isBlocked(sampleBadAddress);
        expect(isBlocked_t0).to.equal(false);

        // Await for the update to complete
        await rfqBlacklistUtils.completeUpdateAsync();

        // Now should be blocked
        const isBlocked_t1 = rfqBlacklistUtils.isBlocked(sampleBadAddress);
        expect(isBlocked_t1).to.equal(true);
    });

    it('should be case insensitive', async () => {
        const sampleBadAddress = '0xC10612Ee5432B6395d1F0d6fB2601299a1c64274';
        await dataSource.getRepository(BlockedAddressEntity).save({
            address: sampleBadAddress.toLowerCase(),
        });

        // Trigger the update and wait for completion
        rfqBlacklistUtils.isBlocked(sampleBadAddress);
        await rfqBlacklistUtils.completeUpdateAsync();

        const isChecksumBlocked = rfqBlacklistUtils.isBlocked(sampleBadAddress);
        const isLowerCaseBlocked = rfqBlacklistUtils.isBlocked(sampleBadAddress.toLowerCase());
        const isUpperCaseBlocked = rfqBlacklistUtils.isBlocked(sampleBadAddress.toUpperCase());

        expect(isChecksumBlocked).to.equal(true);
        expect(isLowerCaseBlocked).to.equal(true);
        expect(isUpperCaseBlocked).to.equal(true);
    });
});
