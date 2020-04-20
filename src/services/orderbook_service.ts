import { APIOrder, OrderbookResponse, PaginatedCollection } from '@0x/connect';
import { AssetPairsItem, OrdersRequestOpts, SignedOrder } from '@0x/types';
import * as _ from 'lodash';
import { Connection, In } from 'typeorm';

import { SRA_ORDER_EXPIRATION_BUFFER_SECONDS } from '../config';
import { SignedOrderEntity } from '../entities';
import { ValidationError } from '../errors';
import { alertOnExpiredOrders } from '../logger';
import { PinResult } from '../types';
import { MeshClient } from '../utils/mesh_client';
import { meshUtils } from '../utils/mesh_utils';
import { orderUtils } from '../utils/order_utils';
import { paginationUtils } from '../utils/pagination_utils';

export class OrderBookService {
    private readonly _meshClient?: MeshClient;
    private readonly _connection: Connection;
    public async getOrderByHashIfExistsAsync(orderHash: string): Promise<APIOrder | undefined> {
        const signedOrderEntityIfExists = await this._connection.manager.findOne(SignedOrderEntity, orderHash);
        if (signedOrderEntityIfExists === undefined) {
            return undefined;
        } else {
            const deserializedOrder = orderUtils.deserializeOrderToAPIOrder(signedOrderEntityIfExists as Required<
                SignedOrderEntity
            >);
            return deserializedOrder;
        }
    }
    public async getAssetPairsAsync(
        page: number,
        perPage: number,
        assetDataA?: string,
        assetDataB?: string,
    ): Promise<PaginatedCollection<AssetPairsItem>> {
        const signedOrderEntities = (await this._connection.manager.find(SignedOrderEntity)) as Array<
            Required<SignedOrderEntity>
        >;
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
        const [bidSignedOrderEntities, askSignedOrderEntities] = await Promise.all([
            this._connection.manager.find(SignedOrderEntity, {
                where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
            }),
            this._connection.manager.find(SignedOrderEntity, {
                where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
            }),
        ]);
        const bidApiOrders: APIOrder[] = (bidSignedOrderEntities as Array<Required<SignedOrderEntity>>)
            .map(orderUtils.deserializeOrderToAPIOrder)
            .filter(orderUtils.isFreshOrder)
            .sort((orderA, orderB) => orderUtils.compareBidOrder(orderA.order, orderB.order));
        const askApiOrders: APIOrder[] = (askSignedOrderEntities as Array<Required<SignedOrderEntity>>)
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
        ordersFilterParams: OrdersRequestOpts,
    ): Promise<PaginatedCollection<APIOrder>> {
        // Pre-filters
        const filterObjectWithValuesIfExist: Partial<SignedOrder> = {
            exchangeAddress: ordersFilterParams.exchangeAddress,
            senderAddress: ordersFilterParams.senderAddress,
            makerAssetData: ordersFilterParams.makerAssetData,
            takerAssetData: ordersFilterParams.takerAssetData,
            makerAddress: ordersFilterParams.makerAddress,
            takerAddress: ordersFilterParams.takerAddress,
            feeRecipientAddress: ordersFilterParams.feeRecipientAddress,
            makerFeeAssetData: ordersFilterParams.makerFeeAssetData,
            takerFeeAssetData: ordersFilterParams.takerFeeAssetData,
        };
        const filterObject = _.pickBy(filterObjectWithValuesIfExist, _.identity.bind(_));
        const signedOrderEntities = (await this._connection.manager.find(SignedOrderEntity, {
            where: filterObject,
        })) as Array<Required<SignedOrderEntity>>;
        const apiOrders = signedOrderEntities.map(orderUtils.deserializeOrderToAPIOrder);

        // check for expired orders
        const { fresh, expired } = orderUtils.groupByFreshness(apiOrders, SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
        alertOnExpiredOrders(expired);

        // Post-filters
        const filteredApiOrders = orderUtils.filterOrders(fresh, ordersFilterParams);
        const paginatedApiOrders = paginationUtils.paginate(filteredApiOrders, page, perPage);
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
        })) as Array<Required<SignedOrderEntity>>;
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
        if (this._meshClient) {
            const { rejected } = await this._meshClient.addOrdersAsync(signedOrders, pinned);
            if (rejected.length !== 0) {
                const validationErrors = rejected.map((r, i) => ({
                    field: `signedOrder[${i}]`,
                    code: meshUtils.rejectedCodeToSRACode(r.status.code),
                    reason: `${r.status.code}: ${r.status.message}`,
                }));
                throw new ValidationError(validationErrors);
            }
            // Order Watcher Service will handle persistence
            return;
        }
        throw new Error('Could not add order to mesh.');
    }
    public async splitOrdersByPinningAsync(signedOrders: SignedOrder[]): Promise<PinResult> {
        return orderUtils.splitOrdersByPinningAsync(this._connection, signedOrders);
    }
}
