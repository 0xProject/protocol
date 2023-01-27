import { BigNumber } from '@0x/utils';
import { rawFeesToFees } from '../../src/core/meta_transaction_fee_utils';

const FEE_TOKEN = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const FEE_RECIPIENT = '0x5fb652150AcE5303c82f0d1D491041e042f2ad22';

describe('meta_transaction_fee_utils', () => {
    describe('rawFeesToFees', () => {
        it('returns undefined if `rawFees` is undefined', () => {
            expect(rawFeesToFees(undefined)).toBeUndefined();
        });

        describe('integrator fee', () => {
            it('returns integrator fee as undefined if integrator fee is not provided', () => {
                const fees = rawFeesToFees({
                    zeroExFee: {
                        type: 'integrator_share',
                        feeToken: FEE_TOKEN,
                        feeAmount: '1000',
                        feeRecipient: FEE_RECIPIENT,
                        integratorSharePercentage: '10',
                    },
                });
                expect(fees).toBeTruthy();
                expect(fees?.integratorFee).toBeUndefined();
            });

            it('returns the correct integrator fee if integrator fee is provided', () => {
                const fees = rawFeesToFees({
                    integratorFee: {
                        type: 'volume',
                        feeToken: FEE_TOKEN,
                        feeAmount: '1000',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: '10',
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeToken: FEE_TOKEN,
                        feeAmount: '100000',
                        feeRecipient: FEE_RECIPIENT,
                        integratorSharePercentage: '1',
                    },
                });
                expect(fees).toBeTruthy();
                expect(fees?.integratorFee).toEqual({
                    type: 'volume',
                    feeToken: FEE_TOKEN,
                    feeAmount: new BigNumber(1000),
                    feeRecipient: FEE_RECIPIENT,
                    volumePercentage: new BigNumber(10),
                });
            });
        });

        describe('0x fee', () => {
            it('returns 0x fee as undefined if 0x fee is not provided', () => {
                const fees = rawFeesToFees({
                    integratorFee: {
                        type: 'volume',
                        feeToken: FEE_TOKEN,
                        feeAmount: '1000',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: '10',
                    },
                });
                expect(fees).toBeTruthy();
                expect(fees?.zeroExFee).toBeUndefined();
            });

            it('returns the correct 0x fee volume fee if 0x fee is provided', () => {
                const fees = rawFeesToFees({
                    integratorFee: {
                        type: 'volume',
                        feeToken: FEE_TOKEN,
                        feeAmount: '1000',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: '10',
                    },
                    zeroExFee: {
                        type: 'volume',
                        feeToken: FEE_TOKEN,
                        feeAmount: '100000',
                        feeRecipient: null,
                        volumePercentage: '1',
                    },
                });
                expect(fees).toBeTruthy();
                expect(fees?.zeroExFee).toEqual({
                    type: 'volume',
                    feeToken: FEE_TOKEN,
                    feeAmount: new BigNumber(100000),
                    feeRecipient: null,
                    volumePercentage: new BigNumber(1),
                });
            });

            it('returns the correct 0x fee integrator share fee if 0x fee is provided', () => {
                const fees = rawFeesToFees({
                    integratorFee: {
                        type: 'volume',
                        feeToken: FEE_TOKEN,
                        feeAmount: '1000',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: '10',
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeToken: FEE_TOKEN,
                        feeAmount: '100000',
                        feeRecipient: FEE_RECIPIENT,
                        integratorSharePercentage: '1',
                    },
                });
                expect(fees).toBeTruthy();
                expect(fees?.zeroExFee).toEqual({
                    type: 'integrator_share',
                    feeToken: FEE_TOKEN,
                    feeAmount: new BigNumber(100000),
                    feeRecipient: FEE_RECIPIENT,
                    integratorSharePercentage: new BigNumber(1),
                });
            });
        });

        describe('gas fee', () => {
            it('returns gas fee as undefined if gas fee is not provided', () => {
                const fees = rawFeesToFees({
                    zeroExFee: {
                        type: 'integrator_share',
                        feeToken: FEE_TOKEN,
                        feeAmount: '1000',
                        feeRecipient: FEE_RECIPIENT,
                        integratorSharePercentage: '10',
                    },
                });
                expect(fees).toBeTruthy();
                expect(fees?.gasFee).toBeUndefined();
            });

            it('returns the correct gas fee if gas is provided', () => {
                const fees = rawFeesToFees({
                    integratorFee: {
                        type: 'volume',
                        feeToken: FEE_TOKEN,
                        feeAmount: '1000',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: '10',
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeToken: FEE_TOKEN,
                        feeAmount: '100000',
                        feeRecipient: FEE_RECIPIENT,
                        integratorSharePercentage: '1',
                    },
                    gasFee: {
                        type: 'gas',
                        feeToken: FEE_TOKEN,
                        feeAmount: '10',
                        feeRecipient: FEE_RECIPIENT,
                        gasPrice: '123',
                        estimatedGas: '200000',
                        feeTokenAmountPerBaseUnitNativeToken: '0.0001',
                    },
                });
                expect(fees).toBeTruthy();
                expect(fees?.gasFee).toEqual({
                    type: 'gas',
                    feeToken: FEE_TOKEN,
                    feeAmount: new BigNumber(10),
                    feeRecipient: FEE_RECIPIENT,
                    gasPrice: new BigNumber(123),
                    estimatedGas: new BigNumber(200000),
                    feeTokenAmountPerBaseUnitNativeToken: new BigNumber(0.0001),
                });
            });
        });
    });
});
