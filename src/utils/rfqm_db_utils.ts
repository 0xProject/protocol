import { RfqOrder } from '@0x/protocol-utils';

import { BigNumber } from '../asset-swapper';
import { RfqmOrderTypes, StoredOrder } from '../entities/RfqmJobEntity';

type RfqmOrder = RfqOrder;

/**
 * convert a stored order into the appropriate order class
 */
export function storedOrderToRfqmOrder(storedOrder: StoredOrder): RfqmOrder {
    if (storedOrder.type === RfqmOrderTypes.V4Rfq) {
        return new RfqOrder({
            txOrigin: storedOrder.order.txOrigin,
            maker: storedOrder.order.maker,
            taker: storedOrder.order.taker,
            makerToken: storedOrder.order.makerToken,
            takerToken: storedOrder.order.takerToken,
            makerAmount: new BigNumber(storedOrder.order.makerAmount),
            takerAmount: new BigNumber(storedOrder.order.takerAmount),
            salt: new BigNumber(storedOrder.order.salt),
            expiry: new BigNumber(storedOrder.order.expiry),
            verifyingContract: storedOrder.order.verifyingContract,
            chainId: Number(storedOrder.order.chainId),
            pool: storedOrder.order.pool,
        });
    } else {
        throw new Error(`Unknown order type`);
    }
}

/**
 * convert a v4 RFQ order into a 'StoredOrder' format for writing to the DB
 */
export function v4RfqOrderToStoredOrder(order: RfqOrder): StoredOrder {
    return {
        type: RfqmOrderTypes.V4Rfq,
        order: {
            makerAmount: order.makerAmount.toString(),
            takerAmount: order.takerAmount.toString(),
            expiry: order.expiry.toString(),
            salt: order.salt.toString(),
            txOrigin: order.txOrigin,
            maker: order.maker,
            taker: order.taker,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            pool: order.pool,
            verifyingContract: order.verifyingContract,
            chainId: String(order.chainId),
        },
    };
}
