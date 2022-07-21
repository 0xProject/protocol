// tslint:disable:max-file-line-count
import {
    InternalServerError,
    InvalidAPIKeyError,
    isAPIError,
    ValidationError,
    ValidationErrorCodes,
} from '@0x/api-utils';
import { OtcOrder } from '@0x/protocol-utils';
import { getTokenMetadataIfExists, isNativeSymbolOrAddress, nativeWrappedTokenSymbol } from '@0x/token-metadata';
import { addressUtils, BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import { Counter } from 'prom-client';

import { Integrator } from '../config';
import { schemas } from '../schemas';
import { RfqmService } from '../services/rfqm_service';
import {
    FetchFirmQuoteParams,
    FetchIndicativeQuoteParams,
    FetchQuoteParamsBase,
    GaslessApprovalTypes,
    OtcOrderSubmitRfqmSignedQuoteParams,
    RfqmTypes,
    SubmitRfqmSignedQuoteWithApprovalParams,
} from '../services/types';
import { ConfigManager } from '../utils/config_manager';
import { HealthCheckResult, transformResultToShortResponse } from '../utils/rfqm_health_check';
import {
    RawOtcOrderFields,
    StringSignatureFields,
    stringsToEIP712Context,
    stringsToOtcOrderFields,
    stringsToSignature,
} from '../utils/rfqm_request_utils';
import { RfqmServices } from '../utils/rfqm_service_builder';
import { schemaUtils } from '../utils/schema_utils';

// TODO (MKR-123): Remove the apiKey reference once dashboards are updated
const RFQM_INDICATIVE_QUOTE_REQUEST = new Counter({
    name: 'rfqm_handler_indicative_quote_requested',
    help: 'Request made to fetch rfqm indicative quote',
    labelNames: ['apiKey', 'integratorId'],
});

const RFQM_INDICATIVE_QUOTE_NOT_FOUND = new Counter({
    name: 'rfqm_handler_indicative_quote_not_found',
    help: 'Request to fetch rfqm indicative quote returned no quote',
    labelNames: ['apiKey', 'integratorId'],
});

const RFQM_INDICATIVE_QUOTE_ERROR = new Counter({
    name: 'rfqm_handler_indicative_quote_error',
    help: 'Request to fetch rfqm indicative quote resulted in error',
    labelNames: ['apiKey', 'integratorId'],
});

const RFQM_FIRM_QUOTE_REQUEST = new Counter({
    name: 'rfqm_handler_firm_quote_requested',
    help: 'Request made to fetch rfqm firm quote',
    labelNames: ['apiKey', 'integratorId'],
});

const RFQM_FIRM_QUOTE_NOT_FOUND = new Counter({
    name: 'rfqm_handler_firm_quote_not_found',
    help: 'Request to fetch rfqm firm quote returned no quote',
    labelNames: ['apiKey', 'integratorId'],
});

const RFQM_FIRM_QUOTE_ERROR = new Counter({
    name: 'rfqm_handler_firm_quote_error',
    help: 'Request to fetch rfqm firm quote resulted in error',
    labelNames: ['apiKey', 'integratorId'],
});

const RFQM_SIGNED_QUOTE_SUBMITTED = new Counter({
    name: 'rfqm_handler_signed_quote_submitted',
    help: 'Request received to submit a signed rfqm quote',
    labelNames: ['apiKey', 'integratorId'],
});

// If the cache is more milliseconds old than the value specified here, it will be refreshed.
const HEALTH_CHECK_RESULT_CACHE_DURATION_MS = 30000;

type RfqmHealthCheckResultCache = [HealthCheckResult, Date];

export class RfqmHandlers {
    private readonly _cachedHealthCheckResultByChainId = new Map<number, RfqmHealthCheckResultCache>();
    constructor(private readonly _rfqmServices: RfqmServices, private readonly _configManager: ConfigManager) {}

    public async getIndicativeQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const integratorId = this._configManager.getIntegratorIdForApiKey(req.header('0x-api-key') || '') ?? 'N/A';
        RFQM_INDICATIVE_QUOTE_REQUEST.labels(integratorId, integratorId).inc();

        // Parse request
        const { chainId, params } = await this._parseFetchIndicativeQuoteParamsAsync(req);

        // Try to get indicative quote
        let indicativeQuote;
        try {
            indicativeQuote = await this._getServiceForChain(chainId).fetchIndicativeQuoteAsync(params);
        } catch (err) {
            req.log.error(err, 'Encountered an error while fetching an rfqm indicative quote');
            RFQM_INDICATIVE_QUOTE_ERROR.labels(integratorId, integratorId).inc();
            throw new InternalServerError('Unexpected error encountered');
        }

        // Log no quote returned
        if (indicativeQuote === null) {
            RFQM_INDICATIVE_QUOTE_NOT_FOUND.labels(integratorId, integratorId).inc();
        }

        // Result
        res.status(HttpStatus.OK).send({
            liquidityAvailable: indicativeQuote !== null,
            ...indicativeQuote,
        });
    }

    public async getFirmQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const integratorId = this._configManager.getIntegratorIdForApiKey(req.header('0x-api-key') || '') ?? 'N/A';
        RFQM_FIRM_QUOTE_REQUEST.labels(integratorId, integratorId).inc();

        // Parse request
        const { chainId, params } = await this._parseFetchFirmQuoteParamsAsync(req);

        // Try to get firm quote
        let firmQuote;
        try {
            firmQuote = await this._getServiceForChain(chainId).fetchFirmQuoteAsync(params);
        } catch (err) {
            req.log.error(err, 'Encountered an error while fetching an rfqm firm quote');
            RFQM_FIRM_QUOTE_ERROR.labels(integratorId, integratorId).inc();
            throw new InternalServerError('Unexpected error encountered');
        }

        // Log no quote returned
        if (firmQuote === null) {
            RFQM_FIRM_QUOTE_NOT_FOUND.labels(integratorId, integratorId).inc();
        }

        // Result
        res.status(HttpStatus.OK).send({
            liquidityAvailable: firmQuote !== null,
            ...firmQuote,
        });
    }

    /**
     * Handler for the `/rfqm/v1/healthz` endpoint.
     */
    public async getHealthAsync(req: express.Request, res: express.Response): Promise<void> {
        const chainId = extractChainId(req);
        const cachedResult = this._cachedHealthCheckResultByChainId.get(chainId);
        let result: HealthCheckResult;
        if (!cachedResult) {
            result = await this._getServiceForChain(chainId).runHealthCheckAsync();
            this._cachedHealthCheckResultByChainId.set(chainId, [result, new Date()]);
        } else {
            const cacheAgeMs = Date.now() - cachedResult[1].getTime();
            if (cacheAgeMs >= HEALTH_CHECK_RESULT_CACHE_DURATION_MS) {
                result = await this._getServiceForChain(chainId).runHealthCheckAsync();
                this._cachedHealthCheckResultByChainId.set(chainId, [result, new Date()]);
            } else {
                result = cachedResult[0];
            }
        }

        const response = transformResultToShortResponse(result);
        res.status(HttpStatus.OK).send(response);
    }

    public async getStatusAsync(req: express.Request, res: express.Response): Promise<void> {
        const chainId = extractChainId(req);
        const { orderHash } = req.params;

        const status = await this._getServiceForChain(chainId).getOrderStatusAsync(orderHash);

        status ? res.status(HttpStatus.OK).send(status) : res.status(HttpStatus.NOT_FOUND).send();
    }

    public async submitSignedQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const { chainId, integrator, params } = this._parseSubmitSignedQuoteParams(req);
        RFQM_SIGNED_QUOTE_SUBMITTED.labels(integrator.integratorId, integrator.integratorId).inc();
        try {
            const response = await this._getServiceForChain(chainId).submitTakerSignedOtcOrderAsync(params);
            res.status(HttpStatus.CREATED).send(response);
        } catch (err) {
            req.log.error(err, 'Encountered an error while queuing a signed quote');
            if (isAPIError(err)) {
                throw err;
            } else {
                throw new InternalServerError(`An unexpected error occurred`);
            }
        }
    }

    public async submitSignedQuoteWithApprovalAsync(req: express.Request, res: express.Response): Promise<void> {
        const { chainId, integrator, params } = this._parseSubmitSignedQuoteWithApprovalParams(req);
        RFQM_SIGNED_QUOTE_SUBMITTED.labels(integrator.integratorId, integrator.integratorId).inc();
        try {
            const response = await this._getServiceForChain(chainId).submitTakerSignedOtcOrderWithApprovalAsync(params);
            res.status(HttpStatus.CREATED).send(response);
        } catch (err) {
            req.log.error(err, 'Encountered an error while queuing a signed quote with approval');
            if (isAPIError(err)) {
                throw err;
            } else {
                throw new InternalServerError(`An unexpected error occurred`);
            }
        }
    }

    private async _parseFetchFirmQuoteParamsAsync(
        req: express.Request,
    ): Promise<{ chainId: number; params: FetchFirmQuoteParams }> {
        schemaUtils.validateSchema(req.query, schemas.firmQuoteRequestSchema as any);
        const takerAddress = req.query.takerAddress;
        const shouldCheckApproval = req.query.checkApproval === 'true' ? true : false;
        const { chainId, params } = await this._parseIndicativeAndFirmQuoteSharedParamsAsync(req);
        if (!addressUtils.isAddress(takerAddress as string)) {
            throw new ValidationError([
                {
                    field: 'takerAddress',
                    code: ValidationErrorCodes.InvalidAddress,
                    reason: `Must provide a valid takerAddress`,
                },
            ]);
        }
        return {
            chainId,
            params: {
                ...params,
                takerAddress: takerAddress as string,
                checkApproval: shouldCheckApproval,
            },
        };
    }

    private _getServiceForChain(chainId: number): RfqmService {
        const service = this._rfqmServices.get(chainId);

        if (!service) {
            throw new Error('No configuration exists for chain');
        }
        return service;
    }

    /**
     * Examines the API key provided in the request, ensures it is valid for RFQM, and fetches the associated
     * integrator ID.
     */
    private _validateApiKey(apiKey: string | undefined, chainId: number): { apiKey: string; integrator: Integrator } {
        if (apiKey === undefined) {
            throw new InvalidAPIKeyError('Must access with an API key');
        }
        if (!this._configManager.getRfqmApiKeyWhitelist().has(apiKey)) {
            throw new InvalidAPIKeyError('API key not authorized for RFQM access');
        }
        const integratorId = this._configManager.getIntegratorIdForApiKey(apiKey);
        if (!integratorId) {
            // With a valid configuration this should never happen
            throw new InvalidAPIKeyError('API key has no associated Integrator ID');
        }
        const integrator = this._configManager.getIntegratorByIdOrThrow(integratorId);
        if (!integrator.allowedChainIds.includes(chainId)) {
            throw new InvalidAPIKeyError(`API Key not authorized to access chain ${chainId}`);
        }
        return { apiKey, integrator };
    }

    private async _parseFetchIndicativeQuoteParamsAsync(
        req: express.Request,
    ): Promise<{ chainId: number; params: FetchIndicativeQuoteParams }> {
        schemaUtils.validateSchema(req.query, schemas.indicativeQuoteRequestSchema as any);
        const { takerAddress } = req.query;
        const { chainId, params } = await this._parseIndicativeAndFirmQuoteSharedParamsAsync(req);

        return {
            chainId,
            params: {
                ...params,
                takerAddress: takerAddress as string,
            },
        };
    }

    /**
     * Parse shared params of indicative and firm quotes.
     *
     * @param req The request object.
     * @returns Chain ID and parsed shared params of indicative and firm quotes.
     */
    private async _parseIndicativeAndFirmQuoteSharedParamsAsync(
        req: express.Request,
    ): Promise<{ chainId: number; params: FetchQuoteParamsBase }> {
        const chainId = extractChainId(req);
        const { integrator } = this._validateApiKey(req.header('0x-api-key'), chainId);
        const { affiliateAddress } = req.query;

        // Parse tokens
        const sellTokenRaw = req.query.sellToken as string;
        const buyTokenRaw = req.query.buyToken as string;
        validateNotNativeTokenOrThrow(sellTokenRaw, chainId, 'sellToken');

        let buyTokenDecimals: number;
        let sellTokenDecimals: number;
        let buyTokenContractAddress: string;
        let sellTokenContractAddress: string;

        try {
            buyTokenContractAddress = buyTokenRaw.toLocaleLowerCase().startsWith('0x')
                ? buyTokenRaw
                : contractAddressForSymbol(buyTokenRaw, chainId);
            buyTokenDecimals = await this._getServiceForChain(chainId).getTokenDecimalsAsync(buyTokenRaw);
        } catch {
            throw new ValidationError([
                {
                    field: 'buyToken',
                    code: ValidationErrorCodes.AddressNotSupported,
                    reason: `Token ${buyTokenRaw} is currently unsupported`,
                },
            ]);
        }

        try {
            sellTokenContractAddress = sellTokenRaw.toLocaleLowerCase().startsWith('0x')
                ? sellTokenRaw
                : contractAddressForSymbol(sellTokenRaw, chainId);
            sellTokenDecimals = await this._getServiceForChain(chainId).getTokenDecimalsAsync(sellTokenRaw);
        } catch {
            throw new ValidationError([
                {
                    field: 'sellToken',
                    code: ValidationErrorCodes.AddressNotSupported,
                    reason: `Token ${sellTokenRaw} is currently unsupported`,
                },
            ]);
        }

        // Parse number params
        const sellAmount =
            req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount as string);
        const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount as string);

        return {
            chainId,
            params: {
                buyAmount,
                buyToken: buyTokenContractAddress,
                buyTokenDecimals,
                integrator,
                sellAmount,
                sellToken: sellTokenContractAddress,
                sellTokenDecimals,
                affiliateAddress: affiliateAddress as string,
            },
        };
    }

    private _parseSubmitSignedQuoteParams(req: express.Request): {
        chainId: number;
        integrator: Integrator;
        params: OtcOrderSubmitRfqmSignedQuoteParams;
    } {
        const type = req.body.type as RfqmTypes;
        const chainId = extractChainId(req);
        const { integrator } = this._validateApiKey(req.header('0x-api-key'), chainId);

        if (type === RfqmTypes.OtcOrder) {
            const order = new OtcOrder(stringsToOtcOrderFields(req.body.order as RawOtcOrderFields));
            const signature = stringsToSignature(req.body.signature as StringSignatureFields);
            return {
                chainId,
                integrator,
                params: {
                    type,
                    order,
                    signature,
                },
            };
        } else {
            throw new ValidationError([
                {
                    field: 'type',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: `${type} is an invalid value for 'type'`,
                },
            ]);
        }
    }

    private _parseSubmitSignedQuoteWithApprovalParams(req: express.Request): {
        chainId: number;
        integrator: Integrator;
        params: SubmitRfqmSignedQuoteWithApprovalParams;
    } {
        const chainId = extractChainId(req);
        const { integrator } = this._validateApiKey(req.header('0x-api-key'), chainId);

        const { approval, trade } = req.body;

        const parsedParams: Partial<SubmitRfqmSignedQuoteWithApprovalParams> = {};

        // Parse approval params
        if (approval) {
            if (approval.type === GaslessApprovalTypes.ExecuteMetaTransaction) {
                const eip712 = stringsToEIP712Context(approval.eip712);
                const signature = stringsToSignature(approval.signature as StringSignatureFields);
                parsedParams.approval = {
                    type: approval.type,
                    eip712,
                    signature,
                };
            } else {
                throw new ValidationError([
                    {
                        field: 'approval',
                        code: ValidationErrorCodes.FieldInvalid,
                        reason: `${approval.type} is an invalid value for Approval 'type'`,
                    },
                ]);
            }
        }

        // Parse trade params
        if (trade.type === RfqmTypes.OtcOrder) {
            const order = new OtcOrder(stringsToOtcOrderFields(trade.order as RawOtcOrderFields));
            const signature = stringsToSignature(trade.signature as StringSignatureFields);
            parsedParams.trade = {
                type: trade.type,
                order,
                signature,
            };
        } else {
            throw new ValidationError([
                {
                    field: 'type',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: `${trade.type} is an invalid value for Trade 'type'`,
                },
            ]);
        }

        return { chainId, integrator, params: parsedParams as SubmitRfqmSignedQuoteWithApprovalParams };
    }
}

