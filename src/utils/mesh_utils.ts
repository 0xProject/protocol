import {
    AcceptedOrderInfo,
    OrderEvent,
    OrderEventEndState,
    OrderInfo,
    RejectedCode,
    RejectedOrderInfo,
} from '@0x/mesh-rpc-client';
import * as _ from 'lodash';

import { ZERO } from '../constants';
import { ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { AddedRemovedUpdate, APIOrderWithMetaData } from '../types';

export const meshUtils = {
    orderInfosToApiOrders: (
        orderEvent: Array<OrderEvent | AcceptedOrderInfo | RejectedOrderInfo | OrderInfo>,
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
            // TODO remove the any when packages are all published and updated with latest types
            // tslint:disable-next-line:no-unnecessary-type-assertion
            order: orderEvent.signedOrder as any,
            metaData: {
                orderHash: orderEvent.orderHash,
                remainingFillableTakerAssetAmount,
            },
        };
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
    calculateAddedRemovedUpdated: (orderEvents: OrderEvent[]): AddedRemovedUpdate => {
        const added: APIOrderWithMetaData[] = [];
        const removed: APIOrderWithMetaData[] = [];
        const updated: APIOrderWithMetaData[] = [];
        for (const event of orderEvents) {
            const apiOrder = meshUtils.orderInfoToAPIOrder(event);
            switch (event.endState) {
                case OrderEventEndState.Added: {
                    added.push(apiOrder);
                    break;
                }
                case OrderEventEndState.Cancelled:
                case OrderEventEndState.Expired:
                case OrderEventEndState.FullyFilled:
                case OrderEventEndState.Unfunded: {
                    removed.push(apiOrder);
                    break;
                }
                case OrderEventEndState.FillabilityIncreased:
                case OrderEventEndState.Filled: {
                    updated.push(apiOrder);
                    break;
                }
                default:
                    logger.error('Unknown Mesh Event', event.endState, event);
                    break;
            }
        }
        return { added, removed, updated };
    },
};
