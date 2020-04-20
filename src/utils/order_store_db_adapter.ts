import { APIOrder, OrderSet, OrderStore } from '@0x/asset-swapper';

import { SWAP_IGNORED_ADDRESSES } from '../config';
import { FIRST_PAGE } from '../constants';
import { OrderBookService } from '../services/orderbook_service';

import { orderUtils } from './order_utils';

const MAX_QUERY_SIZE = 1000;
export class OrderStoreDbAdapter extends OrderStore {
    private readonly _orderbookService: OrderBookService;
    constructor(orderbookService: OrderBookService) {
        super();
        this._orderbookService = orderbookService;
    }
    public async getOrderSetForAssetsAsync(makerAssetData: string, takerAssetData: string): Promise<OrderSet> {
        const assetPairKey = OrderStore.getKeyForAssetPair(makerAssetData, takerAssetData);
        return this.getOrderSetForAssetPairAsync(assetPairKey);
    }
    public async getOrderSetForAssetPairAsync(assetPairKey: string): Promise<OrderSet> {
        const [assetA, assetB] = OrderStore.assetPairKeyToAssets(assetPairKey);
        const { bids, asks } = await this._orderbookService.getOrderBookAsync(
            FIRST_PAGE,
            MAX_QUERY_SIZE,
            assetA,
            assetB,
        );
        const orderSet = new OrderSet();
        const allOrders = [...bids.records, ...asks.records];
        const allowedOrders = allOrders.filter(
            apiOrder => !orderUtils.isIgnoredOrder(SWAP_IGNORED_ADDRESSES, apiOrder),
        );
        await orderSet.addManyAsync(allowedOrders);
        return orderSet;
    }
    public async getBatchOrderSetsForAssetsAsync(
        makerAssetDatas: string[],
        takerAssetDatas: string[],
    ): Promise<OrderSet[]> {
        const { records: apiOrders } = await this._orderbookService.getBatchOrdersAsync(
            FIRST_PAGE,
            MAX_QUERY_SIZE,
            makerAssetDatas,
            takerAssetDatas,
        );
        const orderSets: { [makerAssetData: string]: OrderSet } = {};
        makerAssetDatas.forEach(m =>
            takerAssetDatas.forEach(t => (orderSets[OrderStore.getKeyForAssetPair(m, t)] = new OrderSet())),
        );
        const allowedOrders = apiOrders.filter(
            apiOrder => !orderUtils.isIgnoredOrder(SWAP_IGNORED_ADDRESSES, apiOrder),
        );
        await Promise.all(
            allowedOrders.map(async o =>
                orderSets[OrderStore.getKeyForAssetPair(o.order.makerAssetData, o.order.takerAssetData)].addAsync(o),
            ),
        );
        return Object.values(orderSets);
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async hasAsync(_assetPairKey: string): Promise<boolean> {
        return true;
    }
    public async valuesAsync(assetPairKey: string): Promise<APIOrder[]> {
        return Array.from((await this.getOrderSetForAssetPairAsync(assetPairKey)).values());
    }
    public async keysAsync(): Promise<IterableIterator<string>> {
        const pairs = await this._orderbookService.getAssetPairsAsync(FIRST_PAGE, MAX_QUERY_SIZE);
        const keys = pairs.records.map(r =>
            OrderStore.getKeyForAssetPair(r.assetDataA.assetData, r.assetDataB.assetData),
        );
        return keys.values();
    }
}
