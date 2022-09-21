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

// tslint:disable:enum-naming
export enum TradeDirection {
    SellNFT = 0,
    BuyNFT = 1,
}
// tslint:enable:enum-naming

export enum OrderStatus {
    Invalid = 0,
    Fillable = 1,
    Unfillable = 2,
    Expired = 3,
}

interface Fee {
    recipient: string;
    amount: BigNumber;
    feeData: string;
}

interface Property {
    propertyValidator: string;
    propertyData: string;
}

const NFT_ORDER_DEFAULT_VALUES = {
    direction: TradeDirection.SellNFT,
    maker: NULL_ADDRESS,
    taker: NULL_ADDRESS,
    expiry: ZERO,
    nonce: ZERO,
    erc20Token: NULL_ADDRESS,
    erc20TokenAmount: ZERO,
    fees: [] as Fee[],
    chainId: 1,
    verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
};

const ERC721_ORDER_DEFAULT_VALUES = {
    direction: TradeDirection.SellNFT,
    maker: NULL_ADDRESS,
    taker: NULL_ADDRESS,
    expiry: ZERO,
    nonce: ZERO,
    erc20Token: NULL_ADDRESS,
    erc20TokenAmount: ZERO,
    fees: [] as Fee[],
    erc721Token: NULL_ADDRESS,
    erc721TokenId: ZERO,
    erc721TokenProperties: [] as Property[],
    chainId: 1,
    verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
};

const ERC1155_ORDER_DEFAULT_VALUES = {
    direction: TradeDirection.SellNFT,
    maker: NULL_ADDRESS,
    taker: NULL_ADDRESS,
    expiry: ZERO,
    nonce: ZERO,
    erc20Token: NULL_ADDRESS,
    erc20TokenAmount: ZERO,
    fees: [] as Fee[],
    erc1155Token: NULL_ADDRESS,
    erc1155TokenId: ZERO,
    erc1155TokenProperties: [] as Property[],
    erc1155TokenAmount: ZERO,
    chainId: 1,
    verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
};

type CommonNFTOrderFields = typeof NFT_ORDER_DEFAULT_VALUES;
type ERC721OrderFields = typeof ERC721_ORDER_DEFAULT_VALUES;
type ERC1155OrderFields = typeof ERC1155_ORDER_DEFAULT_VALUES;

export abstract class NFTOrder {
    public static readonly FEE_ABI = [
        { type: 'address', name: 'recipient' },
        { type: 'uint256', name: 'amount' },
        { type: 'bytes', name: 'feeData' },
    ];
    public static readonly PROPERTY_ABI = [
        { type: 'address', name: 'propertyValidator' },
        { type: 'bytes', name: 'propertyData' },
    ];
    public static readonly FEE_TYPE_HASH = getTypeHash('Fee', NFTOrder.FEE_ABI);
    public static readonly PROPERTY_TYPE_HASH = getTypeHash('Property', NFTOrder.PROPERTY_ABI);

    public direction: TradeDirection;
    public maker: string;
    public taker: string;
    public expiry: BigNumber;
    public nonce: BigNumber;
    public erc20Token: string;
    public erc20TokenAmount: BigNumber;
    public fees: Fee[];
    public chainId: number;
    public verifyingContract: string;

    protected constructor(fields: Partial<CommonNFTOrderFields> = {}) {
        const _fields = { ...NFT_ORDER_DEFAULT_VALUES, ...fields };
        this.direction = _fields.direction;
        this.maker = _fields.maker;
        this.taker = _fields.taker;
        this.expiry = _fields.expiry;
        this.nonce = _fields.nonce;
        this.erc20Token = _fields.erc20Token;
        this.erc20TokenAmount = _fields.erc20TokenAmount;
        this.fees = _fields.fees;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }

    public abstract getStructHash(): string;
    public abstract getEIP712TypedData(): EIP712TypedData;
    protected abstract _getProperties(): Property[];

