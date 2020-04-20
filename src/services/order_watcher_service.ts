import * as _ from 'lodash';
import { Connection } from 'typeorm';

import { MESH_IGNORED_ADDRESSES, SRA_ORDER_EXPIRATION_BUFFER_SECONDS } from '../config';
import { SignedOrderEntity } from '../entities';
import { OrderWatcherSyncError } from '../errors';
import { alertOnExpiredOrders, logger } from '../logger';
import { APIOrderWithMetaData, OrderWatcherLifeCycleEvents } from '../types';
import { MeshClient } from '../utils/mesh_client';
import { meshUtils } from '../utils/mesh_utils';
import { orderUtils } from '../utils/order_utils';

export class OrderWatcherService {
    private readonly _meshClient: MeshClient;
    private readonly _connection: Connection;
    public async syncOrderbookAsync(): Promise<void> {
        // Sync the order watching service state locally
        logger.info('OrderWatcherService syncing orderbook with Mesh');

        // 1. Get orders from local cache
        const signedOrderModels = (await this._connection.manager.find(SignedOrderEntity)) as Array<
            Required<SignedOrderEntity>
        >;
        const signedOrders = signedOrderModels.map(orderUtils.deserializeOrder);

        // 2. Get orders from Mesh
        const { ordersInfos } = await this._meshClient.getOrdersAsync();

        // 3. Validate local cache state by posting to Mesh
        // TODO(dekz): Mesh can reject due to InternalError or EthRPCRequestFailed.
        // in the future we can attempt to retry these a few times. Ultimately if we
        // cannot validate the order we cannot keep the order around
        const pinResult = await orderUtils.splitOrdersByPinningAsync(this._connection, signedOrders);
        const [pinnedValidationResults, unpinnedValidationResults] = await Promise.all([
            this._meshClient.addOrdersAsync(pinResult.pin, true),
            this._meshClient.addOrdersAsync(pinResult.doNotPin, false),
        ]);
        const accepted = [...pinnedValidationResults.accepted, ...unpinnedValidationResults.accepted];
        const rejected = [...pinnedValidationResults.rejected, ...unpinnedValidationResults.rejected];

        logger.info('OrderWatcherService sync', {
            accepted: accepted.length,
            rejected: rejected.length,
            sent: signedOrders.length,
        });

        // 4. Notify if any expired orders were accepted by Mesh
        const acceptedApiOrders = meshUtils.orderInfosToApiOrders(accepted);
        const { expired } = orderUtils.groupByFreshness(acceptedApiOrders, SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
        alertOnExpiredOrders(expired, `Erroneously accepted when posting to Mesh`);

        // 5. Remove all of the rejected and expired orders from local cache
        const toRemove = expired.concat(meshUtils.orderInfosToApiOrders(rejected));
        if (toRemove.length > 0) {
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Removed, toRemove);
        }

        // 6. Save Mesh orders to local cache and notify if any expired orders were returned
        const meshOrders = meshUtils.orderInfosToApiOrders(ordersInfos);
        const groupedOrders = orderUtils.groupByFreshness(meshOrders, SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
        alertOnExpiredOrders(groupedOrders.expired, `Mesh client returned expired orders`);
        if (groupedOrders.fresh.length > 0) {
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Added, groupedOrders.fresh);
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
            try {
                await this.syncOrderbookAsync();
            } catch (err) {
                const logError = new OrderWatcherSyncError(`Error on reconnecting Mesh client: [${err.stack}]`);
                throw logError;
            }
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
