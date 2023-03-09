// tslint:disable:max-file-line-count
// tslint:disable:custom-no-magic-numbers

import { BigNumber } from '@0x/utils';
import { anything, instance, mock, when } from 'ts-mockito';

import { DEFAULT_FEE_MODEL_CONFIGURATION, FeeModelConfiguration } from '../../src/config';
import {
    BPS_TO_RATIO,
    DEFAULT_MIN_EXPIRY_DURATION_MS,
    RFQM_TX_OTC_ORDER_GAS_ESTIMATE,
    ZERO,
} from '../../src/core/constants';
import {
    calculateDefaultFeeAmount,
    calculatePriceImprovementAmount,
    reviseQuoteWithFees,
    FeeService,
} from '../../src/services/fee_service';
import { QuoteContext } from '../../src/services/types';
import { FeeWithDetails, IndicativeQuote, TokenMetadata } from '../../src/core/types';
import { ConfigManager } from '../../src/utils/config_manager';
import { GasStationAttendantEthereum } from '../../src/utils/GasStationAttendantEthereum';
import { TokenPriceOracle } from '../../src/utils/TokenPriceOracle';
import { AmmQuote, ZeroExApiClient } from '../../src/utils/ZeroExApiClient';

const feeTokenSymbol = 'fee';
const feeTokenAddress = 'feeTokenAddress';
const feeTokenDecimals = 18;

const buildFeeService = (overrides: {
    feeModelConfiguration?: FeeModelConfiguration;
    gasPrice?: BigNumber;
    tradeTokenPrice?: BigNumber | null;
    feeTokenPrice?: BigNumber | null;
    ammQuote?: AmmQuote | null;
    chainId?: number;
    feeTokenMetadata?: TokenMetadata;
    configManagerMock?: ConfigManager;
    gasStationAttendantMock?: GasStationAttendantEthereum;
    tokenPriceOracleMock?: TokenPriceOracle;
    zeroExApiClientMock?: ZeroExApiClient;
}): FeeService => {
    const chainId = overrides?.chainId || 1337;
    const feeTokenMetadata = overrides?.feeTokenMetadata || {
        symbol: feeTokenSymbol,
        decimals: feeTokenDecimals,
        tokenAddress: feeTokenAddress,
    };
    const feeModelConfiguration = overrides?.feeModelConfiguration || DEFAULT_FEE_MODEL_CONFIGURATION;
    const gasPrice = overrides?.gasPrice || new BigNumber(1e9);
    const tradeTokenPrice = overrides?.tradeTokenPrice || null;
    const feeTokenPrice = overrides?.feeTokenPrice || null;
    const ammQuote = overrides?.ammQuote || null;

    const configManagerMock = mock(ConfigManager);
    when(configManagerMock.getFeeModelConfiguration(chainId, anything(), anything())).thenReturn(feeModelConfiguration);

    const gasStationAttendantMock = mock(GasStationAttendantEthereum);
    when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(gasPrice);

    const tokenPriceOracleMock = mock(TokenPriceOracle);
    when(tokenPriceOracleMock.batchFetchTokenPriceAsync(anything())).thenResolve([tradeTokenPrice, feeTokenPrice]);

    const zeroExApiClientMock = mock(ZeroExApiClient);
    when(zeroExApiClientMock.fetchAmmQuoteAsync(anything())).thenResolve(ammQuote);

    return new FeeService(
        chainId,
        feeTokenMetadata,
        instance(overrides?.configManagerMock || configManagerMock),
        instance(overrides?.gasStationAttendantMock || gasStationAttendantMock),
        instance(overrides?.tokenPriceOracleMock || tokenPriceOracleMock),
        instance(overrides?.zeroExApiClientMock || zeroExApiClientMock),
        DEFAULT_MIN_EXPIRY_DURATION_MS,
    );
};

