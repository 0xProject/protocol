import { SupportedProvider } from '@0x/subproviders';
import { EIP712TypedData } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Signature, SignatureType } from './signature_utils';
export declare enum TradeDirection {
    SellNFT = 0,
    BuyNFT = 1
}
export declare enum OrderStatus {
    Invalid = 0,
    Fillable = 1,
    Unfillable = 2,
    Expired = 3
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
declare const NFT_ORDER_DEFAULT_VALUES: {
    direction: TradeDirection;
    maker: string;
    taker: string;
    expiry: BigNumber;
    nonce: BigNumber;
    erc20Token: string;
    erc20TokenAmount: BigNumber;
    fees: Fee[];
    chainId: number;
    verifyingContract: string;
};
declare const ERC721_ORDER_DEFAULT_VALUES: {
    direction: TradeDirection;
    maker: string;
    taker: string;
    expiry: BigNumber;
    nonce: BigNumber;
    erc20Token: string;
    erc20TokenAmount: BigNumber;
    fees: Fee[];
    erc721Token: string;
    erc721TokenId: BigNumber;
    erc721TokenProperties: Property[];
    chainId: number;
    verifyingContract: string;
};
declare const ERC1155_ORDER_DEFAULT_VALUES: {
    direction: TradeDirection;
    maker: string;
    taker: string;
    expiry: BigNumber;
    nonce: BigNumber;
    erc20Token: string;
    erc20TokenAmount: BigNumber;
    fees: Fee[];
    erc1155Token: string;
    erc1155TokenId: BigNumber;
    erc1155TokenProperties: Property[];
    erc1155TokenAmount: BigNumber;
    chainId: number;
    verifyingContract: string;
};
declare type CommonNFTOrderFields = typeof NFT_ORDER_DEFAULT_VALUES;
declare type ERC721OrderFields = typeof ERC721_ORDER_DEFAULT_VALUES;
declare type ERC1155OrderFields = typeof ERC1155_ORDER_DEFAULT_VALUES;
export declare abstract class NFTOrder {
    static readonly FEE_ABI: {
        type: string;
        name: string;
    }[];
    static readonly PROPERTY_ABI: {
        type: string;
        name: string;
    }[];
    static readonly FEE_TYPE_HASH: string;
    static readonly PROPERTY_TYPE_HASH: string;
    direction: TradeDirection;
    maker: string;
    taker: string;
    expiry: BigNumber;
    nonce: BigNumber;
    erc20Token: string;
    erc20TokenAmount: BigNumber;
    fees: Fee[];
    chainId: number;
    verifyingContract: string;
    protected constructor(fields?: Partial<CommonNFTOrderFields>);
    abstract getStructHash(): string;
    abstract getEIP712TypedData(): EIP712TypedData;
    protected abstract _getProperties(): Property[];
    willExpire(secondsFromNow?: number): boolean;
    getHash(): string;
    getSignatureWithProviderAsync(provider: SupportedProvider, type?: SignatureType, signer?: string): Promise<Signature>;
    getSignatureWithKey(key: string, type?: SignatureType): Signature;
    protected _getPropertiesHash(): string;
    protected _getFeesHash(): string;
}
export declare class ERC721Order extends NFTOrder {
    static readonly STRUCT_NAME = "ERC721Order";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    erc721Token: string;
    erc721TokenId: BigNumber;
    erc721TokenProperties: Property[];
    constructor(fields?: Partial<ERC721OrderFields>);
    clone(fields?: Partial<ERC721OrderFields>): ERC721Order;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
    protected _getProperties(): Property[];
}
export declare class ERC1155Order extends NFTOrder {
    static readonly STRUCT_NAME = "ERC1155Order";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    erc1155Token: string;
    erc1155TokenId: BigNumber;
    erc1155TokenProperties: Property[];
    erc1155TokenAmount: BigNumber;
    constructor(fields?: Partial<ERC1155OrderFields>);
    clone(fields?: Partial<ERC1155OrderFields>): ERC1155Order;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
    protected _getProperties(): Property[];
}
export {};
//# sourceMappingURL=nft_orders.d.ts.map