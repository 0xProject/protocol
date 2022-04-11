import { BigNumber } from '@0x/asset-swapper';
import { OtcOrderFields, Signature } from '@0x/protocol-utils';

export interface StringSignatureFields {
    signatureType: string;
    v: string;
    r: string;
    s: string;
}

export type RawOtcOrderFields = Record<keyof Omit<OtcOrderFields, 'chainId'>, string> & { chainId: any };

/**
 * convert a Signature response into the data types expected by protocol-utils
 */
export function stringsToSignature(strings: StringSignatureFields): Signature {
    return {
        signatureType: Number(strings.signatureType),
        v: Number(strings.v),
        r: strings.r,
        s: strings.s,
    };
}

/**
 * convert a JSON OtcOrder into an OtcOrder
 */
export function stringsToOtcOrderFields(strings: RawOtcOrderFields): OtcOrderFields {
    return {
        maker: strings.maker,
        taker: strings.taker,
        makerAmount: new BigNumber(strings.makerAmount),
        takerAmount: new BigNumber(strings.takerAmount),
        makerToken: strings.makerToken,
        takerToken: strings.takerToken,
        txOrigin: strings.txOrigin,
        expiryAndNonce: new BigNumber(strings.expiryAndNonce),
        chainId: Number(strings.chainId),
        verifyingContract: strings.verifyingContract,
    };
}
