// TODO(dorothy-zbornak): Move these into `@0x/protocol-utils` whenever that
// becomes a thing.
// tslint:disable:max-classes-per-file
import { RevertError } from '@0x/utils';

export enum SignatureValidationErrorCodes {
    AlwaysInvalid = 0,
    InvalidLength = 1,
    Unsupported = 2,
    Illegal = 3,
    WrongSigner = 4,
    BadSignatureData = 5,
}

// tslint:disable:max-classes-per-file
export class SignatureValidationError extends RevertError {
    constructor(code?: SignatureValidationErrorCodes, hash?: string) {
        super('SignatureValidationError', 'SignatureValidationError(uint8 code, bytes32 hash)', {
            code,
            hash,
        });
    }
}

const types = [SignatureValidationError];

// Register the types we've defined.
for (const type of types) {
    RevertError.registerType(type);
}
