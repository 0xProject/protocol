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
import { logger } from '../logger';

/**
 * Wraps an Error with a JSON human readable reason and status code.
 */
export function generateError(err: Error): ErrorBodyWithHTTPStatusCode {
    // handle named errors
    if ((err as any).isAPIError) {
        const apiError = err as APIBaseError;
        const statusCode = apiError.statusCode;

        // populate more information for BAD_REQUEST errors
        if (apiError.statusCode === HttpStatus.BAD_REQUEST) {
            const badRequestError = apiError as BadRequestError;

            // populate validation error information
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
                // if not a validation error, populate the error body with standard bad request text
                return {
                    statusCode,
                    errorBody: {
                        code: badRequestError.generalErrorCode,
                        reason: generalErrorCodeToReason[badRequestError.generalErrorCode],
                    },
                };
            }
        } else {
            // all named errors that are not BAD_REQUEST
            // preserve the statusCode and populate the error body with standard status text
            return {
                statusCode,
                errorBody: {
                    reason: HttpStatus.getStatusText(apiError.statusCode),
                },
            };
        }
    } else {
        // coerce unnamed errors into generic INTERNAL_SERVER_ERROR
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            errorBody: {
                reason: err.message,
            },
        };
    }
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

    const { statusCode, errorBody } = generateError(err);
    res.status(statusCode).send(errorBody);

    // If the error is an internal error, log it with the stack!
    // All other error responses are logged as part of request logging
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
        // hack (xianny): typeorm errors contain the SQL query which breaks the docker char limit and subsequently breaks log parsing
        logger.error({ ...err, query: undefined });
        next(err);
    }
}
