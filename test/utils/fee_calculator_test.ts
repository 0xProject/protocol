import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import { TRANSFER_FROM_GAS, TRANSFER_GAS, ZERO } from '../../src/constants';
import { calculateFees } from '../../src/utils/fee_calculator';
import { WETH_TOKEN_ADDRESS } from '../constants';

const RANDOM_ADDRESS1 = '0x70a9f34f9b34c64957b9c401a97bfed35b95049e';
const RANDOM_ADDRESS2 = '0x70a9f34f9b34c64957b9c401a97bfed35b95049f';

describe('calculateGaslessFees', () => {
    describe('integrator fee', () => {
        it('returns the correct result if fee config is undefined', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: undefined,
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_GAS,
            });

            expect(fees).to.be.undefined;
            expect(totalOnChainFeeAmount).to.eql(ZERO);
            expect(onChainTransfers).to.eql([]);
            expect(onChainTransfersGas).to.eql(ZERO);
        });

        it('returns the correct result if fee config is empty', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {},
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_GAS,
            });

            expect(fees).to.be.not.undefined;
            expect(fees?.integratorFee).to.be.undefined;
            expect(totalOnChainFeeAmount).to.eql(ZERO);
            expect(onChainTransfers).to.eql([]);
            expect(onChainTransfersGas).to.eql(ZERO);
        });

        it('returns the correct result if integrator fee config is present', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        billingType: 'on-chain',
                        volumePercentage: new BigNumber(0.1),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_GAS,
            });

            expect(fees?.integratorFee).to.eql({
                type: 'volume',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: new BigNumber(1e3),
                feeRecipient: RANDOM_ADDRESS1,
                billingType: 'on-chain',
                volumePercentage: new BigNumber(0.1),
            });
            expect(totalOnChainFeeAmount).to.eql(new BigNumber(1e3));
            expect(onChainTransfers).to.eql([
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(1e3),
                    feeRecipient: RANDOM_ADDRESS1,
                },
            ]);
            expect(onChainTransfersGas).to.eql(TRANSFER_GAS);
        });
    });

    describe('0x fee', () => {
        it('returns the correct result if 0x fee config is not present', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {},
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_FROM_GAS,
            });

            expect(fees?.integratorFee).to.be.undefined;
            expect(totalOnChainFeeAmount).to.eql(ZERO);
            expect(onChainTransfers).to.eql([]);
            expect(onChainTransfersGas).to.eql(ZERO);
        });

        it('returns the correct result if 0x fee config is present, the type is volume and the billing type is on-chain', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {
                    zeroExFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        billingType: 'on-chain',
                        volumePercentage: new BigNumber(0.1),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_FROM_GAS,
            });

            expect(fees?.zeroExFee).to.eql({
                type: 'volume',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: new BigNumber(1e3),
                feeRecipient: RANDOM_ADDRESS1,
                billingType: 'on-chain',
                volumePercentage: new BigNumber(0.1),
            });
            expect(totalOnChainFeeAmount).to.eql(new BigNumber(1e3));
            expect(onChainTransfers).to.eql([
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(1e3),
                    feeRecipient: RANDOM_ADDRESS1,
                },
            ]);
            expect(onChainTransfersGas).to.eql(TRANSFER_FROM_GAS);
        });

        it('returns the correct result if 0x fee config is present, the type is volume and the billing type is off-chain', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        billingType: 'on-chain',
                        volumePercentage: new BigNumber(0.1),
                    },
                    zeroExFee: {
                        type: 'volume',
                        feeRecipient: null,
                        billingType: 'off-chain',
                        volumePercentage: new BigNumber(0.1),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_FROM_GAS,
            });

            expect(fees?.zeroExFee).to.eql({
                type: 'volume',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: new BigNumber(1e3),
                feeRecipient: null,
                billingType: 'off-chain',
                volumePercentage: new BigNumber(0.1),
            });
            expect(totalOnChainFeeAmount).to.eql(new BigNumber(1e3));
            expect(onChainTransfers).to.eql([
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(1e3),
                    feeRecipient: RANDOM_ADDRESS1,
                },
            ]);
            expect(onChainTransfersGas).to.eql(TRANSFER_FROM_GAS);
        });

        it('returns the correct result if 0x fee config is present, the type is integrator_share and billing type is on-chain', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        billingType: 'on-chain',
                        volumePercentage: new BigNumber(0.1),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeRecipient: RANDOM_ADDRESS2,
                        billingType: 'on-chain',
                        integratorSharePercentage: new BigNumber(0.05),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_FROM_GAS,
            });

            expect(fees?.zeroExFee).to.eql({
                type: 'integrator_share',
                feeToken: WETH_TOKEN_ADDRESS,
                billingType: 'on-chain',
                feeAmount: new BigNumber(50),
                feeRecipient: RANDOM_ADDRESS2,
                integratorSharePercentage: new BigNumber(0.05),
            });
            expect(totalOnChainFeeAmount).to.eql(new BigNumber(1e3));
            expect(onChainTransfers).to.eql([
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(950),
                    feeRecipient: RANDOM_ADDRESS1,
                },
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(50),
                    feeRecipient: RANDOM_ADDRESS2,
                },
            ]);
            expect(onChainTransfersGas).to.eql(TRANSFER_FROM_GAS.times(2));
        });

        it('returns the correct result if 0x fee config is present, the type is integrator_share and billing type is off-chain', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        billingType: 'on-chain',
                        volumePercentage: new BigNumber(0.1),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeRecipient: null,
                        billingType: 'off-chain',
                        integratorSharePercentage: new BigNumber(0.05),
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_FROM_GAS,
            });

            expect(fees?.zeroExFee).to.eql({
                type: 'integrator_share',
                feeToken: WETH_TOKEN_ADDRESS,
                billingType: 'off-chain',
                feeAmount: new BigNumber(50),
                feeRecipient: null,
                integratorSharePercentage: new BigNumber(0.05),
            });
            expect(totalOnChainFeeAmount).to.eql(new BigNumber(1e3));
            expect(onChainTransfers).to.eql([
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(1e3),
                    feeRecipient: RANDOM_ADDRESS1,
                },
            ]);
            expect(onChainTransfersGas).to.eql(TRANSFER_FROM_GAS);
        });

        it('throws if 0x fee type is integrator_share but integrator fee config is not present', () => {
            expect(() => {
                calculateFees({
                    feeConfigs: {
                        zeroExFee: {
                            type: 'integrator_share',
                            feeRecipient: RANDOM_ADDRESS2,
                            billingType: 'on-chain',
                            integratorSharePercentage: new BigNumber(0.05),
                        },
                    },
                    sellToken: WETH_TOKEN_ADDRESS,
                    sellTokenAmount: new BigNumber(10e3),
                    sellTokenAmountPerWei: new BigNumber(1),
                    gasPrice: new BigNumber(10e9),
                    quoteGasEstimate: new BigNumber(20e3),
                    gasPerOnChainTransfer: TRANSFER_FROM_GAS,
                });
            }).to.throw();
        });
    });

    describe('gas fee', () => {
        it('returns the correct result if gas fee config is not present', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {},
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(10e3),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_GAS,
            });

            expect(fees?.gasFee).to.be.undefined;
            expect(totalOnChainFeeAmount).to.eql(ZERO);
            expect(onChainTransfers).to.eql([]);
            expect(onChainTransfersGas).to.eql(ZERO);
        });

        it('throws if gas fee config is present but `sellTokenAmountPerWei` is undefined', () => {
            expect(() => {
                calculateFees({
                    feeConfigs: {
                        integratorFee: {
                            type: 'volume',
                            feeRecipient: RANDOM_ADDRESS1,
                            billingType: 'on-chain',
                            volumePercentage: new BigNumber(0.01),
                        },
                        zeroExFee: {
                            type: 'volume',
                            feeRecipient: RANDOM_ADDRESS2,
                            billingType: 'on-chain',
                            volumePercentage: new BigNumber(0.01),
                        },
                        gasFee: {
                            type: 'gas',
                            feeRecipient: null,
                            billingType: 'off-chain',
                        },
                    },
                    sellToken: WETH_TOKEN_ADDRESS,
                    sellTokenAmount: new BigNumber(1e16),
                    sellTokenAmountPerWei: undefined,
                    gasPrice: new BigNumber(10e9),
                    quoteGasEstimate: new BigNumber(20e3),
                    gasPerOnChainTransfer: TRANSFER_FROM_GAS,
                });
            }).to.throw();
        });

        it('returns correct result if integrator fee, 0x and gas fees are all present, billing types are all on-chain and 0x and gas fee have the same fee recipient address', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        billingType: 'on-chain',
                        volumePercentage: new BigNumber(0.01),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeRecipient: RANDOM_ADDRESS2,
                        billingType: 'on-chain',
                        integratorSharePercentage: new BigNumber(0.05),
                    },
                    gasFee: {
                        type: 'gas',
                        billingType: 'on-chain',
                        feeRecipient: RANDOM_ADDRESS2,
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(1e16),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_GAS,
            });

            const gasFeeAmount = new BigNumber(20e3).plus(TRANSFER_GAS.times(2)).times(new BigNumber(10e9));
            expect(fees?.gasFee).to.eql({
                type: 'gas',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: gasFeeAmount,
                feeRecipient: RANDOM_ADDRESS2,
                billingType: 'on-chain',
                feeTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                estimatedGas: new BigNumber(20e3).plus(TRANSFER_GAS.times(2)),
            });
            expect(totalOnChainFeeAmount).to.eql(new BigNumber(1e14).plus(gasFeeAmount));
            expect(onChainTransfers).to.eql([
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(95e12),
                    feeRecipient: RANDOM_ADDRESS1,
                },
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(5e12).plus(gasFeeAmount),
                    feeRecipient: RANDOM_ADDRESS2,
                },
            ]);
            expect(onChainTransfersGas).to.eql(TRANSFER_GAS.times(2));
        });

        it('returns correct result if integrator fee, 0x and gas fees are all present and gas fee billing type is off-chain', () => {
            const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        feeRecipient: RANDOM_ADDRESS1,
                        billingType: 'on-chain',
                        volumePercentage: new BigNumber(0.01),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeRecipient: RANDOM_ADDRESS2,
                        billingType: 'on-chain',
                        integratorSharePercentage: new BigNumber(0.05),
                    },
                    gasFee: {
                        type: 'gas',
                        billingType: 'off-chain',
                        feeRecipient: null,
                    },
                },
                sellToken: WETH_TOKEN_ADDRESS,
                sellTokenAmount: new BigNumber(1e16),
                sellTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                quoteGasEstimate: new BigNumber(20e3),
                gasPerOnChainTransfer: TRANSFER_GAS,
            });

            const gasFeeAmount = new BigNumber(20e3).plus(TRANSFER_GAS.times(2)).times(new BigNumber(10e9));
            expect(fees?.gasFee).to.eql({
                type: 'gas',
                feeToken: WETH_TOKEN_ADDRESS,
                feeAmount: gasFeeAmount,
                feeRecipient: null,
                billingType: 'off-chain',
                feeTokenAmountPerWei: new BigNumber(1),
                gasPrice: new BigNumber(10e9),
                estimatedGas: new BigNumber(20e3).plus(TRANSFER_GAS.times(2)),
            });
            expect(totalOnChainFeeAmount).to.eql(new BigNumber(1e14));
            expect(onChainTransfers).to.eql([
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(95e12),
                    feeRecipient: RANDOM_ADDRESS1,
                },
                {
                    feeToken: WETH_TOKEN_ADDRESS,
                    feeAmount: new BigNumber(5e12),
                    feeRecipient: RANDOM_ADDRESS2,
                },
            ]);
            expect(onChainTransfersGas).to.eql(TRANSFER_GAS.times(2));
        });
    });
});
