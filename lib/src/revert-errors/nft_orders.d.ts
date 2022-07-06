import { Numberish, RevertError } from '@0x/utils';
import { OrderStatus } from '../nft_orders';
export declare class OverspentEthError extends RevertError {
    constructor(ethSpent?: Numberish, msgValue?: Numberish);
}
export declare class InsufficientEthError extends RevertError {
    constructor(ethAvailable?: Numberish, orderAmount?: Numberish);
}
export declare class ERC721TokenMismatchError extends RevertError {
    constructor(token1?: string, token2?: string);
}
export declare class ERC1155TokenMismatchError extends RevertError {
    constructor(token1?: string, token2?: string);
}
export declare class ERC20TokenMismatchError extends RevertError {
    constructor(token1?: string, token2?: string);
}
export declare class NegativeSpreadError extends RevertError {
    constructor(sellOrderAmount?: Numberish, buyOrderAmount?: Numberish);
}
export declare class SellOrderFeesExceedSpreadError extends RevertError {
    constructor(sellOrderFees?: Numberish, spread?: Numberish);
}
export declare class OnlyTakerError extends RevertError {
    constructor(sender?: string, taker?: string);
}
export { InvalidSignerError } from './native_orders';
export declare class OrderNotFillableError extends RevertError {
    constructor(maker?: string, nonce?: Numberish, orderStatus?: OrderStatus);
}
export declare class TokenIdMismatchError extends RevertError {
    constructor(tokenId?: Numberish, orderTokenId?: Numberish);
}
export declare class PropertyValidationFailedError extends RevertError {
    constructor(propertyValidator?: string, token?: string, tokenId?: Numberish, propertyData?: string, errorData?: string);
}
//# sourceMappingURL=nft_orders.d.ts.map