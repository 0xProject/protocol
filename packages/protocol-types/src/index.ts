// tslint:disable:max-file-line-count

import { EIP712DomainWithDefaultSchema } from '@0x/types';
import { BigNumber } from 'bignumber.js';

/**
 * Represents a permissive number type.
 */
export type Numberish = BigNumber | string | number;

/**
 * Exchange Proxy meta transaction struct.
 */
export interface ExchangeProxyMetaTransaction {
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
    domain: EIP712DomainWithDefaultSchema;
}

/**
 * Signature types supported by the Exchange proxy.
 */
export enum SignatureType {
    Illegal,
    Invalid,
    EIP712,
    EthSign,
    NSignatureTypes,
}

// Export V3 types
export * from './v3';
