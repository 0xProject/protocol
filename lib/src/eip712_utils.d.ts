export interface EIP712Domain {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
}
export declare type EIP712_STRUCT_ABI = Array<{
    type: string;
    name: string;
}>;
export declare const EIP712_DOMAIN_PARAMETERS: {
    name: string;
    type: string;
}[];
/**
 * Create an exchange proxy EIP712 domain.
 */
export declare function createExchangeProxyEIP712Domain(chainId?: number, verifyingContract?: string): EIP712Domain;
/**
 * Get the hash of the exchange proxy EIP712 domain.
 */
export declare function getExchangeProxyEIP712DomainHash(chainId?: number, verifyingContract?: string): string;
/**
 * Compute a complete EIP712 hash given a struct hash.
 */
export declare function getExchangeProxyEIP712Hash(structHash: string, chainId?: number, verifyingContract?: string): string;
/**
 * Compute the type hash of an EIP712 struct given its ABI.
 */
export declare function getTypeHash(structName: string, abi: EIP712_STRUCT_ABI): string;
//# sourceMappingURL=eip712_utils.d.ts.map