describe('FeeService', () => {
    const workflow = 'rfqm';
    const txOrigin = 'registryAddress';
    const makerToken = 'UsdcAddress';
    const makerTokenDecimals = 6;
    const makerTokenPrice = new BigNumber(1e-6);

    const takerToken = 'WbtcAddress';
    const takerTokenDecimals = 18;
    const takerTokenPrice = new BigNumber(6e-14);

    const gasPrice = new BigNumber(1e9);
    const gasEstimate = RFQM_TX_OTC_ORDER_GAS_ESTIMATE;

    const feeTokenPrice = new BigNumber(3e-15);

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

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('calculateFeeAsync v0', () => {
        const feeModelVersion = 0;
        it('should calculate v0 fee for RFQm correctly', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);
            const tradeSizeBps = 5;

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio: 0,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: takerTokenPrice,
                feeTokenPrice,
            });

            // When
            const { feeWithDetails: fee } = await feeService.calculateFeeAsync({
                workflow,
                chainId: 1337,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                isFirm: true,
                takerAddress,
                trader: takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedGasFeeAmount,
                details: {
                    kind: 'gasOnly',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: null,
                    feeTokenBaseUnitPriceUsd: null,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
        it('should calculate v0 fee for RFQt correctly', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);
            const tradeSizeBps = 5;

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio: 0,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: takerTokenPrice,
                feeTokenPrice,
            });

            // When
            const { feeWithDetails: fee } = await feeService.calculateFeeAsync({
                workflow: 'rfqt',
                chainId: 1337,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                isFirm: true,
                takerAddress,
                trader: takerAddress,
                integrator,
            });

            // Then
            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: new BigNumber(0),
                details: {
                    kind: 'gasOnly',
                    feeModelVersion,
                    gasFeeAmount: new BigNumber(0),
                    gasPrice: new BigNumber(0),
                },
                breakdown: {},
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: null,
                    feeTokenBaseUnitPriceUsd: null,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
    });

    describe('calculateFeeAsync v1', () => {
        const feeModelVersion = 1;
        it('should calculate v1 fee for RFQm selling correctly', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);
            const tradeSizeBps = 5;

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio: 0,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: takerTokenPrice,
                feeTokenPrice,
            });

            // When
            const { feeWithDetails: fee } = await feeService.calculateFeeAsync({
                workflow,
                chainId: 1337,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                isFirm: true,
                takerAddress,
                trader: takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedZeroExFeeAmount = assetFillAmount
                .times(tradeSizeBps * BPS_TO_RATIO)
                .times(takerTokenPrice)
                .div(feeTokenPrice)
                .integerValue();
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedTotalFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    tradeSizeBps,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: takerTokenPrice,
                    makerTokenBaseUnitPriceUsd: null,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                    zeroEx: {
                        amount: expectedZeroExFeeAmount,
                        details: {
                            kind: 'volume',
                            tradeSizeBps,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: feeTokenPrice,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: takerTokenPrice,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
        it('should calculate v1 fee for RFQm buying correctly', async () => {
            // Given
            const isSelling = false;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(5000e6);
            const tradeSizeBps = 4;

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio: 0,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: makerTokenPrice,
                feeTokenPrice,
            });

            // When
            const { feeWithDetails: fee } = await feeService.calculateFeeAsync({
                workflow,
                chainId: 1337,
                feeModelVersion,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                makerAmount: assetFillAmount,
                isFirm: false,
                takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedZeroExFeeAmount = assetFillAmount
                .times(tradeSizeBps * BPS_TO_RATIO)
                .times(makerTokenPrice)
                .div(feeTokenPrice)
                .integerValue();
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedTotalFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    tradeSizeBps,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                    zeroEx: {
                        amount: expectedZeroExFeeAmount,
                        details: {
                            kind: 'volume',
                            tradeSizeBps,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: feeTokenPrice,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
        it('should calculate v1 fee for RFQt selling correctly', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);
            const tradeSizeBps = 5;

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio: 0,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: takerTokenPrice,
                feeTokenPrice,
            });

            // When
            const { feeWithDetails: fee } = await feeService.calculateFeeAsync({
                workflow: 'rfqt',
                chainId: 1337,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                isFirm: true,
                takerAddress,
                trader: takerAddress,
                integrator,
            });

            // Then
            const expectedZeroExFeeAmount = assetFillAmount
                .times(tradeSizeBps * BPS_TO_RATIO)
                .times(takerTokenPrice)
                .div(feeTokenPrice)
                .integerValue();

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedZeroExFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: new BigNumber(0),
                    gasPrice: new BigNumber(0),
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    tradeSizeBps,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: takerTokenPrice,
                    makerTokenBaseUnitPriceUsd: null,
                },
                breakdown: {
                    zeroEx: {
                        amount: expectedZeroExFeeAmount,
                        details: {
                            kind: 'volume',
                            tradeSizeBps,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: feeTokenPrice,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: takerTokenPrice,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
        it('should not include zeroEx fee for non-configured pairs', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(0.345e18);

            const feeService: FeeService = buildFeeService({
                gasPrice,
                tradeTokenPrice: takerTokenPrice,
                feeTokenPrice,
            });

            // When
            const { feeWithDetails: fee } = await feeService.calculateFeeAsync({
                workflow,
                chainId: 1337,
                feeModelVersion,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                isFirm: false,
                takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedGasFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: new BigNumber(0),
                    tradeSizeBps: 0,
                    feeTokenBaseUnitPriceUsd: null,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: null,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                    zeroEx: {
                        amount: new BigNumber(0),
                        details: {
                            kind: 'volume',
                            tradeSizeBps: 0,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: null,
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
            const tradeSizeBps = 4;

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio: 0,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: makerTokenPrice,
                feeTokenPrice: null,
            });

            // When
            const { feeWithDetails: fee } = await feeService.calculateFeeAsync({
                workflow,
                chainId: 1337,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                makerAmount: assetFillAmount,
                isFirm: true,
                takerAddress,
                trader: takerAddress,
                integrator,
            });

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedGasFeeAmount,
                details: {
                    kind: 'gasOnly',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: null,
                    feeTokenBaseUnitPriceUsd: null,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(fee).toMatchObject(expectedFee);
        });
    });

    describe('calculateFeeAsync v2', () => {
        const feeModelVersion = 2;
        it('should calculate v2 `price improvement` based fee for sell correctly if price improvement detection succeeded', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(1e18);
            const marginRakeRatio = 0.5;

            const ammMakerAmount = new BigNumber(3450e6);
            const expectedSlippage = new BigNumber(-0.01);
            const estimatedAmmGasFeeWei = new BigNumber(100e9);
            const decodedUniqueId = '1234-5678';
            const ammQuote: AmmQuote = {
                makerAmount: ammMakerAmount,
                takerAmount: assetFillAmount,
                expectedSlippage,
                estimatedGasFeeWei: estimatedAmmGasFeeWei,
                decodedUniqueId,
            };

            const mm1MakerAmount = new BigNumber(3550e6);
            const mm2MakerAmount = new BigNumber(3600e6);
            const mmQuotes: IndicativeQuote[] = [
                {
                    maker: 'maker1Address',
                    makerUri: 'http://maker1.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm1MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
                {
                    maker: 'maker2Address',
                    makerUri: 'http://maker2.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm2MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
            ];

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio,
                    tradeSizeBps: 0,
                },
                gasPrice,
                tradeTokenPrice: makerTokenPrice,
                feeTokenPrice,
                ammQuote,
            });

            const quoteContext: QuoteContext = {
                workflow,
                chainId: 1337,
                isFirm: true,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                takerAddress,
                trader: takerAddress,
                integrator,
            };

            // When
            jest.useFakeTimers().setSystemTime(1650000000000);
            const { feeWithDetails, quotesWithGasFee, ammQuoteUniqueId } = await feeService.calculateFeeAsync(
                quoteContext,
                async () => {
                    return Promise.resolve(mmQuotes);
                },
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedMargin = mm2MakerAmount
                .minus(ammMakerAmount.times(new BigNumber(1).plus(expectedSlippage)))
                .times(makerTokenPrice)
                .div(feeTokenPrice)
                .plus(estimatedAmmGasFeeWei)
                .integerValue();
            const expectedZeroExFeeAmount = expectedMargin.times(marginRakeRatio).integerValue();
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedTotalFeeAmount,
                details: {
                    kind: 'margin',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    margin: expectedMargin,
                    marginRakeRatio,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                    zeroEx: {
                        amount: expectedZeroExFeeAmount,
                        details: {
                            kind: 'price_improvement',
                            priceImprovement: expectedMargin,
                            rakeRatio: marginRakeRatio,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: feeTokenPrice,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
            };
            expect(feeWithDetails).toMatchObject(expectedFee);
            expect(quotesWithGasFee).toMatchObject(mmQuotes);
            expect(ammQuoteUniqueId).toBe(decodedUniqueId);

            // When
            const revisedQuotes = await feeService.reviseQuotesAsync(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                quotesWithGasFee!,
                expectedZeroExFeeAmount,
                quoteContext,
            );

            // Then
            const expectedRevisedQuotes = mmQuotes.map((quote) =>
                reviseQuoteWithFees(quote, expectedZeroExFeeAmount, isSelling, makerTokenPrice, feeTokenPrice),
            );

            expect(revisedQuotes).toMatchObject(expectedRevisedQuotes);
        });
        it('should calculate v2 `price improvement` based fee for buy correctly if price improvement detection succeeded', async () => {
            // Given
            const isSelling = false;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(1e18);
            const marginRakeRatio = 0.4;

            const ammTakerAmount = new BigNumber(3450e6);
            const expectedSlippage = new BigNumber(-0.1);
            const estimatedAmmGasFeeWei = new BigNumber(100e9);
            const decodedUniqueId = '1234-5678';
            const ammQuote: AmmQuote = {
                makerAmount: assetFillAmount,
                takerAmount: ammTakerAmount,
                expectedSlippage,
                estimatedGasFeeWei: estimatedAmmGasFeeWei,
                decodedUniqueId,
            };

            const mm1TakerAmount = new BigNumber(3400e6);
            const mm2TakerAmount = new BigNumber(3350e6);
            const mmQuotes: IndicativeQuote[] = [
                {
                    maker: 'maker1Address',
                    makerUri: 'http://maker1.com',
                    makerToken,
                    takerToken,
                    makerAmount: assetFillAmount,
                    takerAmount: mm1TakerAmount,
                    expiry: new BigNumber(1652722767),
                },
                {
                    maker: 'maker2Address',
                    makerUri: 'http://maker2.com',
                    makerToken,
                    takerToken,
                    makerAmount: assetFillAmount,
                    takerAmount: mm2TakerAmount,
                    expiry: new BigNumber(1652722767),
                },
            ];

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio,
                    tradeSizeBps: 0,
                },
                gasPrice,
                tradeTokenPrice: takerTokenPrice,
                feeTokenPrice,
                ammQuote,
            });

            const quoteContext: QuoteContext = {
                workflow,
                chainId: 1337,
                feeModelVersion,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                makerAmount: assetFillAmount,
                isFirm: false,
                takerAddress,
                integrator,
            };

            // When
            jest.useFakeTimers().setSystemTime(1650000000000);
            const { feeWithDetails, quotesWithGasFee, ammQuoteUniqueId } = await feeService.calculateFeeAsync(
                quoteContext,
                async () => {
                    return Promise.resolve(mmQuotes);
                },
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedMargin = ammTakerAmount
                .times(new BigNumber(1).minus(expectedSlippage))
                .minus(mm2TakerAmount)
                .times(takerTokenPrice)
                .div(feeTokenPrice)
                .plus(estimatedAmmGasFeeWei)
                .integerValue();
            const expectedZeroExFeeAmount = expectedMargin.times(marginRakeRatio).integerValue();
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedTotalFeeAmount,
                details: {
                    kind: 'margin',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    margin: expectedMargin,
                    marginRakeRatio,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: takerTokenPrice,
                    makerTokenBaseUnitPriceUsd: null,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                    zeroEx: {
                        amount: expectedZeroExFeeAmount,
                        details: {
                            kind: 'price_improvement',
                            priceImprovement: expectedMargin,
                            rakeRatio: marginRakeRatio,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: feeTokenPrice,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: takerTokenPrice,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(feeWithDetails).toMatchObject(expectedFee);
            expect(quotesWithGasFee).toMatchObject(mmQuotes);
            expect(ammQuoteUniqueId).toBe(decodedUniqueId);

            // When
            const revisedQuotes = await feeService.reviseQuotesAsync(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                quotesWithGasFee!,
                expectedZeroExFeeAmount,
                quoteContext,
            );

            // Then
            const expectedRevisedQuotes = mmQuotes.map((quote) =>
                reviseQuoteWithFees(quote, expectedZeroExFeeAmount, isSelling, takerTokenPrice, feeTokenPrice),
            );

            expect(revisedQuotes).toMatchObject(expectedRevisedQuotes);
        });
        it('should calculate v2 `default` fee correctly if token price query succeeded but 0x-api query failed', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(1e18);
            const marginRakeRatio = 0.5;
            const tradeSizeBps = 5;

            const ammQuote = null;

            const mm1MakerAmount = new BigNumber(3550e6);
            const mm2MakerAmount = new BigNumber(3600e6);
            const mmQuotes: IndicativeQuote[] = [
                {
                    maker: 'maker1Address',
                    makerUri: 'http://maker1.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm1MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
                {
                    maker: 'maker2Address',
                    makerUri: 'http://maker2.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm2MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
            ];

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: makerTokenPrice,
                feeTokenPrice,
                ammQuote,
            });

            const quoteContext: QuoteContext = {
                workflow,
                chainId: 1337,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                isFirm: true,
                takerAddress,
                trader: takerAddress,
                integrator,
            };

            // When
            jest.useFakeTimers().setSystemTime(1650000000000);
            const { feeWithDetails, quotesWithGasFee, ammQuoteUniqueId } = await feeService.calculateFeeAsync(
                quoteContext,
                async () => {
                    return Promise.resolve(mmQuotes);
                },
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);
            const expectedZeroExFeeAmount = calculateDefaultFeeAmount(
                mm2MakerAmount,
                tradeSizeBps,
                makerTokenPrice,
                feeTokenPrice,
            );
            const expectedTotalFeeAmount = expectedZeroExFeeAmount.plus(expectedGasFeeAmount);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedTotalFeeAmount,
                details: {
                    kind: 'default',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: expectedZeroExFeeAmount,
                    tradeSizeBps,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                    zeroEx: {
                        amount: expectedZeroExFeeAmount,
                        details: {
                            kind: 'volume',
                            tradeSizeBps,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: feeTokenPrice,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
            };
            expect(feeWithDetails).toMatchObject(expectedFee);
            expect(quotesWithGasFee).toMatchObject(mmQuotes);
            expect(ammQuoteUniqueId).toBe(undefined);

            // When
            const revisedQuotes = await feeService.reviseQuotesAsync(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                quotesWithGasFee!,
                expectedZeroExFeeAmount,
                quoteContext,
            );

            // Then
            const expectedRevisedQuotes = mmQuotes.map((quote) =>
                reviseQuoteWithFees(quote, expectedZeroExFeeAmount, isSelling, makerTokenPrice, feeTokenPrice),
            );

            expect(revisedQuotes).toMatchObject(expectedRevisedQuotes);
        });
        it('should calculate v2 `gasOnly` fee correctly if token price query failed', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(1e18);
            const marginRakeRatio = 0.5;
            const tradeSizeBps = 5;

            const ammMakerAmount = new BigNumber(3450e6);
            const expectedSlippage = new BigNumber(-0.01);
            const estimatedAmmGasFeeWei = new BigNumber(100e9);
            const decodedUniqueId = '1234-5678';
            const ammQuote: AmmQuote = {
                makerAmount: ammMakerAmount,
                takerAmount: assetFillAmount,
                expectedSlippage,
                estimatedGasFeeWei: estimatedAmmGasFeeWei,
                decodedUniqueId,
            };

            const mm1MakerAmount = new BigNumber(3550e6);
            const mm2MakerAmount = new BigNumber(3600e6);
            const mmQuotes: IndicativeQuote[] = [
                {
                    maker: 'maker1Address',
                    makerUri: 'http://maker1.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm1MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
                {
                    maker: 'maker2Address',
                    makerUri: 'http://maker2.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm2MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
            ];

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio,
                    tradeSizeBps,
                },
                gasPrice,
                tradeTokenPrice: makerTokenPrice,
                feeTokenPrice: null,
                ammQuote,
            });

            // When
            jest.useFakeTimers().setSystemTime(1650000000000);
            const { feeWithDetails, quotesWithGasFee, ammQuoteUniqueId } = await feeService.calculateFeeAsync(
                {
                    workflow,
                    chainId: 1337,
                    feeModelVersion,
                    txOrigin,
                    makerToken,
                    takerToken,
                    originalMakerToken: makerToken,
                    makerTokenDecimals,
                    takerTokenDecimals,
                    isUnwrap,
                    isSelling,
                    assetFillAmount,
                    takerAmount: assetFillAmount,
                    isFirm: true,
                    takerAddress,
                    trader: takerAddress,
                    integrator,
                },
                async () => {
                    return Promise.resolve(mmQuotes);
                },
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedGasFeeAmount,
                details: {
                    kind: 'gasOnly',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: null,
                    feeTokenBaseUnitPriceUsd: null,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: null,
                },
            };
            expect(feeWithDetails).toMatchObject(expectedFee);
            expect(quotesWithGasFee).toMatchObject(mmQuotes);
            expect(ammQuoteUniqueId).toBe(decodedUniqueId);
        });
        it('should calculate v2 `price improvement` based fee with zero zeroExFee if price improvement is zero', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(1e18);
            const marginRakeRatio = 0.5;

            const ammMakerAmount = new BigNumber(4000e6);
            const expectedSlippage = new BigNumber(-0.01);
            const estimatedAmmGasFeeWei = new BigNumber(100e9);
            const decodedUniqueId = '1234-5678';
            const ammQuote: AmmQuote = {
                makerAmount: ammMakerAmount,
                takerAmount: assetFillAmount,
                expectedSlippage,
                estimatedGasFeeWei: estimatedAmmGasFeeWei,
                decodedUniqueId,
            };

            const mm1MakerAmount = new BigNumber(3550e6);
            const mm2MakerAmount = new BigNumber(3600e6);
            const mmQuotes: IndicativeQuote[] = [
                {
                    maker: 'maker1Address',
                    makerUri: 'http://maker1.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm1MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
                {
                    maker: 'maker2Address',
                    makerUri: 'http://maker2.com',
                    makerToken,
                    takerToken,
                    makerAmount: mm2MakerAmount,
                    takerAmount: assetFillAmount,
                    expiry: new BigNumber(1652722767),
                },
            ];

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio,
                    tradeSizeBps: 0,
                },
                gasPrice,
                tradeTokenPrice: makerTokenPrice,
                feeTokenPrice,
                ammQuote,
            });

            // When
            jest.useFakeTimers().setSystemTime(1650000000000);
            const { feeWithDetails, quotesWithGasFee, ammQuoteUniqueId } = await feeService.calculateFeeAsync(
                {
                    workflow,
                    chainId: 1337,
                    feeModelVersion,
                    txOrigin,
                    makerToken,
                    takerToken,
                    originalMakerToken: makerToken,
                    makerTokenDecimals,
                    takerTokenDecimals,
                    isUnwrap,
                    isSelling,
                    assetFillAmount,
                    takerAmount: assetFillAmount,
                    isFirm: true,
                    takerAddress,
                    trader: takerAddress,
                    integrator,
                },
                async () => {
                    return Promise.resolve(mmQuotes);
                },
            );

            // Then
            const expectedGasFeeAmount = gasPrice.times(gasEstimate);

            const expectedFee: FeeWithDetails = {
                type: 'fixed',
                token: feeTokenAddress,
                amount: expectedGasFeeAmount,
                details: {
                    kind: 'margin',
                    feeModelVersion,
                    gasFeeAmount: expectedGasFeeAmount,
                    gasPrice,
                    zeroExFeeAmount: ZERO,
                    margin: ZERO,
                    marginRakeRatio,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
                breakdown: {
                    gas: {
                        amount: expectedGasFeeAmount,
                        details: {
                            gasPrice,
                            estimatedGas: new BigNumber(gasEstimate),
                        },
                    },
                    zeroEx: {
                        amount: ZERO,
                        details: {
                            kind: 'price_improvement',
                            priceImprovement: ZERO,
                            rakeRatio: marginRakeRatio,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: feeTokenPrice,
                    feeTokenBaseUnitPriceUsd: feeTokenPrice,
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: makerTokenPrice,
                },
            };
            expect(feeWithDetails).toMatchObject(expectedFee);
            expect(quotesWithGasFee).toMatchObject(mmQuotes);
            expect(ammQuoteUniqueId).toBe(decodedUniqueId);
        });
        it('should throw if called from RFQt workflow', async () => {
            // Given
            const isSelling = true;
            const isUnwrap = false;
            const assetFillAmount = new BigNumber(1e18);
            const marginRakeRatio = 0.5;

            const ammMakerAmount = new BigNumber(3450e6);
            const expectedSlippage = new BigNumber(-0.01);
            const estimatedAmmGasFeeWei = new BigNumber(100e9);
            const decodedUniqueId = '1234-5678';
            const ammQuote: AmmQuote = {
                makerAmount: ammMakerAmount,
                takerAmount: assetFillAmount,
                expectedSlippage,
                estimatedGasFeeWei: estimatedAmmGasFeeWei,
                decodedUniqueId,
            };

            const feeService: FeeService = buildFeeService({
                feeModelConfiguration: {
                    marginRakeRatio,
                    tradeSizeBps: 0,
                },
                gasPrice,
                tradeTokenPrice: makerTokenPrice,
                feeTokenPrice,
                ammQuote,
            });

            const quoteContext: QuoteContext = {
                workflow: 'rfqt',
                chainId: 1337,
                isFirm: true,
                feeModelVersion,
                txOrigin,
                makerToken,
                takerToken,
                originalMakerToken: makerToken,
                makerTokenDecimals,
                takerTokenDecimals,
                isUnwrap,
                isSelling,
                assetFillAmount,
                takerAmount: assetFillAmount,
                takerAddress,
                trader: takerAddress,
                integrator,
            };

            // When
            await expect(() => feeService.calculateFeeAsync(quoteContext)).rejects.toThrow('Not implemented');
        });
    });

    describe('pure function calculateDefaultFeeAmount()', () => {
        it('should calculate default fee amount correctly', async () => {
            // Given
            const tradeTokenAmount = new BigNumber(1e18);
            const feeRateBps = 5;
            const tradeTokenBaseUnitPriceUsd = new BigNumber(6e-14);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const defaultFeeAmount = calculateDefaultFeeAmount(
                tradeTokenAmount,
                feeRateBps,
                tradeTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            const expectedDefaultFeeAmount = new BigNumber(1e16);
            expect(defaultFeeAmount).toMatchObject(expectedDefaultFeeAmount);
        });
        it('should return zero if bps is zero', async () => {
            // Given
            const tradeTokenAmount = new BigNumber(1e18);
            const feeRateBps = 0;
            const tradeTokenBaseUnitPriceUsd = new BigNumber(6e-14);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const defaultFeeAmount = calculateDefaultFeeAmount(
                tradeTokenAmount,
                feeRateBps,
                tradeTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            expect(defaultFeeAmount).toMatchObject(ZERO);
        });
        it('should return zero if either trade token price or fee token price is null', async () => {
            // Given
            const tradeTokenAmount = new BigNumber(1e18);
            const feeRateBps = 5;
            const tradeTokenBaseUnitPriceUsd = new BigNumber(6e-14);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const defaultFeeAmount1 = calculateDefaultFeeAmount(
                tradeTokenAmount,
                feeRateBps,
                null,
                feeTokenBaseUnitPriceUsd,
            );
            const defaultFeeAmount2 = calculateDefaultFeeAmount(
                tradeTokenAmount,
                feeRateBps,
                tradeTokenBaseUnitPriceUsd,
                null,
            );

            // Then
            expect(defaultFeeAmount1).toMatchObject(ZERO);
            expect(defaultFeeAmount2).toMatchObject(ZERO);
        });
    });
    describe('pure function calculatePriceImprovementAmount()', () => {
        it('should calculate price improvement amount for selling correctly', async () => {
            // Given
            const isSelling = true;
            const assetFillAmount = new BigNumber(3e17);
            const makerQuoteWithGasFee: IndicativeQuote = {
                maker: 'maker1Address',
                makerUri: 'http://maker1.com',
                makerToken,
                takerToken,
                makerAmount: new BigNumber(1100e6),
                takerAmount: assetFillAmount,
                expiry: new BigNumber(1652722767),
            };

            const ammQuote: AmmQuote = {
                makerAmount: new BigNumber(1000e6),
                takerAmount: assetFillAmount,
                expectedSlippage: new BigNumber(-0.02),
                estimatedGasFeeWei: new BigNumber(10e15),
            };

            const quoteTokenBaseUnitPriceUsd = new BigNumber(1e-6);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const priceImprovementAmount = calculatePriceImprovementAmount(
                makerQuoteWithGasFee,
                ammQuote,
                isSelling,
                quoteTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            const expectedPriceImprovementAmount = new BigNumber(50e15);
            expect(priceImprovementAmount).toMatchObject(expectedPriceImprovementAmount);
        });
        it('should calculate price improvement amount for buying correctly', async () => {
            // Given
            const isSelling = false;
            const assetFillAmount = new BigNumber(3e17);
            const makerQuoteWithGasFee: IndicativeQuote = {
                maker: 'maker1Address',
                makerUri: 'http://maker1.com',
                makerToken,
                takerToken,
                makerAmount: assetFillAmount,
                takerAmount: new BigNumber(900e6),
                expiry: new BigNumber(1652722767),
            };

            const ammQuote: AmmQuote = {
                makerAmount: assetFillAmount,
                takerAmount: new BigNumber(1000e6),
                expectedSlippage: new BigNumber(-0.02),
                estimatedGasFeeWei: new BigNumber(10e15),
            };

            const quoteTokenBaseUnitPriceUsd = new BigNumber(1e-6);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const priceImprovementAmount = calculatePriceImprovementAmount(
                makerQuoteWithGasFee,
                ammQuote,
                isSelling,
                quoteTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            const expectedPriceImprovementAmount = new BigNumber(50e15);
            expect(priceImprovementAmount).toMatchObject(expectedPriceImprovementAmount);
        });
        it('should return zero if there is no price improvement', async () => {
            // Given
            const isSelling = false;
            const assetFillAmount = new BigNumber(3e17);
            const makerQuoteWithGasFee: IndicativeQuote = {
                maker: 'maker1Address',
                makerUri: 'http://maker1.com',
                makerToken,
                takerToken,
                makerAmount: assetFillAmount,
                takerAmount: new BigNumber(1051e6),
                expiry: new BigNumber(1652722767),
            };

            const ammQuote: AmmQuote = {
                makerAmount: assetFillAmount,
                takerAmount: new BigNumber(1000e6),
                expectedSlippage: new BigNumber(-0.02),
                estimatedGasFeeWei: new BigNumber(10e15),
            };

            const quoteTokenBaseUnitPriceUsd = new BigNumber(1e-6);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const priceImprovementAmount = calculatePriceImprovementAmount(
                makerQuoteWithGasFee,
                ammQuote,
                isSelling,
                quoteTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            expect(priceImprovementAmount).toMatchObject(ZERO);
        });
    });
    describe('pure function reviseQuoteWithZeroExFee()', () => {
        it('should revise quote correctly for selling', async () => {
            // Given
            const isSelling = true;
            const assetFillAmount = new BigNumber(3e17);
            const makerQuoteWithGasFee: IndicativeQuote = {
                maker: 'maker1Address',
                makerUri: 'http://maker1.com',
                makerToken,
                takerToken,
                makerAmount: new BigNumber(1000e6),
                takerAmount: assetFillAmount,
                expiry: new BigNumber(1652722767),
            };

            const zeroExFeeAmount = new BigNumber(10e15);

            const quoteTokenBaseUnitPriceUsd = new BigNumber(1e-6);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const revisedQuote = reviseQuoteWithFees(
                makerQuoteWithGasFee,
                zeroExFeeAmount,
                isSelling,
                quoteTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            const expectedRevisedMakerAmount = new BigNumber(970e6);
            expect(revisedQuote.makerAmount).toMatchObject(expectedRevisedMakerAmount);
        });
        it('should revise quote correctly for buying', async () => {
            // Given
            const isSelling = false;
            const assetFillAmount = new BigNumber(3e17);
            const makerQuoteWithGasFee: IndicativeQuote = {
                maker: 'maker1Address',
                makerUri: 'http://maker1.com',
                makerToken,
                takerToken,
                makerAmount: assetFillAmount,
                takerAmount: new BigNumber(1000e6),
                expiry: new BigNumber(1652722767),
            };

            const zeroExFeeAmount = new BigNumber(10e15);

            const quoteTokenBaseUnitPriceUsd = new BigNumber(1e-6);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const revisedQuote = reviseQuoteWithFees(
                makerQuoteWithGasFee,
                zeroExFeeAmount,
                isSelling,
                quoteTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            const expectedRevisedTakerAmount = new BigNumber(1030e6);
            expect(revisedQuote.takerAmount).toMatchObject(expectedRevisedTakerAmount);
        });
        it('should not revise quote correctly for zero zeroExFee', async () => {
            // Given
            const isSelling = true;
            const assetFillAmount = new BigNumber(3e17);
            const makerQuoteWithGasFee: IndicativeQuote = {
                maker: 'maker1Address',
                makerUri: 'http://maker1.com',
                makerToken,
                takerToken,
                makerAmount: new BigNumber(1000e6),
                takerAmount: assetFillAmount,
                expiry: new BigNumber(1652722767),
            };

            const zeroExFeeAmount = ZERO;

            const quoteTokenBaseUnitPriceUsd = new BigNumber(1e-6);
            const feeTokenBaseUnitPriceUsd = new BigNumber(3e-15);

            // When
            const revisedQuote = reviseQuoteWithFees(
                makerQuoteWithGasFee,
                zeroExFeeAmount,
                isSelling,
                quoteTokenBaseUnitPriceUsd,
                feeTokenBaseUnitPriceUsd,
            );

            // Then
            const expectedRevisedMakerAmount = new BigNumber(1000e6);
            expect(revisedQuote.makerAmount).toMatchObject(expectedRevisedMakerAmount);
            expect(revisedQuote.takerAmount).toMatchObject(assetFillAmount);
        });
    });
});
