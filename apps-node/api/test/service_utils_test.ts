import { expect, randomAddress } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import 'mocha';

import { AffiliateFeeType, ERC20BridgeSource } from '../src/asset-swapper';
import { AFFILIATE_FEE_TRANSFORMER_GAS, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS, ZERO } from '../src/constants';
import { serviceUtils } from '../src/utils/service_utils';

import { AFFILIATE_DATA_SELECTOR } from './constants';
import { randomSellQuote } from './utils/mocks';

const SUITE_NAME = 'serviceUtils';

describe(SUITE_NAME, () => {
    describe('attributeCallData', () => {
        it('it returns a reasonable ID and timestamp', () => {
            const fakeCallData = '0x0000000000000';
            const fakeAffiliate = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
            const attributedCallData = serviceUtils.attributeCallData(fakeCallData, fakeAffiliate).affiliatedData;
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

    // NOTES: the tests runs with Ganache chain id.
    describe('convertToLiquiditySources', () => {
        it('returns the correct liquidity sources for multiple single sources', () => {
            const liquiditySources = serviceUtils.convertToLiquiditySources({
                singleSource: {
                    [ERC20BridgeSource.Native]: new BigNumber(0.5),
                    [ERC20BridgeSource.UniswapV3]: new BigNumber(0.5),
                },
                multihop: [],
            });

            expect(liquiditySources).to.be.deep.eq([
                {
                    name: '0x',
                    proportion: new BigNumber(0.5),
                },
                {
                    name: ERC20BridgeSource.UniswapV3,
                    proportion: new BigNumber(0.5),
                },
            ]);
        });

        it('returns the correct liquidity sources for a mix of a single source and multihop sources', () => {
            const liquiditySources = serviceUtils.convertToLiquiditySources({
                singleSource: {
                    [ERC20BridgeSource.Native]: new BigNumber(0.2),
                },
                multihop: [
                    {
                        proportion: new BigNumber(0.3),
                        intermediateToken: 'intermediate-token-a',
                        hops: [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.Curve],
                    },

                    {
                        proportion: new BigNumber(0.4),
                        intermediateToken: 'intermediate-token-b',
                        hops: [ERC20BridgeSource.BalancerV2, ERC20BridgeSource.Curve],
                    },
                ],
            });

            expect(liquiditySources).to.be.deep.eq([
                {
                    name: '0x',
                    proportion: new BigNumber(0.2),
                },
                {
                    name: ERC20BridgeSource.MultiHop,
                    proportion: new BigNumber(0.3),
                    intermediateToken: 'intermediate-token-a',
                    hops: [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.Curve],
                },

                {
                    name: ERC20BridgeSource.MultiHop,
                    proportion: new BigNumber(0.4),
                    intermediateToken: 'intermediate-token-b',
                    hops: [ERC20BridgeSource.BalancerV2, ERC20BridgeSource.Curve],
                },
            ]);
        });
    });
    describe('getAffiliateFeeAmounts', () => {
        it('returns the correct amounts if the fee is zero', () => {
            const affiliateFee = {
                feeType: AffiliateFeeType.PercentageFee,
                recipient: '',
                buyTokenPercentageFee: 0,
                sellTokenPercentageFee: 0,
            };
            const costInfo = serviceUtils.getBuyTokenFeeAmounts(randomSellQuote, affiliateFee);
            expect(costInfo).to.deep.equal({
                buyTokenFeeAmount: ZERO,
                sellTokenFeeAmount: ZERO,
                gasCost: ZERO,
            });
        });
        it('returns the correct amounts if the fee is non-zero', () => {
            const affiliateFee = {
                feeType: AffiliateFeeType.PercentageFee,
                recipient: randomAddress(),
                buyTokenPercentageFee: 0.01,
                sellTokenPercentageFee: 0,
            };
            const costInfo = serviceUtils.getBuyTokenFeeAmounts(randomSellQuote, affiliateFee);
            expect(costInfo).to.deep.equal({
                buyTokenFeeAmount: randomSellQuote.worstCaseQuoteInfo.makerAmount
                    .times(affiliateFee.buyTokenPercentageFee)
                    .dividedBy(affiliateFee.buyTokenPercentageFee + 1)
                    .integerValue(BigNumber.ROUND_DOWN),
                sellTokenFeeAmount: ZERO,
                gasCost: AFFILIATE_FEE_TRANSFORMER_GAS,
            });
        });
    });
    it('returns the correct amounts if the positive slippage fee is non-zero', () => {
        const affiliateFee = {
            feeType: AffiliateFeeType.PositiveSlippageFee,
            recipient: randomAddress(),
            buyTokenPercentageFee: 0,
            sellTokenPercentageFee: 0,
        };
        const costInfo = serviceUtils.getBuyTokenFeeAmounts(randomSellQuote, affiliateFee);
        expect(costInfo).to.deep.equal({
            buyTokenFeeAmount: ZERO,
            sellTokenFeeAmount: ZERO,
            gasCost: POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS,
        });
    });
    it('returns the correct amounts if gasless', () => {
        const affiliateFee = {
            feeType: AffiliateFeeType.GaslessFee,
            recipient: randomAddress(),
            buyTokenPercentageFee: 0,
            sellTokenPercentageFee: 0,
        };
        const costInfo = serviceUtils.getBuyTokenFeeAmounts(randomSellQuote, affiliateFee);
        expect(costInfo).to.deep.equal({
            buyTokenFeeAmount: randomSellQuote.gasPrice
                .times(randomSellQuote.worstCaseQuoteInfo.gas)
                .times(randomSellQuote.makerAmountPerEth)
                .integerValue(BigNumber.ROUND_DOWN),
            sellTokenFeeAmount: ZERO,
            gasCost: AFFILIATE_FEE_TRANSFORMER_GAS,
        });
    });
});
