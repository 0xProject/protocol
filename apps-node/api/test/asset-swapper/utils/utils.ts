import { getRandomInteger } from '@0x/contracts-test-utils';
import { Signature, SignatureType } from '@0x/protocol-utils';
import { BigNumber, generatePseudoRandom256BitNumber, hexUtils, Numberish } from '@0x/utils';

export function generatePseudoRandomSalt(): BigNumber {
    const salt = generatePseudoRandom256BitNumber();
    return salt;
}

export function getRandomAmount(maxAmount: Numberish = '1e18'): BigNumber {
    return getRandomInteger(1, maxAmount);
}

export function getRandomSignature(): Signature {
    return {
        v: 1,
        r: hexUtils.random(32),
        s: hexUtils.random(32),
        signatureType: SignatureType.Invalid,
    };
}
