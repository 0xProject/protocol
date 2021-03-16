"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@0x/utils");
/**
 * Compute the bloom filter for a list of tokens.
 * Used to filter greedy tokens in the exchange proxy.
 */
function getTokenListBloomFilter(tokens) {
    let filter = utils_1.hexUtils.leftPad(0);
    for (const token of tokens) {
        // (1 << (keccak256(token) % 256)) | (1 << (token % 256))
        const a = utils_1.hexUtils.toHex(new utils_1.BigNumber(2).pow(new utils_1.BigNumber(utils_1.hexUtils.hash(utils_1.hexUtils.leftPad(token))).mod(256)));
        const b = utils_1.hexUtils.toHex(new utils_1.BigNumber(2).pow(new utils_1.BigNumber(token).mod(256)));
        filter = bitwiseOrWords(filter, bitwiseOrWords(a, b));
    }
    return filter;
}
exports.getTokenListBloomFilter = getTokenListBloomFilter;
// Bitwise OR two hex words.
function bitwiseOrWords(a, b) {
    const aBits = hexWordToBitArray(a);
    const bBits = hexWordToBitArray(b);
    const resultBits = aBits.slice();
    for (let i = 0; i < 256; ++i) {
        // tslint:disable-next-line: no-bitwise
        resultBits[i] |= bBits[i];
    }
    return bitArrayToHexWord(resultBits);
}
function hexWordToBitArray(hexWord) {
    // Covnert to a binary string.
    const bin = new utils_1.BigNumber(hexWord).toString(2);
    // Convert to integers.
    const bits = bin.split('').map(s => parseInt(s, 10));
    // Left the binary string pad with zeroes.
    return new Array(256 - bits.length).fill(0).concat(bits);
}
function bitArrayToHexWord(bits) {
    return utils_1.hexUtils.leftPad(new utils_1.BigNumber(`0b${bits.map(b => b.toString()).join('')}`));
}
//# sourceMappingURL=bloom_filter_utils.js.map