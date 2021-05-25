// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { NULL_ADDRESS } from '../../src/constants';
import { workerHasEnoughBalance } from '../../src/utils/rfqm_worker_balance_utils';

describe('RFQM Worker balance utils', () => {
    describe('workerHasEnoughBalance', () => {
        const tests: [BigNumber, BigNumber, boolean][] = [
            [Web3Wrapper.toBaseUnitAmount(0.5, 18), Web3Wrapper.toBaseUnitAmount(120, 9), true],
            [Web3Wrapper.toBaseUnitAmount(0.05, 18), Web3Wrapper.toBaseUnitAmount(120, 9), false],
            [Web3Wrapper.toBaseUnitAmount(0.05, 18), Web3Wrapper.toBaseUnitAmount(100, 9), true],
        ];
        for (const test of tests) {
            const [balance, gasPrice, isSuccessful] = test;
            expect(workerHasEnoughBalance(NULL_ADDRESS, balance, gasPrice)).to.eql(isSuccessful);
        }
    });
});
