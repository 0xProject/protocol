import { assert as sharedAssert } from '@0x/assert';

import { Orderbook } from '../swap_quoter';

export const assert = {
    ...sharedAssert,
    isValidOrderbook(variableName: string, orderFetcher: Orderbook): void {
        sharedAssert.isFunction(`${variableName}.getOrdersAsync`, orderFetcher.getOrdersAsync.bind(orderFetcher));
        sharedAssert.isFunction(
            `${variableName}.getBatchOrdersAsync`,
            orderFetcher.getBatchOrdersAsync.bind(orderFetcher),
        );
    },
    isValidPercentage(variableName: string, percentage: number): void {
        assert.isNumber(variableName, percentage);
        assert.assert(
            percentage >= 0 && percentage <= 1,
            `Expected ${variableName} to be between 0 and 1, but is ${percentage}`,
        );
    },
};
