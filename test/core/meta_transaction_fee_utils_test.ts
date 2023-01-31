import { BigNumber } from '@0x/utils';
import { getFeeConfigsFromParams } from '../../src/core/meta_transaction_fee_utils';
import { MAINET_TOKEN_ADDRESSES } from '../constants';

const FEE_RECIPIENT = '0x4ea754349ace5303c82f0d1d491041e042f2ad22';
const INTEGRATOR_ID = '5062340f-87bb-4e1b-8029-eb8c03a9989c';

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
