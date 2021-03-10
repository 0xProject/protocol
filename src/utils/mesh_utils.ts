import { LimitOrder } from '@0x/asset-swapper';
import {
    AcceptedOrderResult,
    OrderEvent,
    OrderEventEndState,
    OrderWithMetadataV4,
    RejectedOrderCode,
    RejectedOrderResult,
} from '@0x/mesh-graphql-client';
import * as _ from 'lodash';

import { ZERO } from '../constants';
import { ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { OrdersByLifecycleEvents, SignedLimitOrder, SRAOrder } from '../types';
import { objectETHAddressNormalizer } from '../utils/address_utils';

type AcceptedOrderWithEndState = AcceptedOrderResult<OrderWithMetadataV4> & { endState: OrderEventEndState };
type OrderData =
    | AcceptedOrderResult<OrderWithMetadataV4>
    | AcceptedOrderWithEndState
    | RejectedOrderResult<SignedLimitOrder>
    | OrderWithMetadataV4;

const isRejectedOrderResult = (orderData: OrderData): orderData is RejectedOrderResult<SignedLimitOrder> =>
    !!(orderData as RejectedOrderResult<SignedLimitOrder>).code;
const isOrderWithMetadata = (orderData: OrderData): orderData is OrderWithMetadataV4 =>
    !!(orderData as OrderWithMetadataV4).fillableTakerAssetAmount;

const isAcceptedOrderWithEndState = (orderData: OrderData): orderData is AcceptedOrderWithEndState =>
    (orderData as AcceptedOrderWithEndState).isNew !== undefined && !!(orderData as AcceptedOrderWithEndState).endState;

export type OrderEventV4 = OrderEvent & { orderv4: OrderWithMetadataV4 };

export const meshUtils = {
    orderWithMetadataToSignedOrder(order: OrderWithMetadataV4): SignedLimitOrder {
        const cleanedOrder: SignedLimitOrder = objectETHAddressNormalizer(
            _.omit(order, ['hash', 'fillableTakerAssetAmount']),
        );

        return cleanedOrder;
    },
    orderEventToSRAOrder: (orderData: OrderEventV4): SRAOrder => {
        const order = meshUtils.orderWithMetadataToSignedOrder(orderData.orderv4);
        const remainingFillableTakerAmount = orderData.orderv4.fillableTakerAssetAmount;
        const orderHash = orderData.orderv4.hash;
        const state = orderData.endState;

        return {
            order,
            metaData: {
                orderHash,
                remainingFillableTakerAmount,
                state,
            },
        };
    },
    orderInfosToApiOrders: (orders: OrderData[]): SRAOrder[] => {
        return orders.map(e => meshUtils.orderInfoToSRAOrder(e));
    },
    orderInfoToSRAOrder: (orderData: OrderData): SRAOrder => {
        let order: SignedLimitOrder;
        let remainingFillableTakerAmount = ZERO;
        let orderHash: string;
        let state: OrderEventEndState | undefined;
        if (isOrderWithMetadata(orderData)) {
            order = meshUtils.orderWithMetadataToSignedOrder(orderData);
            remainingFillableTakerAmount = orderData.fillableTakerAssetAmount;
            orderHash = orderData.hash;
        } else if (isRejectedOrderResult(orderData)) {
            order = orderData.order;
            orderHash = orderData.hash!;
            state = meshUtils.rejectedCodeToOrderState(orderData.code);
        } else {
            order = meshUtils.orderWithMetadataToSignedOrder(orderData.order);
            remainingFillableTakerAmount = orderData.order.fillableTakerAssetAmount;
            orderHash = orderData.order.hash;
            // For persistent orders we add an end state
            if (isAcceptedOrderWithEndState(orderData)) {
                state = orderData.endState;
            }
        }

        // According to mesh graphql client spec, order hash can sometimes be empty
        if (_.isEmpty(orderHash)) {
            orderHash = new LimitOrder(order).getHash();
        }

        return {
            order,
            metaData: {
                orderHash,
                remainingFillableTakerAmount,
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
                return OrderEventEndState.Invalid;
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
    calculateOrderLifecycle: (orders: SRAOrder[]): OrdersByLifecycleEvents => {
        const added: SRAOrder[] = [];
        const removed: SRAOrder[] = [];
        const updated: SRAOrder[] = [];
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
