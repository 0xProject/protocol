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
    eip712SignHashWithKey,
    eip712SignTypedDataWithProviderAsync,
    ethSignHashWithKey,
    ethSignHashWithProviderAsync,
    Signature,
    SignatureType,
} from './signature_utils';

export class ERC721Order {
    public static readonly STRUCT_NAME = 'ERC721Order';
    public static readonly STRUCT_ABI = [
        { type: 'uint8', name: 'direction' },
        { type: 'address', name: 'erc20Token' },
        { type: 'uint256', name: 'erc20TokenAmount' },
        { type: 'address', name: 'erc721Token' },
        { type: 'uint256', name: 'erc721TokenId' },
        { type: 'Property[]', name: 'erc721TokenProperties' },
        { type: 'Fee[]', name: 'fees' },
        { type: 'address', name: 'maker' },
        { type: 'address', name: 'taker' },
        { type: 'uint256', name: 'expiry' },
        { type: 'uint256', name: 'nonce' },
    ];
    public static readonly REFERENCED_STRUCT_ABIS = {
        ['Fee']: [
            { type: 'address', name: 'recipient' },
            { type: 'uint256', name: 'amount' },
            { type: 'bytes', name: 'feeData' },
        ],
        ['Property']: [
            { type: 'address', name: 'propertyValidator' },
            { type: 'bytes', name: 'propertyData' },
        ],
    };

    public static readonly TYPE_HASH = getTypeHash(
        ERC721Order.STRUCT_NAME,
        ERC721Order.STRUCT_ABI,
        ERC721Order.REFERENCED_STRUCT_ABIS,
    );
    public static readonly FEE_TYPE_HASH = getTypeHash('Fee', ERC721Order.REFERENCED_STRUCT_ABIS.Fee);
    public static readonly PROPERTY_TYPE_HASH = getTypeHash('Property', ERC721Order.REFERENCED_STRUCT_ABIS.Property);

    public direction: ERC721Order.TradeDirection;
    public erc20Token: string;
    public erc20TokenAmount: BigNumber;
    public erc721Token: string;
    public erc721TokenId: BigNumber;
    public erc721TokenProperties: ERC721Order.Property[];
    public fees: ERC721Order.Fee[];
    public maker: string;
    public taker: string;
    public expiry: BigNumber;
    public nonce: BigNumber;
    public chainId: number;
    public verifyingContract: string;

    constructor(fields: Partial<ERC721OrderFields> = {}) {
        const _fields = { ...ERC721_ORDER_DEFAULT_VALUES, ...fields };
        this.direction = _fields.direction;
        this.erc20Token = _fields.erc20Token;
        this.erc20TokenAmount = _fields.erc20TokenAmount;
        this.erc721Token = _fields.erc721Token;
        this.erc721TokenId = _fields.erc721TokenId;
        this.erc721TokenProperties = _fields.erc721TokenProperties;
        this.fees = _fields.fees;
        this.maker = _fields.maker;
        this.taker = _fields.taker;
        this.expiry = _fields.expiry;
        this.nonce = _fields.nonce;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }

