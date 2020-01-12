import { RevertError } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import {
    APIBaseError,
    BadRequestError,
    ErrorBodyWithHTTPStatusCode,
    GeneralErrorCodes,
    generalErrorCodeToReason,
    InternalServerError,
    RevertAPIError,
    ValidationError,
} from '../errors';
import { logger } from '../logger';

/**
 * Wraps an Error with a JSON human readable reason and status code.
 */
export function generateError(err: Error): ErrorBodyWithHTTPStatusCode {
    // handle named errors
    if (isAPIError(err)) {
        const statusCode = err.statusCode;
        // populate more information for BAD_REQUEST errors
        if (isBadRequestError(err)) {
            const code = err.generalErrorCode;
            // populate validation error information
            if (isValidationError(err)) {
                return {
                    statusCode,
                    errorBody: {
                        code,
                        reason: generalErrorCodeToReason[code],
                        validationErrors: err.validationErrors,
                    },
                };
            } else if (isRevertAPIError(err)) {
                return {
                    statusCode,
                    errorBody: {
                        code,
                        reason: err.name,
                        values: err.values,
                    },
                };
            } else {
                // if not a validation error, populate the error body with standard bad request text
                return {
                    statusCode,
                    errorBody: {
                        code,
                        reason: generalErrorCodeToReason[code],
                    },
                };
            }
        } else {
            // all named errors that are not BAD_REQUEST
            // preserve the statusCode and populate the error body with standard status text
            return {
                statusCode,
                errorBody: {
                    reason: HttpStatus.getStatusText(statusCode),
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
    if (isAPIError(err) && isInternalServerError(err)) {
        // hack (xianny): typeorm errors contain the SQL query which breaks the docker char limit and subsequently breaks log parsing
        if ((err as any).query) {
            (err as any).query = undefined;
        }
        logger.error(err);
        next(err);
    }
}

// tslint:disable-next-line:completed-docs
export function isAPIError(error: Error): error is APIBaseError {
    return (error as APIBaseError).isAPIError;
}

// tslint:disable-next-line:completed-docs
export function isRevertError(error: Error): error is RevertError {
    const { signature, selector } = error as RevertError;
    return signature !== undefined && selector !== undefined;
}

function isBadRequestError(error: APIBaseError): error is BadRequestError {
    return error.statusCode === HttpStatus.BAD_REQUEST;
}

function isRevertAPIError(error: APIBaseError): error is RevertAPIError {
    return (error as RevertAPIError).isRevertError;
}

function isInternalServerError(error: APIBaseError): error is InternalServerError {
    return error.statusCode === HttpStatus.INTERNAL_SERVER_ERROR;
}

function isValidationError(error: BadRequestError): error is ValidationError {
    return error.generalErrorCode === GeneralErrorCodes.ValidationError;
}
