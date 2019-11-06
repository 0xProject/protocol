import {
    AcceptedOrderInfo,
    OrderEvent,
    OrderEventEndState,
    OrderInfo,
    RejectedCode,
    RejectedOrderInfo,
    SignedOrder,
    ValidationResults,
    WSClient,
} from '@0x/mesh-rpc-client';
import * as _ from 'lodash';

import { ZERO } from '../constants';
import { ValidationErrorCodes } from '../errors';
import { AddedRemovedUpdate, APIOrderWithMetaData } from '../types';

// tslint:disable-next-line:no-var-requires
const d = require('debug')('MESH');

export const meshUtils = {
    addOrdersToMeshAsync: async (
        meshClient: WSClient,
        orders: SignedOrder[],
        batchSize: number = 100,
    ): Promise<ValidationResults> => {
        // Mesh rpc client can't handle a large amount of orders. This results in a fragmented
        // send which Mesh cannot accept.
        const validationResults: ValidationResults = { accepted: [], rejected: [] };
        const chunks = _.chunk(orders, batchSize);
        for (const chunk of chunks) {
            const results = await meshClient.addOrdersAsync(chunk);
            validationResults.accepted = [...validationResults.accepted, ...results.accepted];
            validationResults.rejected = [...validationResults.rejected, ...results.rejected];
        }
        return validationResults;
    },
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
            order: orderEvent.signedOrder,
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
        const added = [];
        const removed = [];
        const updated = [];
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
                    d('Unknown Event', event.endState, event);
                    break;
            }
        }
        return { added, removed, updated };
    },
};
