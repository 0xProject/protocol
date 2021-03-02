import { addressUtils } from '@0x/utils';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

/**
 * Searches for query param values that match the ETH address format, and transforms them to lowercase
 */
export function addressNormalizer(req: express.Request, _: express.Response, next: core.NextFunction): void {
    const normalized: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(req.query)) {
        if (value && addressUtils.isAddress(value as string)) {
            normalized[key] = (value as string).toLowerCase();
        }
    }
    req.query = {
        ...req.query,
        ...normalized,
    };
    next();
}
