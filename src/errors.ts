import { AlertError, BadRequestError, generalErrorCodeToReason as baseReasons } from '@0x/api-utils';
import * as HttpStatus from 'http-status-codes';

import { ONE_SECOND_MS } from './constants';
import { SignedLimitOrder } from './types';

export {
    BadRequestError,
    ErrorBody,
    GeneralErrorCodes,
    InternalServerError,
    InvalidAPIKeyError,
    MalformedJSONError,
    NotFoundError,
    NotImplementedError,
    RevertAPIError,
    ValidationError,
    ValidationErrorCodes,
    ValidationErrorItem,
} from '@0x/api-utils';

// tslint:disable:max-classes-per-file
export class InsufficientFundsError extends BadRequestError<APIErrorCodes> {
    public statusCode = HttpStatus.BAD_REQUEST;
    public generalErrorCode = APIErrorCodes.InsufficientFundsError;
}

export class EthSellNotSupportedError extends BadRequestError<APIErrorCodes> {
    public statusCode = HttpStatus.BAD_REQUEST;
    public generalErrorCode = APIErrorCodes.EthSellNotSupported;
}

export class GasEstimationError extends BadRequestError<APIErrorCodes> {
    public statusCode = HttpStatus.BAD_REQUEST;
    public generalErrorCode = APIErrorCodes.GasEstimationFailed;
}

export enum APIErrorCodes {
    OrderSubmissionDisabled = 102,
    UnableToSubmitOnBehalfOfTaker = 106,
    ServiceDisabled = 108,
    InsufficientFundsError = 109,
    EthSellNotSupported = 110,
    GasEstimationFailed = 111,
}

export const apiErrorCodesToReasons: { [key in APIErrorCodes]: string } = {
    ...baseReasons,
    [APIErrorCodes.OrderSubmissionDisabled]: 'Order submission disabled',
    [APIErrorCodes.UnableToSubmitOnBehalfOfTaker]: 'Unable to submit transaction on behalf of taker',
    [APIErrorCodes.ServiceDisabled]: 'Service disabled',
    [APIErrorCodes.InsufficientFundsError]: 'Insufficient funds for transaction',
    [APIErrorCodes.EthSellNotSupported]: 'ETH selling is not supported',
    [APIErrorCodes.GasEstimationFailed]: 'Gas estimation failed',
};

export enum ValidationErrorReasons {
    PercentageOutOfRange = 'MUST_BE_LESS_THAN_OR_EQUAL_TO_ONE',
    ConflictingFilteringArguments = 'CONFLICTING_FILTERING_ARGUMENTS',
    ArgumentNotYetSupported = 'ARGUMENT_NOT_YET_SUPPORTED',
    InvalidApiKey = 'INVALID_API_KEY',
    TakerAddressInvalid = 'TAKER_ADDRESS_INVALID',
    RequiresIntentOnFilling = 'REQUIRES_INTENT_ON_FILLING',
    UnfillableRequiresMakerAddress = 'MAKER_ADDRESS_REQUIRED_TO_FETCH_UNFILLABLE_ORDERS',
    MultipleFeeTypesUsed = 'MULTIPLE_FEE_TYPES_USED',
    FeeRecipientMissing = 'FEE_RECIPIENT_MISSING',
}

export class ExpiredOrderError extends AlertError {
    public message = `Found expired order!`;
    public expiry: number;
    public expiredForSeconds: number;
    constructor(public order: SignedLimitOrder, public currentThreshold: number, public details?: string) {
        super();
        this.expiry = order.expiry.toNumber();
        this.expiredForSeconds = Date.now() / ONE_SECOND_MS - this.expiry;
    }
}

export class OrderWatcherSyncError extends AlertError {
    public message = `Error syncing OrderWatcher!`;
    constructor(public details?: string) {
        super();
    }
}

export class WebsocketServiceError extends AlertError {
    public message = 'Error in the Websocket service!';
    constructor(public error: Error) {
        super();
    }
}
