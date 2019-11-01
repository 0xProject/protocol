import { assetDataUtils, BigNumber, SignedOrder } from '0x.js';
import { APIOrder, OrderConfigRequest, OrderConfigResponse } from '@0x/connect';
import { Asset, AssetPairsItem, AssetProxyId } from '@0x/types';
import { errorUtils } from '@0x/utils';

import {
    DEFAULT_ERC20_TOKEN_PRECISION,
    FEE_RECIPIENT,
    MAKER_FEE_ASSET_DATA,
    MAKER_FEE_UNIT_AMOUNT,
    NETWORK_ID,
    TAKER_FEE_ASSET_DATA,
    TAKER_FEE_UNIT_AMOUNT,
} from '../config';
import { MAX_TOKEN_SUPPLY_POSSIBLE, NULL_ADDRESS } from '../constants';
import { SignedOrderEntity } from '../entities';
import { APIOrderWithMetaData } from '../types';

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

const erc721AssetDataToAsset = (assetData: string): Asset => ({
    ...DEFAULT_ERC721_ASSET,
    assetData,
});

const erc20AssetDataToAsset = (assetData: string): Asset => ({
    ...DEFAULT_ERC20_ASSET,
    assetData,
});

const assetDataToAsset = (assetData: string): Asset => {
    const assetProxyId = assetDataUtils.decodeAssetProxyId(assetData);
    let asset: Asset;
    switch (assetProxyId) {
        case AssetProxyId.ERC20:
            asset = erc20AssetDataToAsset(assetData);
            break;
        case AssetProxyId.ERC721:
            asset = erc721AssetDataToAsset(assetData);
            break;
        default:
            throw errorUtils.spawnSwitchErr('assetProxyId', assetProxyId);
    }
    return asset;
};

export const orderUtils = {
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
    includesTokenAddress: (assetData: string, tokenAddress: string): boolean => {
        const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (assetDataUtils.isMultiAssetData(decodedAssetData)) {
            for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
                if (orderUtils.includesTokenAddress(nestedAssetDataElement, tokenAddress)) {
                    return true;
                }
            }
            return false;
        } else if (!assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
            return decodedAssetData.tokenAddress === tokenAddress;
        }
        return false;
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
            takerFeeAssetData: signedOrderEntity.takerFeeAssetData,
            chainId: NETWORK_ID,
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
            expirationTimeSeconds: signedOrder.expirationTimeSeconds.toNumber(),
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
        const normalizedFeeRecipient = FEE_RECIPIENT.toLowerCase();
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
};
