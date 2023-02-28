import express from 'express';

import { AffiliateFeeType, ERC20BridgeSource } from '../asset-swapper';
import { NULL_ADDRESS } from '../constants';
import { ValidationError, ValidationErrorCodes, ValidationErrorReasons } from '../errors';
import { AffiliateFee, FeeParamTypes } from '../types';

interface ParseRequestForExcludedSourcesParams {
    takerAddress?: string;
    excludedSources?: string;
    includedSources?: string;
    intentOnFilling?: string;
    apiKey?: string;
}

interface ParseRequestForExcludedSourcesResult {
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
                nativeExclusivelyRFQT:
                    excludedIds.includes('Mesh') && !excludedIds.includes('0x') && !excludedIds.includes('Native'),
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
                    .map((source) => (source === '0x' ? 'Native' : source))
                    .filter((source) => Object.values(ERC20BridgeSource).includes(source as ERC20BridgeSource))
                    .map((s) => ({ [s]: s })),
            ),
        ) as ERC20BridgeSource[];
    },
    parseAssetDatasStringFromQueryParam(field: string): string | string[] {
        if (field.indexOf(',') !== -1) {
            const fields = field.split(',');
            return fields;
        }
        return field;
    },
    parseAffiliateFeeOptions(req: express.Request): AffiliateFee {
        const { feeRecipient } = req.query;
        const sellTokenPercentageFee = Number.parseFloat(req.query.sellTokenPercentageFee as string) || 0;
        const buyTokenPercentageFee = Number.parseFloat(req.query.buyTokenPercentageFee as string) || 0;
        if (sellTokenPercentageFee > 0) {
            throw new ValidationError([
                {
                    field: 'sellTokenPercentageFee',
                    code: ValidationErrorCodes.UnsupportedOption,
                    reason: ValidationErrorReasons.ArgumentNotYetSupported,
                },
            ]);
        }
        if (buyTokenPercentageFee > 1) {
            throw new ValidationError([
                {
                    field: 'buyTokenPercentageFee',
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: ValidationErrorReasons.PercentageOutOfRange,
                },
            ]);
        }
        let feeType = AffiliateFeeType.None;
        if (buyTokenPercentageFee > 0) {
            feeType = AffiliateFeeType.PercentageFee;
        } else if (req.query.feeType === FeeParamTypes.GASLESS_FEE) {
            feeType = AffiliateFeeType.GaslessFee;
        }

        if (feeType !== AffiliateFeeType.None && feeRecipient === undefined) {
            throw new ValidationError([
                {
                    field: 'feeRecipient',
                    code: ValidationErrorCodes.UnsupportedOption,
                    reason: ValidationErrorReasons.FeeRecipientMissing,
                },
            ]);
        }
        const affiliateFee = feeRecipient
            ? {
                  feeType,
                  recipient: feeRecipient as string,
                  sellTokenPercentageFee,
                  buyTokenPercentageFee,
              }
            : {
                  feeType,
                  recipient: NULL_ADDRESS,
                  sellTokenPercentageFee: 0,
                  buyTokenPercentageFee: 0,
              };
        return affiliateFee;
    },
};
