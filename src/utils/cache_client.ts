import { RedisClient } from 'redis';

const OTC_ORDER_NONCE_BUCKET_COUNTER_KEY = 'otcorder.nonce.bucket.counter';

export class CacheClient {
    constructor(private readonly _redisClient: RedisClient) {}

    // Shut down the CacheClient safely
    public async closeAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._redisClient.quit((err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    // Get the next OtcOrder Bucket
    // NOTE: unliklely to ever hit this, but the node library we use tries to cast the response from Redis as a number.
    // However, MAX_INT for js is lower than MAX_INT for Redis. We also need to be aware of if Redis' MAX_INT ever gets hit (error)
    public async getNextOtcOrderBucketAsync(): Promise<number> {
        return new Promise((resolve, reject) => {
            this._redisClient.incr(OTC_ORDER_NONCE_BUCKET_COUNTER_KEY, (err, valueAfterIncr) => {
                if (err) {
                    reject(err);
                }
                resolve(valueAfterIncr);
            });
        });
    }
}
