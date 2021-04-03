import Axios, { AxiosPromise, AxiosRequestConfig } from 'axios';
import * as rax from 'retry-axios';

import { logger } from '../logger';

const DEFAULT_RETRY_CONFIG: rax.RetryConfig = {
    // Retry 3 times
    retry: 3,
    // Retry twice on no response (ETIMEDOUT)
    noResponseRetries: 2,
    onRetryAttempt: (err) => {
        const cfg = rax.getConfig(err);
        if (cfg) {
            logger.warn(`HTTP retry attempt #${cfg.currentRetryAttempt}. ${err.message}`);
        } else {
            logger.warn(`HTTP retry. ${err.message}`);
        }
    },
};

const retryableAxiosInstance = Axios.create();
export const retryableAxios = (config: AxiosRequestConfig): AxiosPromise => {
    return retryableAxiosInstance({
        ...config,
        raxConfig: {
            instance: retryableAxiosInstance,
            ...DEFAULT_RETRY_CONFIG,
            ...config.raxConfig,
        },
    });
};
// Attach retry-axios only to our specific instance
rax.attach(retryableAxiosInstance);
