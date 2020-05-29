import { ERC20BridgeSource } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
// tslint:disable-next-line:no-implicit-dependencies
import 'mocha';

import { ZERO } from '../src/constants';
import { serviceUtils } from '../src/utils/service_utils';

import { MAX_INT } from './constants';

const SUITE_NAME = 'serviceUtils test';

// tslint:disable:custom-no-magic-numbers
describe(SUITE_NAME, () => {
    describe('getEstimatedGasTokenRefundInfo', () => {
        it('returns an estimate when there are gasTokens and bridge fills', () => {
            const fakeOrders: any = [
                {
                    fills: [
                        {
                            source: ERC20BridgeSource.CurveUsdcDai,
                        },
                    ],
                },
            ];
            const { usedGasTokens, gasTokenRefund, gasTokenGasCost } = serviceUtils.getEstimatedGasTokenRefundInfo(
                fakeOrders,
                MAX_INT,
            );
            expect(usedGasTokens).to.be.eq(22);
            expect(gasTokenRefund.toNumber()).to.be.eq(5280000);
            expect(gasTokenGasCost.toNumber()).to.be.eq(151140);
        });
        it('does not return an estimate when there are bridge fills but no gas tokens', () => {
            const fakeOrders: any = [
                {
                    fills: [
                        {
                            source: ERC20BridgeSource.CurveUsdcDai,
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
});
