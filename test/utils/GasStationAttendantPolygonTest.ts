import { ProtocolFeeUtils } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { instance, mock, when } from 'ts-mockito';

import { GWEI_DECIMALS } from '../../src/constants';
import { RfqmV2TransactionSubmissionEntity } from '../../src/entities/RfqmV2TransactionSubmissionEntity';
import { RfqmTransactionSubmissionType } from '../../src/entities/types';
import { GasStationAttendantPolygon } from '../../src/utils/GasStationAttendantPolygon';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { SubmissionContext } from '../../src/utils/SubmissionContext';

let protocolFeeUtilsMock: ProtocolFeeUtils;

describe('GasStationAttendantPolygon', () => {
    beforeAll(() => {
        protocolFeeUtilsMock = mock(ProtocolFeeUtils);
    });

    describe('getWorkerBalanceForTradeAsync', () => {
        it('gets the balance to trade', async () => {
            when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(
                new BigNumber(1000).shiftedBy(GWEI_DECIMALS),
            );

            const attendant = new GasStationAttendantPolygon(instance(protocolFeeUtilsMock));

            const workerGasToTrade = await attendant.getWorkerBalanceForTradeAsync();

            // 1000 GWEI * (1.1^3) = 1331
            // Gas estimate = 100,000 * 1.1 = 110,000
            // Totol = 1331 * 110,000 = 146,410,000 GWEI

            expect(workerGasToTrade.toPrecision(2).toString()).to.equal(
                // tslint:disable-next-line: custom-no-magic-numbers
                new BigNumber(146_410_000).times(Math.pow(10, GWEI_DECIMALS)).toPrecision(2).toString(),
            );
        });
    });

    describe('getExpectedTransactionGasRateAsync', () => {
        it('estimates the transaction gas rate', async () => {
            when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(
                new BigNumber(666).shiftedBy(GWEI_DECIMALS),
            );

            const attendant = new GasStationAttendantPolygon(instance(protocolFeeUtilsMock));

            const gasRate = await attendant.getExpectedTransactionGasRateAsync();

            // 666 * 1.1^1.5 = 768.35736217 GWEI
            expect(gasRate.toString()).to.equal(
                // tslint:disable-next-line: custom-no-magic-numbers
                new BigNumber(768.35736217)
                    .times(Math.pow(10, GWEI_DECIMALS))
                    .integerValue(BigNumber.ROUND_CEIL)
                    .toString(),
            );
        });
    });

    describe('getNextBidAsync', () => {
        it('gets an initial minimum bid (30 GWEi)', async () => {
            when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(0));

            const attendant = new GasStationAttendantPolygon(instance(protocolFeeUtilsMock));
            const gasRate = await attendant.getNextBidAsync(null);

            expect(gasRate?.maxPriorityFeePerGas?.toString()).to.equal(new BigNumber(0).toString());
            expect(gasRate?.maxFeePerGas?.toString()).to.equal(
                new BigNumber(30).times(Math.pow(10, GWEI_DECIMALS)).toString(),
            );
        });

        it('gets an initial bid when there are no existing transactions', async () => {
            when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(
                new BigNumber(212).shiftedBy(GWEI_DECIMALS),
            );

            const attendant = new GasStationAttendantPolygon(instance(protocolFeeUtilsMock));
            const gasRate = await attendant.getNextBidAsync(null);

            const initialMaxPriorityFeePerGasWei = new BigNumber(212).times(Math.pow(10, GWEI_DECIMALS));
            const initialMaxFeePerGasWei = new BigNumber(/* base fee */ 1)
                .times(Math.pow(10, GWEI_DECIMALS))
                .plus(initialMaxPriorityFeePerGasWei);

            expect(gasRate?.maxPriorityFeePerGas?.toString()).to.equal(initialMaxPriorityFeePerGasWei.toString());
            expect(gasRate?.maxFeePerGas?.toString()).to.equal(initialMaxFeePerGasWei.toString());
        });

        it('calculates a resubmit bid when the fast gas rises', async () => {
            when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(
                new BigNumber(212).shiftedBy(GWEI_DECIMALS),
            );
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(3),
                maxPriorityFeePerGas: new BigNumber(2),
                type: RfqmTransactionSubmissionType.Trade,
            });

            const submissionContext = new SubmissionContext(instance(mock(RfqBlockchainUtils)), [transaction1]);
            const attendant = new GasStationAttendantPolygon(instance(protocolFeeUtilsMock));
            const gasRate = await attendant.getNextBidAsync(submissionContext);

            // Previous submission gas prices were 2 tip, 3 max
            // new tip = 212 GWEI
            // base fee = 1 GWEI
            // total = 213 GWEI
            expect(gasRate?.maxPriorityFeePerGas?.toString()).to.equal(
                new BigNumber(212).times(Math.pow(10, GWEI_DECIMALS)).toString(),
            );
            expect(gasRate?.maxFeePerGas?.toString()).to.equal(
                new BigNumber(213).times(Math.pow(10, GWEI_DECIMALS)).toString(),
            );
        });

        it('calculates a resubmit bid with the minimum max fee per gas increase', async () => {
            when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(0));
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(101).times(Math.pow(10, GWEI_DECIMALS)),
                maxPriorityFeePerGas: new BigNumber(100).times(Math.pow(10, GWEI_DECIMALS)),
                type: RfqmTransactionSubmissionType.Trade,
            });

            const submissionContext = new SubmissionContext(instance(mock(RfqBlockchainUtils)), [transaction1]);
            const attendant = new GasStationAttendantPolygon(instance(protocolFeeUtilsMock));
            const gasRate = await attendant.getNextBidAsync(submissionContext);

            // Previous submission gas prices were 100 tip, 101 toatl (GWEI)
            // new tip = 100 * 1.1 = 110 GWEI
            // Base Fee is always 1 GWEI
            // Max fee per gas = 110 + 1 = 111 GWEI
            //
            // BUT needs at least a 10% increase so 111.1
            expect(gasRate?.maxPriorityFeePerGas?.toString()).to.equal(
                new BigNumber(110).times(Math.pow(10, GWEI_DECIMALS)).toString(),
            );
            expect(gasRate?.maxFeePerGas?.toString()).to.equal(
                new BigNumber(111.1).times(Math.pow(10, GWEI_DECIMALS)).toString(),
            );
        });
    });
});
