// tslint:disable:custom-no-magic-numbers

import { OtcOrder } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';

import { ZERO } from '../../src/constants';
import {
    DefaultFeeBreakdown,
    FeeWithDetails,
    GasOnlyFeeBreakdown,
    MarginBasedFeeBreakDown,
} from '../../src/services/rfqm_fee_service';
import { feeToStoredFee, otcOrderToStoredOtcOrder, storedOtcOrderToOtcOrder } from '../../src/utils/rfqm_db_utils';

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
        });

        it('should convert Fee with gasOnly breakdown correctly', () => {
            // Given
            const fee: FeeWithDetails & { details: GasOnlyFeeBreakdown } = {
                token: '0xatoken',
                amount: new BigNumber(5),
                type: 'fixed',
                details: {
                    kind: 'gasOnly',
                    feeModelVersion: 0,
                    gasFeeAmount: new BigNumber(5),
                    gasPrice: new BigNumber(50),
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
        });

        it('should convert Fee with default breakdown correctly', () => {
            // Given
            const fee: FeeWithDetails & { details: DefaultFeeBreakdown } = {
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
                fee.details.feeTokenBaseUnitPriceUsd!.toString(),
            );
            expect(storedFee.details.takerTokenBaseUnitPriceUsd).toEqual(undefined);
            expect(storedFee.details.makerTokenBaseUnitPriceUsd).toEqual(
                fee.details.makerTokenBaseUnitPriceUsd!.toString(),
            );
        });

        it('should convert Fee with margin based breakdown correctly', () => {
            // Given
            const fee: FeeWithDetails & { details: MarginBasedFeeBreakDown } = {
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
                fee.details.feeTokenBaseUnitPriceUsd!.toString(),
            );
            expect(storedFee.details.takerTokenBaseUnitPriceUsd).toEqual(
                fee.details.takerTokenBaseUnitPriceUsd!.toString(),
            );
            expect(storedFee.details.makerTokenBaseUnitPriceUsd).toEqual(undefined);
        });
    });
});
