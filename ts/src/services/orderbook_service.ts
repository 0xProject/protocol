import { assetDataUtils, SignedOrder } from '0x.js';
import { APIOrder, OrderbookResponse, PaginatedCollection } from '@0x/connect';
import { WSClient } from '@0x/mesh-rpc-client';
import { AssetPairsItem, OrdersRequestOpts } from '@0x/types';
import * as _ from 'lodash';

import { getDBConnection } from '../db_connection';
import { ValidationError } from '../errors';
import { MeshUtils } from '../mesh_utils';
import { SignedOrderModel } from '../models/SignedOrderModel';
import { paginate } from '../paginator';

import {
    compareAskOrder,
    compareBidOrder,
    deserializeOrder,
    deserializeOrderToAPIOrder,
    includesTokenAddress,
    signedOrderToAssetPair,
} from './orderbook_utils';

export class OrderBookService {
    private readonly _meshClient: WSClient;
    public static async getOrderByHashIfExistsAsync(orderHash: string): Promise<APIOrder | undefined> {
        const connection = getDBConnection();
        const signedOrderModelIfExists = await connection.manager.findOne(SignedOrderModel, orderHash);
        if (signedOrderModelIfExists === undefined) {
            return undefined;
        } else {
            const deserializedOrder = deserializeOrderToAPIOrder(signedOrderModelIfExists as Required<
                SignedOrderModel
            >);
            return deserializedOrder;
        }
    }
    public static async getAssetPairsAsync(
        page: number,
        perPage: number,
        assetDataA: string,
        assetDataB: string,
    ): Promise<PaginatedCollection<AssetPairsItem>> {
        const connection = getDBConnection();
        const signedOrderModels = (await connection.manager.find(SignedOrderModel)) as Array<
            Required<SignedOrderModel>
        >;

        const assetPairsItems: AssetPairsItem[] = signedOrderModels.map(deserializeOrder).map(signedOrderToAssetPair);
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
        const uniqueNonPaginatedFilteredAssetPairs = _.uniqWith(nonPaginatedFilteredAssetPairs, _.isEqual.bind(_));
        const paginatedFilteredAssetPairs = paginate(uniqueNonPaginatedFilteredAssetPairs, page, perPage);
        return paginatedFilteredAssetPairs;
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async getOrderBookAsync(
        page: number,
        perPage: number,
        baseAssetData: string,
        quoteAssetData: string,
    ): Promise<OrderbookResponse> {
        const connection = getDBConnection();
        const bidSignedOrderModels = (await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
        })) as Array<Required<SignedOrderModel>>;
        const askSignedOrderModels = (await connection.manager.find(SignedOrderModel, {
            where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
        })) as Array<Required<SignedOrderModel>>;
        const bidApiOrders: APIOrder[] = bidSignedOrderModels
            .map(deserializeOrderToAPIOrder)
            .sort((orderA, orderB) => compareBidOrder(orderA.order, orderB.order));
        const askApiOrders: APIOrder[] = askSignedOrderModels
            .map(deserializeOrderToAPIOrder)
            .sort((orderA, orderB) => compareAskOrder(orderA.order, orderB.order));
        const paginatedBidApiOrders = paginate(bidApiOrders, page, perPage);
        const paginatedAskApiOrders = paginate(askApiOrders, page, perPage);
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
        const connection = getDBConnection();
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
        const signedOrderModels = (await connection.manager.find(SignedOrderModel, { where: filterObject })) as Array<
            Required<SignedOrderModel>
        >;
        let apiOrders = _.map(signedOrderModels, deserializeOrderToAPIOrder);
        // Post-filters
        apiOrders = apiOrders
            .filter(
                // traderAddress
                apiOrder =>
                    ordersFilterParams.traderAddress === undefined ||
                    apiOrder.order.makerAddress === ordersFilterParams.traderAddress ||
                    apiOrder.order.takerAddress === ordersFilterParams.traderAddress,
            )
            .filter(
                // makerAssetAddress
                apiOrder =>
                    ordersFilterParams.makerAssetAddress === undefined ||
                    includesTokenAddress(apiOrder.order.makerAssetData, ordersFilterParams.makerAssetAddress),
            )
            .filter(
                // takerAssetAddress
                apiOrder =>
                    ordersFilterParams.takerAssetAddress === undefined ||
                    includesTokenAddress(apiOrder.order.takerAssetData, ordersFilterParams.takerAssetAddress),
            )
            .filter(
                // makerAssetProxyId
                apiOrder =>
                    ordersFilterParams.makerAssetProxyId === undefined ||
                    assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.makerAssetData).assetProxyId ===
                        ordersFilterParams.makerAssetProxyId,
            )
            .filter(
                // takerAssetProxyId
                apiOrder =>
                    ordersFilterParams.takerAssetProxyId === undefined ||
                    assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.takerAssetData).assetProxyId ===
                        ordersFilterParams.takerAssetProxyId,
            );
        const paginatedApiOrders = paginate(apiOrders, page, perPage);
        return paginatedApiOrders;
    }
    constructor(meshClient: WSClient) {
        this._meshClient = meshClient;
    }
    public async addOrderAsync(signedOrder: SignedOrder): Promise<void> {
        const { rejected } = await this._meshClient.addOrdersAsync([signedOrder]);
        if (rejected.length !== 0) {
            throw new ValidationError([
                {
                    field: 'signedOrder',
                    code: MeshUtils.rejectedCodeToSRACode(rejected[0].status.code),
                    reason: `${rejected[0].status.code}: ${rejected[0].status.message}`,
                },
            ]);
        }
        // Order Watcher Service will handle persistence
    }
}
