import { SignedOrder } from '@0x/types';
import * as _ from 'lodash';
import { Connection, In, Not } from 'typeorm';

import { MESH_IGNORED_ADDRESSES, SRA_ORDER_EXPIRATION_BUFFER_SECONDS } from '../config';
import { SignedOrderEntity } from '../entities';
import { PersistentSignedOrderEntity } from '../entities/PersistentSignedOrderEntity';
import { OrderWatcherSyncError } from '../errors';
import { alertOnExpiredOrders, logger } from '../logger';
import { APIOrderWithMetaData, OrderWatcherLifeCycleEvents } from '../types';
import { MeshClient } from '../utils/mesh_client';
import { meshUtils } from '../utils/mesh_utils';
import { orderUtils } from '../utils/order_utils';

interface ValidationResults {
    accepted: APIOrderWithMetaData[];
    rejected: APIOrderWithMetaData[];
}
export class OrderWatcherService {
    private readonly _meshClient: MeshClient;
    private readonly _connection: Connection;
    public async syncOrderbookAsync(): Promise<void> {
        // Sync the order watching service state locally
        logger.info('OrderWatcherService syncing orderbook with Mesh');

        // 1. Get orders from local cache
        const signedOrderModels = (await this._connection.manager.find(SignedOrderEntity)) as Required<
            SignedOrderEntity
        >[];
        const signedOrders = signedOrderModels.map(orderUtils.deserializeOrder);

        // 2. Get orders from Mesh
        const { ordersInfos } = await this._meshClient.getOrdersAsync();

        // 3. Validate local cache state by posting to Mesh
        // TODO(dekz): Mesh can reject due to InternalError or EthRPCRequestFailed.
        // in the future we can attempt to retry these a few times. Ultimately if we
        // cannot validate the order we cannot keep the order around
        const { pin, doNotPin } = await orderUtils.splitOrdersByPinningAsync(this._connection, signedOrders);
        const { accepted, rejected } = await Promise.all([
            this._addOrdersToMeshAsync(pin, true),
            this._addOrdersToMeshAsync(doNotPin, false),
        ]).then(results => ({
            accepted: results.map(r => r.accepted).flat(),
            rejected: results.map(r => r.rejected).flat(),
        }));

        logger.info('OrderWatcherService sync', {
            accepted: accepted.length,
            rejected: rejected.length,
            sent: signedOrders.length,
        });

        // 4. Notify if any expired orders were accepted by Mesh
        const { expired } = orderUtils.groupByFreshness(accepted, SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
        alertOnExpiredOrders(expired, `Erroneously accepted when posting to Mesh`);

        // 5. Remove all of the rejected and expired orders from local cache
        const toRemove = [...rejected, ...expired];
        if (toRemove.length > 0) {
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Removed, toRemove);
        }

        // 6. Save new Mesh orders to local cache and notify if any expired orders were returned
        const meshOrders = meshUtils.orderInfosToApiOrders(ordersInfos);
        const groupedOrders = orderUtils.groupByFreshness(meshOrders, SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
        alertOnExpiredOrders(groupedOrders.expired, `Mesh client returned expired orders`);
        if (groupedOrders.fresh.length > 0) {
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Added, groupedOrders.fresh);
        }

        // 7. Update state of persistent orders
        const excludeHashes = signedOrderModels.map(o => o.hash);
        const persistentOrders = (
            await this._connection.manager.find(PersistentSignedOrderEntity, { hash: Not(In(excludeHashes)) })
        ).map(o => orderUtils.deserializeOrder(o as Required<PersistentSignedOrderEntity>));
        logger.info(`Found ${persistentOrders.length} persistent orders, posting to Mesh for validation`);
        const { accepted: persistentAccepted, rejected: persistentRejected } = await this._addOrdersToMeshAsync(
            persistentOrders,
            false,
        );
        const allOrders = [...persistentAccepted, ...persistentRejected, ...accepted, ...rejected];
        await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.PersistentUpdated, allOrders);

