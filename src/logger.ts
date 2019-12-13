import * as pino from 'pino';

import { LOGGER_INCLUDE_TIMESTAMP } from './config';

export const logger = pino({
    useLevelLabels: true,
    timestamp: LOGGER_INCLUDE_TIMESTAMP,
});
