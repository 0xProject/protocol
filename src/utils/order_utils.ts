import { APIOrder, OrderConfigRequest, OrderConfigResponse } from '@0x/connect';
import { assetDataUtils } from '@0x/order-utils';
import {
    Asset,
    AssetData,
    AssetPairsItem,
    AssetProxyId,
    ERC1155AssetData,
    ERC20AssetData,
    ERC20BridgeAssetData,
    ERC721AssetData,
    MultiAssetData,
    OrdersRequestOpts,
    SignedOrder,
    StaticCallAssetData,
} from '@0x/types';
import { BigNumber, errorUtils } from '@0x/utils';
import { Connection } from 'typeorm';

import {
    CHAIN_ID,
    DEFAULT_ERC20_TOKEN_PRECISION,
    FEE_RECIPIENT_ADDRESS,
    MAKER_FEE_ASSET_DATA,
    MAKER_FEE_UNIT_AMOUNT,
    PINNED_MM_ADDRESSES,
    PINNED_POOL_IDS,
    SRA_ORDER_EXPIRATION_BUFFER_SECONDS,
    TAKER_FEE_ASSET_DATA,
    TAKER_FEE_UNIT_AMOUNT,
} from '../config';
import { MAX_TOKEN_SUPPLY_POSSIBLE, NULL_ADDRESS, ONE_SECOND_MS, TEN_MINUTES_MS } from '../constants';
import { SignedOrderEntity } from '../entities';
import { logger } from '../logger';
import * as queries from '../queries/staking_queries';
import { APIOrderWithMetaData, PinResult, RawPool } from '../types';

import { createResultCache, ResultCache } from './result_cache';

const DEFAULT_ERC721_ASSET = {
    minAmount: new BigNumber(0),
    maxAmount: new BigNumber(1),
    precision: 0,
};
const DEFAULT_ERC20_ASSET = {
    minAmount: new BigNumber(0),
    maxAmount: MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: DEFAULT_ERC20_TOKEN_PRECISION,
};

const DEFAULT_ERC1155_ASSET = {
    minAmount: new BigNumber(0),
    maxAmount: MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: 0,
};

const DEFAULT_MULTIASSET = {
    minAmount: new BigNumber(0),
    maxAmount: MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: 0,
};

const DEFAULT_STATIC_CALL = {
    minAmount: new BigNumber(1),
    maxAmount: MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: 0,
};
const proxyIdToDefaults: { [id: string]: Partial<Asset> } = {
    [AssetProxyId.ERC20]: DEFAULT_ERC20_ASSET,
    [AssetProxyId.ERC721]: DEFAULT_ERC721_ASSET,
    [AssetProxyId.ERC1155]: DEFAULT_ERC1155_ASSET,
    [AssetProxyId.MultiAsset]: DEFAULT_MULTIASSET,
    [AssetProxyId.StaticCall]: DEFAULT_STATIC_CALL,
    [AssetProxyId.ERC20Bridge]: DEFAULT_ERC20_ASSET,
};

const assetDataToAsset = (assetData: string): Asset => {
    const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
    const defaultAsset = proxyIdToDefaults[decodedAssetData.assetProxyId];
    if (defaultAsset === undefined) {
        throw errorUtils.spawnSwitchErr('assetProxyId', decodedAssetData.assetProxyId);
    }
    return {
        ...defaultAsset,
        assetData,
    } as Asset; // tslint:disable-line:no-object-literal-type-assertion
};

// Cache the expensive query of current epoch stats
let PIN_CACHE: ResultCache<any>;
const getPoolsAsync = async (connection: Connection) => {
    if (!PIN_CACHE) {
        PIN_CACHE = createResultCache<any[]>(() => connection.query(queries.stakingPoolsQuery), TEN_MINUTES_MS);
    }
    return (await PIN_CACHE.getResultAsync()).result;
};