    public clone(fields: Partial<ERC721OrderFields> = {}): ERC721Order {
        return new ERC721Order({
            direction: this.direction,
            erc20Token: this.erc20Token,
            erc20TokenAmount: this.erc20TokenAmount,
            erc721Token: this.erc721Token,
            erc721TokenId: this.erc721TokenId,
            erc721TokenProperties: this.erc721TokenProperties,
            fees: this.fees,
            maker: this.maker,
            taker: this.taker,
            expiry: this.expiry,
            nonce: this.nonce,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        const propertiesHash = hexUtils.hash(
            hexUtils.concat(
                ...this.erc721TokenProperties.map(property =>
                    hexUtils.hash(
                        hexUtils.concat(
                            hexUtils.leftPad(ERC721Order.PROPERTY_TYPE_HASH),
                            hexUtils.leftPad(property.propertyValidator),
                            hexUtils.hash(property.propertyData),
                        ),
                    ),
                ),
            ),
        );
        const feesHash = hexUtils.hash(
            hexUtils.concat(
                ...this.fees.map(fee =>
                    hexUtils.hash(
                        hexUtils.concat(
                            hexUtils.leftPad(ERC721Order.FEE_TYPE_HASH),
                            hexUtils.leftPad(fee.recipient),
                            hexUtils.leftPad(fee.amount),
                            hexUtils.hash(fee.feeData),
                        ),
                    ),
                ),
            ),
        );
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(ERC721Order.TYPE_HASH),
                hexUtils.leftPad(this.direction),
                hexUtils.leftPad(this.erc20Token),
                hexUtils.leftPad(this.erc20TokenAmount),
                hexUtils.leftPad(this.erc721Token),
                hexUtils.leftPad(this.erc721TokenId),
                propertiesHash,
                feesHash,
                hexUtils.leftPad(this.maker),
                hexUtils.leftPad(this.taker),
                hexUtils.leftPad(this.expiry),
                hexUtils.leftPad(this.nonce),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [ERC721Order.STRUCT_NAME]: ERC721Order.STRUCT_ABI,
                ...ERC721Order.REFERENCED_STRUCT_ABIS,
            },
            domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: ERC721Order.STRUCT_NAME,
            message: {
                direction: this.direction,
                erc20Token: this.erc20Token,
                erc20TokenAmount: this.erc20TokenAmount.toString(10),
                erc721Token: this.erc721Token,
                erc721TokenId: this.erc721TokenId.toString(10),
                erc721TokenProperties: this.erc721TokenProperties as any,
                fees: this.fees.map(fee => ({
                    recipient: fee.recipient,
                    amount: fee.amount.toString(10),
                    feeData: fee.feeData,
                })) as any,
                maker: this.maker,
                taker: this.taker,
                expiry: this.expiry.toString(10),
                nonce: this.nonce.toString(10),
            },
        };
    }

    public willExpire(secondsFromNow: number = 0): boolean {
        const millisecondsInSecond = 1000;
        const currentUnixTimestampSec = new BigNumber(Date.now() / millisecondsInSecond).integerValue();
        return this.expiry.isLessThan(currentUnixTimestampSec.plus(secondsFromNow));
    }

    public getHash(): string {
        return getExchangeProxyEIP712Hash(this.getStructHash(), this.chainId, this.verifyingContract);
    }

    public async getSignatureWithProviderAsync(
        provider: SupportedProvider,
        type: SignatureType = SignatureType.EthSign,
        signer: string = this.maker,
    ): Promise<Signature> {
        switch (type) {
            case SignatureType.EIP712:
                return eip712SignTypedDataWithProviderAsync(this.getEIP712TypedData(), signer, provider);
            case SignatureType.EthSign:
                return ethSignHashWithProviderAsync(this.getHash(), signer, provider);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }

    public getSignatureWithKey(key: string, type: SignatureType = SignatureType.EthSign): Signature {
        switch (type) {
            case SignatureType.EIP712:
                return eip712SignHashWithKey(this.getHash(), key);
            case SignatureType.EthSign:
                return ethSignHashWithKey(this.getHash(), key);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }
}

export namespace ERC721Order {
    export interface Property {
        propertyValidator: string;
        propertyData: string;
    }

    export interface Fee {
        recipient: string;
        amount: BigNumber;
        feeData: string;
    }

    export enum TradeDirection {
        Sell721 = 0,
        Buy721 = 1,
    }

    export enum OrderStatus {
        Invalid = 0,
        Fillable = 1,
        Unfillable = 2,
        Expired = 3,
    }
}

const ERC721_ORDER_DEFAULT_VALUES = {
    direction: ERC721Order.TradeDirection.Sell721,
    erc20Token: NULL_ADDRESS,
    erc20TokenAmount: ZERO,
    erc721Token: NULL_ADDRESS,
    erc721TokenId: ZERO,
    erc721TokenProperties: [] as ERC721Order.Property[],
    fees: [] as ERC721Order.Fee[],
    maker: NULL_ADDRESS,
    taker: NULL_ADDRESS,
    expiry: ZERO,
    nonce: ZERO,
    chainId: 1,
    verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
};

export type ERC721OrderFields = typeof ERC721_ORDER_DEFAULT_VALUES;
