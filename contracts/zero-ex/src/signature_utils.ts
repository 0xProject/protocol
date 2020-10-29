import { signatureUtils } from '@0x/order-utils';
import { SupportedProvider } from '@0x/subproviders';
import { EIP712TypedData } from '@0x/types';
import { hexUtils, signTypedDataUtils } from '@0x/utils';
import * as ethjs from 'ethereumjs-util';

/**
 * Valid signature types on the Exchange Proxy.
 */
export enum SignatureType {
    Illegal = 0,
    Invalid = 1,
    EIP712 = 2,
    EthSign = 3,
}

/**
 * Represents a raw EC signature.
 */
export interface ECSignature {
    v: number;
    r: string;
    s: string;
}

/**
 * A complete signature on the Exchange Proxy.
 */
export interface Signature extends ECSignature {
    signatureType: SignatureType;
}

/**
 * Sign a hash with the EthSign signature type on a provider.
 */
export async function ethSignHashFromProviderAsync(
    signer: string,
    hash: string,
    provider: SupportedProvider,
): Promise<Signature> {
    const signatureBytes = await signatureUtils.ecSignHashAsync(provider, hash, signer);
    const parsed = parsePackedSignatureBytes(signatureBytes);
    assertSignatureType(parsed, SignatureType.EthSign);
    return parsed;
}

/**
 * Sign a hash with the EthSign signature type, given a private key.
 */
export function ethSignHashWithKey(hash: string, key: string): Signature {
    const ethHash = hexUtils.toHex(
        ethjs.sha3(hexUtils.concat(ethjs.toBuffer('\x19Ethereum Signed Message:\n32'), hash)),
    );
    return {
        ...ecSignHashWithKey(ethHash, key),
        signatureType: SignatureType.EthSign,
    };
}

/**
 * Sign a typed data object with the EIP712 signature type, given a private key.
 */
export function eip712SignTypedDataWithKey(typedData: EIP712TypedData, key: string): Signature {
    const hash = hexUtils.toHex(signTypedDataUtils.generateTypedDataHash(typedData));
    return {
        ...ecSignHashWithKey(hash, key),
        signatureType: SignatureType.EIP712,
    };
}

/**
 * Sign an EIP712 hash with the EIP712 signature type, given a private key.
 */
export function eip712SignHashWithKey(hash: string, key: string): Signature {
    return {
        ...ecSignHashWithKey(hash, key),
        signatureType: SignatureType.EIP712,
    };
}

/**
 * Generate the EC signature for a hash given a private key.
 */
export function ecSignHashWithKey(hash: string, key: string): ECSignature {
    const { v, r, s } = ethjs.ecsign(ethjs.toBuffer(hash), ethjs.toBuffer(key));
    return {
        v,
        r: ethjs.bufferToHex(r),
        s: ethjs.bufferToHex(s),
    };
}

function assertSignatureType(signature: Signature, expectedType: SignatureType): void {
    if (signature.signatureType !== expectedType) {
        throw new Error(`Expected signature type to be ${expectedType} but received ${signature.signatureType}.`);
    }
}

function parsePackedSignatureBytes(signatureBytes: string): Signature {
    if (hexUtils.size(signatureBytes) !== 66) {
        throw new Error(`Expected packed signatureBytes to be 66 bytes long: ${signatureBytes}`);
    }
    const typeId = parseInt(signatureBytes.slice(-2), 16) as SignatureType;
    if (!Object.values(SignatureType).includes(typeId)) {
        throw new Error(`Invalid signatureBytes type ID detected: ${typeId}`);
    }
    return {
        signatureType: typeId,
        v: parseInt(signatureBytes.slice(2, 4), 16),
        r: hexUtils.slice(signatureBytes, 1, 33),
        s: hexUtils.slice(signatureBytes, 33),
    };
}