    public willExpire(secondsFromNow = 0): boolean {
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

    protected _getPropertiesHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                ...this._getProperties().map(property =>
                    hexUtils.hash(
                        hexUtils.concat(
                            hexUtils.leftPad(NFTOrder.PROPERTY_TYPE_HASH),
                            hexUtils.leftPad(property.propertyValidator),
                            hexUtils.hash(property.propertyData),
                        ),
                    ),
                ),
            ),
        );
    }

    protected _getFeesHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                ...this.fees.map(fee =>
                    hexUtils.hash(
                        hexUtils.concat(
                            hexUtils.leftPad(NFTOrder.FEE_TYPE_HASH),
                            hexUtils.leftPad(fee.recipient),
                            hexUtils.leftPad(fee.amount),
                            hexUtils.hash(fee.feeData),
                        ),
                    ),
                ),
            ),
        );
    }
}

export class ERC721Order extends NFTOrder {
    public static readonly STRUCT_NAME = 'ERC721Order';
    public static readonly STRUCT_ABI = [
        { type: 'uint8', name: 'direction' },
        { type: 'address', name: 'maker' },
        { type: 'address', name: 'taker' },
        { type: 'uint256', name: 'expiry' },
        { type: 'uint256', name: 'nonce' },
        { type: 'address', name: 'erc20Token' },
        { type: 'uint256', name: 'erc20TokenAmount' },
        { type: 'Fee[]', name: 'fees' },
        { type: 'address', name: 'erc721Token' },
        { type: 'uint256', name: 'erc721TokenId' },
        { type: 'Property[]', name: 'erc721TokenProperties' },
    ];

    public static readonly TYPE_HASH = getTypeHash(ERC721Order.STRUCT_NAME, ERC721Order.STRUCT_ABI, {
        ['Fee']: NFTOrder.FEE_ABI,
        ['Property']: NFTOrder.PROPERTY_ABI,
    });

    public erc721Token: string;
    public erc721TokenId: BigNumber;
    public erc721TokenProperties: Property[];

    constructor(fields: Partial<ERC721OrderFields> = {}) {
        const _fields = { ...ERC721_ORDER_DEFAULT_VALUES, ...fields };
        super(_fields);
        this.erc721Token = _fields.erc721Token;
        this.erc721TokenId = _fields.erc721TokenId;
        this.erc721TokenProperties = _fields.erc721TokenProperties;
    }

    public clone(fields: Partial<ERC721OrderFields> = {}): ERC721Order {
        return new ERC721Order({
            direction: this.direction,
            maker: this.maker,
            taker: this.taker,
            expiry: this.expiry,
            nonce: this.nonce,
            erc20Token: this.erc20Token,
            erc20TokenAmount: this.erc20TokenAmount,
            fees: this.fees,
            erc721Token: this.erc721Token,
            erc721TokenId: this.erc721TokenId,
            erc721TokenProperties: this.erc721TokenProperties,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(ERC721Order.TYPE_HASH),
                hexUtils.leftPad(this.direction),
                hexUtils.leftPad(this.maker),
                hexUtils.leftPad(this.taker),
                hexUtils.leftPad(this.expiry),
                hexUtils.leftPad(this.nonce),
                hexUtils.leftPad(this.erc20Token),
                hexUtils.leftPad(this.erc20TokenAmount),
                this._getFeesHash(),
                hexUtils.leftPad(this.erc721Token),
                hexUtils.leftPad(this.erc721TokenId),
                this._getPropertiesHash(),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [ERC721Order.STRUCT_NAME]: ERC721Order.STRUCT_ABI,
                ['Fee']: NFTOrder.FEE_ABI,
                ['Property']: NFTOrder.PROPERTY_ABI,
            },
            domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: ERC721Order.STRUCT_NAME,
            message: {
                direction: this.direction,
                maker: this.maker,
                taker: this.taker,
                expiry: this.expiry.toString(10),
                nonce: this.nonce.toString(10),
                erc20Token: this.erc20Token,
                erc20TokenAmount: this.erc20TokenAmount.toString(10),
                fees: this.fees.map(fee => ({
                    recipient: fee.recipient,
                    amount: fee.amount.toString(10),
                    feeData: fee.feeData,
                })) as any,
                erc721Token: this.erc721Token,
                erc721TokenId: this.erc721TokenId.toString(10),
                erc721TokenProperties: this.erc721TokenProperties as any,
            },
        };
    }

