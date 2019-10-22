import { Integrator } from '@0x/asset-swapper';
import { MetricsProxy } from '@0x/asset-swapper/lib/src/utils/quote_requestor';
import { BigNumber } from '@0x/utils';
import { Counter, Histogram, Summary } from 'prom-client';

const ORDER_EXPIRED_TOO_SOON = new Counter({
    name: 'rfq_order_expired_too_soon',
    help: 'RFQ Order expired too soon',
    labelNames: ['maker', 'isLastLook'],
});

const EXPIRATION_FOR_VALID_ORDER_SECONDS = new Histogram({
    name: 'rfq_expiration_for_valid_order',
    help: 'Order expiration in seconds for ',
    labelNames: ['maker', 'isLastLook'],
    // Buckets go from 30 seconds all the way to 5 minutes

    // tslint:disable-next-line:custom-no-magic-numbers
    buckets: [0, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300],
});

const ORDER_FILL_RATIO_WARNING_RANGE = new Counter({
    name: 'rfq_fill_ratio_warning',
    help: 'Fill ratio is in warning range (99%) usually due to a bug',
    labelNames: ['maker', 'isLastLook'],
});

const RFQ_MAKER_NETWORK_INTERACTION_COUNTER = new Counter({
    name: 'rfq_maker_network_interaction_counter',
    help: 'Provides stats around market maker network interactions',
    labelNames: ['isLastLook', 'integratorLabel', 'url', 'quoteType', 'included', 'statusCode', 'market'],
});

const RFQ_MAKER_NETWORK_INTERACTION_SUMMARY = new Summary({
    name: 'rfq_maker_network_interaction_summary',
    help: 'Provides stats around market maker network interactions',
    labelNames: ['isLastLook', 'integratorLabel', 'url', 'quoteType', 'included', 'statusCode', 'market'],
});

// NOTE: Do not use this map for anything sensitive. This is only used for
// metrics/datavis purposes.
const KNOWN_TOKENS: { [key: string]: string } = {
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
};

/**
 * Returns a human-readible label for Prometheus counters. Only popular most relevant pairs
 * should be displayed in Prometheus (since it overload the service) and any other market that does
 * not contain popular pairs will simply return "Other".
 *
 * @param tokenSold the token being sold
 * @param tokenPurchased the token being purchased
 * @returns a market like "WETH-DAI", or "Other" is a pair is unknown
 */
function getMarketLabel(tokenSold: string, tokenPurchased: string): string {
    const items = [tokenSold.toLowerCase(), tokenPurchased.toLowerCase()];
    items.sort();

    const tokenA: string | undefined = KNOWN_TOKENS[items[0]];
    const tokenB: string | undefined = KNOWN_TOKENS[items[1]];
    if (!tokenA || !tokenB) {
        return 'Other';
    }
    return `${tokenA}-${tokenB}`;
}

export const METRICS_PROXY: MetricsProxy = {
    incrementExpirationToSoonCounter: (isLastLook: boolean, maker: string) => {
        ORDER_EXPIRED_TOO_SOON.labels(maker, isLastLook.toString()).inc();
    },

    measureExpirationForValidOrder: (isLastLook: boolean, maker: string, expirationTimeSeconds: BigNumber | number) => {
        EXPIRATION_FOR_VALID_ORDER_SECONDS.labels(maker, isLastLook.toString()).observe(
            new BigNumber(expirationTimeSeconds).toNumber(),
        );
    },

    incrementFillRatioWarningCounter: (isLastLook: boolean, maker: string) => {
        ORDER_FILL_RATIO_WARNING_RANGE.labels(maker, isLastLook.toString()).inc();
    },

    logRfqMakerNetworkInteraction: (interaction: {
        isLastLook: boolean;
        integrator: Integrator;
        url: string;
        quoteType: 'firm' | 'indicative';
        statusCode: number | undefined;
        latencyMs: number;
        included: boolean;
        sellTokenAddress: string;
        buyTokenAddress: string;
    }) => {
        const {
            isLastLook,
            integrator,
            url,
            quoteType,
            included: isIncluded,
            statusCode,
            sellTokenAddress,
            buyTokenAddress,
            latencyMs,
        } = interaction;

        const market = getMarketLabel(sellTokenAddress, buyTokenAddress);
        const payload = [
            isLastLook.toString(),
            integrator.label,
            url,
            quoteType,
            isIncluded.toString(),
            `${statusCode || 'N/A'}`,
            market,
        ];
        RFQ_MAKER_NETWORK_INTERACTION_COUNTER.labels(...payload).inc();
        RFQ_MAKER_NETWORK_INTERACTION_SUMMARY.labels(...payload).observe(latencyMs);
    },
};
