// tslint:disable:max-file-line-count
import {
    InternalServerError,
    InvalidAPIKeyError,
    NotFoundError,
    ValidationError,
    ValidationErrorCodes,
} from '@0x/api-utils';
import { getTokenMetadataIfExists, isNativeSymbolOrAddress, TokenMetadata } from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import { Counter } from 'prom-client';

import { CHAIN_ID, NATIVE_WRAPPED_TOKEN_SYMBOL } from '../config';
import { schemas } from '../schemas';
import { FetchIndicativeQuoteParams, RfqmService } from '../services/rfqm_service';
import { ConfigManager } from '../utils/config_manager';
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

    private _parseFetchIndicativeQuoteParams(req: express.Request): FetchIndicativeQuoteParams {
        // HACK - reusing the validation for Swap Quote as the interface here is a subset
        schemaUtils.validateSchema(req.query, schemas.swapQuoteRequestSchema as any);
        const apiKey = req.header('0x-api-key');
        if (apiKey === undefined) {
            throw new InvalidAPIKeyError('Must access with an API key');
        }

        if (!this._configManager.getRfqmApiKeyWhitelist().has(apiKey)) {
            throw new InvalidAPIKeyError('API key not authorized for RFQM access');
        }

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
        const gasPrice = req.query.gasPrice === undefined ? undefined : new BigNumber(req.query.gasPrice as string);

        return {
            apiKey,
            buyAmount,
            buyToken,
            buyTokenDecimals,
            gasPrice,
            sellAmount,
            sellToken,
            sellTokenDecimals,
            takerAddress: takerAddress as string,
        };
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
