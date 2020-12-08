import { getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { LimitOrder, LimitOrderFields, RfqOrder, RfqOrderFields } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';

/**
 * Generate a random limit order.
 */
export function getRandomLimitOrder(fields: Partial<LimitOrderFields> = {}): LimitOrder {
    return new LimitOrder({
        makerToken: randomAddress(),
        takerToken: randomAddress(),
        makerAmount: getRandomInteger('1e18', '100e18'),
        takerAmount: getRandomInteger('1e6', '100e6'),
        takerTokenFeeAmount: getRandomInteger('0.01e18', '1e18'),
        maker: randomAddress(),
        taker: randomAddress(),
        sender: randomAddress(),
        feeRecipient: randomAddress(),
        pool: hexUtils.random(),
        expiry: new BigNumber(Math.floor(Date.now() / 1000 + 60)),
        salt: new BigNumber(hexUtils.random()),
        ...fields,
    });
}

/**
 * Generate a random RFQ order.
 */
export function getRandomRfqOrder(fields: Partial<RfqOrderFields> = {}): RfqOrder {
    return new RfqOrder({
        makerToken: randomAddress(),
        takerToken: randomAddress(),
        makerAmount: getRandomInteger('1e18', '100e18'),
        takerAmount: getRandomInteger('1e6', '100e6'),
        maker: randomAddress(),
        txOrigin: randomAddress(),
        pool: hexUtils.random(),
        expiry: new BigNumber(Math.floor(Date.now() / 1000 + 60)),
        salt: new BigNumber(hexUtils.random()),
        ...fields,
    });
}
