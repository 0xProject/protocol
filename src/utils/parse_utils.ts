import { assert } from '@0x/assert';
import { ERC20BridgeSource } from '@0x/asset-swapper';

import {
    MetaTransactionDailyLimiterConfig,
    MetaTransactionRateLimitConfig,
    MetaTransactionRollingLimiterConfig,
    MetaTransactionRollingValueLimiterConfig,
} from '../types';

import { AvailableRateLimiter, DatabaseKeysUsedForRateLimiter, RollingLimiterIntervalUnit } from './rate-limiters';

export const parseUtils = {
    parseStringArrForERC20BridgeSources(excludedSources: string[]): ERC20BridgeSource[] {
        // Need to compare value of the enum instead of the key, as values are used by asset-swapper
        // CurveUsdcDaiUsdt = 'Curve_USDC_DAI_USDT' is excludedSources=Curve_USDC_DAI_USDT
        return excludedSources
            .map(source => (source === '0x' ? 'Native' : source))
            .filter((source: string) =>
                Object.keys(ERC20BridgeSource).find((k: any) => ERC20BridgeSource[k] === source),
            ) as ERC20BridgeSource[];
    },
    parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString: string): MetaTransactionRateLimitConfig {
        const parsedConfig = JSON.parse(configString);
        Object.entries(parsedConfig).forEach(entry => {
            const [key, value] = entry;
            assert.doesBelongToStringEnum('dbField', key, DatabaseKeysUsedForRateLimiter);
            Object.entries(value).forEach(configEntry => {
                const [rateLimiterType, rateLimiterConfig] = configEntry;
                switch (rateLimiterType) {
                    case AvailableRateLimiter.Daily:
                        const dailyConfig = rateLimiterConfig as MetaTransactionDailyLimiterConfig;
                        if (dailyConfig === undefined) {
                            throw new Error(`missing configuration for daily rate limiter: ${entry}`);
                        }
                        assert.isNumber('allowedDailyLimit', dailyConfig.allowedDailyLimit);
                        break;
                    case AvailableRateLimiter.Rolling:
                        const rollingConfig = rateLimiterConfig as MetaTransactionRollingLimiterConfig;
                        if (rollingConfig === undefined) {
                            throw new Error(`missing configuration for rolling rate limiter: ${entry}`);
                        }
                        assert.isNumber('allowedLimit', rollingConfig.allowedLimit);
                        assert.isNumber('intervalNumber', rollingConfig.intervalNumber);
                        assert.doesBelongToStringEnum(
                            'intervalUnit',
                            rollingConfig.intervalUnit,
                            RollingLimiterIntervalUnit,
                        );
                        break;
                    case AvailableRateLimiter.RollingValue:
                        const rollingValueConfig = rateLimiterConfig as MetaTransactionRollingValueLimiterConfig;
                        if (rollingValueConfig === undefined) {
                            throw new Error(`missing configuration for rolling value rate limiter: ${entry}`);
                        }
                        assert.isNumber('allowedLimitEth', rollingValueConfig.allowedLimitEth);
                        assert.isNumber('intervalNumber', rollingValueConfig.intervalNumber);
                        assert.doesBelongToStringEnum(
                            'intervalUnit',
                            rollingValueConfig.intervalUnit,
                            RollingLimiterIntervalUnit,
                        );
                        break;
                    default:
                        throw new Error(`unsupported rate limiter type: ${key}`);
                }
            });
        });

        return parsedConfig;
    },
};
