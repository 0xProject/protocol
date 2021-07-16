// tslint:disable: max-classes-per-file
import { Numberish, RevertError } from '@0x/utils';

import { OrderStatus } from '../orders';

export class ProtocolFeeRefundFailed extends RevertError {
    constructor(receiver?: string, refundAmount?: Numberish) {
        super('ProtocolFeeRefundFailed', 'ProtocolFeeRefundFailed(address receiver, uint256 refundAmount)', {
            receiver,
            refundAmount,
        });
    }
}

export class OrderNotFillableByOriginError extends RevertError {
    constructor(orderHash?: string, txOrigin?: string, orderTxOrigin?: string) {
        super(
            'OrderNotFillableByOriginError',
            'OrderNotFillableByOriginError(bytes32 orderHash, address txOrigin, address orderTxOrigin)',
            {
                orderHash,
                txOrigin,
                orderTxOrigin,
            },
        );
    }
}

export class OrderNotFillableError extends RevertError {
    constructor(orderHash?: string, orderStatus?: OrderStatus) {
        super('OrderNotFillableError', 'OrderNotFillableError(bytes32 orderHash, uint8 orderStatus)', {
            orderHash,
            orderStatus,
        });
    }
}

export class OrderNotSignedByMakerError extends RevertError {
    constructor(orderHash?: string, signer?: string, maker?: string) {
        super(
            'OrderNotSignedByMakerError',
            'OrderNotSignedByMakerError(bytes32 orderHash, address signer, address maker)',
            {
                orderHash,
                signer,
                maker,
            },
        );
    }
}

export class InvalidSignerError extends RevertError {
    constructor(maker?: string, signer?: string) {
        super('InvalidSignerError', 'InvalidSignerError(address maker, address signer)', {
            maker,
            signer,
        });
    }
}

export class OrderNotFillableBySenderError extends RevertError {
    constructor(orderHash?: string, sender?: string, orderSender?: string) {
        super(
            'OrderNotFillableBySenderError',
            'OrderNotFillableBySenderError(bytes32 orderHash, address sender, address orderSender)',
            {
                orderHash,
                sender,
                orderSender,
            },
        );
    }
}

export class OrderNotFillableByTakerError extends RevertError {
    constructor(orderHash?: string, taker?: string, orderTaker?: string) {
        super(
            'OrderNotFillableByTakerError',
            'OrderNotFillableByTakerError(bytes32 orderHash, address taker, address orderTaker)',
            {
                orderHash,
                taker,
                orderTaker,
            },
        );
    }
}

export class CancelSaltTooLowError extends RevertError {
    constructor(minValidSalt?: Numberish, oldMinValidSalt?: Numberish) {
        super('CancelSaltTooLowError', 'CancelSaltTooLowError(uint256 minValidSalt, uint256 oldMinValidSalt)', {
            minValidSalt,
            oldMinValidSalt,
        });
    }
}

export class FillOrKillFailedError extends RevertError {
    constructor(orderHash?: string, takerTokenFilledAmount?: Numberish, takerTokenFillAmount?: Numberish) {
        super(
            'FillOrKillFailedError',
            'FillOrKillFailedError(bytes32 orderHash, uint256 takerTokenFilledAmount, uint256 takerTokenFillAmount)',
            {
                orderHash,
                takerTokenFilledAmount,
                takerTokenFillAmount,
            },
        );
    }
}

export class OnlyOrderMakerAllowed extends RevertError {
    constructor(orderHash?: string, sender?: string, maker?: string) {
        super('OnlyOrderMakerAllowed', 'OnlyOrderMakerAllowed(bytes32 orderHash, address sender, address maker)', {
            orderHash,
            sender,
            maker,
        });
    }
}

export class BatchFillIncompleteError extends RevertError {
    constructor(orderHash?: string, takerTokenFilledAmount?: Numberish, takerTokenFillAmount?: Numberish) {
        super(
            'BatchFillIncompleteError',
            'BatchFillIncompleteError(bytes32 orderHash, uint256 takerTokenFilledAmount, uint256 takerTokenFillAmount)',
            {
                orderHash,
                takerTokenFilledAmount,
                takerTokenFillAmount,
            },
        );
    }
}

const types = [
    ProtocolFeeRefundFailed,
    OrderNotFillableByOriginError,
    OrderNotFillableError,
    OrderNotSignedByMakerError,
    OrderNotFillableBySenderError,
    OrderNotFillableByTakerError,
    CancelSaltTooLowError,
    FillOrKillFailedError,
    OnlyOrderMakerAllowed,
    BatchFillIncompleteError,
    InvalidSignerError,
];

// Register the types we've defined.
for (const type of types) {
    RevertError.registerType(type);
}
