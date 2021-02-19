import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

const DEFAULT_CACHE_AGE_SECONDS = 10;

/**
 *  Sets the Cache related headers in a response
 */
export function cacheControl(req: express.Request, res: express.Response, next: core.NextFunction): void {
    if (req.method === 'GET') {
        res.set('Cache-control', `public, max-age=${DEFAULT_CACHE_AGE_SECONDS}, s-maxage=${DEFAULT_CACHE_AGE_SECONDS}`);
    }
    next();
}
