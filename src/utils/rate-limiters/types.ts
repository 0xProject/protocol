export enum AvailableRateLimiter {
    Daily = 'daily',
    Rolling = 'rolling',
    RollingValue = 'rollingValue',
}

export enum RollingLimiterIntervalUnit {
    Hours = 'hours',
    Minutes = 'minutes',
}

export enum DatabaseKeysUsedForRateLimiter {
    ApiKey = 'api_key',
    TakerAddress = 'taker_address',
}

export interface MetaTransactionRateLimiterContext {
    apiKey: string;
    takerAddress: string;
}

export interface MetaTransactionRateLimiterAllowedResponse {
    isAllowed: boolean;
}

export interface MetaTransactionRateLimiterRejectedResponse {
    isAllowed: boolean;
    reason: string;
}

export type MetaTransactionRateLimiterResponse =
    | MetaTransactionRateLimiterAllowedResponse
    | MetaTransactionRateLimiterRejectedResponse;

export interface MetaTransactionRollingLimiterConfig {
    allowedLimit: number;
    intervalNumber: number;
    intervalUnit: RollingLimiterIntervalUnit;
}

export interface MetaTransactionRollingValueLimiterConfig {
    allowedLimitEth: number;
    intervalNumber: number;
    intervalUnit: RollingLimiterIntervalUnit;
}

export interface MetaTransactionDailyLimiterConfig {
    allowedDailyLimit: number;
}

export type MetaTransactionRateLimitConfig = {
    [key in DatabaseKeysUsedForRateLimiter]?: {
        [AvailableRateLimiter.Daily]?: MetaTransactionDailyLimiterConfig;
        [AvailableRateLimiter.Rolling]?: MetaTransactionRollingLimiterConfig;
        [AvailableRateLimiter.RollingValue]?: MetaTransactionRollingValueLimiterConfig;
    };
};
