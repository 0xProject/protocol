import { AcceptedRejectedOrders, AssetPairsItem, BaseOrderProvider, OrderStore, SignedOrder } from '@0x/asset-swapper';

import { FIRST_PAGE } from './constants';
import { OrderBookService } from './services/orderbook_service';

const MAX_QUERY_SIZE = 1000;
// tslint:disable:prefer-function-over-method
/**
 * Stubs out the required functions for usage in AssetSwapper/Orderbook
 * Where required the implementation will fetch from the OrderBookService
 * representing the underlying database
 */
export class OrderBookServiceOrderProvider extends BaseOrderProvider {
    private readonly _orderbookService: OrderBookService;
    constructor(orderStore: OrderStore, orderbookService: OrderBookService) {
        super(orderStore);
        this._orderbookService = orderbookService;
    }
    public async createSubscriptionForAssetPairAsync(_makerAssetData: string, _takerAssetData: string): Promise<void> {
        return Promise.resolve();
    }
    public async getAvailableAssetDatasAsync(): Promise<AssetPairsItem[]> {
        const response = await this._orderbookService.getAssetPairsAsync(FIRST_PAGE, MAX_QUERY_SIZE);
        return response.records;
    }
    public async destroyAsync(): Promise<void> {
        return Promise.resolve();
    }
    public async addOrdersAsync(_orders: SignedOrder[]): Promise<AcceptedRejectedOrders> {
        return Promise.resolve() as any;
    }
}
