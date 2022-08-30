import { getRandomInteger } from '@0x/contracts-test-utils';
import { Signature, SignatureType } from '@0x/protocol-utils';
import { BigNumber, generatePseudoRandom256BitNumber, hexUtils, Numberish } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

const TOKEN_DECIMALS = 18;

export const baseUnitAmount = (unitAmount: number, decimals = TOKEN_DECIMALS): BigNumber => {
    return Web3Wrapper.toBaseUnitAmount(new BigNumber(unitAmount), decimals);
};

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
