import { BigNumber } from '@0x/asset-swapper';
import { MetaTransactionFields, Signature } from '@0x/protocol-utils';

export interface StringMetaTransactionFields {
    signer: string;
    sender: string;
    minGasPrice: string;
    maxGasPrice: string;
    expirationTimeSeconds: string;
    salt: string;
    callData: string;
    value: string;
    feeToken: string;
    feeAmount: string;
    chainId: string;
    verifyingContract: string;
}

export interface StringSignatureFields {
    signatureType: string;
    v: string;
    r: string;
    s: string;
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
 * convert a metaTransaction response into a the fields expected when instantiating
 * a metaTransaction object
 */
export function stringsToMetaTransactionFields(strings: StringMetaTransactionFields): MetaTransactionFields {
    return {
        signer: strings.signer,
        sender: strings.sender,
        minGasPrice: new BigNumber(strings.minGasPrice),
        maxGasPrice: new BigNumber(strings.maxGasPrice),
        expirationTimeSeconds: new BigNumber(strings.expirationTimeSeconds),
        salt: new BigNumber(strings.salt),
        callData: strings.callData,
        value: new BigNumber(strings.value),
        feeToken: strings.feeToken,
        feeAmount: new BigNumber(strings.feeAmount),
        chainId: Number(strings.chainId),
        verifyingContract: strings.verifyingContract,
    };
}
