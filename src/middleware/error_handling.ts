import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import {
    APIBaseError,
    BadRequestError,
    ErrorBodyWithHTTPStatusCode,
    GeneralErrorCodes,
    generalErrorCodeToReason,
    ValidationError,
} from '../errors';

/**
 * Wraps an Error with a JSON human readable reason and status code.
 */
export function generateError(err: Error): ErrorBodyWithHTTPStatusCode {
    if ((err as any).isAPIError) {
        const apiError = err as APIBaseError;
        const statusCode = apiError.statusCode;
        if (apiError.statusCode === HttpStatus.BAD_REQUEST) {
            const badRequestError = apiError as BadRequestError;
            if (badRequestError.generalErrorCode === GeneralErrorCodes.ValidationError) {
                const validationError = badRequestError as ValidationError;
                return {
                    statusCode,
                    errorBody: {
                        code: badRequestError.generalErrorCode,
                        reason: generalErrorCodeToReason[badRequestError.generalErrorCode],
                        validationErrors: validationError.validationErrors,
                    },
                };
            } else {
                return {
                    statusCode,
                    errorBody: {
                        code: badRequestError.generalErrorCode,
                        reason: generalErrorCodeToReason[badRequestError.generalErrorCode],
                    },
                };
            }
        } else {
            return {
                statusCode,
                errorBody: {
                    reason: HttpStatus.getStatusText(apiError.statusCode),
                },
            };
        }
    }
    return {
        statusCode: HttpStatus.BAD_REQUEST,
        errorBody: {
            reason: err.message,
        },
    };
}

/**
 * Catches errors thrown by our code and serialies them
 */
export function errorHandler(
    err: Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): void {
    // If you call next() with an error after you have started writing the response
    // (for example, if you encounter an error while streaming the response to the client)
    // the Express default error handler closes the connection and fails the request.
    if (res.headersSent) {
        return next(err);
    }
    if ((err as any).isAPIError || (err as any).statusCode) {
        const { statusCode, errorBody } = generateError(err);
        res.status(statusCode).send(errorBody);
        return;
    } else {
        return next(err);
    }
}
