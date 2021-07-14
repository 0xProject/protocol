// tslint:disable:custom-no-magic-numbers
// tslint:disable:max-file-line-count

import { expect } from '@0x/contracts-test-utils';

import { RFQM_TX_GAS_ESTIMATE } from '../../src/constants';
import { calculateGasEstimate } from '../../src/utils/rfqm_gas_estimate_utils';

describe('RFQM Gas Estimate utils', () => {
    describe('calculateGasEstimate', () => {
        it('should return base gas estimate if neither tokens have premiums', () => {
            const makerToken = '';
            const takerToken = '';

            const result = calculateGasEstimate(makerToken, takerToken);

            expect(result).to.eq(RFQM_TX_GAS_ESTIMATE);
        });

        it('should add a token premium for maker token', () => {
            const makerToken = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
            const takerToken = '';

            const result = calculateGasEstimate(makerToken, takerToken);

            expect(result).to.be.greaterThan(RFQM_TX_GAS_ESTIMATE);
        });

        it('should add a token premium for taker token', () => {
            const makerToken = '';
            const takerToken = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

            const result = calculateGasEstimate(makerToken, takerToken);

            expect(result).to.be.greaterThan(RFQM_TX_GAS_ESTIMATE);
        });

        it('token premiums for maker and taker token should be additive', () => {
            const unknown = '';
            const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
            const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';

            const result1 = calculateGasEstimate(USDC, unknown);
            const result2 = calculateGasEstimate(USDC, USDT);

            expect(result2).to.be.greaterThan(result1);
        });

        it('should be case insensitive to the input tokens', () => {
            const unknown = '';
            const USDC_uppercase = '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48';
            const USDT_uppercase = '0xDAC17F958D2EE523A2206206994597C13D831EC7';

            const result0 = calculateGasEstimate(unknown, unknown);
            const result1 = calculateGasEstimate(USDC_uppercase, unknown);
            const result2 = calculateGasEstimate(USDC_uppercase, USDT_uppercase);

            expect(result1).to.be.greaterThan(result0);
            expect(result2).to.be.greaterThan(result1);
        });
    });
});
