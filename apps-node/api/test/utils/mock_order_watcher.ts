import { LimitOrder, LimitOrderFields } from '@0x/protocol-utils';
import { Connection } from 'typeorm';

import { OrderWatcherSignedOrderEntity } from '../../src/entities';
import { SignedLimitOrder } from '../../src/types';
import { orderUtils } from '../../src/utils/order_utils';
import { OrderWatcherInterface } from '../../src/utils/order_watcher';

export class MockOrderWatcher implements OrderWatcherInterface {
    private readonly _connection: Connection;

    constructor(connection: Connection) {
        this._connection = connection;
    }

    public async postOrdersAsync(orders: SignedLimitOrder[]): Promise<void> {
        await this._connection.getRepository(OrderWatcherSignedOrderEntity).save(
            orders.map((order) => {
                const limitOrder = new LimitOrder(order as LimitOrderFields);
                return orderUtils.serializeOrder({
                    order,
                    metaData: {
                        orderHash: limitOrder.getHash(),
                        remainingFillableTakerAmount: order.takerAmount,
                    },
                });
            }),
        );
    }
}
