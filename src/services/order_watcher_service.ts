import * as _ from 'lodash';
import { Connection } from 'typeorm';

import { MESH_IGNORED_ADDRESSES } from '../config';
import { SignedOrderEntity } from '../entities';
import { logger } from '../logger';
import { APIOrderWithMetaData, OrderWatcherLifeCycleEvents } from '../types';
import { MeshClient } from '../utils/mesh_client';
import { meshUtils } from '../utils/mesh_utils';
import { orderUtils } from '../utils/order_utils';

export class OrderWatcherService {
    private readonly _meshClient: MeshClient;
    private readonly _connection: Connection;
    public async syncOrderbookAsync(): Promise<void> {
        logger.info('OrderWatcherService syncing orderbook with Mesh');
        const signedOrderModels = (await this._connection.manager.find(SignedOrderEntity)) as Array<
            Required<SignedOrderEntity>
        >;
        const signedOrders = signedOrderModels.map(orderUtils.deserializeOrder);
        // Sync the order watching service state locally
        const { ordersInfos } = await this._meshClient.getOrdersAsync();
        // TODO(dekz): Mesh can reject due to InternalError or EthRPCRequestFailed.
        // in the future we can attempt to retry these a few times. Ultimately if we
        // cannot validate the order we cannot keep the order around
        // Mesh websocket fails if there are too many orders, so we use HTTP instead
        // Validate the local state and notify the order watcher of any missed orders
        const { accepted, rejected } = await this._meshClient.addOrdersAsync(signedOrders);
        logger.info('OrderWatcherService sync', {
            accepted: accepted.length,
            rejected: rejected.length,
            sent: signedOrders.length,
        });
        // Remove all of the rejected orders
        if (rejected.length > 0) {
            await this._onOrderLifeCycleEventAsync(
                OrderWatcherLifeCycleEvents.Removed,
                meshUtils.orderInfosToApiOrders(rejected),
            );
        }
        // Sync the order watching service state locally
        if (ordersInfos.length > 0) {
            await this._onOrderLifeCycleEventAsync(
                OrderWatcherLifeCycleEvents.Added,
                meshUtils.orderInfosToApiOrders(ordersInfos),
            );
        }
        logger.info('OrderWatcherService sync complete');
    }
    constructor(connection: Connection, meshClient: MeshClient) {
        this._connection = connection;
        this._meshClient = meshClient;
        void this._meshClient.subscribeToOrdersAsync(async orders => {
            const { added, removed, updated } = meshUtils.calculateAddedRemovedUpdated(orders);
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Removed, removed);
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Updated, updated);
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Added, added);
        });
        this._meshClient.onReconnected(async () => {
            logger.info('OrderWatcherService reconnecting to Mesh');
            await this.syncOrderbookAsync();
        });
    }
    private async _onOrderLifeCycleEventAsync(
        lifecycleEvent: OrderWatcherLifeCycleEvents,
        orders: APIOrderWithMetaData[],
    ): Promise<void> {
        if (orders.length <= 0) {
            return;
        }
        switch (lifecycleEvent) {
            case OrderWatcherLifeCycleEvents.Updated:
            case OrderWatcherLifeCycleEvents.Added: {
                const allowedOrders = orders.filter(
                    apiOrder => !orderUtils.isIgnoredOrder(MESH_IGNORED_ADDRESSES, apiOrder),
                );
                const signedOrdersModel = allowedOrders.map(o => orderUtils.serializeOrder(o));
                // MAX SQL variable size is 999. This limit is imposed via Sqlite.
                // The SELECT query is not entirely effecient and pulls in all attributes
                // so we need to leave space for the attributes on the model represented
                // as SQL variables in the "AS" syntax. We leave 99 free for the
                // signedOrders model
                await this._connection.manager.save(signedOrdersModel, { chunk: 900 });
                break;
            }
            case OrderWatcherLifeCycleEvents.Removed: {
                const orderHashes = orders.map(o => o.metaData.orderHash);
                // MAX SQL variable size is 999. This limit is imposed via Sqlite
                // and other databases have higher limits (or no limits at all, eg postgresql)
                // tslint:disable-next-line:custom-no-magic-numbers
                const chunks = _.chunk(orderHashes, 999);
                for (const chunk of chunks) {
                    await this._connection.manager.delete(SignedOrderEntity, chunk);
                }
                break;
            }
            default:
            // Do Nothing
        }
    }
}
