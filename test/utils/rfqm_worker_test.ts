// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { BlockParamLiteral } from 'ethereum-types';
import { anything, instance, mock, when } from 'ts-mockito';

import { NULL_ADDRESS } from '../../src/constants';
import { isWorkerReadyAndAbleAsync } from '../../src/utils/rfqm_worker_balance_utils';

let web3WrapperMock: Web3Wrapper;

describe('RFQM Worker balance utils', () => {
    describe('isWorkerReadyAndAbleAsync', () => {
        beforeEach(() => {
            web3WrapperMock = mock(Web3Wrapper);
        });
        it('should assess the balance to trade', async () => {
            when(web3WrapperMock.getAccountNonceAsync(NULL_ADDRESS)).thenResolve(0);
            when(web3WrapperMock.getAccountNonceAsync(NULL_ADDRESS, anything())).thenResolve(0);
            const tests: [BigNumber, BigNumber, boolean][] = [
                [Web3Wrapper.toBaseUnitAmount(0.5, 18), Web3Wrapper.toBaseUnitAmount(120, 9), true],
                [Web3Wrapper.toBaseUnitAmount(0.05, 18), Web3Wrapper.toBaseUnitAmount(120, 9), false],
                [Web3Wrapper.toBaseUnitAmount(0.05, 18), Web3Wrapper.toBaseUnitAmount(100, 9), true],
            ];
            for (const test of tests) {
                const [balance, gasPrice, isSuccessful] = test;
                expect(
                    await isWorkerReadyAndAbleAsync(instance(web3WrapperMock), NULL_ADDRESS, balance, gasPrice),
                ).to.eql(isSuccessful);
            }
        });
        it('should fail with an outstanding transaction', async () => {
            when(web3WrapperMock.getAccountNonceAsync(NULL_ADDRESS)).thenResolve(0);
            when(web3WrapperMock.getAccountNonceAsync(NULL_ADDRESS, BlockParamLiteral.Pending)).thenResolve(1);

            expect(
                await isWorkerReadyAndAbleAsync(
                    instance(web3WrapperMock),
                    NULL_ADDRESS,
                    Web3Wrapper.toBaseUnitAmount(10, 18),
                    Web3Wrapper.toBaseUnitAmount(120, 9),
                ),
            ).to.eql(false);
        });
    });
});
