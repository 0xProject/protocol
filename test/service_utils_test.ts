import { ERC20BridgeSource } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
// tslint:disable-next-line:no-implicit-dependencies
import 'mocha';

import { ZERO } from '../src/constants';
import { serviceUtils } from '../src/utils/service_utils';

import { AFFILIATE_DATA_SELECTOR, MAX_INT } from './constants';

const SUITE_NAME = 'serviceUtils test';

// tslint:disable:custom-no-magic-numbers
describe(SUITE_NAME, () => {
    describe('getEstimatedGasTokenRefundInfo', () => {
        it('returns an estimate when there are gasTokens and bridge fills', () => {
            const fakeOrders: any = [
                {
                    fills: [
                        {
                            source: ERC20BridgeSource.Uniswap,
                        },
                    ],
                },
            ];
            const { usedGasTokens, gasTokenRefund, gasTokenGasCost } = serviceUtils.getEstimatedGasTokenRefundInfo(
                fakeOrders,
                MAX_INT,
            );
            expect(usedGasTokens).to.be.eq(8);
            expect(gasTokenRefund.toNumber()).to.be.eq(1920000);
            expect(gasTokenGasCost.toNumber()).to.be.eq(54960);
        });
        it('does not return an estimate when there are bridge fills but no gas tokens', () => {
            const fakeOrders: any = [
                {
                    fills: [
                        {
                            source: ERC20BridgeSource.Uniswap,
                        },
                    ],
                },
            ];
            const { usedGasTokens, gasTokenRefund, gasTokenGasCost } = serviceUtils.getEstimatedGasTokenRefundInfo(
                fakeOrders,
                ZERO,
            );
            expect(usedGasTokens).to.be.eq(0);
            expect(gasTokenRefund.toNumber()).to.be.eq(0);
            expect(gasTokenGasCost.toNumber()).to.be.eq(0);
        });
        it('does not return an estimate when there are gas tokens but no bridge fills', () => {
            const fakeOrders: any = [
                {
                    fills: [
                        {
                            source: ERC20BridgeSource.Native,
                        },
                    ],
                },
            ];
            const { usedGasTokens, gasTokenRefund, gasTokenGasCost } = serviceUtils.getEstimatedGasTokenRefundInfo(
                fakeOrders,
                MAX_INT,
            );
            expect(usedGasTokens).to.be.eq(0);
            expect(gasTokenRefund.toNumber()).to.be.eq(0);
            expect(gasTokenGasCost.toNumber()).to.be.eq(0);
        });
    });
    describe('attributeCallData', () => {
        it('it returns a reasonable ID and timestamp', () => {
            const fakeCallData = '0x0000000000000';
            const fakeAffiliate = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
            const attributedCallData = serviceUtils.attributeCallData(fakeCallData, fakeAffiliate);
            const currentTime = new Date();

            // parse out items from call data to ensure they are reasonable values
            const selectorPos = attributedCallData.indexOf(AFFILIATE_DATA_SELECTOR);
            const affiliateAddress = '0x'.concat(attributedCallData.substring(selectorPos + 32, selectorPos + 72));
            const randomId = attributedCallData.substring(selectorPos + 118, selectorPos + 128);
            const timestampFromCallDataHex = attributedCallData.substring(selectorPos + 128, selectorPos + 136);
            const timestampFromCallData = parseInt(timestampFromCallDataHex, 16);

            expect(affiliateAddress).to.be.eq(fakeAffiliate);
            // call data timestamp is within 3 seconds of timestamp created during test
            expect(timestampFromCallData).to.be.greaterThan(currentTime.getTime() / 1000 - 3);
            expect(timestampFromCallData).to.be.lessThan(currentTime.getTime() / 1000 + 3);
            // ID is a 10-digit hex number
            expect(randomId).to.match(/[0-9A-Fa-f]{10}/);
        });
    });
});
