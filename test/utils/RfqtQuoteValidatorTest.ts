import { BigNumber } from '@0x/utils';
import { Integrator } from '../../src/config';
import { ONE_MINUTE_MS, ONE_SECOND_MS } from '../../src/constants';
import { QuoteContext } from '../../src/services/types';

import { RfqtV2Prices } from '../../src/types';
import { getRfqtV2FillableAmounts, validateV2Prices } from '../../src/utils/RfqtQuoteValidator';

describe('Rfqt Quote Validator', () => {
    const chainId = 1337;
    const integrator: Integrator = {
        allowedChainIds: [chainId],
        apiKeys: [],
        integratorId: 'integrator-id',
        label: 'test integrator',
        plp: false,
        rfqm: false,
        rfqt: true,
    };
    const quoteContext: QuoteContext = {
        isFirm: false,
        workflow: 'rfqt',
        isUnwrap: false,
        originalMakerToken: '0x1',
        takerTokenDecimals: 18,
        makerTokenDecimals: 18,
        feeModelVersion: 1,
        assetFillAmount: new BigNumber(111),
        chainId,
        integrator,
        makerToken: '0x1',
        isSelling: false,
        takerAddress: '0x0',
        takerToken: '0x2',
        txOrigin: '0xtakeraddress',
    };
    const nowTimeS = new BigNumber(Date.now()).div(ONE_SECOND_MS);
    const validPrices: RfqtV2Prices = [
        {
            expiry: nowTimeS.plus(75),
            makerAddress: '0xmaker1',
            makerAmount: new BigNumber(111),
            makerId: 'uuid-maker1',
            makerToken: '0x1',
            makerUri: 'maker1.xyz',
            takerAmount: new BigNumber(111),
            takerToken: '0x2',
        },
        {
            expiry: nowTimeS.plus(75),
            makerAddress: '0xmaker2',
            makerAmount: new BigNumber(111),
            makerId: 'uuid-maker2',
            makerToken: '0x1',
            makerUri: 'maker2.xyz',
            takerAmount: new BigNumber(111),
            takerToken: '0x2',
        },
    ];
    const validityWindowMs = ONE_MINUTE_MS;

    describe('validateV2Prices', () => {
        it('filters fetched prices for the wrong pair', () => {
            const prices: RfqtV2Prices = [
                ...validPrices,
                {
                    expiry: nowTimeS.plus(75),
                    makerAddress: '0xmaker3',
                    makerAmount: new BigNumber(111),
                    makerId: 'uuid-maker3',
                    makerToken: '0x1',
                    makerUri: 'maker3.xyz',
                    takerAmount: new BigNumber(111),
                    takerToken: '0x3',
                },
            ];
            const validatedPrices = validateV2Prices(prices, quoteContext, validityWindowMs);
            expect(validatedPrices).toEqual(validPrices);
        });

        it('filters fetched prices with tight expiration windows', () => {
            const prices: RfqtV2Prices = [
                ...validPrices,
                {
                    expiry: nowTimeS.plus(59),
                    makerAddress: '0xmaker3',
                    makerAmount: new BigNumber(111),
                    makerId: 'uuid-maker3',
                    makerToken: '0x1',
                    makerUri: 'maker3.xyz',
                    takerAmount: new BigNumber(111),
                    takerToken: '0x2',
                },
            ];
            const validatedPrices = validateV2Prices(prices, quoteContext, validityWindowMs);
            expect(validatedPrices).toEqual(validPrices);
        });

        it('returns an empty array from empty prices', () => {
            const emptyPrices = validateV2Prices([], quoteContext, validityWindowMs);
            expect(emptyPrices).toEqual([]);
        });
    });

    describe('getRfqtV2FillableAmounts', () => {
        it('returns full amounts for fully fillable orders', () => {
            const quotedMakerBalances = [new BigNumber(1000), new BigNumber(1000)];
            const fillableAmounts = getRfqtV2FillableAmounts(validPrices, chainId, quotedMakerBalances);
            expect(fillableAmounts).toEqual([
                { fillableMakerAmount: new BigNumber(111), fillableTakerAmount: new BigNumber(111) },
                { fillableMakerAmount: new BigNumber(111), fillableTakerAmount: new BigNumber(111) },
            ]);
        });

        it('returns full amounts if maker balances are not present', () => {
            const fillableAmounts = getRfqtV2FillableAmounts(validPrices, chainId);
            expect(fillableAmounts).toEqual([
                { fillableMakerAmount: new BigNumber(111), fillableTakerAmount: new BigNumber(111) },
                { fillableMakerAmount: new BigNumber(111), fillableTakerAmount: new BigNumber(111) },
            ]);
        });

        it('returns partial amounts if a maker does not have enough balance', () => {
            const quotedMakerBalances = [new BigNumber(1000), new BigNumber(10)];
            const fillableAmounts = getRfqtV2FillableAmounts(validPrices, chainId, quotedMakerBalances);
            expect(fillableAmounts).toEqual([
                { fillableMakerAmount: new BigNumber(111), fillableTakerAmount: new BigNumber(111) },
                { fillableMakerAmount: new BigNumber(10), fillableTakerAmount: new BigNumber(10) },
            ]);
        });

        it('returns zero amounts if a maker has zero balance', () => {
            const quotedMakerBalances = [new BigNumber(1000), new BigNumber(0)];
            const fillableAmounts = getRfqtV2FillableAmounts(validPrices, chainId, quotedMakerBalances);
            expect(fillableAmounts).toEqual([
                { fillableMakerAmount: new BigNumber(111), fillableTakerAmount: new BigNumber(111) },
                { fillableMakerAmount: new BigNumber(0), fillableTakerAmount: new BigNumber(0) },
            ]);
        });

        it('returns zero amounts if supplied maker amount is zero', () => {
            const prices = [
                {
                    expiry: nowTimeS.plus(75),
                    makerAddress: '0xmaker3',
                    makerAmount: new BigNumber(0),
                    makerId: 'uuid-maker3',
                    makerToken: '0x1',
                    makerUri: 'maker3.xyz',
                    takerAmount: new BigNumber(111),
                    takerToken: '0x2',
                },
            ];
            const quotedMakerBalances = [new BigNumber(1000)];
            const fillableAmounts = getRfqtV2FillableAmounts(prices, chainId, quotedMakerBalances);
            expect(fillableAmounts).toEqual([
                { fillableMakerAmount: new BigNumber(0), fillableTakerAmount: new BigNumber(0) },
            ]);
        });
    });
});
