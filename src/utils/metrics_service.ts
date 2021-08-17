import { MetricsProxy } from '@0x/asset-swapper/lib/src/utils/quote_requestor';
import { BigNumber } from '@0x/utils';
import { Counter, Histogram } from 'prom-client';

const ORDER_EXPIRED_TOO_SOON = new Counter({
    name: 'rfq_order_expired_too_soon',
    help: 'RFQ Order expired too soon',
    labelNames: ['maker', 'isLastLook'],
});

const EXPIRATION_FOR_VALID_ORDER_SECONDS = new Histogram({
    name: 'rfq_expiration_for_valid_order',
    help: 'Order expiration in seconds for ',
    labelNames: ['maker', 'isLastLook'],
});

const ORDER_FILL_RATIO_WARNING_RANGE = new Counter({
    name: 'rfq_fill_ratio_warning',
    help: 'Fill ratio is in warning range (99%) usually due to a bug',
    labelNames: ['maker', 'isLastLook'],
});

export const METRICS_PROXY: MetricsProxy = {
    incrementExpirationToSoonCounter: (isLastLook: boolean, maker: string) => {
        ORDER_EXPIRED_TOO_SOON.labels(maker, isLastLook.toString()).inc();
    },

    measureExpirationForValidOrder: (isLastLook: boolean, maker: string, expirationTimeSeconds: BigNumber) => {
        EXPIRATION_FOR_VALID_ORDER_SECONDS.labels(maker, isLastLook.toString()).observe(
            expirationTimeSeconds.toNumber(),
        );
    },

    incrementFillRatioWarningCounter: (isLastLook: boolean, maker: string) => {
        ORDER_FILL_RATIO_WARNING_RANGE.labels(maker, isLastLook.toString()).inc();
    },
};
