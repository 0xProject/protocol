import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import * as HttpStatus from 'http-status-codes';

import { logger } from '../logger';
/**
 * log middleware
 */
export function requestLogger(): core.RequestHandler {
    const handler = (req: express.Request, res: express.Response, next: core.NextFunction) => {
        const origSend = res.send;
        let cachedBody: any;
        res.send = (body?: any): express.Response => {
            cachedBody = body;
            return origSend.bind(res)(body);
        };
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
                        '0x-api-key': req.headers['0x-api-key'],
                        'user-agent': req.headers['user-agent'],
                        host: req.headers.host,
                        referer: req.headers.referer,
                    },
                    body: req.body,
                    params: req.params,
                    query: req.query,
                },
                res: {
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    errorBody: res.statusCode >= HttpStatus.BAD_REQUEST ? cachedBody : undefined,
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