    protected _getProperties(): Property[] {
        return this.erc721TokenProperties;
    }
}

export class ERC1155Order extends NFTOrder {
    public static readonly STRUCT_NAME = 'ERC1155Order';
    public static readonly STRUCT_ABI = [
        { type: 'uint8', name: 'direction' },
        { type: 'address', name: 'maker' },
        { type: 'address', name: 'taker' },
        { type: 'uint256', name: 'expiry' },
        { type: 'uint256', name: 'nonce' },
        { type: 'address', name: 'erc20Token' },
        { type: 'uint256', name: 'erc20TokenAmount' },
        { type: 'Fee[]', name: 'fees' },
        { type: 'address', name: 'erc1155Token' },
        { type: 'uint256', name: 'erc1155TokenId' },
        { type: 'Property[]', name: 'erc1155TokenProperties' },
        { type: 'uint128', name: 'erc1155TokenAmount' },
    ];

    public static readonly TYPE_HASH = getTypeHash(ERC1155Order.STRUCT_NAME, ERC1155Order.STRUCT_ABI, {
        ['Fee']: NFTOrder.FEE_ABI,
        ['Property']: NFTOrder.PROPERTY_ABI,
    });

    public erc1155Token: string;
    public erc1155TokenId: BigNumber;
    public erc1155TokenProperties: Property[];
    public erc1155TokenAmount: BigNumber;

    constructor(fields: Partial<ERC1155OrderFields> = {}) {
        const _fields = { ...ERC1155_ORDER_DEFAULT_VALUES, ...fields };
        super(_fields);
        this.erc1155Token = _fields.erc1155Token;
        this.erc1155TokenId = _fields.erc1155TokenId;
        this.erc1155TokenProperties = _fields.erc1155TokenProperties;
        this.erc1155TokenAmount = _fields.erc1155TokenAmount;
    }

    public clone(fields: Partial<ERC1155OrderFields> = {}): ERC1155Order {
        return new ERC1155Order({
            direction: this.direction,
            maker: this.maker,
            taker: this.taker,
            expiry: this.expiry,
            nonce: this.nonce,
            erc20Token: this.erc20Token,
            erc20TokenAmount: this.erc20TokenAmount,
            fees: this.fees,
            erc1155Token: this.erc1155Token,
            erc1155TokenId: this.erc1155TokenId,
            erc1155TokenProperties: this.erc1155TokenProperties,
            erc1155TokenAmount: this.erc1155TokenAmount,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(ERC1155Order.TYPE_HASH),
                hexUtils.leftPad(this.direction),
                hexUtils.leftPad(this.maker),
                hexUtils.leftPad(this.taker),
                hexUtils.leftPad(this.expiry),
                hexUtils.leftPad(this.nonce),
                hexUtils.leftPad(this.erc20Token),
                hexUtils.leftPad(this.erc20TokenAmount),
                this._getFeesHash(),
                hexUtils.leftPad(this.erc1155Token),
                hexUtils.leftPad(this.erc1155TokenId),
                this._getPropertiesHash(),
                hexUtils.leftPad(this.erc1155TokenAmount),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [ERC1155Order.STRUCT_NAME]: ERC1155Order.STRUCT_ABI,
                ['Fee']: NFTOrder.FEE_ABI,
                ['Property']: NFTOrder.PROPERTY_ABI,
            },
            domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: ERC1155Order.STRUCT_NAME,
            message: {
                direction: this.direction,
                maker: this.maker,
                taker: this.taker,
                expiry: this.expiry.toString(10),
                nonce: this.nonce.toString(10),
                erc20Token: this.erc20Token,
                erc20TokenAmount: this.erc20TokenAmount.toString(10),
                fees: this.fees.map(fee => ({
                    recipient: fee.recipient,
                    amount: fee.amount.toString(10),
                    feeData: fee.feeData,
                })) as any,
                erc1155Token: this.erc1155Token,
                erc1155TokenId: this.erc1155TokenId.toString(10),
                erc1155TokenProperties: this.erc1155TokenProperties as any,
                erc1155TokenAmount: this.erc1155TokenAmount.toString(10),
            },
        };
    }

    protected _getProperties(): Property[] {
        return this.erc1155TokenProperties;
    }
}
