import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

import { objectETHAddressNormalizer } from '../utils/address_utils';

/**
 * Searches for query param values that match the ETH address format, and transforms them to lowercase
 */
export function addressNormalizer(req: express.Request, _: express.Response, next: core.NextFunction): void {
    const normalizedQuery = objectETHAddressNormalizer(req.query);
    req.query = normalizedQuery;

    next();
}
