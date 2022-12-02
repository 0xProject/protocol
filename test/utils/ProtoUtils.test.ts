import { BigNumber } from '@0x/utils';
import { bigNumberToProto, protoToBigNumber } from '../../src/utils/ProtoUtils';

describe('ProtoUtils', () => {
    describe('bignumber utilities', () => {
        it('converts bignumber to proto and back', () => {
            const numbers = [10, -24, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 2.425335, -3.1412, 42069, NaN];
            numbers.forEach((n) => {
                const bn = new BigNumber(n);
                const proto = bigNumberToProto(bn);
                const bn2 = protoToBigNumber(proto);
                expect(bn2.toNumber()).toEqual(n);
            });
        });
    });
});
