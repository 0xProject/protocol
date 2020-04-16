import { ObjectMap, SignedOrder } from '@0x/types';
import { RevertError } from '@0x/utils';
import * as HttpStatus from 'http-status-codes';

import { ONE_SECOND_MS } from './constants';

// tslint:disable:max-classes-per-file

// base class for all the named errors in this file
export abstract class APIBaseError extends Error {
    public abstract statusCode: number;
    public isAPIError = true;
}

export abstract class BadRequestError extends APIBaseError {
    public statusCode = HttpStatus.BAD_REQUEST;
    public abstract generalErrorCode: GeneralErrorCodes;
}

export interface ValidationErrorItem {
    field: string;
    code: ValidationErrorCodes;
    reason: string;
}

export interface ErrorBodyWithHTTPStatusCode {
    statusCode: number;
    errorBody: ErrorBody | RevertReasonErrorBody;
}

export interface ErrorBody {
    reason: string;
    code?: number;
    validationErrors?: ValidationErrorItem[];
}

export interface RevertReasonErrorBody {
    reason: string;
    code?: number;
    values: ObjectMap<any>;
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
    public statusCode = HttpStatus.TOO_MANY_REQUESTS;
    public generalErrorCode = GeneralErrorCodes.Throttled;
}

export class NotImplementedError extends BadRequestError {
    public statusCode = HttpStatus.NOT_IMPLEMENTED;
    public generalErrorCode = GeneralErrorCodes.NotImplemented;
}

export class NotFoundError extends APIBaseError {
    public statusCode = HttpStatus.NOT_FOUND;
}

export class InternalServerError extends APIBaseError {
    public statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
}

export class RevertAPIError extends BadRequestError {
    public statusCode = HttpStatus.BAD_REQUEST;
    public generalErrorCode = GeneralErrorCodes.TransactionInvalid;
    public name: string;
    public values: ObjectMap<any>;
    public isRevertError = true;
    constructor(revertError: RevertError) {
        super();
        this.name = revertError.name;
        this.values = revertError.values;
    }
}

export enum GeneralErrorCodes {
    ValidationError = 100,
    MalformedJson = 101,
    OrderSubmissionDisabled = 102,
    Throttled = 103,
    NotImplemented = 104,
    TransactionInvalid = 105,
}

export const generalErrorCodeToReason: { [key in GeneralErrorCodes]: string } = {
    [GeneralErrorCodes.ValidationError]: 'Validation Failed',
    [GeneralErrorCodes.MalformedJson]: 'Malformed JSON',
    [GeneralErrorCodes.OrderSubmissionDisabled]: 'Order submission disabled',
    [GeneralErrorCodes.Throttled]: 'Throttled',
    [GeneralErrorCodes.NotImplemented]: 'Not Implemented',
    [GeneralErrorCodes.TransactionInvalid]: 'Transaction Invalid',
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
    TokenNotSupported = 1009,
}

export abstract class AlertError {
    public abstract message: string;
    public shouldAlert: boolean = true;
}

export class ExpiredOrderError extends AlertError {
    public message = `Found expired order!`;
    public expiry: number;
    public expiredForSeconds: number;
    constructor(public order: SignedOrder, public currentThreshold: number, public details?: string) {
        super();
        this.expiry = order.expirationTimeSeconds.toNumber();
        this.expiredForSeconds = Date.now() / ONE_SECOND_MS - this.expiry;
    }
}

export class OrderWatcherSyncError extends AlertError {
    public message = `Error syncing OrderWatcher!`;
    constructor(public details?: string) {
        super();
    }
}
