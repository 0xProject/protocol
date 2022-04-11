import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import 'mocha';
import { instance, mock, when } from 'ts-mockito';

import { RfqmV2TransactionSubmissionEntity } from '../../src/entities/RfqmV2TransactionSubmissionEntity';
import { GasOracle } from '../../src/utils/GasOracle';
import { GasStationAttendantEthereum } from '../../src/utils/GasStationAttendantEthereum';
import { calculateGasEstimate } from '../../src/utils/rfqm_gas_estimate_utils';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { SubmissionContext } from '../../src/utils/SubmissionContext';

let gasOracleMock: GasOracle;

describe('GasStationAttendantEthereum', () => {
    before(() => {
        gasOracleMock = mock(GasOracle);
    });

    describe('getWorkerBalanceForTradeAsync', () => {
        it('gets the balance to trade', async () => {
            when(gasOracleMock.getBaseFeePerGasWeiAsync()).thenResolve(new BigNumber(1000));
            when(gasOracleMock.getMaxPriorityFeePerGasWeiAsync('instant')).thenResolve(new BigNumber(666));

            const attendant = new GasStationAttendantEthereum(instance(gasOracleMock));

            const workerGasToTrade = await attendant.getWorkerBalanceForTradeAsync();

            // Base fee is 1000. With 6 10% increases = 1000 * (1.1)^ 6 = 1771.561
            // Instant tip is 666
            // Gas estimate matches the one used in the algorithm
            const gasEstimate = calculateGasEstimate(
                '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                'otc',
                true,
            );

            expect(workerGasToTrade.toPrecision(2).toString()).to.equal(
                // tslint:disable-next-line: custom-no-magic-numbers
                new BigNumber(1771.561).plus(666).times(gasEstimate).toPrecision(2).toString(),
            );
        });
    });

    describe('getExpectedTransactionGasRateAsync', () => {
        it('estimates the transaction gas rate', async () => {
            when(gasOracleMock.getBaseFeePerGasWeiAsync()).thenResolve(new BigNumber(1000));

            const attendant = new GasStationAttendantEthereum(instance(gasOracleMock));

            const gasRate = await attendant.getExpectedTransactionGasRateAsync();

            // Base fee is 1000
            // Tip estimate is
            const tipEstimate = new BigNumber(2750000000);

            expect(gasRate.toString()).to.equal(
                // tslint:disable-next-line: custom-no-magic-numbers
                new BigNumber(1000).plus(tipEstimate).toString(),
            );
        });
    });
    describe('getNextBidAsync', () => {
        it('gets an initial bid when there are no existing transactions', async () => {
            when(gasOracleMock.getBaseFeePerGasWeiAsync()).thenResolve(new BigNumber(1000));

            const attendant = new GasStationAttendantEthereum(instance(gasOracleMock));
            const gasRate = await attendant.getNextBidAsync(null);

            const initialMaxPriorityFeePerGasWei = new BigNumber(2000000000);
            const initialMaxFeePerGasWei = new BigNumber(/* base fee */ 1000)
                .times(2)
                .plus(initialMaxPriorityFeePerGasWei);

            expect(gasRate?.maxPriorityFeePerGas?.toString()).to.equal(initialMaxPriorityFeePerGasWei.toString());
            expect(gasRate?.maxFeePerGas?.toString()).to.equal(initialMaxFeePerGasWei.toString());
        });

        it('calculates a resubmit bid when the base fee rises', async () => {
            when(gasOracleMock.getBaseFeePerGasWeiAsync()).thenResolve(new BigNumber(1000));
            when(gasOracleMock.getMaxPriorityFeePerGasWeiAsync('instant')).thenResolve(new BigNumber(666));
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(3),
                maxPriorityFeePerGas: new BigNumber(2),
            });

            const submissionContext = new SubmissionContext(instance(mock(RfqBlockchainUtils)), [transaction1]);
            const attendant = new GasStationAttendantEthereum(instance(gasOracleMock));
            const gasRate = await attendant.getNextBidAsync(submissionContext);

            // Previous submission gas prices were 2 tip, 3 max
            // new tip = 2 * 1.5 = 3
            // Base fee is now 1000
            // total = 2 x base fee + tip
            // total = 2 * 1000 + 3
            expect(gasRate?.maxPriorityFeePerGas?.toString()).to.equal(new BigNumber(3).toString());
            expect(gasRate?.maxFeePerGas?.toString()).to.equal(new BigNumber(2003).toString());
        });

        it('calculates a resubmit bid with the minimum max fee per gas increase', async () => {
            when(gasOracleMock.getBaseFeePerGasWeiAsync()).thenResolve(new BigNumber(0));
            when(gasOracleMock.getMaxPriorityFeePerGasWeiAsync('instant')).thenResolve(new BigNumber(666));
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(2002),
                maxPriorityFeePerGas: new BigNumber(2),
            });

            const submissionContext = new SubmissionContext(instance(mock(RfqBlockchainUtils)), [transaction1]);
            const attendant = new GasStationAttendantEthereum(instance(gasOracleMock));
            const gasRate = await attendant.getNextBidAsync(submissionContext);

            // Previous submission gas prices were 2 tip, 3 max
            // new tip = 2 * 1.5 = 3

            // Base fee is now 0, so max fee must go up by 10% so the node
            // accepts the transacion
            // old max fee per gas * 110% = 2002 * 1.1 = 2202.2
            expect(gasRate?.maxPriorityFeePerGas?.toString()).to.equal(new BigNumber(3).toString());
            expect(gasRate?.maxFeePerGas?.toString()).to.equal(
                new BigNumber(2202.2).integerValue(BigNumber.ROUND_CEIL).toString(),
            );
        });
    });
});
