import { assert } from '@0x/assert';
import { ERC20BridgeSource } from '@0x/asset-swapper';

import { ValidationError, ValidationErrorCodes, ValidationErrorReasons } from '../errors';
import {
    MetaTransactionDailyLimiterConfig,
    MetaTransactionRateLimitConfig,
    MetaTransactionRollingLimiterConfig,
    MetaTransactionRollingValueLimiterConfig,
} from '../types';

import { AvailableRateLimiter, DatabaseKeysUsedForRateLimiter, RollingLimiterIntervalUnit } from './rate-limiters';

interface ParseRequestForExcludedSourcesParams {
    takerAddress?: string;
    excludedSources?: string;
    includedSources?: string;
    intentOnFilling?: string;
    apiKey?: string;
}

export interface ParseRequestForExcludedSourcesResult {
    excludedSources: ERC20BridgeSource[];
    includedSources: ERC20BridgeSource[];
    nativeExclusivelyRFQT: boolean;
}

export const parseUtils = {
    parseRequestForExcludedSources(
        request: ParseRequestForExcludedSourcesParams,
        validApiKeys: string[],
        endpoint: 'price' | 'quote',
    ): ParseRequestForExcludedSourcesResult {
        const excludedIds = request.excludedSources ? request.excludedSources.split(',') : [];
        const includedIds = request.includedSources ? request.includedSources.split(',') : [];

        // Ensure that both filtering arguments cannot be present.
        if (excludedIds.length !== 0 && includedIds.length !== 0) {
            throw new ValidationError([
                {
                    field: 'excludedSources',
                    code: ValidationErrorCodes.IncorrectFormat,
                    reason: ValidationErrorReasons.ConflictingFilteringArguments,
                },
                {
                    field: 'includedSources',
                    code: ValidationErrorCodes.IncorrectFormat,
                    reason: ValidationErrorReasons.ConflictingFilteringArguments,
                },
            ]);
        }

        // If excludedSources is present, just return those.
        if (excludedIds.length > 0) {
            return {
                excludedSources: parseUtils.parseStringArrForERC20BridgeSources(excludedIds),
                includedSources: [],
                // Exclude open orderbook if 'Mesh' is excluded.
                nativeExclusivelyRFQT: excludedIds.includes('Mesh'),
            };
        }

        // Is RFQT is being explicitly requested?
        if (includedIds.includes('RFQT')) {
            // We assume that if a `takerAddress` key is present, it's value was already validated by the JSON
            // schema.
            if (request.takerAddress === undefined) {
                throw new ValidationError([
                    {
                        field: 'takerAddress',
                        code: ValidationErrorCodes.RequiredField,
                        reason: ValidationErrorReasons.TakerAddressInvalid,
                    },
                ]);
            }

            // We enforce a valid API key - we don't want to fail silently.
            if (request.apiKey === undefined) {
                throw new ValidationError([
                    {
                        field: '0x-api-key',
                        code: ValidationErrorCodes.RequiredField,
                        reason: ValidationErrorReasons.InvalidApiKey,
                    },
                ]);
            }
            if (!validApiKeys.includes(request.apiKey)) {
                throw new ValidationError([
                    {
                        field: '0x-api-key',
                        code: ValidationErrorCodes.FieldInvalid,
                        reason: ValidationErrorReasons.InvalidApiKey,
                    },
                ]);
            }

            // If the user is requesting a firm quote, we want to make sure that `intentOnFilling` is set to "true".
            if (endpoint === 'quote' && request.intentOnFilling !== 'true') {
                throw new ValidationError([
                    {
                        field: 'intentOnFilling',
                        code: ValidationErrorCodes.RequiredField,
                        reason: ValidationErrorReasons.RequiresIntentOnFilling,
                    },
                ]);
            }

            return {
                excludedSources: [],
                includedSources: parseUtils.parseStringArrForERC20BridgeSources(['0x', ...includedIds]),
                nativeExclusivelyRFQT: !includedIds.includes('0x') && !includedIds.includes('Native'),
            };
        }

        return {
            excludedSources: [],
            includedSources: parseUtils.parseStringArrForERC20BridgeSources(includedIds),
            nativeExclusivelyRFQT: false,
        };
    },
    parseStringArrForERC20BridgeSources(sources: string[]): ERC20BridgeSource[] {
        // Need to compare value of the enum instead of the key, as values are used by asset-swapper
        // CurveUsdcDaiUsdt = 'Curve_USDC_DAI_USDT' is sources=Curve_USDC_DAI_USDT
        // Also remove duplicates by assigning to an object then converting to keys.
        return Object.keys(
            Object.assign(
                {},
                ...sources
                    .map(source => (source === '0x' ? 'Native' : source))
                    .filter(source => Object.values(ERC20BridgeSource).includes(source as ERC20BridgeSource))
                    .map(s => ({ [s]: s })),
            ),
        ) as ERC20BridgeSource[];
    },
    parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString: string): MetaTransactionRateLimitConfig {
        const parsedConfig: object = JSON.parse(configString);
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
