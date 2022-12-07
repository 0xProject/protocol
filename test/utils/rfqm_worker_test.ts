// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { expect } from 'chai';
import { BlockParamLiteral } from 'ethereum-types';
import { providers } from 'ethers';
import { anything, instance, mock, when } from 'ts-mockito';

import { NULL_ADDRESS, RFQM_TX_GAS_ESTIMATE } from '../../src/core/constants';
import { isWorkerReadyAndAbleAsync } from '../../src/utils/rfqm_worker_balance_utils';

let providerMock: providers.Provider;

describe('RFQM Worker balance utils', () => {
    describe('isWorkerReadyAndAbleAsync', () => {
        beforeEach(() => {
            providerMock = mock(providers.Web3Provider);
        });
        it('should assess the balance to trade', async () => {
            when(providerMock.getTransactionCount(NULL_ADDRESS)).thenResolve(0);
            when(providerMock.getTransactionCount(NULL_ADDRESS, anything())).thenResolve(0);
            const tests: [BigNumber, BigNumber, boolean][] = [
                [Web3Wrapper.toBaseUnitAmount(0.5, 18), Web3Wrapper.toBaseUnitAmount(120, 9), true],
                [Web3Wrapper.toBaseUnitAmount(0.05, 18), Web3Wrapper.toBaseUnitAmount(120, 9), false],
                [Web3Wrapper.toBaseUnitAmount(0.05, 18), Web3Wrapper.toBaseUnitAmount(100, 9), true],
            ];
            for (const test of tests) {
                const [balance, gasPrice, isSuccessful] = test;
                expect(
                    await isWorkerReadyAndAbleAsync(
                        instance(providerMock),
                        NULL_ADDRESS,
                        balance,
                        gasPrice,
                        RFQM_TX_GAS_ESTIMATE,
                    ),
                ).to.eql(isSuccessful);
            }
        });
        it('should fail with an outstanding transaction', async () => {
            when(providerMock.getTransactionCount(NULL_ADDRESS)).thenResolve(0);
            when(providerMock.getTransactionCount(NULL_ADDRESS, BlockParamLiteral.Pending)).thenResolve(1);

            expect(
                await isWorkerReadyAndAbleAsync(
                    instance(providerMock),
                    NULL_ADDRESS,
                    Web3Wrapper.toBaseUnitAmount(10, 18),
                    Web3Wrapper.toBaseUnitAmount(120, 9),
                    RFQM_TX_GAS_ESTIMATE,
                ),
            ).to.eql(false);
        });
    });
});
