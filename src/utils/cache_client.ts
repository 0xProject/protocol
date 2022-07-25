import { RedisClientType } from 'redis';

const OTC_ORDER_NONCE_BUCKET_COUNTER_KEY = (chainId: number) => `otcorder.nonce.bucket.counter.chain.${chainId}`;

export class CacheClient {
    constructor(private readonly _redisClient: RedisClientType) {}

    // Shut down the CacheClient safely
    public async closeAsync(): Promise<void> {
        return this._redisClient.quit();
    }

    // Get the next OtcOrder Bucket
    // NOTE: unliklely to ever hit this, but the node library we use tries to cast the response from Redis as a number.
    // However, MAX_INT for js is lower than MAX_INT for Redis. We also need to be aware of if Redis' MAX_INT ever gets hit (error)
    public async getNextOtcOrderBucketAsync(chainId: number): Promise<number> {
        return this._redisClient.incr(OTC_ORDER_NONCE_BUCKET_COUNTER_KEY(chainId));
    }
}
