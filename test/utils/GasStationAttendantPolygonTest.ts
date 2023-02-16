import { BigNumber } from '@0x/utils';
import { instance, mock, when } from 'ts-mockito';

import { GWEI_DECIMALS } from '../../src/core/constants';
import { GasOracleType0 } from '../../src/utils/GasOracleType0';
import { GasStationAttendantPolygon } from '../../src/utils/GasStationAttendantPolygon';

let gasOracleMock: GasOracleType0;

describe('GasStationAttendantPolygon', () => {
    beforeAll(() => {
        gasOracleMock = mock(GasOracleType0);
    });

    describe('getWorkerBalanceForTradeAsync', () => {
        it('gets the balance to trade', async () => {
            when(gasOracleMock.getGasWeiAsync('fast')).thenResolve(new BigNumber(1000).shiftedBy(GWEI_DECIMALS));

            const attendant = new GasStationAttendantPolygon(instance(gasOracleMock));

            const workerGasToTrade = await attendant.getWorkerBalanceForTradeAsync();

            // 1000 GWEI * (1.1^3) = 1331
            // Gas estimate = 100,000 * 1.1 = 110,000
            // Total = 1331 * 110,000 = 146,410,000 GWEI

            expect(workerGasToTrade.toPrecision(2).toString()).toEqual(
                // tslint:disable-next-line: custom-no-magic-numbers
                new BigNumber(146_410_000).times(Math.pow(10, GWEI_DECIMALS)).toPrecision(2).toString(),
            );
        });
    });

    describe('getExpectedTransactionGasRateAsync', () => {
        it('estimates the transaction gas rate', async () => {
            when(gasOracleMock.getGasWeiAsync('fast')).thenResolve(new BigNumber(666).shiftedBy(GWEI_DECIMALS));

            const attendant = new GasStationAttendantPolygon(instance(gasOracleMock));

            const gasRate = await attendant.getExpectedTransactionGasRateAsync();

            // 666 * 1.1^1.5 = 768.35736217 GWEI
            expect(gasRate.toString()).toEqual(
                // tslint:disable-next-line: custom-no-magic-numbers
                new BigNumber(768.35736217)
                    .times(Math.pow(10, GWEI_DECIMALS))
                    .integerValue(BigNumber.ROUND_CEIL)
                    .toString(),
            );
        });
    });
});
