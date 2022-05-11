// tslint:disable:custom-no-magic-numbers

import { BigNumber } from '@0x/utils';
import { anything, instance, mock, when } from 'ts-mockito';

import { DEFAULT_FEE_MODEL_CONFIGURATION } from '../../src/config';
import { BPS_TO_RATIO, RFQM_TX_OTC_ORDER_GAS_ESTIMATE } from '../../src/constants';
import { FeeWithDetails, RfqmFeeService } from '../../src/services/rfqm_fee_service';
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

    const integrator = {
        apiKeys: [],
        integratorId: 'integratorId',
        allowedChainIds: [1, 3, 137, 1337],
        label: 'dummy integrator',
        plp: true,
        rfqm: true,
        rfqt: true,
    };
    const takerAddress = 'takerAddress';
    const feeModelVersion = 1;

    describe('calculateFeeV1Async', () => {
        it('should calculate v1 fee for selling correctly', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);
            const configuredTradeSizeBps = 5;
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getFeeModelConfiguration(chainId, makerToken, takerToken)).thenReturn({
                marginRakeRatio: 0,
                tradeSizeBps: configuredTradeSizeBps,
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
            const fee = await feeService.calculateFeeAsync({
                feeModelVersion,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                isFirm: true,
                takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedZeroExFeeAmount = assetFillAmount
                .times(configuredTradeSizeBps * BPS_TO_RATIO)
                .times(takerTokenPrice)
                .dividedBy(feeTokenPrice)
                .integerValue();
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeToken,
                amount: expectedTotalFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    configuredTradeSizeBps,
                    tradeSizeBps: configuredTradeSizeBps,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: takerTokenPrice,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
        it('should calculate v1 fee for buying correctly', async () => {
            // Given
            const isSelling = false;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(5000e6);
            const configuredTradeSizeBps = 4;
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getFeeModelConfiguration(chainId, makerToken, takerToken)).thenReturn({
                marginRakeRatio: 0,
                tradeSizeBps: configuredTradeSizeBps,
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
            const fee = await feeService.calculateFeeAsync({
                feeModelVersion,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                isFirm: false,
                takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedZeroExFeeAmount = assetFillAmount
                .times(configuredTradeSizeBps * BPS_TO_RATIO)
                .times(makerTokenPrice)
                .dividedBy(feeTokenPrice)
                .integerValue();
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeToken,
                amount: expectedTotalFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    configuredTradeSizeBps,
                    tradeSizeBps: configuredTradeSizeBps,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
            };
            expect(fee).toMatchObject(expectedFee);
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
            const fee = await feeService.calculateFeeAsync({
                feeModelVersion,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                isFirm: false,
                takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeToken,
                amount: expectedGasFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: new BigNumber(0),
                    configuredTradeSizeBps: 0,
                    tradeSizeBps: 0,
                    feeTokenBaseUnitPriceUsd: null,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
        it('should not include zeroEx fee if price oracle is down', async () => {
            // Given
            const isSelling = false;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(5000e6);
            const configuredTradeSizeBps = 4;
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getFeeModelConfiguration(chainId, makerToken, takerToken)).thenReturn({
                marginRakeRatio: 0,
                tradeSizeBps: configuredTradeSizeBps,
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

            // When
            const fee = await feeService.calculateFeeAsync({
                feeModelVersion,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                isFirm: true,
                takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeToken,
                amount: expectedGasFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: new BigNumber(0),
                    configuredTradeSizeBps,
                    tradeSizeBps: 0,
                    feeTokenBaseUnitPriceUsd: null,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
    });
});
