import { InternalServerError } from '@0x/api-utils';
import axios from 'axios';

import { ORDER_WATCHER_URL } from '../config';
import { ValidationError } from '../errors';
import { SignedLimitOrder } from '../types';

export interface OrderWatcherInterface {
    postOrdersAsync(orders: SignedLimitOrder[]): Promise<void>;
}

export class OrderWatcher implements OrderWatcherInterface {
    public async postOrdersAsync(orders: SignedLimitOrder[]): Promise<void> {
        try {
            await axios.post(`${ORDER_WATCHER_URL}/orders`, orders, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 1000,
            });
        } catch (err) {
            if (err.response.data) {
                throw new ValidationError(err.response.data.validationErrors);
            } else if (err.request) {
                throw new InternalServerError('failed to submit order to order-watcher');
            } else {
                throw new InternalServerError('failed to prepare the order-watcher request');
            }
        }
    }
}
