import { BigNumber } from '@0x/asset-swapper';
import { OtcOrderFields, Signature } from '@0x/protocol-utils';

import { EIP712Context, EIP712DataField, EIP712Domain } from '../types';

export interface StringSignatureFields {
    signatureType: string;
    v: string;
    r: string;
    s: string;
}

export type RawOtcOrderFields = Record<keyof Omit<OtcOrderFields, 'chainId'>, string> & { chainId: any };

export interface RawEIP712ContextFields {
    types: Record<string, Record<keyof EIP712DataField, string>[]>;
    primaryType: string;
    domain: Record<keyof EIP712Domain, string>;
    message: Record<string, any>;
}

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

/**
 * convert a JSON EIP712Context into an EIP712Context
 */
export function stringsToEIP712Context(strings: RawEIP712ContextFields): EIP712Context {
    return {
        types: strings.types,
        primaryType: strings.primaryType,
        domain: {
            ...strings.domain,
            chainId: Number(strings.domain.chainId),
        },
        message: strings.message,
    };
}
