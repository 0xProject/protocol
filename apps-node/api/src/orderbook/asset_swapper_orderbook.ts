import { Counter } from 'prom-client';
import { FillQuoteTransformerOrderType, Orderbook, SignedLimitOrder } from '../asset-swapper';
import { PROMETHEUS_LABEL_STATUS_ERROR, PROMETHEUS_LABEL_STATUS_OK } from '../config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../constants';
import { logger } from '../logger';
import { OrderBookService } from '../services/orderbook_service';
import { SRAOrder } from '../types';

const ORDERBOOK_REQUESTS = new Counter({
    name: 'orderbook_requests',
    help: 'The count of orderbook requests',
    labelNames: ['status'],
});

export class AssetSwapperOrderbook extends Orderbook {
    constructor(public readonly orderbookService: OrderBookService) {
        super();
    }

    /**
     * Returns matching limit orders.
     *
     *  NOTE: If the request to orderbook service fails, it returns an empty array.
     */
    public async getOrdersAsync(
        makerToken: string,
        takerToken: string,
        pruneFn?: (o: SignedLimitOrder) => boolean,
    ): Promise<SignedLimitOrder[]> {
        const apiOrders = await this.orderbookService
            .getOrdersAsync(
                DEFAULT_PAGE,
                DEFAULT_PER_PAGE,
                {
                    makerToken,
                    takerToken,
                },
                {},
            )
            .catch((err) => {
                ORDERBOOK_REQUESTS.labels(PROMETHEUS_LABEL_STATUS_ERROR).inc();
                logger.warn(
                    {
                        takerToken,
                        makerToken,
                        errorMessage: err.message,
                    },
                    'Request to OrderBookService failed',
                );
                return {
                    records: [],
                };
            });

        ORDERBOOK_REQUESTS.labels(PROMETHEUS_LABEL_STATUS_OK).inc();
        const orders = apiOrders.records.map(apiOrderToOrderbookOrder);
        const result = pruneFn ? orders.filter(pruneFn) : orders;
        return result;
    }

    public async destroyAsync(): Promise<void> {
        return;
    }
}

function apiOrderToOrderbookOrder(apiOrder: SRAOrder): SignedLimitOrder {
    const { signature, ...orderRest } = apiOrder.order;

    return {
        order: orderRest,
        signature,
        type: FillQuoteTransformerOrderType.Limit,
    };
}
