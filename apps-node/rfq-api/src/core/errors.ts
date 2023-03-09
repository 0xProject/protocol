import { generalErrorCodeToReason as baseReasons } from '@0x/api-utils';

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
    ArgumentNotYetSupported = 'ARGUMENT_NOT_YET_SUPPORTED',
    FeeRecipientMissing = 'FEE_RECIPIENT_MISSING',
    MultipleFeeTypesUsed = 'MULTIPLE_FEE_TYPES_USED',
    PercentageOutOfRange = 'MUST_BE_LESS_THAN_OR_EQUAL_TO_ONE',
}
