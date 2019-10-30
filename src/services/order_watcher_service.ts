import { WSClient } from '@0x/mesh-rpc-client';
import * as _ from 'lodash';

import { getDBConnection } from '../db_connection';
import { SignedOrderEntity } from '../entities';
import { APIOrderWithMetaData, OrderWatcherLifeCycleEvents } from '../types';
import { meshUtils } from '../utils/mesh_utils';
import { orderUtils } from '../utils/order_utils';

// tslint:disable-next-line:no-var-requires
const d = require('debug')('orderbook');

export class OrderWatcherService {
    private readonly _meshClient: WSClient;
    private static async _onOrderLifeCycleEventAsync(
        lifecycleEvent: OrderWatcherLifeCycleEvents,
        orders: APIOrderWithMetaData[],
    ): Promise<void> {
        if (orders.length <= 0) {
            return;
        }
        const connection = getDBConnection();
        switch (lifecycleEvent) {
            case OrderWatcherLifeCycleEvents.Updated:
            case OrderWatcherLifeCycleEvents.Added: {
                const signedOrdersModel = orders.map(o => orderUtils.serializeOrder(o));
                // MAX SQL variable size is 999. This limit is imposed via Sqlite.
                // The SELECT query is not entirely effecient and pulls in all attributes
                // so we need to leave space for the attributes on the model represented
                // as SQL variables in the "AS" syntax. We leave 99 free for the
                // signedOrders model
                await connection.manager.save(signedOrdersModel, { chunk: 900 });
                break;
            }
            case OrderWatcherLifeCycleEvents.Removed: {
                const orderHashes = orders.map(o => o.metaData.orderHash);
                // MAX SQL variable size is 999. This limit is imposed via Sqlite
                // and other databases have higher limits (or no limits at all, eg postgresql)
                // tslint:disable-next-line:custom-no-magic-numbers
                const chunks = _.chunk(orderHashes, 999);
                for (const chunk of chunks) {
                    await connection.manager.delete(SignedOrderEntity, chunk);
                }
                break;
            }
            default:
            // Do Nothing
        }
    }
    constructor(meshClient: WSClient) {
        this._meshClient = meshClient;
        void this._meshClient.subscribeToOrdersAsync(async orders => {
            const { added, removed, updated } = meshUtils.calculateAddedRemovedUpdated(orders);
            await OrderWatcherService._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Removed, removed);
            await OrderWatcherService._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Updated, updated);
            await OrderWatcherService._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Added, added);
        });
        this._meshClient.onReconnected(async () => {
            d('Reconnecting to Mesh');
            await this.syncOrderbookAsync();
        });
    }
    public async syncOrderbookAsync(): Promise<void> {
        d('SYNC orderbook with Mesh');
        const connection = getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderEntity)) as Array<
            Required<SignedOrderEntity>
        >;
        const signedOrders = signedOrderModels.map(orderUtils.deserializeOrder);
        // Sync the order watching service state locally
        const orders = await this._meshClient.getOrdersAsync();
        // TODO(dekz): Mesh can reject due to InternalError or EthRPCRequestFailed.
        // in the future we can attempt to retry these a few times. Ultimately if we
        // cannot validate the order we cannot keep the order around
        // Validate the local state and notify the order watcher of any missed orders
        const { accepted, rejected } = await meshUtils.addOrdersToMeshAsync(this._meshClient, signedOrders);
        d(`SYNC ${rejected.length} rejected ${accepted.length} accepted ${signedOrders.length} sent`);
        // Remove all of the rejected orders
        if (rejected.length > 0) {
            await OrderWatcherService._onOrderLifeCycleEventAsync(
                OrderWatcherLifeCycleEvents.Removed,
                meshUtils.orderInfosToApiOrders(rejected),
            );
        }
        // Sync the order watching service state locally
        if (orders.length > 0) {
            await OrderWatcherService._onOrderLifeCycleEventAsync(
                OrderWatcherLifeCycleEvents.Added,
                meshUtils.orderInfosToApiOrders(orders),
            );
        }
        d('SYNC complete');
    }
}
