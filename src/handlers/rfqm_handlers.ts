// tslint:disable:max-file-line-count
import {
    InternalServerError,
    InvalidAPIKeyError,
    isAPIError,
    NotImplementedError,
    ValidationError,
    ValidationErrorCodes,
} from '@0x/api-utils';
import { MetaTransaction } from '@0x/protocol-utils';
import { getTokenMetadataIfExists, isNativeSymbolOrAddress, TokenMetadata } from '@0x/token-metadata';
import { addressUtils, BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import { Counter } from 'prom-client';

import { CHAIN_ID, Integrator, NATIVE_WRAPPED_TOKEN_SYMBOL } from '../config';
import { schemas } from '../schemas';
import {
    FetchFirmQuoteParams,
    FetchIndicativeQuoteParams,
    RfqmService,
    RfqmTypes,
    SubmitRfqmSignedQuoteParams,
} from '../services/rfqm_service';
import { ConfigManager } from '../utils/config_manager';
import { HealthCheckResult, transformResultToShortResponse } from '../utils/rfqm_health_check';
import {
    StringMetaTransactionFields,
    StringSignatureFields,
    stringsToMetaTransactionFields,
    stringsToSignature,
} from '../utils/rfqm_request_utils';
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

// If the cache is more seconds old than the value specified here, it will be refreshed.
const HEALTH_CHECK_RESULT_CACHE_DURATION_S = 30;

type RfqmHealthCheckResultCache = [HealthCheckResult, Date];

export class RfqmHandlers {
    private _cachedHealthCheckResult: RfqmHealthCheckResultCache | null = null;
    constructor(private readonly _rfqmService: RfqmService, private readonly _configManager: ConfigManager) {}

    public async getIndicativeQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const integratorId = this._configManager.getIntegratorIdForApiKey(req.header('0x-api-key') || '') ?? 'N/A';
        RFQM_INDICATIVE_QUOTE_REQUEST.labels(integratorId, integratorId).inc();

        // Parse request
        const params = this._parseFetchIndicativeQuoteParams(req);

        // Try to get indicative quote
        let indicativeQuote;
        try {
            indicativeQuote = await this._rfqmService.fetchIndicativeQuoteAsync(params);
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
        const params = this._parseFetchFirmQuoteParams(req);

        // Try to get firm quote
        let firmQuote;
        try {
            firmQuote = await this._rfqmService.fetchFirmQuoteAsync(params);
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
        let result: HealthCheckResult;
        if (this._cachedHealthCheckResult === null) {
            result = await this._rfqmService.runHealthCheckAsync();
            this._cachedHealthCheckResult = [result, new Date()];
        } else {
            const cacheAgeMs = Date.now() - this._cachedHealthCheckResult[1].getTime();
            // tslint:disable-next-line: custom-no-magic-numbers
            if (cacheAgeMs >= HEALTH_CHECK_RESULT_CACHE_DURATION_S * 1000) {
                result = await this._rfqmService.runHealthCheckAsync();
                this._cachedHealthCheckResult = [result, new Date()];
            } else {
                result = this._cachedHealthCheckResult[0];
            }
        }

        const response = transformResultToShortResponse(result);
        res.status(HttpStatus.OK).send(response);
    }

    public async getStatusAsync(req: express.Request, res: express.Response): Promise<void> {
        const { orderHash } = req.params;

        const status = await this._rfqmService.getOrderStatusAsync(orderHash);

        status ? res.status(HttpStatus.OK).send(status) : res.status(HttpStatus.NOT_FOUND).send();
    }

    public async submitSignedQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const params = this._parseSubmitSignedQuoteParams(req);
        RFQM_SIGNED_QUOTE_SUBMITTED.labels(params.integrator.integratorId, params.integrator.integratorId).inc();

        if (params.type === RfqmTypes.MetaTransaction) {
            try {
                const response = await this._rfqmService.submitMetaTransactionSignedQuoteAsync(params);
                res.status(HttpStatus.CREATED).send(response);
            } catch (err) {
                req.log.error(err, 'Encountered an error while queuing a signed quote');
                if (isAPIError(err)) {
                    throw err;
                } else {
                    throw new InternalServerError(`An unexpected error occurred`);
                }
            }
        } else {
            throw new NotImplementedError('rfqm type not supported');
        }
    }

    private _parseFetchFirmQuoteParams(req: express.Request): FetchFirmQuoteParams {
        // Same as indicative except requires takerAddress
        const indicativeQuoteRequest = this._parseFetchIndicativeQuoteParams(req);
        const takerAddress = indicativeQuoteRequest.takerAddress || '';
        if (takerAddress === '') {
            throw new ValidationError([
                {
                    field: 'takerAddress',
                    code: ValidationErrorCodes.RequiredField,
                    reason: `The field takerAddress is missing`,
                },
            ]);
        } else if (!addressUtils.isAddress(takerAddress)) {
            throw new ValidationError([
                {
                    field: 'takerAddress',
                    code: ValidationErrorCodes.InvalidAddress,
                    reason: `Must provide a valid takerAddress`,
                },
            ]);
        }
        return {
            ...indicativeQuoteRequest,
            takerAddress,
        };
    }

    /**
     * Examines the API key provided in the request, ensures it is valid for RFQM, and fetches the associated
     * integrator ID.
     */
    private _validateApiKey(apiKey: string | undefined): { apiKey: string; integrator: Integrator } {
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
        return { apiKey, integrator };
    }

    private _parseFetchIndicativeQuoteParams(req: express.Request): FetchIndicativeQuoteParams {
        // HACK - reusing the validation for Swap Quote as the interface here is a subset
        schemaUtils.validateSchema(req.query, schemas.swapQuoteRequestSchema as any);
        const { integrator } = this._validateApiKey(req.header('0x-api-key'));

        // Parse string params
        const { takerAddress, affiliateAddress } = req.query;

        // Parse tokens
        const sellTokenRaw = req.query.sellToken as string;
        const buyTokenRaw = req.query.buyToken as string;
        validateNotNativeTokenOrThrow(sellTokenRaw, 'sellToken');
        validateNotNativeTokenOrThrow(buyTokenRaw, 'buyToken');

        const { tokenAddress: sellToken, decimals: sellTokenDecimals } = getTokenMetadataOrThrow(
            sellTokenRaw,
            'sellToken',
        );
        const { tokenAddress: buyToken, decimals: buyTokenDecimals } = getTokenMetadataOrThrow(buyTokenRaw, 'buyToken');

        // Parse number params
        const sellAmount =
            req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount as string);
        const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount as string);

        return {
            buyAmount,
            buyToken,
            buyTokenDecimals,
            integrator,
            sellAmount,
            sellToken,
            sellTokenDecimals,
            takerAddress: takerAddress as string,
            affiliateAddress: affiliateAddress as string,
        };
    }

    private _parseSubmitSignedQuoteParams(req: express.Request): SubmitRfqmSignedQuoteParams {
        const type = req.body.type as RfqmTypes;
        const { integrator } = this._validateApiKey(req.header('0x-api-key'));

        if (type === RfqmTypes.MetaTransaction) {
            const metaTransaction = new MetaTransaction(
                stringsToMetaTransactionFields(req.body.metaTransaction as unknown as StringMetaTransactionFields),
            );
            const signature = stringsToSignature(req.body.signature as unknown as StringSignatureFields);

            return {
                type,
                metaTransaction,
                signature,
                integrator,
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
}

const validateNotNativeTokenOrThrow = (token: string, field: string): boolean => {
    if (isNativeSymbolOrAddress(token, CHAIN_ID)) {
        throw new ValidationError([
            {
                field,
                code: ValidationErrorCodes.TokenNotSupported,
                reason: `Unwrapped Native Asset is not supported. Use ${NATIVE_WRAPPED_TOKEN_SYMBOL} instead`,
            },
        ]);
    }

    return true;
};

const getTokenMetadataOrThrow = (token: string, field: string): TokenMetadata => {
    const metadata = getTokenMetadataIfExists(token, CHAIN_ID);
    if (metadata === undefined) {
        throw new ValidationError([
            {
                field,
                code: ValidationErrorCodes.AddressNotSupported,
                reason: `Token ${token} is currently unsupported`,
            },
        ]);
    }

    return metadata;
};
