import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

import { logger } from '../logger';
/**
 * log middleware
 */
export function requestLogger(): core.RequestHandler {
    const handler = (req: express.Request, res: express.Response, next: core.NextFunction) => {
        const startTime = Date.now();
        function writeLog(): void {
            const responseTime = Date.now() - startTime;
            res.removeListener('finish', writeLog);
            res.removeListener('close', writeLog);
            const logMsg = {
                req: {
                    url: req.originalUrl.split('?')[0],
                    method: req.method,
                    headers: {
                        'user-agent': req.headers['user-agent'],
                        host: req.headers.host,
                    },
                    body: req.body,
                    params: req.params,
                    query: req.query,
                },
                res: {
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                },
                responseTime,
                timestamp: Date.now(),
            };
            logger.info(logMsg);
        }
        res.on('finish', writeLog);
        res.on('close', writeLog);
        next();
    };
    return handler;
}
