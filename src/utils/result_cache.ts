import { TEN_MINUTES_MS } from '../constants';
import { logger } from '../logger';

export interface CachedResult<T> {
    timestamp: number;
    result: T;
}

export interface ResultCache<T> {
    getResultAsync: (args?: any) => Promise<CachedResult<T>>;
}

export const createResultCache = <T>(
    fn: (fnArgs?: any) => Promise<T>,
    cacheExpiryMs: number = TEN_MINUTES_MS,
): ResultCache<T> => {
    const resultCache: { [key: string]: { timestamp: number; result: T } } = {};
    return {
        getResultAsync: async (getArgs?: any): Promise<CachedResult<T>> => {
            let timestamp = resultCache[getArgs] && resultCache[getArgs].timestamp;
            let result = resultCache[getArgs] && resultCache[getArgs].result;
            if (!result || !timestamp || timestamp < Date.now() - cacheExpiryMs) {
                try {
                    result = await fn(getArgs);
                    timestamp = Date.now();
                    resultCache[getArgs] = { timestamp, result };
                } catch (e) {
                    if (!result) {
                        // Throw if we've never received a result
                        throw e;
                    }
                    logger.warn(`Error performing cache miss update: ${e}`);
                }
            }
            return { timestamp, result };
        },
    };
};
