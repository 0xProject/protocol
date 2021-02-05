import {
    OrderEvent,
    OrderEventEndState,
    OrderWithMetadata,
    RejectedOrderCode,
    SignedOrder,
} from '@0x/mesh-graphql-client';
import * as _ from 'lodash';

import { ZERO } from '../constants';
import { ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { AcceptedOrderResult, APIOrderWithMetaData, OrdersByLifecycleEvents, RejectedOrderResult } from '../types';

type OrderData = AcceptedOrderResult | RejectedOrderResult | OrderEvent | OrderWithMetadata;

const isOrderEvent = (orderData: OrderData): orderData is OrderEvent => !!(orderData as OrderEvent).endState;
const isRejectedOrderResult = (orderData: OrderData): orderData is RejectedOrderResult =>
    !!(orderData as RejectedOrderResult).code;
const isOrderWithMetadata = (orderData: OrderData): orderData is OrderWithMetadata =>
    !!(orderData as OrderWithMetadata).fillableTakerAssetAmount;

export const meshUtils = {
    orderWithMetadataToSignedOrder(order: OrderWithMetadata): SignedOrder {
        const cleanedOrder: SignedOrder = _.omit(order, ['hash', 'fillableTakerAssetAmount']);

        return cleanedOrder;
    },
    orderInfosToApiOrders: (orders: OrderData[]): APIOrderWithMetaData[] => {
        return orders.map(e => meshUtils.orderInfoToAPIOrder(e));
    },
    orderInfoToAPIOrder: (orderData: OrderData): APIOrderWithMetaData => {
        let order: SignedOrder;
        let remainingFillableTakerAssetAmount = ZERO;
        let orderHash: string;
        let state: OrderEventEndState | undefined;
        if (isOrderWithMetadata(orderData)) {
            order = meshUtils.orderWithMetadataToSignedOrder(orderData);
            remainingFillableTakerAssetAmount = orderData.fillableTakerAssetAmount;
            orderHash = orderData.hash;
        } else if (isOrderEvent(orderData)) {
            order = meshUtils.orderWithMetadataToSignedOrder(orderData.order);
            remainingFillableTakerAssetAmount = orderData.order.fillableTakerAssetAmount;
            orderHash = orderData.order.hash;

            state = orderData.endState;
        } else if (isRejectedOrderResult(orderData)) {
            order = orderData.order;
            // TODO(kimpers): sometimes this will not exist according to Mesh GQL spec. Is this a problem?
            orderHash = orderData.hash!;

            state = meshUtils.rejectedCodeToOrderState(orderData.code);
        } else {
            order = meshUtils.orderWithMetadataToSignedOrder(orderData.order);
            remainingFillableTakerAssetAmount = orderData.order.fillableTakerAssetAmount;
            orderHash = orderData.order.hash;
        }

        return {
            order,
            metaData: {
                orderHash,
                remainingFillableTakerAssetAmount,
                state,
            },
        };
    },
    rejectedCodeToOrderState: (code: RejectedOrderCode): OrderEventEndState | undefined => {
        switch (code) {
            case RejectedOrderCode.OrderCancelled:
                return OrderEventEndState.Cancelled;
            case RejectedOrderCode.OrderExpired:
                return OrderEventEndState.Expired;
            case RejectedOrderCode.OrderUnfunded:
                return OrderEventEndState.Unfunded;
            case RejectedOrderCode.OrderFullyFilled:
                return OrderEventEndState.FullyFilled;
            default:
                return undefined;
        }
    },
    rejectedCodeToSRACode: (code: RejectedOrderCode): ValidationErrorCodes => {
        switch (code) {
            case RejectedOrderCode.OrderCancelled:
            case RejectedOrderCode.OrderExpired:
            case RejectedOrderCode.OrderUnfunded:
            case RejectedOrderCode.OrderHasInvalidMakerAssetAmount:
            case RejectedOrderCode.OrderHasInvalidMakerAssetData:
            case RejectedOrderCode.OrderHasInvalidTakerAssetAmount:
            case RejectedOrderCode.OrderHasInvalidTakerAssetData:
            case RejectedOrderCode.OrderFullyFilled: {
                return ValidationErrorCodes.InvalidOrder;
            }
            case RejectedOrderCode.OrderHasInvalidSignature: {
                return ValidationErrorCodes.InvalidSignatureOrHash;
            }
            case RejectedOrderCode.OrderForIncorrectChain: {
                return ValidationErrorCodes.InvalidAddress;
            }
            default:
                return ValidationErrorCodes.InternalError;
        }
    },
    calculateOrderLifecycle: (orders: APIOrderWithMetaData[]): OrdersByLifecycleEvents => {
        const added: APIOrderWithMetaData[] = [];
        const removed: APIOrderWithMetaData[] = [];
        const updated: APIOrderWithMetaData[] = [];
        for (const order of orders) {
            switch (order.metaData.state as OrderEventEndState) {
                case OrderEventEndState.Added: {
                    added.push(order);
                    break;
                }
                // case OrderEventEndState.Invalid: TODO(kimpers): Invalid state is no longer available, is this an issue?
                case OrderEventEndState.Cancelled:
                case OrderEventEndState.Expired:
                case OrderEventEndState.FullyFilled:
                case OrderEventEndState.StoppedWatching:
                case OrderEventEndState.Unfunded: {
                    removed.push(order);
                    break;
                }
                case OrderEventEndState.Unexpired:
                case OrderEventEndState.FillabilityIncreased:
                case OrderEventEndState.Filled: {
                    updated.push(order);
                    break;
                }
                default:
                    logger.error('Unknown Mesh Event State', order.metaData.state, order);
                    break;
            }
        }
        return { added, removed, updated };
    },
};
