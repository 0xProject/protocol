import { SupportedProvider } from '@0x/subproviders';
import { EIP712TypedData } from '@0x/types';
/**
 * Valid signature types on the Exchange Proxy.
 */
export declare enum SignatureType {
    Illegal = 0,
    Invalid = 1,
    EIP712 = 2,
    EthSign = 3
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
 * ABI definition for the `Signature` struct.
 */
export declare const SIGNATURE_ABI: {
    name: string;
    type: string;
}[];
/**
 * Sign a hash with the EthSign signature type on a provider.
 */
export declare function ethSignHashWithProviderAsync(hash: string, signer: string, provider: SupportedProvider): Promise<Signature>;
/**
 * Sign a hash with the EthSign signature type, given a private key.
 */
export declare function ethSignHashWithKey(hash: string, key: string): Signature;
/**
 * Sign a typed data object with the EIP712 signature type on a provider.
 */
export declare function eip712SignTypedDataWithProviderAsync(data: EIP712TypedData, signer: string, provider: SupportedProvider): Promise<Signature>;
/**
 * Sign a typed data object with the EIP712 signature type, given a private key.
 */
export declare function eip712SignTypedDataWithKey(typedData: EIP712TypedData, key: string): Signature;
/**
 * Sign an EIP712 hash with the EIP712 signature type, given a private key.
 */
export declare function eip712SignHashWithKey(hash: string, key: string): Signature;
/**
 * Generate the EC signature for a hash given a private key.
 */
export declare function ecSignHashWithKey(hash: string, key: string): ECSignature;
//# sourceMappingURL=signature_utils.d.ts.map