import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import { ZERO } from '../../src/constants';
import { calculateFees } from '../../src/utils/fee_calculator';
import { WETH_TOKEN_ADDRESS } from '../constants';

const RANDOM_ADDRESS1 = '0x70a9f34f9b34c64957b9c401a97bfed35b95049e';
const RANDOM_ADDRESS2 = '0x70a9f34f9b34c64957b9c401a97bfed35b95049f';

describe('calculateGaslessFees', () => {
    describe('integrator fee', () => {
        it('returns undefined for integrator field if integrator fee config is not present', () => {
            const { fees, totalChargedFeeAmount } = calculateFees({
                feeConfigs: {},
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
            });

            expect(fees.integratorFee).to.be.undefined;
            expect(totalChargedFeeAmount.eq(ZERO));
        });

        it('returns correct integrator fee and total fee amount if integrator fee config is present', () => {
            const { fees, totalChargedFeeAmount } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        volumePercentage: new BigNumber(0.1),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
            });

            expect(fees.integratorFee).to.eql({
                type: 'volume',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: new BigNumber(1e3),
                feeRecipient: RANDOM_ADDRESS1,
                volumePercentage: new BigNumber(0.1),
            });
            expect(totalChargedFeeAmount.eq(new BigNumber(1e3)));
        });
    });

    describe('0x fee', () => {
        it('returns undefined for zeroex field if 0x fee config is not present', () => {
            const { fees, totalChargedFeeAmount } = calculateFees({
                feeConfigs: {},
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
            });

            expect(fees.integratorFee).to.be.undefined;
            expect(totalChargedFeeAmount.eq(ZERO));
        });

        it('returns correct 0x fee and total fee amount if 0x fee config is present and the type is volume', () => {
            const { fees, totalChargedFeeAmount } = calculateFees({
                feeConfigs: {
                    zeroexFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        volumePercentage: new BigNumber(0.1),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
            });

            expect(fees.zeroexFee).to.eql({
                type: 'volume',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: new BigNumber(1e3),
                feeRecipient: RANDOM_ADDRESS1,
                volumePercentage: new BigNumber(0.1),
            });
            expect(totalChargedFeeAmount.eq(new BigNumber(1e3)));
        });

        it('returns correct 0x fee and total fee amount if 0x fee config is present and the type is integrator_share', () => {
            const { fees, totalChargedFeeAmount } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        volumePercentage: new BigNumber(0.1),
                    },
                    zeroexFee: {
                        type: 'integrator_share',
                        feeRecipient: RANDOM_ADDRESS2,
                        integratorSharePercentage: new BigNumber(0.05),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
            });

            expect(fees.zeroexFee).to.eql({
                type: 'integrator_share',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: new BigNumber(50),
                feeRecipient: RANDOM_ADDRESS2,
                integratorSharePercentage: new BigNumber(0.05),
            });
            expect(totalChargedFeeAmount.eq(new BigNumber(1e3)));
        });

        it('throws if 0x fee type is integrator_share but integrator fee config is not present', () => {
            expect(() => {
                calculateFees({
                    feeConfigs: {
                        zeroexFee: {
                            type: 'integrator_share',
                            feeRecipient: RANDOM_ADDRESS2,
                            integratorSharePercentage: new BigNumber(0.05),
                        },
                    },
                    sellToken: WETH_TOKEN_ADDRESS,
                    sellTokenAmount: new BigNumber(10e3),
                    sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                    gasPrice: new BigNumber(10e9),
                    quoteGasEstimate: new BigNumber(20e3),
                });
            }).to.throw();
        });
    });

    describe('gas fee', () => {
        it('returns undefined for zeroex field if 0x fee config is not present', () => {
            const { fees, totalChargedFeeAmount } = calculateFees({
                feeConfigs: {},
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
            });

            expect(fees.integratorFee).to.be.undefined;
            expect(totalChargedFeeAmount.eq(ZERO));
        });

        describe('returns correct gas fee and total fee amount if gas fee config is present', () => {
            it('returns correct result if integrator fee, 0x and gas fee all have fee recipient', () => {
                const { fees, totalChargedFeeAmount } = calculateFees({
                    feeConfigs: {
                        integratorFee: {
                            type: 'volume',
                            feeRecipient: RANDOM_ADDRESS1,
                            volumePercentage: new BigNumber(0.01),
                        },
                        zeroexFee: {
                            type: 'integrator_share',
                            feeRecipient: RANDOM_ADDRESS2,
                            integratorSharePercentage: new BigNumber(0.05),
                        },
                        gasFee: {
                            type: 'gas',
                            feeRecipient: RANDOM_ADDRESS2,
                        },
                    },
                    sellToken: WETH_TOKEN_ADDRESS,
                    sellTokenAmount: new BigNumber(1e16),
                    sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                    gasPrice: new BigNumber(10e9),
                    quoteGasEstimate: new BigNumber(20e3),
                });

                expect(fees.gasFee).to.eql({
                    type: 'gas',
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(1.64e15),
                    feeRecipient: RANDOM_ADDRESS2,
                    feeTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                    gasPrice: new BigNumber(10e9),
                    estimatedGas: new BigNumber(164e3),
                });
                expect(totalChargedFeeAmount.eq(new BigNumber(1.74e15)));
            });

            it('returns correct result if gas fee do not have fee recipient', () => {
                const { fees, totalChargedFeeAmount } = calculateFees({
                    feeConfigs: {
                        integratorFee: {
                            type: 'volume',
                            feeRecipient: RANDOM_ADDRESS1,
                            volumePercentage: new BigNumber(0.01),
                        },
                        zeroexFee: {
                            type: 'volume',
                            feeRecipient: RANDOM_ADDRESS2,
                            volumePercentage: new BigNumber(0.01),
                        },
                        gasFee: {
                            type: 'gas',
                            feeRecipient: null,
                        },
                    },
                    sellToken: WETH_TOKEN_ADDRESS,
                    sellTokenAmount: new BigNumber(1e16),
                    sellTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                    gasPrice: new BigNumber(10e9),
                    quoteGasEstimate: new BigNumber(20e3),
                });

                expect(fees.gasFee).to.eql({
                    type: 'gas',
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(1.64e15),
                    feeRecipient: null,
                    feeTokenAmountPerBaseUnitNativeToken: new BigNumber(1),
                    gasPrice: new BigNumber(10e9),
                    estimatedGas: new BigNumber(164e3),
                });
                expect(totalChargedFeeAmount.eq(new BigNumber(2e14)));
            });
        });
    });
});
