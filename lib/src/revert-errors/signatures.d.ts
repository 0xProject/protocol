import { RevertError } from '@0x/utils';
export declare enum SignatureValidationErrorCodes {
    AlwaysInvalid = 0,
    InvalidLength = 1,
    Unsupported = 2,
    Illegal = 3,
    WrongSigner = 4,
    BadSignatureData = 5
}
export declare class SignatureValidationError extends RevertError {
    constructor(code?: SignatureValidationErrorCodes, hash?: string);
}
//# sourceMappingURL=signatures.d.ts.map