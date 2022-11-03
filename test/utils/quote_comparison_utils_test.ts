import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';

import {
    FillQuoteTransformerOrderType,
    RfqOrder,
    SignatureType,
    SignedNativeOrder,
    V4RFQIndicativeQuote,
} from '../../src/asset-swapper';
import { SignedRfqOrder } from '../../src/asset-swapper/types';
import { ONE_SECOND_MS } from '../../src/asset-swapper/utils/market_operation_utils/constants';
import { ONE_MINUTE_MS, RFQM_MINIMUM_EXPIRY_DURATION_MS, ZERO } from '../../src/constants';
import { getBestQuote } from '../../src/utils/quote_comparison_utils';

const NEVER_EXPIRES = new BigNumber('9999999999999999');

function createBaseOrder(): SignedRfqOrder {
    return {
        type: FillQuoteTransformerOrderType.Rfq,
        order: {
            ...new RfqOrder({
                makerAmount: ZERO,
                takerAmount: ZERO,
            }),
        },
        signature: {
            signatureType: SignatureType.Invalid,
            v: 0,
            r: '0x1',
            s: '0x2',
        },
    };
}

describe('getBestQuote', () => {
    const makerToken = 'DAI';
    const takerToken = 'SUSD';
    const assetFillAmount = new BigNumber(100);
    const validityWindowMs = RFQM_MINIMUM_EXPIRY_DURATION_MS;
    const inOneMinute = new BigNumber((Date.now() + ONE_MINUTE_MS) / ONE_SECOND_MS);

    describe('IndicativeQuotes when selling', () => {
        // Given
        const BASE_INDICATIVE_QUOTE = {
            makerToken,
            takerToken,
            expiry: NEVER_EXPIRES,
        };

        describe('sells', () => {
            const isSelling = true;
            const partialFillQuote = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(55),
                takerAmount: new BigNumber(50),
            };

            const fullQuoteBadPricing = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(99),
                takerAmount: new BigNumber(100),
            };

            const fullQuoteOkPricing = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(105),
                takerAmount: new BigNumber(100),
            };

            const fullQuoteGreatPricing = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(125),
                takerAmount: new BigNumber(100),
            };

            const wrongPair = {
                makerToken: takerToken,
                takerToken: makerToken,
                expiry: NEVER_EXPIRES,
                makerAmount: new BigNumber(125),
                takerAmount: new BigNumber(100),
            };

            const expiresInOneMinute = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(125),
                takerAmount: new BigNumber(100),
                expiry: inOneMinute,
            };

            const tests = [
                {
                    name: 'should return null when no quotes valid',
                    quotes: [partialFillQuote],
                    expectations: {
                        isNull: true,
                        makerAmount: undefined,
                        takerAmount: undefined,
                    },
                },
                {
                    name: 'should only select quotes that are 100% filled',
                    quotes: [partialFillQuote, fullQuoteBadPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 99,
                        takerAmount: 100,
                    },
                },
                {
                    name: 'should select quote with best pricing',
                    quotes: [fullQuoteBadPricing, fullQuoteGreatPricing, fullQuoteOkPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 125,
                        takerAmount: 100,
                    },
                },
                {
                    name: 'should ignore quotes with the wrong pair',
                    quotes: [fullQuoteBadPricing, wrongPair],
                    expectations: {
                        isNull: false,
                        makerAmount: 99,
                        takerAmount: 100,
                    },
                },
                {
                    name: 'should ignore quotes that expire too soon',
                    quotes: [fullQuoteBadPricing, expiresInOneMinute],
                    expectations: {
                        isNull: false,
                        makerAmount: 99,
                        takerAmount: 100,
                    },
                },
            ];

            tests.forEach(({ name, quotes, expectations }) => {
                it(name, () => {
                    const bestQuote = getBestQuote<V4RFQIndicativeQuote>(
                        quotes,
                        isSelling,
                        takerToken,
                        makerToken,
                        assetFillAmount,
                        validityWindowMs,
                    );

                    if (bestQuote === null) {
                        expect(expectations?.isNull).to.be.true();
                        return;
                    }

                    expect(expectations?.isNull).to.be.false();
                    expect(bestQuote.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                    expect(bestQuote.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                });
            });
        });

        describe('buys', () => {
            const isSelling = false;
            const partialFillQuote = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(55),
                takerAmount: new BigNumber(50),
            };

            const fullQuoteBadPricing = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(100),
                takerAmount: new BigNumber(125),
            };

            const fullQuoteOkPricing = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(100),
                takerAmount: new BigNumber(120),
            };

            const fullQuoteGreatPricing = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(100),
                takerAmount: new BigNumber(80),
            };

            const wrongPair = {
                makerToken: takerToken,
                takerToken: makerToken,
                expiry: NEVER_EXPIRES,
                makerAmount: new BigNumber(100),
                takerAmount: new BigNumber(80),
            };

            const expiresInOneMinute = {
                ...BASE_INDICATIVE_QUOTE,
                makerAmount: new BigNumber(100),
                takerAmount: new BigNumber(80),
                expiry: inOneMinute,
            };

            const tests = [
                {
                    name: 'should return null when no quotes valid',
                    quotes: [partialFillQuote],
                    expectations: {
                        isNull: true,
                        makerAmount: undefined,
                        takerAmount: undefined,
                    },
                },
                {
                    name: 'should only select quotes that are 100% filled',
                    quotes: [partialFillQuote, fullQuoteBadPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 125,
                    },
                },
                {
                    name: 'should select quote with best pricing',
                    quotes: [fullQuoteBadPricing, fullQuoteGreatPricing, fullQuoteOkPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 80,
                    },
                },
                {
                    name: 'should ignore quotes with the wrong pair',
                    quotes: [fullQuoteBadPricing, wrongPair],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 125,
                    },
                },
                {
                    name: 'should ignore quotes that expire too soon',
                    quotes: [fullQuoteBadPricing, expiresInOneMinute],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 125,
                    },
                },
            ];

            tests.forEach(({ name, quotes, expectations }) => {
                it(name, () => {
                    const bestQuote = getBestQuote<V4RFQIndicativeQuote>(
                        quotes,
                        isSelling,
                        takerToken,
                        makerToken,
                        assetFillAmount,
                        validityWindowMs,
                    );

                    if (bestQuote === null) {
                        expect(expectations?.isNull).to.be.true();
                        return;
                    }

                    expect(expectations?.isNull).to.be.false();
                    expect(bestQuote.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                    expect(bestQuote.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                });
            });
        });
    });

    describe('FirmQuotes', () => {
        // Given
        const BASE_QUOTE = createBaseOrder();

        const BASE_ORDER = new RfqOrder({
            makerToken,
            takerToken,
            expiry: NEVER_EXPIRES,
        });

        describe('sells', () => {
            const isSelling = true;
            const partialFillQuote = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(55),
                    takerAmount: new BigNumber(50),
                },
            };

            const fullQuoteBadPricing = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(99),
                    takerAmount: new BigNumber(100),
                },
            };

            const fullQuoteOkPricing = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(105),
                    takerAmount: new BigNumber(100),
                },
            };

            const fullQuoteGreatPricing = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(125),
                    takerAmount: new BigNumber(100),
                },
            };

            const wrongPair = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerToken: takerToken,
                    takerToken: makerToken,
                    expiry: NEVER_EXPIRES,
                    makerAmount: new BigNumber(125),
                    takerAmount: new BigNumber(100),
                },
            };

            const expiresInOneMinute = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(125),
                    takerAmount: new BigNumber(100),
                    expiry: inOneMinute,
                },
            };

            const tests = [
                {
                    name: 'should return null when no quotes valid',
                    quotes: [partialFillQuote],
                    expectations: {
                        isNull: true,
                        makerAmount: undefined,
                        takerAmount: undefined,
                    },
                },
                {
                    name: 'should only select quotes that are 100% filled',
                    quotes: [partialFillQuote, fullQuoteBadPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 99,
                        takerAmount: 100,
                    },
                },
                {
                    name: 'should select quote with best pricing',
                    quotes: [fullQuoteBadPricing, fullQuoteGreatPricing, fullQuoteOkPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 125,
                        takerAmount: 100,
                    },
                },
                {
                    name: 'should ignore quotes with the wrong pair',
                    quotes: [fullQuoteBadPricing, wrongPair],
                    expectations: {
                        isNull: false,
                        makerAmount: 99,
                        takerAmount: 100,
                    },
                },
                {
                    name: 'should ignore quotes that expire too soon',
                    quotes: [fullQuoteBadPricing, expiresInOneMinute],
                    expectations: {
                        isNull: false,
                        makerAmount: 99,
                        takerAmount: 100,
                    },
                },
            ];

            tests.forEach(({ name, quotes, expectations }) => {
                it(name, () => {
                    const bestQuote = getBestQuote<SignedNativeOrder>(
                        quotes,
                        isSelling,
                        takerToken,
                        makerToken,
                        assetFillAmount,
                        validityWindowMs,
                    );

                    if (bestQuote === null) {
                        expect(expectations?.isNull).to.be.true();
                        return;
                    }

                    expect(expectations?.isNull).to.be.false();
                    expect(bestQuote.order.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                    expect(bestQuote.order.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                });
            });
        });

        describe('buys', () => {
            const isSelling = false;
            const partialFillQuote = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(55),
                    takerAmount: new BigNumber(50),
                },
            };

            const fullQuoteBadPricing = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(125),
                },
            };

            const fullQuoteOkPricing = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(120),
                },
            };

            const fullQuoteGreatPricing = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(80),
                },
            };

            const wrongPair = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerToken: takerToken,
                    takerToken: makerToken,
                    expiry: NEVER_EXPIRES,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(80),
                },
            };

            const expiresInOneMinute = {
                ...BASE_QUOTE,
                order: {
                    ...BASE_ORDER,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(80),
                    expiry: inOneMinute,
                },
            };

            const tests = [
                {
                    name: 'should return null when no quotes valid',
                    quotes: [partialFillQuote],
                    expectations: {
                        isNull: true,
                        makerAmount: undefined,
                        takerAmount: undefined,
                    },
                },
                {
                    name: 'should only select quotes that are 100% filled',
                    quotes: [partialFillQuote, fullQuoteBadPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 125,
                    },
                },
                {
                    name: 'should select quote with best pricing',
                    quotes: [fullQuoteBadPricing, fullQuoteGreatPricing, fullQuoteOkPricing],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 80,
                    },
                },
                {
                    name: 'should ignore quotes with the wrong pair',
                    quotes: [fullQuoteBadPricing, wrongPair],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 125,
                    },
                },
                {
                    name: 'should ignore quotes that expire too soon',
                    quotes: [fullQuoteBadPricing, expiresInOneMinute],
                    expectations: {
                        isNull: false,
                        makerAmount: 100,
                        takerAmount: 125,
                    },
                },
            ];

            tests.forEach(({ name, quotes, expectations }) => {
                it(name, () => {
                    const bestQuote = getBestQuote<SignedNativeOrder>(
                        quotes,
                        isSelling,
                        takerToken,
                        makerToken,
                        assetFillAmount,
                        validityWindowMs,
                    );

                    if (bestQuote === null) {
                        expect(expectations?.isNull).to.be.true();
                        return;
                    }

                    expect(expectations?.isNull).to.be.false();
                    expect(bestQuote.order.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                    expect(bestQuote.order.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                });
            });
        });
    });
});
