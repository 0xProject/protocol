import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import {
    BadRequestError,
    ErrorBodyWithHTTPStatusCode,
    GeneralErrorCodes,
    generalErrorCodeToReason,
    RelayerBaseError,
    ValidationError,
} from '../errors';

/**
 * Wraps an Error with a JSON human readable reason and status code.
 */
export function generateError(err: Error): ErrorBodyWithHTTPStatusCode {
    if ((err as any).isRelayerError) {
        const relayerError = err as RelayerBaseError;
        const statusCode = relayerError.statusCode;
        if (relayerError.statusCode === HttpStatus.BAD_REQUEST) {
            const badRequestError = relayerError as BadRequestError;
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
                    reason: HttpStatus.getStatusText(relayerError.statusCode),
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
    if ((err as any).isRelayerError || (err as any).statusCode) {
        const { statusCode, errorBody } = generateError(err);
        res.status(statusCode).send(errorBody);
        return;
    } else {
        return next(err);
    }
}