        logger.info('OrderWatcherService sync complete');
    }
    constructor(connection: Connection, meshClient: MeshClient) {
        this._connection = connection;
        this._meshClient = meshClient;
        void this._meshClient.subscribeToOrdersAsync(async orders => {
            const apiOrders = meshUtils.orderInfosToApiOrders(orders);
            const { added, removed, updated } = meshUtils.calculateOrderLifecycle(apiOrders);
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Removed, removed);
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Updated, updated);
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.Added, added);
            await this._onOrderLifeCycleEventAsync(OrderWatcherLifeCycleEvents.PersistentUpdated, [
                ...removed,
                ...updated,
            ]);
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
                // We only add to SignedOrders table, NOT PersistentSignedOrders table.
                // PersistentSignedOrders should ONLY be added via the POST /orders/persistent endpoint
                const allowedOrders = orders.filter(
                    apiOrder => !orderUtils.isIgnoredOrder(MESH_IGNORED_ADDRESSES, apiOrder),
                );
                const signedOrdersModel = allowedOrders.map(o => orderUtils.serializeOrder(o));
                // MAX SQL variable size is 999. This limit is imposed via Sqlite.
                // The SELECT query is not entirely effecient and pulls in all attributes
                // so we need to leave space for the attributes on the model represented
                // as SQL variables in the "AS" syntax. We leave 99 free for the
                // signedOrders model
                await this._connection.getRepository(SignedOrderEntity).save(signedOrdersModel, { chunk: 900 });
                break;
            }
            case OrderWatcherLifeCycleEvents.Removed: {
                const orderHashes = orders.map(o => o.metaData.orderHash);
                // MAX SQL variable size is 999. This limit is imposed via Sqlite
                // and other databases have higher limits (or no limits at all, eg postgresql)
                // tslint:disable-next-line:custom-no-magic-numbers
                const chunks = _.chunk(orderHashes, 999);
                for (const chunk of chunks) {
                    await this._connection.getRepository(SignedOrderEntity).delete(chunk);
                }
                break;
            }
            case OrderWatcherLifeCycleEvents.PersistentUpdated: {
                // Only update orders that exist in PersistentSignedOrders table. Avoid accidentally
                // adding open orderbook orders to the table.

                // 1. Filter out ignored
                const filtered = orders.filter(
                    apiOrder => !orderUtils.isIgnoredOrder(MESH_IGNORED_ADDRESSES, apiOrder),
                );

                // 2. Create the Update queries
                // Use Update instead of Save to throw an error if the order doesn't already exist in the table
                // We do this to avoid saving non-persistent orders
                // tslint:disable-next-line:promise-function-async
                const updatePromises = filtered.map(apiOrder => {
                    const entity = orderUtils.serializePersistentOrder(apiOrder);
                    // will ignore any orders that don't already exist in this table
                    return this._connection
                        .getRepository(PersistentSignedOrderEntity)
                        .update(apiOrder.metaData.orderHash, entity);
                });

                // 3. Wait for results
                await Promise.allSettled(updatePromises).then(results => {
                    let [fulfilled, rejected] = [0, 0];
                    results.forEach(r =>
                        r.status === 'fulfilled' && r.value.affected! > 0 ? fulfilled++ : rejected++,
                    );
                    logger.info('Persistent orders update', {
                        attempted: orders.length,
                        updated: fulfilled,
                        ignored: rejected,
                    });
                });
                break;
            }
            default:
            // Do Nothing
        }
    }
    private async _addOrdersToMeshAsync(orders: SignedOrder[], pinned: boolean = false): Promise<ValidationResults> {
        const { accepted, rejected } = await this._meshClient.addOrdersAsync(orders, pinned);
        return {
            accepted: meshUtils.orderInfosToApiOrders(accepted),
            rejected: meshUtils.orderInfosToApiOrders(rejected),
        };
    }
}
