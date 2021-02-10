import { Orderbook, SignedNativeOrder } from '@0x/asset-swapper';

import { OrderBookService } from '../services/orderbook_service';
// tslint:disable

export class AssetSwapperOrderbook extends Orderbook {
    constructor(public readonly orderbookService: OrderBookService) {
        super();
    }

    // TODO: change to token address instead of asset data
    public async getOrdersAsync(): // makerToken: string,
    // takerToken: string,
    // pruneFn?: (o: SignedNativeOrder) => boolean,
    Promise<SignedNativeOrder[]> {
        return [];
        // const apiOrders = await this.orderbookService.getOrdersAsync(DEFAULT_PAGE, DEFAULT_PER_PAGE, {
        //     makerAssetData,
        //     takerAssetData,
        // });
        // const orders = apiOrders.records.map(apiOrderToOrderbookOrder);
        // const result = pruneFn ? orders.filter(pruneFn) : orders;
        // return result;
    }
    public async getBatchOrdersAsync(
        makerTokens: string[],
        _takerToken: string,
        _pruneFn?: (o: SignedNativeOrder) => boolean,
    ): Promise<SignedNativeOrder[][]> {
        return Array(makerTokens.length).fill([]);
        // const apiOrders = await this.orderbookService.getBatchOrdersAsync(DEFAULT_PAGE, DEFAULT_PER_PAGE, makerTokens, [
        //     takerToken,
        // ]);
        // const orders = apiOrders.records.map(apiOrderToOrderbookOrder);
        // const pruned = pruneFn ? orders.filter(pruneFn) : orders;
        // const groupedByMakerToken: SignedNativeOrder[][] = makerTokens.map(token =>
        //     pruned.filter(o => o.order.makerToken === token),
        // );
        // return groupedByMakerToken;
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async destroyAsync(): Promise<void> {
        return;
    }
}

// // TODO
// function apiOrderToOrderbookOrder(apiOrder: APIOrder): SignedNativeOrder {
//     return (apiOrder as any) as SignedNativeOrder;
// }
