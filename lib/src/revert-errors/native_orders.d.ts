import { Numberish, RevertError } from '@0x/utils';
import { OrderStatus } from '../orders';
export declare class ProtocolFeeRefundFailed extends RevertError {
    constructor(receiver?: string, refundAmount?: Numberish);
}
export declare class OrderNotFillableByOriginError extends RevertError {
    constructor(orderHash?: string, txOrigin?: string, orderTxOrigin?: string);
}
export declare class OrderNotFillableError extends RevertError {
    constructor(orderHash?: string, orderStatus?: OrderStatus);
}
export declare class OrderNotSignedByMakerError extends RevertError {
    constructor(orderHash?: string, signer?: string, maker?: string);
}
export declare class InvalidSignerError extends RevertError {
    constructor(maker?: string, signer?: string);
}
export declare class OrderNotFillableBySenderError extends RevertError {
    constructor(orderHash?: string, sender?: string, orderSender?: string);
}
export declare class OrderNotFillableByTakerError extends RevertError {
    constructor(orderHash?: string, taker?: string, orderTaker?: string);
}
export declare class CancelSaltTooLowError extends RevertError {
    constructor(minValidSalt?: Numberish, oldMinValidSalt?: Numberish);
}
export declare class FillOrKillFailedError extends RevertError {
    constructor(orderHash?: string, takerTokenFilledAmount?: Numberish, takerTokenFillAmount?: Numberish);
}
export declare class OnlyOrderMakerAllowed extends RevertError {
    constructor(orderHash?: string, sender?: string, maker?: string);
}
export declare class BatchFillIncompleteError extends RevertError {
    constructor(orderHash?: string, takerTokenFilledAmount?: Numberish, takerTokenFillAmount?: Numberish);
}
//# sourceMappingURL=native_orders.d.ts.map