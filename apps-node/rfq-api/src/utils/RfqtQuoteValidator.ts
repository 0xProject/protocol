import { BigNumber } from '@0x/utils';
import { Counter } from 'prom-client';

import { ONE_SECOND_MS } from '../core/constants';
import { logger } from '../logger';
import { QuoteContext } from '../services/types';
import { RfqtV2Price } from '../core/types';

const ORDER_FULLY_FILLABLE = new Counter({
    name: 'rfqt_order_fully_fillable',
    help: 'Number of fully fillable rfqt orders',
    labelNames: ['chainId', 'makerUri'],
});
const ORDER_PARTIALLY_FILLABLE = new Counter({
    name: 'rfqt_order_partially_fillable',
    help: 'Number of partially fillable rfqt orders',
    labelNames: ['chainId', 'makerUri'],
});
const ORDER_NOT_FILLABLE = new Counter({
    name: 'rfqt_order_not_fillable',
    help: 'Number of rfqt orders that are not fillable',
    labelNames: ['chainId', 'makerUri'],
});

const RFQT_MM_RETURNED_OVERFILL = new Counter({
    name: 'rfqt_mm_returned_overfill_total',
    help: 'A maker responded a quote with more amount than requested',
    labelNames: ['maker_uri', 'chain_id'],
});

/**
 * Performs basic validation on fetched prices from Market Makers.
 *
 * Filters prices that:
 * - are for the wrong pair
 * - expire in less than the validity window
 *
 * @param prices Prices fetched from Market Makers
 * @returns Array of valid prices
 */
export function validateV2Prices(
    prices: RfqtV2Price[],
    quoteContext: QuoteContext,
    validityWindowMs: number,
    chainId: number,
    now: Date = new Date(),
): RfqtV2Price[] {
    // calculate minimum expiry threshold
    const nowSeconds = new BigNumber(now.getTime()).div(ONE_SECOND_MS);
    const validityWindowS = new BigNumber(validityWindowMs).div(ONE_SECOND_MS);
    const expiryThreshold = nowSeconds.plus(validityWindowS);

    return prices
        .filter((price) => price.makerToken === quoteContext.makerToken && price.takerToken === quoteContext.takerToken)
        .map((price) => {
            // log if MM returns an overfill
            const { assetFillAmount, isSelling, workflow } = quoteContext;
            const { makerAmount, makerUri, takerAmount } = price;
            const quotedAmount = isSelling ? takerAmount : makerAmount;
            if (quotedAmount.gt(assetFillAmount)) {
                logger.warn(
                    {
                        isSelling,
                        requestedAmount: assetFillAmount,
                        quotedAmount,
                        price,
                        makerUri,
                        workflow,
                    },
                    'MM returned an overfilled amount',
                );
                RFQT_MM_RETURNED_OVERFILL.labels(makerUri, chainId.toString()).inc();
            }
            return price;
        })
        .filter((price) => price.expiry.gte(expiryThreshold));
}

/**
 * Calculates fillable amounts based on the amount of assets Market Makers can provide for the trading pair.
 * If the maker has enough balance, return full amounts originally requested from the order.
 * If not, scale down fillable taker amount based on maker balance.
 *
 * @param prices Prices fetched from Market Makers
 * @param chainId Chain ID of fetched prices
 * @param quotedMakerBalances Array of cached market maker balances
 * @returns Array of maker and taker fillable amounts
 */
export function getRfqtV2FillableAmounts(
    prices: RfqtV2Price[],
    chainId: number,
    quotedMakerBalances?: BigNumber[],
): { fillableMakerAmount: BigNumber; fillableTakerAmount: BigNumber }[] {
    // if no maker balances are present, assume all orders are fully fillable
    if (!quotedMakerBalances) {
        return prices.map((price) => ({
            fillableMakerAmount: price.makerAmount,
            fillableTakerAmount: price.takerAmount,
        }));
    }

    return prices.map((price, i) => {
        // if requested maker amount is zero, order is not fillable
        if (price.makerAmount.lte(0)) {
            ORDER_NOT_FILLABLE.inc({
                chainId,
                makerUri: price.makerUri,
            });
            logger.warn({ price }, 'Market maker provided an empty order');
            return {
                fillableMakerAmount: new BigNumber(0),
                fillableTakerAmount: new BigNumber(0),
            };
        }

        const makerBalance: BigNumber = quotedMakerBalances[i];

        // quote is fully fillable
        if (makerBalance.gte(price.makerAmount)) {
            ORDER_FULLY_FILLABLE.inc({
                chainId,
                makerUri: price.makerUri,
            });
            return {
                fillableMakerAmount: price.makerAmount,
                fillableTakerAmount: price.takerAmount,
            };
        }

        // order may be partially fillable
        // scale down fillable taker amount according to available maker balance
        const partialFillableTakerAmount = price.takerAmount.times(makerBalance).idiv(price.makerAmount);
        ORDER_PARTIALLY_FILLABLE.inc({
            chainId,
            makerUri: price.makerUri,
        });
        logger.warn(
            {
                price,
                makerAmount: price.makerAmount,
                makerBalance,
                takerAmount: price.takerAmount,
                partialFillableTakerAmount,
            },
            'Market maker can only partially cover an order',
        );
        return {
            fillableMakerAmount: makerBalance,
            fillableTakerAmount: partialFillableTakerAmount,
        };
    });
}
