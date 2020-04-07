import Axios, { AxiosPromise, AxiosRequestConfig } from 'axios';
import * as rax from 'retry-axios';

import { logger } from '../logger';

// Attach retry-axios to the global instance
rax.attach();

const DEFAULT_RETRY_CONFIG: rax.RetryConfig = {
    // Retry 3 times
    retry: 3,
    // Retry twice on no response (ETIMEDOUT)
    noResponseRetries: 2,
    onRetryAttempt: err => {
        const cfg = rax.getConfig(err);
        if (cfg) {
            logger.warn(`HTTP retry attempt #${cfg.currentRetryAttempt}. ${err.message}`);
        } else {
            logger.warn(`HTTP retry. ${err.message}`);
        }
    },
};

export const axios = (config: AxiosRequestConfig): AxiosPromise => {
    return Axios({
        ...config,
        raxConfig: {
            ...DEFAULT_RETRY_CONFIG,
            ...config.raxConfig,
        },
    });
};
