import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

/**
 * Searches for keys matching `[x]Address` in query params, and transforms values to lowercase
 */
export function addressNormalizer(req: express.Request, _: express.Response, next: core.NextFunction): void {
    const addressKeys = Object.keys(req.query).filter(key => key.match(/\w+Address/));
    const normalized: { [key: string]: any } = {};
    for (const key of addressKeys) {
        normalized[key] = (req.query[key] as string).toLowerCase();
    }
    req.query = {
        ...req.query,
        ...normalized,
    };
    next();
}
