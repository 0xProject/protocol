import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { EIP712TypedData } from '@0x/types';
import { BigNumber, hexUtils, NULL_ADDRESS } from '@0x/utils';
import { ZERO } from './constants';
import {
    createExchangeProxyEIP712Domain,
    EIP712_DOMAIN_PARAMETERS,
    getExchangeProxyEIP712Hash,
    getTypeHash,
} from './eip712_utils';

export interface MetaTransactionV2Fee {
    recipient: string,
    amount: BigNumber,
}

const MTX_DEFAULT_VALUES = {
    signer: NULL_ADDRESS,
    sender: NULL_ADDRESS,
    expirationTimeSeconds: ZERO,
    salt: ZERO,
    callData: hexUtils.leftPad(0),
    feeToken: NULL_ADDRESS,
    fees: [] as MetaTransactionV2Fee[],
    chainId: 1,
    verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
};

export type MetaTransactionV2Fields = typeof MTX_DEFAULT_VALUES;

export class MetaTransactionV2 {
	public static readonly FEE_STRUCT_NAME = 'MetaTransactionFeeData';
    public static readonly FEE_STRUCT_ABI = [
        { type: 'address', name: 'recipient' },
        { type: 'uint256', name: 'amount' },
    ];
    public static readonly FEE_TYPE_HASH = getTypeHash(MetaTransactionV2.FEE_STRUCT_NAME, MetaTransactionV2.FEE_STRUCT_ABI);

    public static readonly MTX_STRUCT_NAME = 'MetaTransactionDataV2';
    public static readonly MTX_STRUCT_ABI = [
        { type: 'address', name: 'signer' },
        { type: 'address', name: 'sender' },
        { type: 'uint256', name: 'expirationTimeSeconds' },
        { type: 'uint256', name: 'salt' },
        { type: 'bytes', name: 'callData' },
        { type: 'address', name: 'feeToken' },
        { type: `${MetaTransactionV2.FEE_STRUCT_NAME}[]`, name: 'fees' },
    ];
    public static readonly MTX_TYPE_HASH = getTypeHash(
        MetaTransactionV2.MTX_STRUCT_NAME,
        MetaTransactionV2.MTX_STRUCT_ABI,
        { [MetaTransactionV2.FEE_STRUCT_NAME]: MetaTransactionV2.FEE_STRUCT_ABI }
    );

    public signer: string;
    public sender: string;
    public expirationTimeSeconds: BigNumber;
    public salt: BigNumber;
    public callData: string;
    public feeToken: string;
    public fees: MetaTransactionV2Fee[];
    public chainId: number;
    public verifyingContract: string;

    public constructor(fields: Partial<MetaTransactionV2Fields> = {}) {
        const _fields = { ...MTX_DEFAULT_VALUES, ...fields };
        this.signer = _fields.signer;
        this.sender = _fields.sender;
        this.expirationTimeSeconds = _fields.expirationTimeSeconds;
        this.salt = _fields.salt;
        this.callData = _fields.callData;
        this.feeToken = _fields.feeToken;
        this.fees = _fields.fees;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }

    public clone(fields: Partial<MetaTransactionV2Fields> = {}): MetaTransactionV2 {
        return new MetaTransactionV2({
            signer: this.signer,
            sender: this.sender,
            expirationTimeSeconds: this.expirationTimeSeconds,
            salt: this.salt,
            callData: this.callData,
            feeToken: this.feeToken,
            fees: this.fees,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        const feesHash = hexUtils.hash(hexUtils.concat(
            ...this.fees.map((fee) => hexUtils.hash(hexUtils.concat(
                hexUtils.leftPad(MetaTransactionV2.FEE_TYPE_HASH),
                hexUtils.leftPad(fee.recipient),
                hexUtils.leftPad(fee.amount),
            )))
        ));

        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(MetaTransactionV2.MTX_TYPE_HASH),
                hexUtils.leftPad(this.signer),
                hexUtils.leftPad(this.sender),
                hexUtils.leftPad(this.expirationTimeSeconds),
                hexUtils.leftPad(this.salt),
                hexUtils.hash(this.callData),
                hexUtils.leftPad(this.feeToken),
                hexUtils.leftPad(feesHash),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [MetaTransactionV2.MTX_STRUCT_NAME]: MetaTransactionV2.MTX_STRUCT_ABI,
                [MetaTransactionV2.FEE_STRUCT_NAME]: MetaTransactionV2.FEE_STRUCT_ABI,
            },
            domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: MetaTransactionV2.MTX_STRUCT_NAME,
            message: {
                signer: this.signer,
                sender: this.sender,
                expirationTimeSeconds: this.expirationTimeSeconds.toString(10),
                salt: this.salt.toString(10),
                callData: this.callData,
                feeToken: this.feeToken,
                fees: this.fees.map(({recipient, amount}) => ({
                    recipient,
                    amount: amount.toString(10),
                })) as any,
            },
        };
    }

    public getHash(): string {
        return getExchangeProxyEIP712Hash(this.getStructHash(), this.chainId, this.verifyingContract);
    }
}
