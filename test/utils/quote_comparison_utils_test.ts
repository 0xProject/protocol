// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count
import { OtcOrder, SignatureType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';

import { DEFAULT_MIN_EXPIRY_DURATION_MS, ONE_SECOND_MS, ZERO } from '../../src/core/constants';
import { FirmOtcQuote, IndicativeQuote } from '../../src/core/types';
import { getBestQuote } from '../../src/utils/quote_comparison_utils';

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-loss-of-precision
const NEVER_EXPIRES = new BigNumber(9999999999999999);

function createBaseQuote(): FirmOtcQuote {
    return {
        order: new OtcOrder({
            makerAmount: ZERO,
            takerAmount: ZERO,
        }),
        kind: 'otc',
        makerSignature: {
            signatureType: SignatureType.Invalid,
            v: 0,
            r: '0x1',
            s: '0x2',
        },
        makerUri: 'someuri.xyz',
    };
}
describe('Quote Comparison Utils', () => {
    describe('getBestQuote', () => {
        const makerToken = 'DAI';
        const takerToken = 'SUSD';
        const assetFillAmount = new BigNumber(100);
        const validityWindowMs = DEFAULT_MIN_EXPIRY_DURATION_MS;
        const inThirtySeconds = new BigNumber(Math.round((Date.now() + ONE_SECOND_MS * 30) / ONE_SECOND_MS));

        describe('IndicativeQuotes when selling', () => {
            // Given
            const BASE_INDICATIVE_QUOTE = {
                makerUri: 'http://makeruri',
                maker: '0xmaker',
                makerToken,
                takerToken,
                expiry: NEVER_EXPIRES,
            };

            describe('sells', () => {
                const isSelling = true;
                const partialFillQuote: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(55),
                    takerAmount: new BigNumber(50),
                };

                const fullQuoteBadPricing: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(99),
                    takerAmount: new BigNumber(100),
                };

                const fullQuoteOkPricing: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(105),
                    takerAmount: new BigNumber(100),
                };

                const fullQuoteGreatPricing: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(125),
                    takerAmount: new BigNumber(100),
                };

                const wrongPair: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    expiry: NEVER_EXPIRES,
                    makerAmount: new BigNumber(125),
                    makerToken: takerToken,
                    makerUri: 'http://makeruri',
                    takerAmount: new BigNumber(100),
                    takerToken: makerToken,
                };

                const expiresInOneMinute: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(125),
                    takerAmount: new BigNumber(100),
                    expiry: inThirtySeconds,
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
                        const bestQuote = getBestQuote<IndicativeQuote>(
                            quotes,
                            isSelling,
                            takerToken,
                            makerToken,
                            assetFillAmount,
                            validityWindowMs,
                        );

                        if (bestQuote === null) {
                            expect(expectations?.isNull).to.equal(true);
                            return;
                        }

                        expect(expectations?.isNull).to.equal(false);
                        expect(bestQuote.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                        expect(bestQuote.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                    });
                });
            });

            describe('buys', () => {
                const isSelling = false;
                const partialFillQuote: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(55),
                    takerAmount: new BigNumber(50),
                };

                const fullQuoteBadPricing: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(125),
                };

                const fullQuoteOkPricing: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(120),
                };

                const fullQuoteGreatPricing: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
                    makerAmount: new BigNumber(100),
                    takerAmount: new BigNumber(80),
                };

                const wrongPair: IndicativeQuote = {
                    ...BASE_INDICATIVE_QUOTE,
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
                    expiry: inThirtySeconds,
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
                        const bestQuote = getBestQuote<IndicativeQuote>(
                            quotes,
                            isSelling,
                            takerToken,
                            makerToken,
                            assetFillAmount,
                            validityWindowMs,
                        );

                        if (bestQuote === null) {
                            expect(expectations?.isNull).to.equal(true);
                            return;
                        }

                        expect(expectations?.isNull).to.equal(false);
                        expect(bestQuote.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                        expect(bestQuote.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                    });
                });
            });
        });

        describe('FirmQuotes', () => {
            // Given
            const BASE_QUOTE = createBaseQuote();

            const BASE_ORDER = new OtcOrder({
                makerToken,
                takerToken,
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(NEVER_EXPIRES, ZERO, ZERO),
            });

            describe('sells', () => {
                const isSelling = true;
                const partialFillQuote: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(55),
                        takerAmount: new BigNumber(50),
                    }),
                };

                const fullQuoteBadPricing: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(99),
                        takerAmount: new BigNumber(100),
                    }),
                };

                const fullQuoteOkPricing: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(105),
                        takerAmount: new BigNumber(100),
                    }),
                };

                const fullQuoteGreatPricing: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(125),
                        takerAmount: new BigNumber(100),
                    }),
                };

                const wrongPair: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerToken: takerToken,
                        takerToken: makerToken,
                        makerAmount: new BigNumber(125),
                        takerAmount: new BigNumber(100),
                    }),
                };

                const expiresInOneMinute: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(125),
                        takerAmount: new BigNumber(100),
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(inThirtySeconds, ZERO, ZERO),
                    }),
                };

                // TODO (MKR-671): uncomment once filter is enabled
                const validMakerBalances: BigNumber[] = [new BigNumber(150), new BigNumber(150)];
                const invalidMakerBalances: BigNumber[] = [new BigNumber(150), new BigNumber(50)];

                const tests = [
                    {
                        name: 'should return null when no quotes valid',
                        args: {
                            quotes: [partialFillQuote],
                        },
                        expectations: {
                            isNull: true,
                            makerAmount: undefined,
                            takerAmount: undefined,
                        },
                    },
                    {
                        name: 'should only select quotes that are 100% filled',
                        args: {
                            quotes: [partialFillQuote, fullQuoteBadPricing],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 99,
                            takerAmount: 100,
                        },
                    },
                    {
                        name: 'should select quote with best pricing',
                        args: {
                            quotes: [fullQuoteBadPricing, fullQuoteGreatPricing, fullQuoteOkPricing],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 125,
                            takerAmount: 100,
                        },
                    },
                    {
                        name: 'should ignore quotes with the wrong pair',
                        args: {
                            quotes: [fullQuoteBadPricing, wrongPair],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 99,
                            takerAmount: 100,
                        },
                    },
                    {
                        name: 'should ignore quotes that expire too soon',
                        args: {
                            quotes: [fullQuoteBadPricing, expiresInOneMinute],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 99,
                            takerAmount: 100,
                        },
                    },
                    // TODO (MKR-671): uncomment once filter is enabled
                    {
                        name: 'should not ignore quotes if makers have enough balances',
                        args: {
                            quotes: [fullQuoteBadPricing, fullQuoteOkPricing],
                            quotedMakerBalances: validMakerBalances,
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 105,
                            takerAmount: 100,
                        },
                    },
                    {
                        name: 'should ignore quotes if makers do not have enough balances',
                        args: {
                            quotes: [fullQuoteBadPricing, fullQuoteOkPricing],
                            quotedMakerBalances: invalidMakerBalances,
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 99,
                            takerAmount: 100,
                        },
                    },
                ];

                tests.forEach(({ name, args, expectations }) => {
                    it(name, () => {
                        const bestQuote = getBestQuote(
                            args?.quotes,
                            isSelling,
                            takerToken,
                            makerToken,
                            assetFillAmount,
                            validityWindowMs,
                            args?.quotedMakerBalances,
                        );

                        if (bestQuote === null) {
                            expect(expectations?.isNull).to.equal(true);
                            return;
                        }

                        expect(expectations?.isNull).to.equal(false);
                        expect(bestQuote.order.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                        expect(bestQuote.order.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                    });
                });
            });

            describe('buys', () => {
                const isSelling = false;
                const partialFillQuote: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(55),
                        takerAmount: new BigNumber(50),
                    }),
                };
                const fullQuoteBadPricing: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(100),
                        takerAmount: new BigNumber(125),
                    }),
                };

                const fullQuoteOkPricing: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(100),
                        takerAmount: new BigNumber(120),
                    }),
                };

                const fullQuoteGreatPricing: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(100),
                        takerAmount: new BigNumber(80),
                    }),
                };

                const wrongPair: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerToken: takerToken,
                        takerToken: makerToken,
                        makerAmount: new BigNumber(100),
                        takerAmount: new BigNumber(80),
                    }),
                };

                const expiresInOneMinute: FirmOtcQuote = {
                    ...BASE_QUOTE,
                    order: new OtcOrder({
                        ...BASE_ORDER,
                        makerAmount: new BigNumber(100),
                        takerAmount: new BigNumber(80),
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(inThirtySeconds, ZERO, ZERO),
                    }),
                };

                // TODO (MKR-671): uncomment once filter is enabled
                const validMakerBalances: BigNumber[] = [new BigNumber(150), new BigNumber(150)];
                const invalidMakerBalances: BigNumber[] = [new BigNumber(150), new BigNumber(50)];

                const tests = [
                    {
                        name: 'should return null when no quotes valid',
                        args: {
                            quotes: [partialFillQuote],
                        },
                        expectations: {
                            isNull: true,
                            makerAmount: undefined,
                            takerAmount: undefined,
                        },
                    },
                    {
                        name: 'should only select quotes that are 100% filled',
                        args: {
                            quotes: [partialFillQuote, fullQuoteBadPricing],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 100,
                            takerAmount: 125,
                        },
                    },
                    {
                        name: 'should select quote with best pricing',
                        args: {
                            quotes: [fullQuoteBadPricing, fullQuoteGreatPricing, fullQuoteOkPricing],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 100,
                            takerAmount: 80,
                        },
                    },
                    {
                        name: 'should ignore quotes with the wrong pair',
                        args: {
                            quotes: [fullQuoteBadPricing, wrongPair],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 100,
                            takerAmount: 125,
                        },
                    },
                    {
                        name: 'should ignore quotes that expire too soon',
                        args: {
                            quotes: [fullQuoteBadPricing, expiresInOneMinute],
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 100,
                            takerAmount: 125,
                        },
                    },
                    // TODO (MKR-671): uncomment once filter is enabled
                    {
                        name: 'should not ignore quotes if makers have enough balances',
                        args: {
                            quotes: [fullQuoteBadPricing, fullQuoteOkPricing],
                            quotedMakerBalances: validMakerBalances,
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 100,
                            takerAmount: 120,
                        },
                    },
                    {
                        name: 'should ignore quotes if makers do not have enough balances',
                        args: {
                            quotes: [fullQuoteBadPricing, fullQuoteOkPricing],
                            quotedMakerBalances: invalidMakerBalances,
                        },
                        expectations: {
                            isNull: false,
                            makerAmount: 100,
                            takerAmount: 125,
                        },
                    },
                ];

                tests.forEach(({ name, args, expectations }) => {
                    it(name, () => {
                        const bestQuote = getBestQuote(
                            args?.quotes,
                            isSelling,
                            takerToken,
                            makerToken,
                            assetFillAmount,
                            validityWindowMs,
                            args?.quotedMakerBalances,
                        );

                        if (bestQuote === null) {
                            expect(expectations?.isNull).to.equal(true);
                            return;
                        }

                        expect(expectations?.isNull).to.equal(false);
                        expect(bestQuote.order.makerAmount.toNumber()).to.be.eq(expectations?.makerAmount);
                        expect(bestQuote.order.takerAmount.toNumber()).to.be.eq(expectations?.takerAmount);
                    });
                });
            });
        });
    });
});
