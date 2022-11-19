import { BigNumber, hexUtils } from '@0x/utils';

/**
 * Compute the bloom filter for a list of tokens.
 * Used to filter greedy tokens in the exchange proxy.
 */
export function getTokenListBloomFilter(tokens: string[]): string {
    let filter = hexUtils.leftPad(0);
    for (const token of tokens) {
        // (1 << (keccak256(token) % 256)) | (1 << (token % 256))
        const a = hexUtils.toHex(new BigNumber(2).pow(new BigNumber(hexUtils.hash(hexUtils.leftPad(token))).mod(256)));
        const b = hexUtils.toHex(new BigNumber(2).pow(new BigNumber(token).mod(256)));
        filter = bitwiseOrWords(filter, bitwiseOrWords(a, b));
    }
    return filter;
}

// Bitwise OR two hex words.
function bitwiseOrWords(a: string, b: string): string {
    const aBits = hexWordToBitArray(a);
    const bBits = hexWordToBitArray(b);
    const resultBits = aBits.slice();
    for (let i = 0; i < 256; ++i) {
        resultBits[i] |= bBits[i];
    }
    return bitArrayToHexWord(resultBits);
}

function hexWordToBitArray(hexWord: string): number[] {
    // Covnert to a binary string.
    const bin = new BigNumber(hexWord).toString(2);
    // Convert to integers.
    const bits = bin.split('').map(s => parseInt(s, 10));
    // Left the binary string pad with zeroes.
    return new Array(256 - bits.length).fill(0).concat(bits);
}

function bitArrayToHexWord(bits: number[]): string {
    return hexUtils.leftPad(new BigNumber(`0b${bits.map(b => b.toString()).join('')}`));
}
