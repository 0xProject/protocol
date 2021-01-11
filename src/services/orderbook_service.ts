import { APIOrder, OrderbookResponse, PaginatedCollection } from '@0x/connect';
import { AcceptedOrderInfo, OrderEventEndState } from '@0x/mesh-rpc-client';
import { AssetPairsItem, SignedOrder } from '@0x/types';
import * as _ from 'lodash';
import { Connection, In } from 'typeorm';

import { SRA_ORDER_EXPIRATION_BUFFER_SECONDS, SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS } from '../config';
import { SignedOrderEntity } from '../entities';
import { PersistentSignedOrderEntity } from '../entities/PersistentSignedOrderEntity';
import { ValidationError, ValidationErrorCodes, ValidationErrorReasons } from '../errors';
import { alertOnExpiredOrders } from '../logger';
import { APIOrderWithMetaData, PinResult, SRAGetOrdersRequestOpts } from '../types';
import { MeshClient } from '../utils/mesh_client';
import { meshUtils } from '../utils/mesh_utils';
import { orderUtils } from '../utils/order_utils';
import { paginationUtils } from '../utils/pagination_utils';

export class OrderBookService {
    private readonly _meshClient?: MeshClient;
    private readonly _connection: Connection;
    public static isAllowedPersistentOrders(apiKey: string): boolean {
        return SRA_PERSISTENT_ORDER_POSTING_WHITELISTED_API_KEYS.includes(apiKey);
    }
    public async getOrderByHashIfExistsAsync(orderHash: string): Promise<APIOrder | undefined> {
        const signedOrderEntityIfExists = await this._connection.manager.findOne(SignedOrderEntity, orderHash);
        if (signedOrderEntityIfExists === undefined) {
            return undefined;
        } else {
            const deserializedOrder = orderUtils.deserializeOrderToAPIOrder(
                signedOrderEntityIfExists as Required<SignedOrderEntity>,
            );
            return deserializedOrder;
        }
    }
    public async getAssetPairsAsync(
        page: number,
        perPage: number,
        assetDataA?: string,
        assetDataB?: string,
    ): Promise<PaginatedCollection<AssetPairsItem>> {
        const signedOrderEntities = (await this._connection.manager.find(SignedOrderEntity)) as Required<
            SignedOrderEntity
        >[];
        const assetPairsItems: AssetPairsItem[] = signedOrderEntities
            .map(orderUtils.deserializeOrder)
            .map(orderUtils.signedOrderToAssetPair);
        let nonPaginatedFilteredAssetPairs: AssetPairsItem[];
        if (assetDataA === undefined && assetDataB === undefined) {
            nonPaginatedFilteredAssetPairs = assetPairsItems;
        } else if (assetDataA !== undefined && assetDataB !== undefined) {
            const containsAssetDataAAndAssetDataB = (assetPair: AssetPairsItem) =>
                (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetDataAAndAssetDataB);
        } else {
            const assetData = assetDataA || assetDataB;
            const containsAssetData = (assetPair: AssetPairsItem) =>
                assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetData);
        }
        const uniqueNonPaginatedFilteredAssetPairs = _.uniqBy(
            nonPaginatedFilteredAssetPairs,
            assetPair => `${assetPair.assetDataA.assetData}/${assetPair.assetDataB.assetData}`,
        );
        const paginatedFilteredAssetPairs = paginationUtils.paginate(
            uniqueNonPaginatedFilteredAssetPairs,
            page,
            perPage,
        );
        return paginatedFilteredAssetPairs;
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async getOrderBookAsync(
        page: number,
        perPage: number,
        baseAssetData: string,
        quoteAssetData: string,
    ): Promise<OrderbookResponse> {
        const orderEntities = await this._connection.manager.find(SignedOrderEntity, {
            where: {
                takerAssetData: In([baseAssetData, quoteAssetData]),
                makerAssetData: In([baseAssetData, quoteAssetData]),
            },
        });
        const bidSignedOrderEntities = orderEntities.filter(
            o => o.takerAssetData === baseAssetData && o.makerAssetData === quoteAssetData,
        );
        const askSignedOrderEntities = orderEntities.filter(
            o => o.takerAssetData === quoteAssetData && o.makerAssetData === baseAssetData,
        );
        const bidApiOrders: APIOrder[] = (bidSignedOrderEntities as Required<SignedOrderEntity>[])
            .map(orderUtils.deserializeOrderToAPIOrder)
            .filter(orderUtils.isFreshOrder)
            .sort((orderA, orderB) => orderUtils.compareBidOrder(orderA.order, orderB.order));
        const askApiOrders: APIOrder[] = (askSignedOrderEntities as Required<SignedOrderEntity>[])
            .map(orderUtils.deserializeOrderToAPIOrder)
            .filter(orderUtils.isFreshOrder)
            .sort((orderA, orderB) => orderUtils.compareAskOrder(orderA.order, orderB.order));
        const paginatedBidApiOrders = paginationUtils.paginate(bidApiOrders, page, perPage);
        const paginatedAskApiOrders = paginationUtils.paginate(askApiOrders, page, perPage);
        return {
            bids: paginatedBidApiOrders,
            asks: paginatedAskApiOrders,
        };
    }

    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    // tslint:disable-next-line:prefer-function-over-method
    public async getOrdersAsync(
        page: number,
        perPage: number,
        ordersFilterParams: SRAGetOrdersRequestOpts,
    ): Promise<PaginatedCollection<APIOrderWithMetaData>> {
        // Pre-filters
        const filterObjectWithValuesIfExist = {
            exchangeAddress: ordersFilterParams.exchangeAddress,
            senderAddress: ordersFilterParams.senderAddress,
            makerAssetData: orderUtils.assetDataOrAssetProxyId(
                ordersFilterParams.makerAssetData,
                ordersFilterParams.makerAssetProxyId,
            ),
            takerAssetData: orderUtils.assetDataOrAssetProxyId(
                ordersFilterParams.takerAssetData,
                ordersFilterParams.takerAssetProxyId,
            ),
            makerAddress: ordersFilterParams.makerAddress,
            takerAddress: ordersFilterParams.takerAddress,
            feeRecipientAddress: ordersFilterParams.feeRecipientAddress,
            makerFeeAssetData: ordersFilterParams.makerFeeAssetData,
            takerFeeAssetData: ordersFilterParams.takerFeeAssetData,
        };
        const filterObject = _.pickBy(filterObjectWithValuesIfExist, _.identity.bind(_));
        const [signedOrderCount, signedOrderEntities] = await Promise.all([
            this._connection.manager.count(SignedOrderEntity, {
                where: filterObject,
            }),
            this._connection.manager.find(SignedOrderEntity, {
                where: filterObject,
                ...paginationUtils.paginateDBFilters(page, perPage),
                order: {
                    hash: 'ASC',
                },
            }),
        ]);
        const apiOrders = (signedOrderEntities as Required<SignedOrderEntity>[]).map(
            orderUtils.deserializeOrderToAPIOrder,
        );

        // check for expired orders
        const { fresh, expired } = orderUtils.groupByFreshness(apiOrders, SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
        alertOnExpiredOrders(expired);

        // Join with persistent orders
        let persistentOrders: APIOrderWithMetaData[] = [];
        let persistentOrdersCount = 0;
        if (ordersFilterParams.isUnfillable === true) {
            if (filterObject.makerAddress === undefined) {
                throw new ValidationError([
                    {
                        field: 'makerAddress',
                        code: ValidationErrorCodes.RequiredField,
                        reason: ValidationErrorReasons.UnfillableRequiresMakerAddress,
                    },
                ]);
            }
            let persistentOrderEntities = [];
            [persistentOrdersCount, persistentOrderEntities] = await Promise.all([
                this._connection.manager.count(PersistentSignedOrderEntity, { where: filterObject }),
                this._connection.manager.find(PersistentSignedOrderEntity, {
                    where: filterObject,
                    ...paginationUtils.paginateDBFilters(page, perPage),
                    order: {
                        hash: 'ASC',
                    },
                }),
            ]);
            // This should match the states that trigger a removal from the SignedOrders table
            // Defined in meshUtils.calculateOrderLifecycle
            const unfillableStates = [
                OrderEventEndState.Cancelled,
                OrderEventEndState.Expired,
                OrderEventEndState.FullyFilled,
                OrderEventEndState.Invalid,
                OrderEventEndState.StoppedWatching,
                OrderEventEndState.Unfunded,
            ];
            persistentOrders = (persistentOrderEntities as Required<PersistentSignedOrderEntity>[])
                .map(orderUtils.deserializeOrderToAPIOrder)
                .filter(apiOrder => {
                    return apiOrder.metaData.state && unfillableStates.includes(apiOrder.metaData.state);
                });
        }

        // Post-filters (query fields that don't exist verbatim in the order)
        const filteredApiOrders = orderUtils.filterOrders(fresh.concat(persistentOrders), ordersFilterParams);
        const total = signedOrderCount + persistentOrdersCount;

        // Paginate
        const paginatedApiOrders = paginationUtils.paginateSerialize(filteredApiOrders, total, page, perPage);
        return paginatedApiOrders;
    }
    public async getBatchOrdersAsync(
        page: number,
        perPage: number,
        makerAssetDatas: string[],
        takerAssetDatas: string[],
    ): Promise<PaginatedCollection<APIOrder>> {
        const filterObject = {
            makerAssetData: In(makerAssetDatas),
            takerAssetData: In(takerAssetDatas),
        };
        const signedOrderEntities = (await this._connection.manager.find(SignedOrderEntity, {
            where: filterObject,
        })) as Required<SignedOrderEntity>[];
        const apiOrders = signedOrderEntities.map(orderUtils.deserializeOrderToAPIOrder);

        // check for expired orders
        const { fresh, expired } = orderUtils.groupByFreshness(apiOrders, SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
        alertOnExpiredOrders(expired);

        const paginatedApiOrders = paginationUtils.paginate(fresh, page, perPage);
        return paginatedApiOrders;
    }
    constructor(connection: Connection, meshClient?: MeshClient) {
        this._meshClient = meshClient;
        this._connection = connection;
    }
    public async addOrderAsync(signedOrder: SignedOrder, pinned: boolean): Promise<void> {
        return this.addOrdersAsync([signedOrder], pinned);
    }
    public async addOrdersAsync(signedOrders: SignedOrder[], pinned: boolean): Promise<void> {
        // Order Watcher Service will handle persistence
        await this._addOrdersAsync(signedOrders, pinned);
        return;
    }
    public async addPersistentOrdersAsync(signedOrders: SignedOrder[], pinned: boolean): Promise<void> {
        const accepted = await this._addOrdersAsync(signedOrders, pinned);
        const persistentOrders = accepted.map(orderInfo => {
            const apiOrder = meshUtils.orderInfoToAPIOrder({ ...orderInfo, endState: OrderEventEndState.Added });
            return orderUtils.serializePersistentOrder(apiOrder);
        });
        // MAX SQL variable size is 999. This limit is imposed via Sqlite.
        // The SELECT query is not entirely effecient and pulls in all attributes
        // so we need to leave space for the attributes on the model represented
        // as SQL variables in the "AS" syntax. We leave 99 free for the
        // signedOrders model
        await this._connection.getRepository(PersistentSignedOrderEntity).save(persistentOrders);
    }
    public async splitOrdersByPinningAsync(signedOrders: SignedOrder[]): Promise<PinResult> {
        return orderUtils.splitOrdersByPinningAsync(this._connection, signedOrders);
    }
    private async _addOrdersAsync(signedOrders: SignedOrder[], pinned: boolean): Promise<AcceptedOrderInfo[]> {
        if (this._meshClient) {
            const { rejected, accepted } = await this._meshClient.addOrdersAsync(signedOrders, pinned);
            if (rejected.length !== 0) {
                const validationErrors = rejected.map((r, i) => ({
                    field: `signedOrder[${i}]`,
                    code: meshUtils.rejectedCodeToSRACode(r.status.code),
                    reason: `${r.status.code}: ${r.status.message}`,
                }));
                throw new ValidationError(validationErrors);
            }
            // Order Watcher Service will handle persistence
            return accepted;
        }
        throw new Error('Could not add order to mesh.');
    }
}
