"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchFillIncompleteError = exports.OnlyOrderMakerAllowed = exports.FillOrKillFailedError = exports.CancelSaltTooLowError = exports.OrderNotFillableByTakerError = exports.OrderNotFillableBySenderError = exports.InvalidSignerError = exports.OrderNotSignedByMakerError = exports.OrderNotFillableError = exports.OrderNotFillableByOriginError = exports.ProtocolFeeRefundFailed = void 0;
// tslint:disable: max-classes-per-file
const utils_1 = require("@0x/utils");
class ProtocolFeeRefundFailed extends utils_1.RevertError {
    constructor(receiver, refundAmount) {
        super('ProtocolFeeRefundFailed', 'ProtocolFeeRefundFailed(address receiver, uint256 refundAmount)', {
            receiver,
            refundAmount,
        });
    }
}
exports.ProtocolFeeRefundFailed = ProtocolFeeRefundFailed;
class OrderNotFillableByOriginError extends utils_1.RevertError {
    constructor(orderHash, txOrigin, orderTxOrigin) {
        super('OrderNotFillableByOriginError', 'OrderNotFillableByOriginError(bytes32 orderHash, address txOrigin, address orderTxOrigin)', {
            orderHash,
            txOrigin,
            orderTxOrigin,
        });
    }
}
exports.OrderNotFillableByOriginError = OrderNotFillableByOriginError;
class OrderNotFillableError extends utils_1.RevertError {
    constructor(orderHash, orderStatus) {
        super('OrderNotFillableError', 'OrderNotFillableError(bytes32 orderHash, uint8 orderStatus)', {
            orderHash,
            orderStatus,
        });
    }
}
exports.OrderNotFillableError = OrderNotFillableError;
class OrderNotSignedByMakerError extends utils_1.RevertError {
    constructor(orderHash, signer, maker) {
        super('OrderNotSignedByMakerError', 'OrderNotSignedByMakerError(bytes32 orderHash, address signer, address maker)', {
            orderHash,
            signer,
            maker,
        });
    }
}
exports.OrderNotSignedByMakerError = OrderNotSignedByMakerError;
class InvalidSignerError extends utils_1.RevertError {
    constructor(maker, signer) {
        super('InvalidSignerError', 'InvalidSignerError(address maker, address signer)', {
            maker,
            signer,
        });
    }
}
exports.InvalidSignerError = InvalidSignerError;
class OrderNotFillableBySenderError extends utils_1.RevertError {
    constructor(orderHash, sender, orderSender) {
        super('OrderNotFillableBySenderError', 'OrderNotFillableBySenderError(bytes32 orderHash, address sender, address orderSender)', {
            orderHash,
            sender,
            orderSender,
        });
    }
}
exports.OrderNotFillableBySenderError = OrderNotFillableBySenderError;
class OrderNotFillableByTakerError extends utils_1.RevertError {
    constructor(orderHash, taker, orderTaker) {
        super('OrderNotFillableByTakerError', 'OrderNotFillableByTakerError(bytes32 orderHash, address taker, address orderTaker)', {
            orderHash,
            taker,
            orderTaker,
        });
    }
}
exports.OrderNotFillableByTakerError = OrderNotFillableByTakerError;
class CancelSaltTooLowError extends utils_1.RevertError {
    constructor(minValidSalt, oldMinValidSalt) {
        super('CancelSaltTooLowError', 'CancelSaltTooLowError(uint256 minValidSalt, uint256 oldMinValidSalt)', {
            minValidSalt,
            oldMinValidSalt,
        });
    }
}
exports.CancelSaltTooLowError = CancelSaltTooLowError;
class FillOrKillFailedError extends utils_1.RevertError {
    constructor(orderHash, takerTokenFilledAmount, takerTokenFillAmount) {
        super('FillOrKillFailedError', 'FillOrKillFailedError(bytes32 orderHash, uint256 takerTokenFilledAmount, uint256 takerTokenFillAmount)', {
            orderHash,
            takerTokenFilledAmount,
            takerTokenFillAmount,
        });
    }
}
exports.FillOrKillFailedError = FillOrKillFailedError;
class OnlyOrderMakerAllowed extends utils_1.RevertError {
    constructor(orderHash, sender, maker) {
        super('OnlyOrderMakerAllowed', 'OnlyOrderMakerAllowed(bytes32 orderHash, address sender, address maker)', {
            orderHash,
            sender,
            maker,
        });
    }
}
exports.OnlyOrderMakerAllowed = OnlyOrderMakerAllowed;
class BatchFillIncompleteError extends utils_1.RevertError {
    constructor(orderHash, takerTokenFilledAmount, takerTokenFillAmount) {
        super('BatchFillIncompleteError', 'BatchFillIncompleteError(bytes32 orderHash, uint256 takerTokenFilledAmount, uint256 takerTokenFillAmount)', {
            orderHash,
            takerTokenFilledAmount,
            takerTokenFillAmount,
        });
    }
}
exports.BatchFillIncompleteError = BatchFillIncompleteError;
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
    utils_1.RevertError.registerType(type);
}
//# sourceMappingURL=native_orders.js.map