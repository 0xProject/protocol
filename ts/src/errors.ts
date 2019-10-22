// tslint:disable:max-classes-per-file
export abstract class RelayerBaseError extends Error {
    public abstract statusCode: number;
    public isRelayerError = true;
}

export abstract class BadRequestError extends RelayerBaseError {
    public statusCode = 400;
    public abstract generalErrorCode: GeneralErrorCodes;
}

export interface ValidationErrorItem {
    field: string;
    code: ValidationErrorCodes;
    reason: string;
}

export interface ErrorBodyWithHTTPStatusCode {
    statusCode: number;
    errorBody: ErrorBody;
}

export interface ErrorBody {
    reason: string;
    code?: number;
    validationErrors?: ValidationErrorItem[];
}

export class ValidationError extends BadRequestError {
    public generalErrorCode = GeneralErrorCodes.ValidationError;
    public validationErrors: ValidationErrorItem[];
    constructor(validationErrors: ValidationErrorItem[]) {
        super();
        this.validationErrors = validationErrors;
    }
}

export class MalformedJSONError extends BadRequestError {
    public generalErrorCode = GeneralErrorCodes.MalformedJson;
}

export class TooManyRequestsError extends BadRequestError {
    public statusCode = 429;
    public generalErrorCode = GeneralErrorCodes.Throttled;
}

export class NotImplementedError extends BadRequestError {
    public statusCode = 501;
    public generalErrorCode = GeneralErrorCodes.NotImplemented;
}

export class NotFoundError extends RelayerBaseError {
    public statusCode = 404;
}

export class InternalServerError extends RelayerBaseError {
    public statusCode = 500;
}

export enum GeneralErrorCodes {
    ValidationError = 100,
    MalformedJson = 101,
    OrderSubmissionDisabled = 102,
    Throttled = 103,
    NotImplemented = 104,
}

export const generalErrorCodeToReason: { [key in GeneralErrorCodes]: string } = {
    [GeneralErrorCodes.ValidationError]: 'Validation Failed',
    [GeneralErrorCodes.MalformedJson]: 'Malformed JSON',
    [GeneralErrorCodes.OrderSubmissionDisabled]: 'Order submission disabled',
    [GeneralErrorCodes.Throttled]: 'Throttled',
    [GeneralErrorCodes.NotImplemented]: 'Not Implemented',
};

export enum ValidationErrorCodes {
    RequiredField = 1000,
    IncorrectFormat = 1001,
    InvalidAddress = 1002,
    AddressNotSupported = 1003,
    ValueOutOfRange = 1004,
    InvalidSignatureOrHash = 1005,
    UnsupportedOption = 1006,
    InvalidOrder = 1007,
    InternalError = 1008,
}
