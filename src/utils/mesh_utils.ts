import {
    AcceptedOrderInfo,
    OrderEvent,
    OrderEventEndState,
    OrderInfo,
    RejectedCode,
    RejectedOrderInfo,
} from '@0x/mesh-rpc-client';

import { ZERO } from '../constants';
import { ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { APIOrderWithMetaData, OrdersByLifecycleEvents } from '../types';

import { orderUtils } from './order_utils';

export const meshUtils = {
    orderInfosToApiOrders: (
        orderEvent: (OrderEvent | AcceptedOrderInfo | RejectedOrderInfo | OrderInfo)[],
    ): APIOrderWithMetaData[] => {
        return orderEvent.map(e => meshUtils.orderInfoToAPIOrder(e));
    },
    orderInfoToAPIOrder: (
        orderEvent: OrderEvent | AcceptedOrderInfo | RejectedOrderInfo | OrderInfo,
    ): APIOrderWithMetaData => {
        const { orderHash, fillableTakerAssetAmount, signedOrder } = orderEvent as OrderEvent;
        const apiOrder: APIOrderWithMetaData = {
            // orderEvent.signedOrder comes from mesh with string fields, needs to be serialized into SignedOrder
            order: orderUtils.deserializeOrder(signedOrder as any), // tslint:disable-line:no-unnecessary-type-assertion
            metaData: {
                orderHash,
                remainingFillableTakerAssetAmount: fillableTakerAssetAmount || ZERO,
            },
        };
        // populate order state
        apiOrder.metaData.state = (orderEvent as OrderEvent).endState;
        if (apiOrder.metaData.state === undefined) {
            const r = orderEvent as RejectedOrderInfo;
            apiOrder.metaData.state =
                r.status && r.status.code
                    ? meshUtils.rejectedCodeToOrderState(r.status.code)
                    : OrderEventEndState.Invalid;
        }
        return apiOrder;
    },
    rejectedCodeToOrderState: (code: RejectedCode): OrderEventEndState | undefined => {
        switch (code) {
            case RejectedCode.OrderCancelled:
                return OrderEventEndState.Cancelled;
            case RejectedCode.OrderExpired:
                return OrderEventEndState.Expired;
            case RejectedCode.OrderUnfunded:
                return OrderEventEndState.Unfunded;
            case RejectedCode.OrderFullyFilled:
                return OrderEventEndState.FullyFilled;
            default:
                return undefined;
        }
    },
    rejectedCodeToSRACode: (code: RejectedCode): ValidationErrorCodes => {
        switch (code) {
            case RejectedCode.OrderCancelled:
            case RejectedCode.OrderExpired:
            case RejectedCode.OrderUnfunded:
            case RejectedCode.OrderHasInvalidMakerAssetAmount:
            case RejectedCode.OrderHasInvalidMakerAssetData:
            case RejectedCode.OrderHasInvalidTakerAssetAmount:
            case RejectedCode.OrderHasInvalidTakerAssetData:
            case RejectedCode.OrderFullyFilled: {
                return ValidationErrorCodes.InvalidOrder;
            }
            case RejectedCode.OrderHasInvalidSignature: {
                return ValidationErrorCodes.InvalidSignatureOrHash;
            }
            case RejectedCode.OrderForIncorrectChain: {
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
                case OrderEventEndState.Invalid:
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
