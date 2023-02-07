import { BigNumber } from '@0x/utils';
import { feesToTruncatedFees, getFeeConfigsFromParams, rawFeesToFees } from '../../src/core/meta_transaction_fee_utils';
import { MAINET_TOKEN_ADDRESSES } from '../constants';

const FEE_TOKEN = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const FEE_RECIPIENT = '0x4ea754349ace5303c82f0d1d491041e042f2ad22';
const INTEGRATOR_ID = '5062340f-87bb-4e1b-8029-eb8c03a9989c';

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

    describe('getFeeConfigsFromParams', () => {
        describe('integrator fee', () => {
            it('returns undefined integrator fee if `integratorFeeConfig` is not provided', () => {
                const integratorFeeConfig = getFeeConfigsFromParams({
                    integratorId: INTEGRATOR_ID,
                    chainId: 1,
                    sellToken: MAINET_TOKEN_ADDRESSES.WETH,
                    buyToken: MAINET_TOKEN_ADDRESSES.USDC,
                }).integratorFee;
                expect(integratorFeeConfig).toBeUndefined();
            });

            it('returns the correct integrator fee', () => {
                const integratorFeeConfig = getFeeConfigsFromParams({
                    integratorId: INTEGRATOR_ID,
                    chainId: 1,
                    sellToken: MAINET_TOKEN_ADDRESSES.WETH,
                    buyToken: MAINET_TOKEN_ADDRESSES.USDC,
                    integratorFeeConfig: {
                        type: 'volume',
                        recipient: FEE_RECIPIENT,
                        sellTokenPercentage: new BigNumber(0.1),
                    },
                }).integratorFee;
                expect(integratorFeeConfig).toEqual({
                    type: 'volume',
                    feeRecipient: FEE_RECIPIENT,
                    volumePercentage: new BigNumber(0.1),
                });
            });
        });

        describe('0x fee', () => {
            describe('coinbase mainnet', () => {
                it('matches a specific pair', () => {
                    const zeroExFeeConfig = getFeeConfigsFromParams({
                        integratorId: INTEGRATOR_ID,
                        chainId: 1,
                        sellToken: MAINET_TOKEN_ADDRESSES.WETH,
                        buyToken: MAINET_TOKEN_ADDRESSES.USDC,
                    }).zeroExFee;

                    expect(zeroExFeeConfig).toBeTruthy();
                    expect(zeroExFeeConfig).toEqual({
                        type: 'volume',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: new BigNumber(0.5),
                    });
                });

                it('matches a cartesian product if no matches for specific pair', () => {
                    const zeroExFeeConfig = getFeeConfigsFromParams({
                        integratorId: INTEGRATOR_ID,
                        chainId: 1,
                        sellToken: MAINET_TOKEN_ADDRESSES.DAI,
                        buyToken: MAINET_TOKEN_ADDRESSES.WBTC,
                    }).zeroExFee;

                    expect(zeroExFeeConfig).toBeTruthy();
                    expect(zeroExFeeConfig).toEqual({
                        type: 'volume',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: new BigNumber(0.7),
                    });
                });

                it('matches a token if no matches for specific pair and cartesian product', () => {
                    const zeroExFeeConfig = getFeeConfigsFromParams({
                        integratorId: INTEGRATOR_ID,
                        chainId: 1,
                        sellToken: MAINET_TOKEN_ADDRESSES.SHIB,
                        buyToken: MAINET_TOKEN_ADDRESSES.WBTC,
                    }).zeroExFee;

                    expect(zeroExFeeConfig).toBeTruthy();
                    expect(zeroExFeeConfig).toEqual({
                        type: 'volume',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: new BigNumber(1.5),
                    });
                });

                it('matches a wildcard token if no matches for specific pair, cartesian product and exact token', () => {
                    const zeroExFeeConfig = getFeeConfigsFromParams({
                        integratorId: INTEGRATOR_ID,
                        chainId: 1,
                        sellToken: MAINET_TOKEN_ADDRESSES.SHIB,
                        buyToken: MAINET_TOKEN_ADDRESSES.AAVE,
                    }).zeroExFee;

                    expect(zeroExFeeConfig).toBeTruthy();
                    expect(zeroExFeeConfig).toEqual({
                        type: 'volume',
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: new BigNumber(0.05),
                    });
                });
            });

            describe('default mainnet', () => {
                it('returns the correct 0x fee config', () => {
                    const zeroExFeeConfig = getFeeConfigsFromParams({
                        integratorId: '*',
                        chainId: 1,
                        sellToken: MAINET_TOKEN_ADDRESSES.WETH,
                        buyToken: MAINET_TOKEN_ADDRESSES.USDC,
                    }).zeroExFee;

                    expect(zeroExFeeConfig).toBeTruthy();
                    expect(zeroExFeeConfig).toEqual({
                        type: 'integrator_share',
                        feeRecipient: FEE_RECIPIENT,
                        integratorSharePercentage: new BigNumber(0.03),
                    });
                });
            });
        });

        describe('gas fee', () => {
            it('returns the correct gas fee config', () => {
                const gasFeeConfig = getFeeConfigsFromParams({
                    integratorId: INTEGRATOR_ID,
                    chainId: 1,
                    sellToken: MAINET_TOKEN_ADDRESSES.WETH,
                    buyToken: MAINET_TOKEN_ADDRESSES.USDC,
                }).gasFee;
                expect(gasFeeConfig).toEqual({
                    type: 'gas',
                    feeRecipient: null,
                });
            });
        });
    });

    describe('feesToTruncatedFees', () => {
        it('returns undefined when `fees` is undefined', () => {
            expect(feesToTruncatedFees(undefined)).toBeUndefined();
        });

        it('returns correct truncated fee', () => {
            expect(
                feesToTruncatedFees({
                    integratorFee: {
                        type: 'volume',
                        feeToken: FEE_TOKEN,
                        feeAmount: new BigNumber(1000),
                        feeRecipient: FEE_RECIPIENT,
                        volumePercentage: new BigNumber(10),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        feeToken: FEE_TOKEN,
                        feeAmount: new BigNumber(100),
                        feeRecipient: FEE_RECIPIENT,
                        integratorSharePercentage: new BigNumber(1),
                    },
                    gasFee: {
                        type: 'gas',
                        feeToken: FEE_TOKEN,
                        feeAmount: new BigNumber(1),
                        feeRecipient: FEE_RECIPIENT,
                        gasPrice: new BigNumber(123),
                        estimatedGas: new BigNumber(200000),
                        feeTokenAmountPerBaseUnitNativeToken: new BigNumber(0.0001),
                    },
                }),
            );
        });
    });
});