/**
 * Extracts the Chain Id from the request. If none is provided, assumes a Chain Id of 1 (for backwards compatibility)
 *
 * @param req - the Express Request object
 * @returns the chain Id for this request
 */
const extractChainId = (req: express.Request): number => {
    const chainIdFromHeader = req.header('0x-chain-id');
    if (chainIdFromHeader === undefined) {
        return 1;
    } else {
        const parsedInt = parseInt(chainIdFromHeader, 10);
        if (Number.isNaN(parsedInt)) {
            throw new ValidationError([
                {
                    field: '0x-chain-id',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: 'Invalid chain id',
                },
            ]);
        }
        return parsedInt;
    }
};

/**
 * Gets the token address for a given symbol.
 *
 * Throws if the symbol is not present in @0x/token-metadata
 */
const contractAddressForSymbol = (symbol: string, chainId: number): string => {
    const address = getTokenMetadataIfExists(symbol, chainId)?.tokenAddress;
    if (!address) {
        throw new Error('Unsupported token');
    }
    return address;
};

const validateNotNativeTokenOrThrow = (token: string, chainId: number, field: string): boolean => {
    if (isNativeSymbolOrAddress(token, chainId)) {
        const symbol = nativeWrappedTokenSymbol(chainId);
        throw new ValidationError([
            {
                field,
                code: ValidationErrorCodes.TokenNotSupported,
                reason: `Unwrapped Native Asset is not supported. Use ${symbol} instead`,
            },
        ]);
    }

    return true;
};
