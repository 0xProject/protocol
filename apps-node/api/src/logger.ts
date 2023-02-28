import { pino } from '@0x/api-utils';

import { LOGGER_INCLUDE_TIMESTAMP, LOG_LEVEL } from './config';

export const logger = pino({
    formatters: {
        level: (label) => ({
            level: label,
        }),
    },
    level: LOG_LEVEL,
    timestamp: LOGGER_INCLUDE_TIMESTAMP,
});
