import { BigNumber } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { RfqOrder } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import 'mocha';
import { Connection } from 'typeorm';

import { getDBConnectionAsync } from '../src/db_connection';
import { RfqmJobEntity, RfqmQuoteEntity } from '../src/entities';
import {
    feeToStoredFee,
    RfqmDbUtils,
    RfqmJobOpts,
    RfqmJobStatus,
    v4RfqOrderToStoredOrder,
} from '../src/utils/rfqm_db_utils';

import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../src/app')];

const SUITE_NAME = 'rfqm db test';

describe(SUITE_NAME, () => {
    let connection: Connection;
    let dbUtils: RfqmDbUtils;

    const createdAt = new Date();
    // it's expired if it's over 9000
    const expiry = new BigNumber(9000);
    const chainId = 1;
    const makerUri = 'https://marketmaking.over9000.io';
    const integratorId = 'an integrator';

    const metaTransactionHash = '0x5678';
    const calldata = '0xfillinganorder';
    const fee: Fee = {
        token: '0xatoken',
        amount: new BigNumber(5),
        type: 'fixed',
    };

    const order = new RfqOrder({
        txOrigin: '0xsomeone',
        taker: '0xataker',
        maker: '0xamaker',
        makerToken: '0xamakertoken',
        takerToken: '0xatakertoken',
        expiry,
        salt: new BigNumber(1),
        chainId,
        verifyingContract: '0xacontract',
        pool: '0x1',
    });

    const orderHash = order.getHash();

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        connection = await getDBConnectionAsync();
        await connection.synchronize(true);
        dbUtils = new RfqmDbUtils(connection);
    });

    after(async () => {
        // reset DB
        connection = await getDBConnectionAsync();
        await connection.synchronize(true);
        await teardownDependenciesAsync(SUITE_NAME);
    });

    beforeEach(async () => {
        // reset DB
        connection = await getDBConnectionAsync();
        await connection.synchronize(true);
        dbUtils = new RfqmDbUtils(connection);
    });

    describe('rfqm db tests', () => {
        it('should be able to save and read an rfqm quote entity w/ no change in information', async () => {
            const testRfqmQuoteEntity = new RfqmQuoteEntity({
                orderHash,
                metaTransactionHash,
                createdAt,
                integratorId,
                chainId,
                makerUri,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
            });

            const quoteRepository = connection.getRepository(RfqmQuoteEntity);
            await quoteRepository.save(testRfqmQuoteEntity);
            const dbEntity = await quoteRepository.findOne();

            // the saved + read entity should match the original entity in information
            expect(dbEntity).to.deep.eq(testRfqmQuoteEntity);
        });
        it('should be able to save and read an rfqm job entity w/ no change in information', async () => {
            const rfqmJobOpts: RfqmJobOpts = {
                orderHash,
                metaTransactionHash,
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.InQueue,
                statusReason: null,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
            };
            const testRfqmJobEntity = new RfqmJobEntity(rfqmJobOpts);

            const jobRepository = connection.getRepository(RfqmJobEntity);
            await jobRepository.save(testRfqmJobEntity);
            const dbEntity = await jobRepository.findOne();

            // the saved + read entity should match the original entity in information
            expect(dbEntity).to.deep.eq(testRfqmJobEntity);
        });

        it('should be able to update an rfqm job entity', async () => {
            const rfqmJobOpts: RfqmJobOpts = {
                orderHash,
                metaTransactionHash,
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.InQueue,
                statusReason: null,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
            };
            await dbUtils.writeRfqmJobToDbAsync(rfqmJobOpts);

            const dbEntityFirstSnapshot = await dbUtils.findJobByOrderHashAsync(orderHash);
            await dbUtils.updateRfqmJobAsync(orderHash, { status: RfqmJobStatus.Processing });

            const dbEntitySecondSnapshot = await dbUtils.findJobByOrderHashAsync(orderHash);

            // expect status to be updated
            expect(dbEntityFirstSnapshot?.status).to.eq(RfqmJobStatus.InQueue);
            expect(dbEntitySecondSnapshot?.status).to.eq(RfqmJobStatus.Processing);

            // spot check that other values have not changed
            expect(dbEntityFirstSnapshot?.calldata).to.eq(dbEntitySecondSnapshot?.calldata);
            expect(dbEntityFirstSnapshot?.expiry).to.deep.eq(dbEntitySecondSnapshot?.expiry);
        });
    });
});

// tslint:disable-line:max-file-line-count
