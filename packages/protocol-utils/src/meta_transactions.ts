import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { SupportedProvider } from '@0x/subproviders';
import { EIP712TypedData } from '@0x/types';
import { BigNumber, hexUtils, NULL_ADDRESS } from '@0x/utils';

import { ZERO } from './constants';
import {
    createExchangeProxyEIP712Domain,
    EIP712_DOMAIN_PARAMETERS,
    getExchangeProxyEIP712Hash,
    getTypeHash,
} from './eip712_utils';
import {
    eip712SignTypedDataWithKey,
    eip712SignTypedDataWithProviderAsync,
    ethSignHashWithKey,
    ethSignHashWithProviderAsync,
    Signature,
    SignatureType,
} from './signature_utils';

const MTX_DEFAULT_VALUES = {
    signer: NULL_ADDRESS,
    sender: NULL_ADDRESS,
    minGasPrice: ZERO,
    maxGasPrice: ZERO,
    expirationTimeSeconds: ZERO,
    salt: ZERO,
    callData: hexUtils.leftPad(0),
    value: ZERO,
    feeToken: NULL_ADDRESS,
    feeAmount: ZERO,
    chainId: 1,
    verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
};

export type MetaTransactionFields = typeof MTX_DEFAULT_VALUES;

export class MetaTransaction {
    public static readonly STRUCT_NAME = 'MetaTransactionData';
    public static readonly STRUCT_ABI = [
        { type: 'address', name: 'signer' },
        { type: 'address', name: 'sender' },
        { type: 'uint256', name: 'minGasPrice' },
        { type: 'uint256', name: 'maxGasPrice' },
        { type: 'uint256', name: 'expirationTimeSeconds' },
        { type: 'uint256', name: 'salt' },
        { type: 'bytes', name: 'callData' },
        { type: 'uint256', name: 'value' },
        { type: 'address', name: 'feeToken' },
        { type: 'uint256', name: 'feeAmount' },
    ];
    public static readonly TYPE_HASH = getTypeHash(MetaTransaction.STRUCT_NAME, MetaTransaction.STRUCT_ABI);

    public signer: string;
    public sender: string;
    public minGasPrice: BigNumber;
    public maxGasPrice: BigNumber;
    public expirationTimeSeconds: BigNumber;
    public salt: BigNumber;
    public callData: string;
    public value: BigNumber;
    public feeToken: string;
    public feeAmount: BigNumber;
    public chainId: number;
    public verifyingContract: string;

    public constructor(fields: Partial<MetaTransactionFields> = {}) {
        const _fields = { ...MTX_DEFAULT_VALUES, ...fields };
        this.signer = _fields.signer;
        this.sender = _fields.sender;
        this.minGasPrice = _fields.minGasPrice;
        this.maxGasPrice = _fields.maxGasPrice;
        this.expirationTimeSeconds = _fields.expirationTimeSeconds;
        this.salt = _fields.salt;
        this.callData = _fields.callData;
        this.value = _fields.value;
        this.feeToken = _fields.feeToken;
        this.feeAmount = _fields.feeAmount;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }

    public clone(fields: Partial<MetaTransactionFields> = {}): MetaTransaction {
        return new MetaTransaction({
            signer: this.signer,
            sender: this.sender,
            minGasPrice: this.minGasPrice,
            maxGasPrice: this.maxGasPrice,
            expirationTimeSeconds: this.expirationTimeSeconds,
            salt: this.salt,
            callData: this.callData,
            value: this.value,
            feeToken: this.feeToken,
            feeAmount: this.feeAmount,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(MetaTransaction.TYPE_HASH),
                hexUtils.leftPad(this.signer),
                hexUtils.leftPad(this.sender),
                hexUtils.leftPad(this.minGasPrice),
                hexUtils.leftPad(this.maxGasPrice),
                hexUtils.leftPad(this.expirationTimeSeconds),
                hexUtils.leftPad(this.salt),
                hexUtils.hash(this.callData),
                hexUtils.leftPad(this.value),
                hexUtils.leftPad(this.feeToken),
                hexUtils.leftPad(this.feeAmount),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [MetaTransaction.STRUCT_NAME]: MetaTransaction.STRUCT_ABI,
            },
            domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: MetaTransaction.STRUCT_NAME,
            message: {
                signer: this.signer,
                sender: this.sender,
                minGasPrice: this.minGasPrice.toString(10),
                maxGasPrice: this.maxGasPrice.toString(10),
                expirationTimeSeconds: this.expirationTimeSeconds.toString(10),
                salt: this.salt.toString(10),
                callData: this.callData,
                value: this.value.toString(10),
                feeToken: this.feeToken,
                feeAmount: this.feeAmount.toString(10),
            },
        };
    }

    public getHash(): string {
        return getExchangeProxyEIP712Hash(this.getStructHash(), this.chainId, this.verifyingContract);
    }

    public async getSignatureWithProviderAsync(
        provider: SupportedProvider,
        type: SignatureType = SignatureType.EthSign,
    ): Promise<Signature> {
        switch (type) {
            case SignatureType.EIP712:
                return eip712SignTypedDataWithProviderAsync(this.getEIP712TypedData(), this.signer, provider);
            case SignatureType.EthSign:
                return ethSignHashWithProviderAsync(this.getHash(), this.signer, provider);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }

    public getSignatureWithKey(key: string, type: SignatureType = SignatureType.EthSign): Signature {
        switch (type) {
            case SignatureType.EIP712:
                return eip712SignTypedDataWithKey(this.getEIP712TypedData(), key);
            case SignatureType.EthSign:
                return ethSignHashWithKey(this.getHash(), key);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }
}
