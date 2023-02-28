import { BigNumber } from '@0x/utils';
import { createHash } from 'crypto';

const SHA1_BITS = 160;
const MAX_SHA1 = new BigNumber(2).pow(SHA1_BITS);

/**
 * A function that hashes a message via sha1, and confirms if the hash is within the threshold
 *
 * Given a message, and a target threshold  (between 0 and 1), returns a boolean of whether
 * the message's hash is within the threshold
 *
 * @param  message is a "toString()"-able value
 * @param threshold is a number between 0 and 1
 * @returns boolean
 */
export function isHashSmallEnough({
    message,
    threshold,
}: {
    message: { toString: () => string };
    threshold: number;
}): boolean {
    // If threshold is 1, short circuit and return true
    if (threshold >= 1) {
        return true;
    }

    // If threshold is 0, short circuit and return false
    if (threshold === 0) {
        return false;
    }

    // Generate the hash from the message
    const hash = createHash('sha1').update(message.toString()).digest('hex');

    // Represent the hash as a BigNumber
    const hashBN = new BigNumber(`0x${hash}`);

    // Convert the threshold to a value between 0 and MAX_SHA1 value
    const thresholdBN = MAX_SHA1.times(threshold);

    // Compare
    return hashBN.isLessThan(thresholdBN);
}
