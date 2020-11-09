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
        const remainingFillableTakerAssetAmount = (orderEvent as OrderEvent).fillableTakerAssetAmount
            ? (orderEvent as OrderEvent).fillableTakerAssetAmount
            : ZERO;
        return {
            // orderEvent.signedOrder comes from mesh with string fields, needs to be serialized into SignedOrder
            order: orderUtils.deserializeOrder(orderEvent.signedOrder as any), // tslint:disable-line:no-unnecessary-type-assertion
            metaData: {
                orderHash: orderEvent.orderHash,
                remainingFillableTakerAssetAmount,
                state:
                    (orderEvent as OrderEvent).endState ||
                    meshUtils.rejectedCodeToOrderState((orderEvent as RejectedOrderInfo).status.code),
            },
        };
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
    calculateOrderLifecycle: (orderEvents: OrderEvent[]): OrdersByLifecycleEvents => {
        const added: APIOrderWithMetaData[] = [];
        const removed: APIOrderWithMetaData[] = [];
        const updated: APIOrderWithMetaData[] = [];
        const persistentUpdated: APIOrderWithMetaData[] = [];
        for (const event of orderEvents) {
            const apiOrder = meshUtils.orderInfoToAPIOrder(event);
            switch (event.endState) {
                case OrderEventEndState.Added: {
                    added.push(apiOrder);
                    break;
                }
                case OrderEventEndState.Invalid:
                case OrderEventEndState.Cancelled:
                case OrderEventEndState.Expired:
                case OrderEventEndState.FullyFilled:
                case OrderEventEndState.StoppedWatching:
                case OrderEventEndState.Unfunded: {
                    removed.push(apiOrder);
                    persistentUpdated.push(apiOrder);
                    break;
                }
                case OrderEventEndState.Unexpired:
                case OrderEventEndState.FillabilityIncreased:
                case OrderEventEndState.Filled: {
                    updated.push(apiOrder);
                    persistentUpdated.push(apiOrder);
                    break;
                }
                default:
                    logger.error('Unknown Mesh Event', event.endState, event);
                    break;
            }
        }
        return { added, removed, updated, persistentUpdated };
    },
};
