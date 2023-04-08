import { OtcOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { ZERO } from '../../src/core/constants';
import { feeToStoredFee } from '../../src/core/fee_utils';
import {
    DefaultFeeDetailsDeprecated,
    Fee,
    FeeWithDetails,
    GasOnlyFeeDetailsDeprecated,
    MarginBasedFeeDetailsDeprecated,
} from '../../src/core/types';
import { otcOrderToStoredOtcOrder, storedOtcOrderToOtcOrder } from '../../src/utils/rfqm_db_utils';

describe('RFQM DB utils', () => {
    describe('storedOtcOrderToOtcOrder and otcOrderToStoredOtcOrder', () => {
        it('should map there and back without data corruption', () => {
            // it's expired if it's over 9000
            const expiry = new BigNumber(9000);
            const nonce = new BigNumber(1637085289);
            const chainId = 1;
            const order = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: '0x1111111111111111111111111111111111111111',
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, nonce),
                chainId,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const processedOrder = storedOtcOrderToOtcOrder(otcOrderToStoredOtcOrder(order));
            expect(processedOrder).toEqual(order);
        });
    });
    describe('feeToStoredFee', () => {
        it('should convert Fee without details correctly', () => {
            // Given
            const fee: Fee = {
                token: '0xatoken',
                amount: new BigNumber(5),
                type: 'fixed',
            };

            // When
            const storedFee = feeToStoredFee(fee);

            // Expect
            expect(storedFee.type).toEqual(fee.type);
            expect(storedFee.token).toEqual(fee.token);
            expect(storedFee.amount).toEqual(fee.amount.toString());
            expect(storedFee.details).toEqual(undefined);
            expect(storedFee.breakdown).toEqual(undefined);
            expect(storedFee.conversionRates).toEqual(undefined);
        });

        it('should convert Fee with gasOnly details correctly', () => {
            // Given
            const fee: FeeWithDetails & { details: GasOnlyFeeDetailsDeprecated } = {
                token: '0xatoken',
                amount: new BigNumber(5),
                type: 'fixed',
                details: {
                    kind: 'gasOnly',
                    feeModelVersion: 0,
                    gasFeeAmount: new BigNumber(5),
                    gasPrice: new BigNumber(50),
                },
                breakdown: {
                    gas: {
                        amount: new BigNumber(100),
                        details: {
                            gasPrice: new BigNumber(50),
                            estimatedGas: new BigNumber(1),
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

            // When
            const storedFee = feeToStoredFee(fee);

            // Expect
            expect(storedFee.type).toEqual(fee.type);
            expect(storedFee.token).toEqual(fee.token);
            expect(storedFee.amount).toEqual(fee.amount.toString());
            expect(storedFee.details.kind).toEqual(fee.details.kind);
            expect(storedFee.details.feeModelVersion).toEqual(fee.details.feeModelVersion);
            expect(storedFee.details.gasFeeAmount).toEqual(fee.details.gasFeeAmount.toString());
            expect(storedFee.details.gasPrice).toEqual(fee.details.gasPrice.toString());

            expect(storedFee.breakdown.gas.amount).toEqual(fee.breakdown.gas?.amount.toString());
            expect(storedFee.breakdown.gas.details.gasPrice).toEqual(fee.breakdown.gas?.details.gasPrice.toString());
            expect(storedFee.breakdown.gas.details.estimatedGas).toEqual(
                fee.breakdown.gas?.details.estimatedGas.toString(),
            );
            expect(storedFee.breakdown.zeroEx).toEqual(undefined);

            expect(storedFee.conversionRates.nativeTokenBaseUnitPriceUsd).toEqual(undefined);
            expect(storedFee.conversionRates.feeTokenBaseUnitPriceUsd).toEqual(undefined);
            expect(storedFee.conversionRates.takerTokenBaseUnitPriceUsd).toEqual(undefined);
            expect(storedFee.conversionRates.makerTokenBaseUnitPriceUsd).toEqual(undefined);
        });

        it('should convert Fee with default details correctly', () => {
            // Given
            const fee: FeeWithDetails & { details: DefaultFeeDetailsDeprecated } = {
                token: '0xatoken',
                amount: new BigNumber(5),
                type: 'fixed',
                details: {
                    kind: 'default',
                    feeModelVersion: 1,
                    gasFeeAmount: new BigNumber(5),
                    gasPrice: new BigNumber(50),
                    tradeSizeBps: 4,
                    zeroExFeeAmount: new BigNumber(10),
                    feeTokenBaseUnitPriceUsd: new BigNumber(3e-15),
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: new BigNumber(1e-18),
                },
                breakdown: {
                    gas: {
                        amount: new BigNumber(5),
                        details: {
                            gasPrice: new BigNumber(50),
                            estimatedGas: new BigNumber(1),
                        },
                    },
                    zeroEx: {
                        amount: new BigNumber(10),
                        details: {
                            kind: 'volume',
                            tradeSizeBps: 4,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: new BigNumber(3e-15),
                    feeTokenBaseUnitPriceUsd: new BigNumber(3e-15),
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: new BigNumber(1e-18),
                },
            };

            // When
            const storedFee = feeToStoredFee(fee);

            // Expect
            expect(storedFee.type).toEqual(fee.type);
            expect(storedFee.token).toEqual(fee.token);
            expect(storedFee.amount).toEqual(fee.amount.toString());
            expect(storedFee.details.kind).toEqual(fee.details.kind);
            expect(storedFee.details.feeModelVersion).toEqual(fee.details.feeModelVersion);
            expect(storedFee.details.gasFeeAmount).toEqual(fee.details.gasFeeAmount.toString());
            expect(storedFee.details.gasPrice).toEqual(fee.details.gasPrice.toString());
            expect(storedFee.details.tradeSizeBps).toEqual(fee.details.tradeSizeBps);
            expect(storedFee.details.zeroExFeeAmount).toEqual(fee.details.zeroExFeeAmount.toString());
            expect(storedFee.details.feeTokenBaseUnitPriceUsd).toEqual(
                fee.details.feeTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.details.takerTokenBaseUnitPriceUsd).toEqual(undefined);
            expect(storedFee.details.makerTokenBaseUnitPriceUsd).toEqual(
                fee.details.makerTokenBaseUnitPriceUsd?.toString(),
            );

            expect(storedFee.breakdown.gas.amount).toEqual(fee.breakdown.gas?.amount.toString());
            expect(storedFee.breakdown.gas.details.gasPrice).toEqual(fee.breakdown.gas?.details.gasPrice.toString());
            expect(storedFee.breakdown.gas.details.estimatedGas).toEqual(
                fee.breakdown.gas?.details.estimatedGas.toString(),
            );
            expect(storedFee.breakdown.zeroEx.amount).toEqual(fee.breakdown.zeroEx?.amount.toString());
            expect(storedFee.breakdown.zeroEx.details.kind).toEqual(fee.breakdown.zeroEx?.details.kind);
            expect(storedFee.breakdown.zeroEx.details.tradeSizeBps).toEqual(4);

            expect(storedFee.conversionRates.nativeTokenBaseUnitPriceUsd).toEqual(
                fee.conversionRates.nativeTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.conversionRates.feeTokenBaseUnitPriceUsd).toEqual(
                fee.conversionRates.feeTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.conversionRates.takerTokenBaseUnitPriceUsd).toEqual(undefined);
            expect(storedFee.conversionRates.makerTokenBaseUnitPriceUsd).toEqual(
                fee.conversionRates.makerTokenBaseUnitPriceUsd?.toString(),
            );
        });

        it('should convert Fee with margin based details correctly', () => {
            // Given
            const fee: FeeWithDetails & { details: MarginBasedFeeDetailsDeprecated } = {
                token: '0xatoken',
                amount: new BigNumber(5),
                type: 'fixed',
                details: {
                    kind: 'margin',
                    feeModelVersion: 1,
                    gasFeeAmount: new BigNumber(5),
                    gasPrice: new BigNumber(50),
                    margin: new BigNumber(4570),
                    marginRakeRatio: 0.35,
                    zeroExFeeAmount: new BigNumber(10),
                    feeTokenBaseUnitPriceUsd: new BigNumber(3e-15),
                    takerTokenBaseUnitPriceUsd: new BigNumber(1e-18),
                    makerTokenBaseUnitPriceUsd: null,
                },
                breakdown: {
                    gas: {
                        amount: new BigNumber(5),
                        details: {
                            gasPrice: new BigNumber(50),
                            estimatedGas: new BigNumber(1),
                        },
                    },
                    zeroEx: {
                        amount: new BigNumber(10),
                        details: {
                            kind: 'price_improvement',
                            priceImprovement: new BigNumber(4570),
                            rakeRatio: 0.35,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: new BigNumber(3e-15),
                    feeTokenBaseUnitPriceUsd: new BigNumber(3e-15),
                    takerTokenBaseUnitPriceUsd: new BigNumber(1e-18),
                    makerTokenBaseUnitPriceUsd: null,
                },
            };

            // When
            const storedFee = feeToStoredFee(fee);

            // Expect
            expect(storedFee.type).toEqual(fee.type);
            expect(storedFee.token).toEqual(fee.token);
            expect(storedFee.amount).toEqual(fee.amount.toString());
            expect(storedFee.details.kind).toEqual(fee.details.kind);
            expect(storedFee.details.feeModelVersion).toEqual(fee.details.feeModelVersion);
            expect(storedFee.details.gasFeeAmount).toEqual(fee.details.gasFeeAmount.toString());
            expect(storedFee.details.gasPrice).toEqual(fee.details.gasPrice.toString());
            expect(storedFee.details.margin).toEqual(fee.details.margin.toString());
            expect(storedFee.details.marginRakeRatio).toEqual(fee.details.marginRakeRatio);
            expect(storedFee.details.zeroExFeeAmount).toEqual(fee.details.zeroExFeeAmount.toString());
            expect(storedFee.details.feeTokenBaseUnitPriceUsd).toEqual(
                fee.details.feeTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.details.takerTokenBaseUnitPriceUsd).toEqual(
                fee.details.takerTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.details.makerTokenBaseUnitPriceUsd).toEqual(undefined);

            expect(storedFee.breakdown.gas.amount).toEqual(fee.breakdown.gas?.amount.toString());
            expect(storedFee.breakdown.gas.details.gasPrice).toEqual(fee.breakdown.gas?.details.gasPrice.toString());
            expect(storedFee.breakdown.gas.details.estimatedGas).toEqual(
                fee.breakdown.gas?.details.estimatedGas.toString(),
            );
            expect(storedFee.breakdown.zeroEx.amount).toEqual(fee.breakdown.zeroEx?.amount.toString());
            expect(storedFee.breakdown.zeroEx.details.kind).toEqual(fee.breakdown.zeroEx?.details.kind);
            expect(storedFee.breakdown.zeroEx.details.priceImprovement).toEqual('4570');
            expect(storedFee.breakdown.zeroEx.details.rakeRatio).toEqual(0.35);

            expect(storedFee.conversionRates.nativeTokenBaseUnitPriceUsd).toEqual(
                fee.conversionRates.nativeTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.conversionRates.feeTokenBaseUnitPriceUsd).toEqual(
                fee.conversionRates.feeTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.conversionRates.takerTokenBaseUnitPriceUsd).toEqual(
                fee.conversionRates.takerTokenBaseUnitPriceUsd?.toString(),
            );
            expect(storedFee.conversionRates.makerTokenBaseUnitPriceUsd).toEqual(undefined);
        });
    });
});