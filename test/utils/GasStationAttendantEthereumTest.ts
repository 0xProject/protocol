import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { instance, mock, when } from 'ts-mockito';

import { GasOracleType2 } from '../../src/utils/GasOracleType2';
import { GasStationAttendantEthereum } from '../../src/utils/GasStationAttendantEthereum';
import { calculateGasEstimate } from '../../src/utils/rfqm_gas_estimate_utils';

let gasOracleMock: GasOracleType2;

describe('GasStationAttendantEthereum', () => {
    beforeAll(() => {
        gasOracleMock = mock(GasOracleType2);
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
});
