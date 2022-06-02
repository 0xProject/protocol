"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyValidationFailedError = exports.TokenIdMismatchError = exports.OrderNotFillableError = exports.InvalidSignerError = exports.OnlyTakerError = exports.SellOrderFeesExceedSpreadError = exports.NegativeSpreadError = exports.ERC20TokenMismatchError = exports.ERC1155TokenMismatchError = exports.ERC721TokenMismatchError = exports.InsufficientEthError = exports.OverspentEthError = void 0;
// tslint:disable: max-classes-per-file
const utils_1 = require("@0x/utils");
class OverspentEthError extends utils_1.RevertError {
    constructor(ethSpent, msgValue) {
        super('OverspentEthError', 'OverspentEthError(uint256 ethSpent, uint256 msgValue)', {
            ethSpent,
            msgValue,
        });
    }
}
exports.OverspentEthError = OverspentEthError;
class InsufficientEthError extends utils_1.RevertError {
    constructor(ethAvailable, orderAmount) {
        super('InsufficientEthError', 'InsufficientEthError(uint256 ethAvailable, uint256 orderAmount)', {
            ethAvailable,
            orderAmount,
        });
    }
}
exports.InsufficientEthError = InsufficientEthError;
class ERC721TokenMismatchError extends utils_1.RevertError {
    constructor(token1, token2) {
        super('ERC721TokenMismatchError', 'ERC721TokenMismatchError(address token1, address token2)', {
            token1,
            token2,
        });
    }
}
exports.ERC721TokenMismatchError = ERC721TokenMismatchError;
class ERC1155TokenMismatchError extends utils_1.RevertError {
    constructor(token1, token2) {
        super('ERC1155TokenMismatchError', 'ERC1155TokenMismatchError(address token1, address token2)', {
            token1,
            token2,
        });
    }
}
exports.ERC1155TokenMismatchError = ERC1155TokenMismatchError;
class ERC20TokenMismatchError extends utils_1.RevertError {
    constructor(token1, token2) {
        super('ERC20TokenMismatchError', 'ERC20TokenMismatchError(address token1, address token2)', {
            token1,
            token2,
        });
    }
}
exports.ERC20TokenMismatchError = ERC20TokenMismatchError;
class NegativeSpreadError extends utils_1.RevertError {
    constructor(sellOrderAmount, buyOrderAmount) {
        super('NegativeSpreadError', 'NegativeSpreadError(uint256 sellOrderAmount, uint256 buyOrderAmount)', {
            sellOrderAmount,
            buyOrderAmount,
        });
    }
}
exports.NegativeSpreadError = NegativeSpreadError;
class SellOrderFeesExceedSpreadError extends utils_1.RevertError {
    constructor(sellOrderFees, spread) {
        super('SellOrderFeesExceedSpreadError', 'SellOrderFeesExceedSpreadError(uint256 sellOrderFees, uint256 spread)', {
            sellOrderFees,
            spread,
        });
    }
}
exports.SellOrderFeesExceedSpreadError = SellOrderFeesExceedSpreadError;
class OnlyTakerError extends utils_1.RevertError {
    constructor(sender, taker) {
        super('OnlyTakerError', 'OnlyTakerError(address sender, address taker)', {
            sender,
            taker,
        });
    }
}
exports.OnlyTakerError = OnlyTakerError;
var native_orders_1 = require("./native_orders");
Object.defineProperty(exports, "InvalidSignerError", { enumerable: true, get: function () { return native_orders_1.InvalidSignerError; } });
class OrderNotFillableError extends utils_1.RevertError {
    constructor(maker, nonce, orderStatus) {
        super('OrderNotFillableError', 'OrderNotFillableError(address maker, uint256 nonce, uint8 orderStatus)', {
            maker,
            nonce,
            orderStatus,
        });
    }
}
exports.OrderNotFillableError = OrderNotFillableError;
class TokenIdMismatchError extends utils_1.RevertError {
    constructor(tokenId, orderTokenId) {
        super('TokenIdMismatchError', 'TokenIdMismatchError(uint256 tokenId, uint256 orderTokenId)', {
            tokenId,
            orderTokenId,
        });
    }
}
exports.TokenIdMismatchError = TokenIdMismatchError;
class PropertyValidationFailedError extends utils_1.RevertError {
    constructor(propertyValidator, token, tokenId, propertyData, errorData) {
        super('PropertyValidationFailedError', 'PropertyValidationFailedError(address propertyValidator, address token, uint256 tokenId, bytes propertyData, bytes errorData)', {
            propertyValidator,
            token,
            tokenId,
            propertyData,
            errorData,
        });
    }
}
exports.PropertyValidationFailedError = PropertyValidationFailedError;
const types = [
    OverspentEthError,
    InsufficientEthError,
    ERC721TokenMismatchError,
    ERC1155TokenMismatchError,
    ERC20TokenMismatchError,
    NegativeSpreadError,
    SellOrderFeesExceedSpreadError,
    OnlyTakerError,
    OrderNotFillableError,
    TokenIdMismatchError,
    PropertyValidationFailedError,
];
// Register the types we've defined.
for (const type of types) {
    utils_1.RevertError.registerType(type);
}
//# sourceMappingURL=nft_orders.js.map