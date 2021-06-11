// tslint:disable:max-file-line-count
import {
    InternalServerError,
    InvalidAPIKeyError,
    isAPIError,
    NotFoundError,
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

import { CHAIN_ID, NATIVE_WRAPPED_TOKEN_SYMBOL } from '../config';
import { schemas } from '../schemas';
import {
    FetchFirmQuoteParams,
    FetchIndicativeQuoteParams,
    RfqmService,
    RfqmTypes,
    SubmitRfqmSignedQuoteParams,
} from '../services/rfqm_service';
import { ConfigManager } from '../utils/config_manager';
import {
    StringMetaTransactionFields,
    StringSignatureFields,
    stringsToMetaTransactionFields,
    stringsToSignature,
} from '../utils/rfqm_request_utils';
import { schemaUtils } from '../utils/schema_utils';

const RFQM_INDICATIVE_QUOTE_REQUEST = new Counter({
    name: 'rfqm_handler_indicative_quote_requested',
    help: 'Request made to fetch rfqm indicative quote',
    labelNames: ['apiKey'],
});

const RFQM_INDICATIVE_QUOTE_NOT_FOUND = new Counter({
    name: 'rfqm_handler_indicative_quote_not_found',
    help: 'Request to fetch rfqm indicative quote returned no quote',
    labelNames: ['apiKey'],
});

const RFQM_INDICATIVE_QUOTE_ERROR = new Counter({
    name: 'rfqm_handler_indicative_quote_error',
    help: 'Request to fetch rfqm indicative quote resulted in error',
    labelNames: ['apiKey'],
});

const RFQM_FIRM_QUOTE_REQUEST = new Counter({
    name: 'rfqm_handler_firm_quote_requested',
    help: 'Request made to fetch rfqm firm quote',
    labelNames: ['apiKey'],
});

const RFQM_FIRM_QUOTE_NOT_FOUND = new Counter({
    name: 'rfqm_handler_firm_quote_not_found',
    help: 'Request to fetch rfqm firm quote returned no quote',
    labelNames: ['apiKey'],
});

const RFQM_FIRM_QUOTE_ERROR = new Counter({
    name: 'rfqm_handler_firm_quote_error',
    help: 'Request to fetch rfqm firm quote resulted in error',
    labelNames: ['apiKey'],
});

const RFQM_SIGNED_QUOTE_SUBMITTED = new Counter({
    name: 'rfqm_handler_signed_quote_submitted',
    help: 'Request received to submit a signed rfqm quote',
    labelNames: ['apiKey'],
});

export class RfqmHandlers {
    constructor(private readonly _rfqmService: RfqmService, private readonly _configManager: ConfigManager) {}

    public async getIndicativeQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const apiKeyLabel = req.header('0x-api-key') || 'N/A';
        RFQM_INDICATIVE_QUOTE_REQUEST.labels(apiKeyLabel).inc();

        // Parse request
        const params = this._parseFetchIndicativeQuoteParams(req);

        // Try to get indicative quote
        let indicativeQuote;
        try {
            indicativeQuote = await this._rfqmService.fetchIndicativeQuoteAsync(params);
        } catch (err) {
            req.log.error(err, 'Encountered an error while fetching an rfqm indicative quote');
            RFQM_INDICATIVE_QUOTE_ERROR.labels(apiKeyLabel).inc();
            throw new InternalServerError('Unexpected error encountered');
        }

        // Handle no quote returned
        if (indicativeQuote === null) {
            RFQM_INDICATIVE_QUOTE_NOT_FOUND.labels(apiKeyLabel).inc();
            throw new NotFoundError('Unable to retrieve a price');
        }

        // Result
        res.status(HttpStatus.OK).send(indicativeQuote);
    }

    public async getFirmQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const apiKeyLabel = req.header('0x-api-key') || 'N/A';
        RFQM_FIRM_QUOTE_REQUEST.labels(apiKeyLabel).inc();

        // Parse request
        const params = this._parseFetchFirmQuoteParams(req);

        // Try to get firm quote
        let firmQuote;
        try {
            firmQuote = await this._rfqmService.fetchFirmQuoteAsync(params);
        } catch (err) {
            req.log.error(err, 'Encountered an error while fetching an rfqm firm quote');
            RFQM_FIRM_QUOTE_ERROR.labels(apiKeyLabel).inc();
            throw new InternalServerError('Unexpected error encountered');
        }

        // Handle no quote returned
        if (firmQuote === null) {
            RFQM_FIRM_QUOTE_NOT_FOUND.labels(apiKeyLabel).inc();
            throw new NotFoundError('Unable to retrieve a quote');
        }

        // Result
        res.status(HttpStatus.OK).send(firmQuote);
    }

    public async submitSignedQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const apiKeyLabel = req.header('0x-api-key') || 'N/A';
        RFQM_SIGNED_QUOTE_SUBMITTED.labels(apiKeyLabel).inc();
        const params = this._parseSubmitSignedQuoteParams(req);

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

    private _validateAndReturnApiKey(apiKey: string | undefined): string {
        if (apiKey === undefined) {
            throw new InvalidAPIKeyError('Must access with an API key');
        }
        if (!this._configManager.getRfqmApiKeyWhitelist().has(apiKey)) {
            throw new InvalidAPIKeyError('API key not authorized for RFQM access');
        }
        return apiKey;
    }

    private _parseFetchIndicativeQuoteParams(req: express.Request): FetchIndicativeQuoteParams {
        // HACK - reusing the validation for Swap Quote as the interface here is a subset
        schemaUtils.validateSchema(req.query, schemas.swapQuoteRequestSchema as any);
        const apiKey = this._validateAndReturnApiKey(req.header('0x-api-key'));

        // Parse string params
        const { takerAddress } = req.query;

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
            apiKey,
            buyAmount,
            buyToken,
            buyTokenDecimals,
            sellAmount,
            sellToken,
            sellTokenDecimals,
            takerAddress: takerAddress as string,
        };
    }

    private _parseSubmitSignedQuoteParams(req: express.Request): SubmitRfqmSignedQuoteParams {
        const type = req.body.type as RfqmTypes;
        this._validateAndReturnApiKey(req.header('0x-api-key'));

        if (type === RfqmTypes.MetaTransaction) {
            const metaTransaction = new MetaTransaction(
                stringsToMetaTransactionFields(req.body.metaTransaction as unknown as StringMetaTransactionFields),
            );
            const signature = stringsToSignature(req.body.signature as unknown as StringSignatureFields);

            return {
                type,
                metaTransaction,
                signature,
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
