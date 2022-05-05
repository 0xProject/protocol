// tslint:disable:custom-no-magic-numbers

import { BigNumber } from '@0x/utils';
import { anything, instance, mock, when } from 'ts-mockito';

import { DEFAULT_FEE_MODEL_CONFIGURATION } from '../../src/config';
import { BPS_TO_RATIO, RFQM_TX_OTC_ORDER_GAS_ESTIMATE } from '../../src/constants';
import { RfqmFeeService } from '../../src/services/rfqm_fee_service';
import { ConfigManager } from '../../src/utils/config_manager';
import { GasStationAttendantEthereum } from '../../src/utils/GasStationAttendantEthereum';
import { TokenPriceOracle } from '../../src/utils/TokenPriceOracle';

describe('RfqmFeeService', () => {
    const chainId = 1337;

    const feeToken = 'WethAddress';
    const feeTokenDecimals = 18;
    const feeTokenMetadata = {
        symbol: 'fee',
        decimals: feeTokenDecimals,
        tokenAddress: feeToken,
    };
    const feeTokenPrice = new BigNumber(3e-15);
    const makerToken = 'UsdcAddress';
    const makerTokenDecimals = 6;
    const makerTokenPrice = new BigNumber(1e-6);
    const takerToken = 'WbtcAddress';
    const takerTokenDecimals = 18;
    const takerTokenPrice = new BigNumber(6e-14);

    const gasPrice = new BigNumber(1e9);
    const gasEstimate = RFQM_TX_OTC_ORDER_GAS_ESTIMATE;

    describe('calculateFeeV1Async', () => {
        it('should calculate v1 fee for selling correctly', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);
            const tradeSizeBps = 5;
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getFeeModelConfiguration(chainId, makerToken, takerToken)).thenReturn({
                marginRakeRatio: 0,
                tradeSizeBps,
            });

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(gasPrice);

            const tokenPriceOracleMock = mock(TokenPriceOracle);
            when(tokenPriceOracleMock.batchFetchTokenPriceAsync(anything())).thenResolve([
                takerTokenPrice,
                feeTokenPrice,
            ]);

            const feeService: RfqmFeeService = new RfqmFeeService(
                chainId,
                feeTokenMetadata,
                instance(configManagerMock),
                instance(gasStationAttendantMock),
                instance(tokenPriceOracleMock),
            );

            // When
            const fee = await feeService.calculateFeeV1Async(
                makerToken,
                takerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedZeroExFeeAmount = assetFillAmount
                .times(tradeSizeBps * BPS_TO_RATIO)
                .times(takerTokenPrice)
                .dividedBy(feeTokenPrice);
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            expect(fee.type).toEqual('fixed');
            expect(fee.token).toEqual(feeToken);
            expect(fee.amount.toNumber()).toEqual(expectedTotalFeeAmount.toNumber());
            expect(fee.details.kind).toEqual('default');
            expect(fee.details.gasFeeAmount.toNumber()).toEqual(expectedGasFeeAmount.toNumber());
            expect(fee.details.gasPrice.toNumber()).toEqual(gasPrice.toNumber());
            expect(fee.details.zeroExFeeAmount.toNumber()).toEqual(expectedZeroExFeeAmount.toNumber());
            expect(fee.details.tradeSizeBps).toEqual(tradeSizeBps);
            expect(fee.details.feeTokenBaseUnitPriceUsd).toEqual(feeTokenPrice);
            expect(fee.details.takerTokenBaseUnitPriceUsd).toEqual(takerTokenPrice);
            expect(fee.details.makerTokenBaseUnitPriceUsd).toEqual(null);
        });
        it('should calculate v1 fee for buying correctly', async () => {
            // Given
            const isSelling = false;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(5000e6);
            const tradeSizeBps = 4;
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getFeeModelConfiguration(chainId, makerToken, takerToken)).thenReturn({
                marginRakeRatio: 0,
                tradeSizeBps,
            });

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(gasPrice);

            const tokenPriceOracleMock = mock(TokenPriceOracle);
            when(tokenPriceOracleMock.batchFetchTokenPriceAsync(anything())).thenResolve([
                makerTokenPrice,
                feeTokenPrice,
            ]);

            const feeService: RfqmFeeService = new RfqmFeeService(
                chainId,
                feeTokenMetadata,
                instance(configManagerMock),
                instance(gasStationAttendantMock),
                instance(tokenPriceOracleMock),
            );

            // When
            const fee = await feeService.calculateFeeV1Async(
                makerToken,
                takerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedZeroExFeeAmount = assetFillAmount
                .times(tradeSizeBps * BPS_TO_RATIO)
                .times(makerTokenPrice)
                .dividedBy(feeTokenPrice);
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            expect(fee.type).toEqual('fixed');
            expect(fee.token).toEqual(feeToken);
            expect(fee.amount.toNumber()).toEqual(expectedTotalFeeAmount.toNumber());
            expect(fee.details.kind).toEqual('default');
            expect(fee.details.gasFeeAmount.toNumber()).toEqual(expectedGasFeeAmount.toNumber());
            expect(fee.details.gasPrice.toNumber()).toEqual(gasPrice.toNumber());
            expect(fee.details.zeroExFeeAmount.toNumber()).toEqual(expectedZeroExFeeAmount.toNumber());
            expect(fee.details.tradeSizeBps).toEqual(tradeSizeBps);
            expect(fee.details.feeTokenBaseUnitPriceUsd).toEqual(feeTokenPrice);
            expect(fee.details.takerTokenBaseUnitPriceUsd).toEqual(null);
            expect(fee.details.makerTokenBaseUnitPriceUsd).toEqual(makerTokenPrice);
        });
        it('should not include zeroEx fee for non-configured pairs', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getFeeModelConfiguration(chainId, makerToken, takerToken)).thenReturn(
                DEFAULT_FEE_MODEL_CONFIGURATION,
            );

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(gasPrice);

            const tokenPriceOracleMock = mock(TokenPriceOracle);
            when(tokenPriceOracleMock.batchFetchTokenPriceAsync(anything())).thenResolve([
                takerTokenPrice,
                feeTokenPrice,
            ]);

            const feeService: RfqmFeeService = new RfqmFeeService(
                chainId,
                feeTokenMetadata,
                instance(configManagerMock),
                instance(gasStationAttendantMock),
                instance(tokenPriceOracleMock),
            );

            // When
            const fee = await feeService.calculateFeeV1Async(
                makerToken,
                takerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            expect(fee.type).toEqual('fixed');
            expect(fee.token).toEqual(feeToken);
            expect(fee.amount.toNumber()).toEqual(expectedGasFeeAmount.toNumber());
            expect(fee.details.kind).toEqual('default');
            expect(fee.details.gasFeeAmount.toNumber()).toEqual(expectedGasFeeAmount.toNumber());
            expect(fee.details.gasPrice.toNumber()).toEqual(gasPrice.toNumber());
            expect(fee.details.zeroExFeeAmount.toNumber()).toEqual(0);
            expect(fee.details.tradeSizeBps).toEqual(0);
            expect(fee.details.feeTokenBaseUnitPriceUsd).toEqual(null);
            expect(fee.details.takerTokenBaseUnitPriceUsd).toEqual(null);
            expect(fee.details.makerTokenBaseUnitPriceUsd).toEqual(null);
        });
        it('should not include zeroEx fee if price oracle is down', async () => {
            // Given
            const isSelling = false;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(5000e6);
            const tradeSizeBps = 4;
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getFeeModelConfiguration(chainId, makerToken, takerToken)).thenReturn({
                marginRakeRatio: 0,
                tradeSizeBps,
            });

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(gasPrice);

            const tokenPriceOracleMock = mock(TokenPriceOracle);
            when(tokenPriceOracleMock.batchFetchTokenPriceAsync(anything())).thenResolve([makerTokenPrice, null]);

            const feeService: RfqmFeeService = new RfqmFeeService(
                chainId,
                feeTokenMetadata,
                instance(configManagerMock),
                instance(gasStationAttendantMock),
                instance(tokenPriceOracleMock),
            );

            // When
            const fee = await feeService.calculateFeeV1Async(
                makerToken,
                takerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            expect(fee.type).toEqual('fixed');
            expect(fee.token).toEqual(feeToken);
            expect(fee.amount.toNumber()).toEqual(expectedGasFeeAmount.toNumber());
            expect(fee.details.kind).toEqual('default');
            expect(fee.details.gasFeeAmount.toNumber()).toEqual(expectedGasFeeAmount.toNumber());
            expect(fee.details.gasPrice.toNumber()).toEqual(gasPrice.toNumber());
            expect(fee.details.zeroExFeeAmount.toNumber()).toEqual(0);
            expect(fee.details.tradeSizeBps).toEqual(0);
            expect(fee.details.feeTokenBaseUnitPriceUsd).toEqual(null);
            expect(fee.details.takerTokenBaseUnitPriceUsd).toEqual(null);
            expect(fee.details.makerTokenBaseUnitPriceUsd).toEqual(null);
        });
    });
});
