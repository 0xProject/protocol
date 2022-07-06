import { SupportedProvider } from '@0x/subproviders';
import { EIP712TypedData } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Signature, SignatureType } from './signature_utils';
declare const MTX_DEFAULT_VALUES: {
    signer: string;
    sender: string;
    minGasPrice: BigNumber;
    maxGasPrice: BigNumber;
    expirationTimeSeconds: BigNumber;
    salt: BigNumber;
    callData: string;
    value: BigNumber;
    feeToken: string;
    feeAmount: BigNumber;
    chainId: number;
    verifyingContract: string;
};
export declare type MetaTransactionFields = typeof MTX_DEFAULT_VALUES;
export declare class MetaTransaction {
    static readonly STRUCT_NAME = "MetaTransactionData";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    signer: string;
    sender: string;
    minGasPrice: BigNumber;
    maxGasPrice: BigNumber;
    expirationTimeSeconds: BigNumber;
    salt: BigNumber;
    callData: string;
    value: BigNumber;
    feeToken: string;
    feeAmount: BigNumber;
    chainId: number;
    verifyingContract: string;
    constructor(fields?: Partial<MetaTransactionFields>);
    clone(fields?: Partial<MetaTransactionFields>): MetaTransaction;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
    getHash(): string;
    getSignatureWithProviderAsync(provider: SupportedProvider, type?: SignatureType): Promise<Signature>;
    getSignatureWithKey(key: string, type?: SignatureType): Signature;
}
export {};
//# sourceMappingURL=meta_transactions.d.ts.map