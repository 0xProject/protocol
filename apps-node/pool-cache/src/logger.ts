import { env } from './env';
import pino from 'pino';
import pretty from 'pino-pretty';

export const logger =
    env.NODE_ENV !== 'production'
        ? pino({ level: 'debug' }, pretty({ colorize: true, sync: true }))
        : pino({ level: env.LOG_LEVEL });
