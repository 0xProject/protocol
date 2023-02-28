import { BigNumber } from '@0x/utils';

import { OrderEventEndState, SRAOrder } from '../types';

export interface OrderWatcherEvent {
    order: {
        takerTokenFeeAmount: string; // BigNumber;
        sender: string;
        feeRecipient: string;
        makerToken: string;
        takerToken: string;
        makerAmount: string; // BigNumber;
        takerAmount: string; // BigNumber;
        maker: string;
        taker: string;
        pool: string;
        expiry: string; // BigNumber;
        salt: string; // BigNumber;
        chainId: number;
        verifyingContract: string;
        signature: {
            signatureType: number;
            v: number;
            r: string;
            s: string;
        };
    };
    metaData: {
        orderHash: string;
        remainingFillableTakerAmount: string;
        state: string;
        createdAt: string;
    };
}

export const orderWatcherEventToSRAOrder = (event: OrderWatcherEvent): SRAOrder => {
    return {
        order: {
            ...event.order,
            takerTokenFeeAmount: new BigNumber(event.order.takerTokenFeeAmount),
            makerAmount: new BigNumber(event.order.makerAmount),
            takerAmount: new BigNumber(event.order.takerAmount),
            expiry: new BigNumber(event.order.expiry),
            salt: new BigNumber(event.order.salt),
        },
        metaData: {
            orderHash: event.metaData.orderHash,
            remainingFillableTakerAmount: new BigNumber(event.metaData.remainingFillableTakerAmount),
            state: event.metaData.state.toUpperCase() as OrderEventEndState,
        },
    };
};
