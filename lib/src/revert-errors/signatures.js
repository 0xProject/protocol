"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureValidationError = exports.SignatureValidationErrorCodes = void 0;
const utils_1 = require("@0x/utils");
var SignatureValidationErrorCodes;
(function (SignatureValidationErrorCodes) {
    SignatureValidationErrorCodes[SignatureValidationErrorCodes["AlwaysInvalid"] = 0] = "AlwaysInvalid";
    SignatureValidationErrorCodes[SignatureValidationErrorCodes["InvalidLength"] = 1] = "InvalidLength";
    SignatureValidationErrorCodes[SignatureValidationErrorCodes["Unsupported"] = 2] = "Unsupported";
    SignatureValidationErrorCodes[SignatureValidationErrorCodes["Illegal"] = 3] = "Illegal";
    SignatureValidationErrorCodes[SignatureValidationErrorCodes["WrongSigner"] = 4] = "WrongSigner";
    SignatureValidationErrorCodes[SignatureValidationErrorCodes["BadSignatureData"] = 5] = "BadSignatureData";
})(SignatureValidationErrorCodes = exports.SignatureValidationErrorCodes || (exports.SignatureValidationErrorCodes = {}));
class SignatureValidationError extends utils_1.RevertError {
    constructor(code, hash) {
        super('SignatureValidationError', 'SignatureValidationError(uint8 code, bytes32 hash)', {
            code,
            hash,
        });
    }
}
exports.SignatureValidationError = SignatureValidationError;
const types = [SignatureValidationError];
// Register the types we've defined.
for (const type of types) {
    utils_1.RevertError.registerType(type);
}
//# sourceMappingURL=signatures.js.map