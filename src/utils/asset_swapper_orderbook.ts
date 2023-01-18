import { FillQuoteTransformerOrderType, Orderbook, SignedLimitOrder } from '../asset-swapper';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../constants';
import { OrderBookService } from '../services/orderbook_service';
import { SRAOrder } from '../types';

export class AssetSwapperOrderbook extends Orderbook {
    constructor(public readonly orderbookService: OrderBookService) {
        super();
    }

    public async getOrdersAsync(
        makerToken: string,
        takerToken: string,
        pruneFn?: (o: SignedLimitOrder) => boolean,
    ): Promise<SignedLimitOrder[]> {
        const apiOrders = await this.orderbookService.getOrdersAsync(
            DEFAULT_PAGE,
            DEFAULT_PER_PAGE,
            {
                makerToken,
                takerToken,
            },
            {},
        );

        const orders = apiOrders.records.map(apiOrderToOrderbookOrder);
        const result = pruneFn ? orders.filter(pruneFn) : orders;
        return result;
    }
    public async getBatchOrdersAsync(
        makerTokens: string[],
        takerToken: string,
        pruneFn?: (o: SignedLimitOrder) => boolean,
    ): Promise<SignedLimitOrder[][]> {
        const apiOrders = await this.orderbookService.getBatchOrdersAsync(DEFAULT_PAGE, DEFAULT_PER_PAGE, makerTokens, [
            takerToken,
        ]);
        const orders = apiOrders.records.map(apiOrderToOrderbookOrder);
        const pruned = pruneFn ? orders.filter(pruneFn) : orders;
        const groupedByMakerToken: SignedLimitOrder[][] = makerTokens.map((token) =>
            pruned.filter((o) => o.order.makerToken === token),
        );
        return groupedByMakerToken;
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
