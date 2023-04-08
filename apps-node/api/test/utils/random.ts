import * as crypto from 'crypto';
import * as ethUtil from 'ethereumjs-util';
import { BigNumber } from '@0x/utils';

/**
 * Generate a random integer between `min` and `max`, inclusive.
 */
export function getRandomInteger(min: BigNumber | string | number, max: BigNumber | string | number): BigNumber {
    const range = new BigNumber(max).minus(min);
    return getRandomPortion(range).plus(min);
}

/**
 * Generate a random integer between `0` and `total`, inclusive.
 */
function getRandomPortion(total: BigNumber | string | number): BigNumber {
    return new BigNumber(total).times(getRandomFloat(0, 1)).integerValue(BigNumber.ROUND_HALF_UP);
}

export function randomAddress(): string {
    return ethUtil.bufferToHex(crypto.randomBytes(20));
}

/**
 * Generate a random, high-precision decimal between `min` and `max`, inclusive.
 */
export function getRandomFloat(min: BigNumber | string | number, max: BigNumber | string | number): BigNumber {
    // Generate a really high precision number between [0, 1]
    const r = new BigNumber(crypto.randomBytes(32).toString('hex'), 16).dividedBy(new BigNumber(2).pow(256).minus(1));
    return new BigNumber(max).minus(min).times(r).plus(min);
}
