import * as express from 'express';

import { MAX_PER_PAGE } from '../config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../constants';
import { ValidationError, ValidationErrorCodes } from '../errors';

export const paginationUtils = {
    paginate: <T>(collection: T[], page: number, perPage: number) => {
        const paginatedCollection = {
            total: collection.length,
            page,
            perPage,
            records: collection.slice((page - 1) * perPage, page * perPage),
        };
        return paginatedCollection;
    },
    parsePaginationConfig: (req: express.Request): { page: number; perPage: number } => {
        const page = req.query.page === undefined ? DEFAULT_PAGE : Number(req.query.page);
        const perPage = req.query.perPage === undefined ? DEFAULT_PER_PAGE : Number(req.query.perPage);
        if (perPage > MAX_PER_PAGE) {
            throw new ValidationError([
                {
                    field: 'perPage',
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: `perPage should be less or equal to ${MAX_PER_PAGE}`,
                },
            ]);
        }
        return { page, perPage };
    },
};
