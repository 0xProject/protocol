"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dev_utils_1 = require("@0x/dev-utils");
const chai_1 = require("chai");
const eip712_utils_1 = require("../src/eip712_utils");
dev_utils_1.chaiSetup.configure();
describe('eip712_utils', () => {
    describe('getExchangeProxyEIP712DomainHash()', () => {
        it('computes the correct default hash', () => {
            const actual = eip712_utils_1.getExchangeProxyEIP712DomainHash();
            const expected = '0xc92fa40dbe33b59738624b1b4ec40b30ff52e4da223f68018a7e0667ffc0e798';
            chai_1.expect(actual).to.eq(expected);
        });
        it('computes the correct hash with parameters', () => {
            const chainId = 1337;
            const verifyingContract = '0xfe20c9f78898cf8a3e7c5c2ed36568a3d2ad02b9';
            const actual = eip712_utils_1.getExchangeProxyEIP712DomainHash(chainId, verifyingContract);
            const expected = '0x3f2ee54842d00d7e811297005788367c60110c261f9f94d7f4f46a17e382bdf3';
            chai_1.expect(actual).to.eq(expected);
        });
    });
    describe('getExchangeProxyEIP712Hash()', () => {
        const structHash = '0x3ada2b9bef7def77259eca388e1074fd09013e2942cf9b594a9c6a1b2d215d1f';
        it('computes the correct hash', () => {
            const actual = eip712_utils_1.getExchangeProxyEIP712Hash(structHash);
            const expected = '0x619a48532e5e0a633191af930dacfd5538b74078793d09e8408ab9124f7b9bf3';
            chai_1.expect(actual).to.eq(expected);
        });
        it('computes the correct hash with parameters', () => {
            const chainId = 1337;
            const verifyingContract = '0xfe20c9f78898cf8a3e7c5c2ed36568a3d2ad02b9';
            const actual = eip712_utils_1.getExchangeProxyEIP712Hash(structHash, chainId, verifyingContract);
            const expected = '0xc051b4f9f305b095768427eb29d9461c473d2e96aa30a5914a7081feae979d1d';
            chai_1.expect(actual).to.eq(expected);
        });
    });
});
//# sourceMappingURL=eip712_utils_test.js.map