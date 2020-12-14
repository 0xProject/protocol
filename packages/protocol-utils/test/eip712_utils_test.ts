import { chaiSetup } from '@0x/dev-utils';
import { expect } from 'chai';

import { getExchangeProxyEIP712DomainHash, getExchangeProxyEIP712Hash } from '../src/eip712_utils';

chaiSetup.configure();

describe('eip712_utils', () => {
    describe('getExchangeProxyEIP712DomainHash()', () => {
        it('computes the correct default hash', () => {
            const actual = getExchangeProxyEIP712DomainHash();
            const expected = '0xc92fa40dbe33b59738624b1b4ec40b30ff52e4da223f68018a7e0667ffc0e798';
            expect(actual).to.eq(expected);
        });

        it('computes the correct hash with parameters', () => {
            const chainId = 1337;
            const verifyingContract = '0xfe20c9f78898cf8a3e7c5c2ed36568a3d2ad02b9';
            const actual = getExchangeProxyEIP712DomainHash(chainId, verifyingContract);
            const expected = '0x3f2ee54842d00d7e811297005788367c60110c261f9f94d7f4f46a17e382bdf3';
            expect(actual).to.eq(expected);
        });
    });

    describe('getExchangeProxyEIP712Hash()', () => {
        const structHash = '0x3ada2b9bef7def77259eca388e1074fd09013e2942cf9b594a9c6a1b2d215d1f';

        it('computes the correct hash', () => {
            const actual = getExchangeProxyEIP712Hash(structHash);
            const expected = '0x619a48532e5e0a633191af930dacfd5538b74078793d09e8408ab9124f7b9bf3';
            expect(actual).to.eq(expected);
        });

        it('computes the correct hash with parameters', () => {
            const chainId = 1337;
            const verifyingContract = '0xfe20c9f78898cf8a3e7c5c2ed36568a3d2ad02b9';
            const actual = getExchangeProxyEIP712Hash(structHash, chainId, verifyingContract);
            const expected = '0xc051b4f9f305b095768427eb29d9461c473d2e96aa30a5914a7081feae979d1d';
            expect(actual).to.eq(expected);
        });
    });
});
