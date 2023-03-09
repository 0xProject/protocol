import { MetaTransactionFields, OtcOrderFields, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { Eip712DataField, Eip712Domain, ExecuteMetaTransactionEip712Context, PermitEip712Context } from '../core/types';

export interface StringSignatureFields {
    signatureType: string;
    v: string;
    r: string;
    s: string;
}

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawOtcOrderFields = Record<keyof Omit<OtcOrderFields, 'chainId'>, string> & { chainId: any };
// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawMetaTransactionFields = Record<keyof Omit<MetaTransactionFields, 'chainId'>, string> & { chainId: any };
export interface RawEIP712ContextFields {
    types: Record<string, Record<keyof Eip712DataField, string>[]>;
    primaryType: string;
    domain: Record<keyof Eip712Domain, string>;
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Converts the request payload for a gasless swap metatransaction into
 * the appropriate types
 */
export function stringsToMetaTransactionFields(strings: RawMetaTransactionFields): MetaTransactionFields {
    return {
        callData: strings.callData,
        chainId: Number(strings.chainId),
        expirationTimeSeconds: new BigNumber(strings.expirationTimeSeconds),
        feeAmount: new BigNumber(strings.feeAmount),
        feeToken: strings.feeToken,
        maxGasPrice: new BigNumber(strings.maxGasPrice),
        minGasPrice: new BigNumber(strings.minGasPrice),
        salt: new BigNumber(strings.salt),
        sender: strings.sender,
        signer: strings.signer,
        value: new BigNumber(strings.value),
        verifyingContract: strings.verifyingContract,
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

// Internal function for handling the domain
function _stringsToEIP712Domain(strings: RawEIP712ContextFields['domain']): Eip712Domain {
    const res: Eip712Domain = {
        ...strings,
        chainId: Number(strings.chainId),
    };

    // remove chainId if its NaN
    if (Number.isNaN(res.chainId)) {
        delete res.chainId;
    }

    return res;
}

/**
 * convert a JSON EIP712Context into an EIP712Context
 */
export function stringsToEIP712Context(
    strings: RawEIP712ContextFields,
): ExecuteMetaTransactionEip712Context | PermitEip712Context {
    return {
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        types: strings.types as any,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        primaryType: strings.primaryType as any,
        domain: _stringsToEIP712Domain(strings.domain),
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: strings.message as any,
    };
}
