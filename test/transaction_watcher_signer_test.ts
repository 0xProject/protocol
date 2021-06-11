import { expect } from '@0x/contracts-test-utils';
// tslint:disable-next-line:no-implicit-dependencies
import * as ethers from 'ethers'; // HACK to make ethers quiet

import { TransactionWatcherSignerService } from '../src/services/transaction_watcher_signer_service';

// HACK to make ethers quiet
ethers.errors.setLogLevel('error');

// tslint:disable:custom-no-magic-numbers

const SUITE_NAME = 'transaction watcher signer tests';
describe(SUITE_NAME, () => {
    describe('.getSortedSignersByAvailability', () => {
        it('sorts signers in order of highest balance andd lowest tx count', () => {
            const testSigners = [
                { balance: 0.25, count: 0, from: '1' },
                { balance: 0.59, count: 1, from: '2' },
                { balance: 0.27, count: 1, from: '3' },
                { balance: 1.67, count: 0, from: '4' },
                { balance: 1.68, count: 0, from: '5' },
                { balance: 51.68, count: 2, from: '6' },
            ];
            const testCase = new Map<string, { count: number; balance: number }>();
            testSigners.forEach((signer) => {
                const { from, count, balance } = signer;
                testCase.set(from, { count, balance });
            });
            const expected = ['5', '4', '1', '2', '3', '6'];
            const calculated = TransactionWatcherSignerService.getSortedSignersByAvailability(testCase);
            expect(calculated).to.be.deep.equal(expected);
        });
    });
});
