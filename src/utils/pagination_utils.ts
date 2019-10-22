import * as express from 'express';

import { MAX_PER_PAGE } from '../config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../constants';
import { ValidationError, ValidationErrorCodes } from '../errors';

export const paginationUtils = {
    /**
     *  Paginates locally in memory from a larger collection
     * @param records The records to paginate
     * @param page The current page for these records
     * @param perPage The total number of records to return per page
     */
    paginate: <T>(records: T[], page: number, perPage: number) => {
        return paginationUtils.paginateSerialize(
            records.slice((page - 1) * perPage, page * perPage),
            records.length,
            page,
            perPage,
        );
    },
    paginateDBFilters: (page: number, perPage: number) => {
        return {
            skip: (page - 1) * perPage,
            take: perPage,
        };
    },
    paginateSerialize: <T>(collection: T[], total: number, page: number, perPage: number) => {
        const paginated = {
            total,
            page,
            perPage,
            records: collection,
        };
        return paginated;
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