export const orderUtils = {
    isIgnoredOrder: (addressesToIgnore: string[], apiOrder: APIOrder): boolean => {
        return (
            addressesToIgnore.includes(apiOrder.order.makerAddress) ||
            orderUtils.includesTokenAddresses(apiOrder.order.makerAssetData, addressesToIgnore) ||
            orderUtils.includesTokenAddresses(apiOrder.order.takerAssetData, addressesToIgnore)
        );
    },
    isMultiAssetData: (decodedAssetData: AssetData): decodedAssetData is MultiAssetData => {
        return decodedAssetData.assetProxyId === AssetProxyId.MultiAsset;
    },
    isStaticCallAssetData: (decodedAssetData: AssetData): decodedAssetData is StaticCallAssetData => {
        return decodedAssetData.assetProxyId === AssetProxyId.StaticCall;
    },
    isBridgeAssetData: (decodedAssetData: AssetData): decodedAssetData is ERC20BridgeAssetData => {
        return decodedAssetData.assetProxyId === AssetProxyId.ERC20Bridge;
    },
    isTokenAssetData: (
        decodedAssetData: AssetData,
    ): decodedAssetData is ERC20AssetData | ERC1155AssetData | ERC721AssetData => {
        switch (decodedAssetData.assetProxyId) {
            case AssetProxyId.ERC1155:
            case AssetProxyId.ERC721:
            case AssetProxyId.ERC20:
                return true;
            default:
                return false;
        }
    },
    isFreshOrder: (
        apiOrder: APIOrder,
        expirationBufferSeconds: number = SRA_ORDER_EXPIRATION_BUFFER_SECONDS,
    ): boolean => {
        const dateNowSeconds = Date.now() / ONE_SECOND_MS;
        return apiOrder.order.expirationTimeSeconds.toNumber() > dateNowSeconds + expirationBufferSeconds;
    },
    groupByFreshness: <T extends APIOrder>(
        apiOrders: T[],
        expirationBufferSeconds: number,
    ): { fresh: T[]; expired: T[] } => {
        const accumulator = { fresh: [] as T[], expired: [] as T[] };
        for (const order of apiOrders) {
            orderUtils.isFreshOrder(order, expirationBufferSeconds)
                ? accumulator.fresh.push(order)
                : accumulator.expired.push(order);
        }
        return accumulator;
    },
    compareAskOrder: (orderA: SignedOrder, orderB: SignedOrder): number => {
        const orderAPrice = orderA.takerAssetAmount.div(orderA.makerAssetAmount);
        const orderBPrice = orderB.takerAssetAmount.div(orderB.makerAssetAmount);
        if (!orderAPrice.isEqualTo(orderBPrice)) {
            return orderAPrice.comparedTo(orderBPrice);
        }
        return orderUtils.compareOrderByFeeRatio(orderA, orderB);
    },
    compareBidOrder: (orderA: SignedOrder, orderB: SignedOrder): number => {
        const orderAPrice = orderA.makerAssetAmount.div(orderA.takerAssetAmount);
        const orderBPrice = orderB.makerAssetAmount.div(orderB.takerAssetAmount);
        if (!orderAPrice.isEqualTo(orderBPrice)) {
            return orderBPrice.comparedTo(orderAPrice);
        }
        return orderUtils.compareOrderByFeeRatio(orderA, orderB);
    },
    compareOrderByFeeRatio: (orderA: SignedOrder, orderB: SignedOrder): number => {
        const orderAFeePrice = orderA.takerFee.div(orderA.takerAssetAmount);
        const orderBFeePrice = orderB.takerFee.div(orderB.takerAssetAmount);
        if (!orderAFeePrice.isEqualTo(orderBFeePrice)) {
            return orderBFeePrice.comparedTo(orderAFeePrice);
        }
        return orderA.expirationTimeSeconds.comparedTo(orderB.expirationTimeSeconds);
    },
    includesTokenAddresses: (assetData: string, tokenAddresses: string[]): boolean => {
        const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (orderUtils.isMultiAssetData(decodedAssetData)) {
            for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
                if (orderUtils.includesTokenAddresses(nestedAssetDataElement, tokenAddresses)) {
                    return true;
                }
            }
            return false;
        } else if (orderUtils.isTokenAssetData(decodedAssetData)) {
            return tokenAddresses.find(a => a === decodedAssetData.tokenAddress) !== undefined;
        }
        return false;
    },
    includesTokenAddress: (assetData: string, tokenAddress: string): boolean => {
        return orderUtils.includesTokenAddresses(assetData, [tokenAddress]);
    },
    deserializeOrder: (signedOrderEntity: Required<SignedOrderEntity>): SignedOrder => {
        const signedOrder: SignedOrder = {
            signature: signedOrderEntity.signature,
            senderAddress: signedOrderEntity.senderAddress,
            makerAddress: signedOrderEntity.makerAddress,
            takerAddress: signedOrderEntity.takerAddress,
            makerFee: new BigNumber(signedOrderEntity.makerFee),
            takerFee: new BigNumber(signedOrderEntity.takerFee),
            makerAssetAmount: new BigNumber(signedOrderEntity.makerAssetAmount),
            takerAssetAmount: new BigNumber(signedOrderEntity.takerAssetAmount),
            makerAssetData: signedOrderEntity.makerAssetData,
            takerAssetData: signedOrderEntity.takerAssetData,
            salt: new BigNumber(signedOrderEntity.salt),
            exchangeAddress: signedOrderEntity.exchangeAddress,
            feeRecipientAddress: signedOrderEntity.feeRecipientAddress,
            expirationTimeSeconds: new BigNumber(signedOrderEntity.expirationTimeSeconds),
            makerFeeAssetData: signedOrderEntity.makerFeeAssetData,
            chainId: CHAIN_ID,
            takerFeeAssetData: signedOrderEntity.takerFeeAssetData,
        };
        return signedOrder;
    },
    deserializeOrderToAPIOrder: (signedOrderEntity: Required<SignedOrderEntity>): APIOrder => {
        const order = orderUtils.deserializeOrder(signedOrderEntity);
        const apiOrder: APIOrder = {
            order,
            metaData: {
                orderHash: signedOrderEntity.hash,
                remainingFillableTakerAssetAmount: signedOrderEntity.remainingFillableTakerAssetAmount,
            },
        };
        return apiOrder;
    },
    serializeOrder: (apiOrder: APIOrderWithMetaData): SignedOrderEntity => {
        const signedOrder = apiOrder.order;
        const signedOrderEntity = new SignedOrderEntity({
            signature: signedOrder.signature,
            senderAddress: signedOrder.senderAddress,
            makerAddress: signedOrder.makerAddress,
            takerAddress: signedOrder.takerAddress,
            makerAssetAmount: signedOrder.makerAssetAmount.toString(),
            takerAssetAmount: signedOrder.takerAssetAmount.toString(),
            makerAssetData: signedOrder.makerAssetData,
            takerAssetData: signedOrder.takerAssetData,
            makerFee: signedOrder.makerFee.toString(),
            takerFee: signedOrder.takerFee.toString(),
            makerFeeAssetData: signedOrder.makerFeeAssetData.toString(),
            takerFeeAssetData: signedOrder.takerFeeAssetData.toString(),
            salt: signedOrder.salt.toString(),
            exchangeAddress: signedOrder.exchangeAddress,
            feeRecipientAddress: signedOrder.feeRecipientAddress,
            expirationTimeSeconds: signedOrder.expirationTimeSeconds.toString(),
            hash: apiOrder.metaData.orderHash,
            remainingFillableTakerAssetAmount: apiOrder.metaData.remainingFillableTakerAssetAmount.toString(),
        });
        return signedOrderEntity;
    },
    signedOrderToAssetPair: (signedOrder: SignedOrder): AssetPairsItem => {
        return {
            assetDataA: assetDataToAsset(signedOrder.makerAssetData),
            assetDataB: assetDataToAsset(signedOrder.takerAssetData),
        };
    },
    getOrderConfig: (_order: Partial<OrderConfigRequest>): OrderConfigResponse => {
        const normalizedFeeRecipient = FEE_RECIPIENT_ADDRESS.toLowerCase();
        const orderConfigResponse: OrderConfigResponse = {
            senderAddress: NULL_ADDRESS,
            feeRecipientAddress: normalizedFeeRecipient,
            makerFee: MAKER_FEE_UNIT_AMOUNT,
            takerFee: TAKER_FEE_UNIT_AMOUNT,
            makerFeeAssetData: MAKER_FEE_ASSET_DATA,
            takerFeeAssetData: TAKER_FEE_ASSET_DATA,
        };
        return orderConfigResponse;
    },
    filterOrders: (apiOrders: APIOrder[], filters: OrdersRequestOpts): APIOrder[] => {
        let filteredOrders = apiOrders;
        const { traderAddress, makerAssetAddress, takerAssetAddress, makerAssetProxyId, takerAssetProxyId } = filters;
        if (traderAddress) {
            filteredOrders = filteredOrders.filter(
                apiOrder =>
                    apiOrder.order.makerAddress === traderAddress || apiOrder.order.takerAddress === traderAddress,
            );
        }
        if (makerAssetAddress) {
            filteredOrders = filteredOrders.filter(apiOrder =>
                orderUtils.includesTokenAddress(apiOrder.order.makerAssetData, makerAssetAddress),
            );
        }
        if (takerAssetAddress) {
            filteredOrders = filteredOrders.filter(apiOrder =>
                orderUtils.includesTokenAddress(apiOrder.order.takerAssetData, takerAssetAddress),
            );
        }
        if (makerAssetProxyId) {
            filteredOrders = filteredOrders.filter(
                apiOrder =>
                    assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.makerAssetData).assetProxyId ===
                    makerAssetProxyId,
            );
        }
        if (takerAssetProxyId) {
            filteredOrders = filteredOrders.filter(
                apiOrder =>
                    assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.takerAssetData).assetProxyId ===
                    takerAssetProxyId,
            );
        }
        return filteredOrders;
    },
    // splitOrdersByPinning splits the orders into those we wish to pin in our Mesh node and
    // those we wish not to pin. We wish to pin the orders of MMers with a lot of ZRX at stake and
    // who have a track record of acting benevolently.
    async splitOrdersByPinningAsync(connection: Connection, signedOrders: SignedOrder[]): Promise<PinResult> {
        let currentPools = [];
        // HACK(jalextowle): This query will fail when running against Ganache, so we
        // skip it an only use pinned MMers. A deployed staking system that allows this
        // functionality to be tested would improve the testing infrastructure.
        try {
            currentPools = (await getPoolsAsync(connection)) || [];
        } catch (error) {
            logger.warn(`stakingPoolsQuery threw an error: ${error}`);
        }
        let makerAddresses: string[] = PINNED_MM_ADDRESSES;
        currentPools.forEach((poolStats: RawPool) => {
            if (!PINNED_POOL_IDS.includes(poolStats.pool_id)) {
                return;
            }
            makerAddresses = [...makerAddresses, ...poolStats.maker_addresses];
        });
        const pinResult: PinResult = {
            pin: [],
            doNotPin: [],
        };
        signedOrders.forEach(signedOrder => {
            if (makerAddresses.includes(signedOrder.makerAddress)) {
                pinResult.pin.push(signedOrder);
            } else {
                pinResult.doNotPin.push(signedOrder);
            }
        });
        return pinResult;
    },
};
