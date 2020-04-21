import { SwapQuoterError } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';

import { CHAIN_ID } from '../config';
import { DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE, META_TRANSACTION_DOCS_URL } from '../constants';
import { InternalServerError, RevertAPIError, ValidationError, ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { isAPIError, isRevertError } from '../middleware/error_handling';
import { schemas } from '../schemas/schemas';
import { MetaTransactionService } from '../services/meta_transaction_service';
import { GetTransactionRequestParams } from '../types';
import { parseUtils } from '../utils/parse_utils';
import { schemaUtils } from '../utils/schema_utils';
import { findTokenAddressOrThrowApiError } from '../utils/token_metadata_utils';

export class MetaTransactionHandlers {
    private readonly _metaTransactionService: MetaTransactionService;
    public static rootAsync(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Meta Transaction API. Visit ${META_TRANSACTION_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    constructor(metaTransactionService: MetaTransactionService) {
        this._metaTransactionService = metaTransactionService;
    }
    public async getQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        // HACK typescript typing does not allow this valid json-schema
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema as any);
        // parse query params
        const {
            takerAddress,
            sellToken,
            buyToken,
            sellAmount,
            buyAmount,
            slippagePercentage,
            excludedSources,
        } = parseGetTransactionRequestParams(req);
        const sellTokenAddress = findTokenAddressOrThrowApiError(sellToken, 'sellToken', CHAIN_ID);
        const buyTokenAddress = findTokenAddressOrThrowApiError(buyToken, 'buyToken', CHAIN_ID);
        try {
            const metaTransactionQuote = await this._metaTransactionService.calculateMetaTransactionQuoteAsync({
                takerAddress,
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                sellAmount,
                from: takerAddress,
                slippagePercentage,
                excludedSources,
            });
            res.status(HttpStatus.OK).send(metaTransactionQuote);
        } catch (e) {
            // If this is already a transformed error then just re-throw
            if (isAPIError(e)) {
                throw e;
            }
            // Wrap a Revert error as an API revert error
            if (isRevertError(e)) {
                throw new RevertAPIError(e);
            }
            const errorMessage: string = e.message;
            // TODO AssetSwapper can throw raw Errors or InsufficientAssetLiquidityError
            if (
                errorMessage.startsWith(SwapQuoterError.InsufficientAssetLiquidity) ||
                errorMessage.startsWith('NO_OPTIMAL_PATH')
            ) {
                throw new ValidationError([
                    {
                        field: buyAmount ? 'buyAmount' : 'sellAmount',
                        code: ValidationErrorCodes.ValueOutOfRange,
                        reason: SwapQuoterError.InsufficientAssetLiquidity,
                    },
                ]);
            }
            if (errorMessage.startsWith(SwapQuoterError.AssetUnavailable)) {
                throw new ValidationError([
                    {
                        field: 'token',
                        code: ValidationErrorCodes.ValueOutOfRange,
                        reason: e.message,
                    },
                ]);
            }
            logger.info('Uncaught error', e);
            throw new InternalServerError(e.message);
        }
    }
    public async getPriceAsync(req: express.Request, res: express.Response): Promise<void> {
        // HACK typescript typing does not allow this valid json-schema
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema as any);
        // parse query params
        const {
            takerAddress,
            sellToken,
            buyToken,
            sellAmount,
            buyAmount,
            slippagePercentage,
            excludedSources,
        } = parseGetTransactionRequestParams(req);
        const sellTokenAddress = findTokenAddressOrThrowApiError(sellToken, 'sellToken', CHAIN_ID);
        const buyTokenAddress = findTokenAddressOrThrowApiError(buyToken, 'buyToken', CHAIN_ID);
        try {
            const metaTransactionPrice = await this._metaTransactionService.calculateMetaTransactionPriceAsync({
                takerAddress,
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                sellAmount,
                from: takerAddress,
                slippagePercentage,
                excludedSources,
            });
            const metaTransactionPriceResponse = {
                price: metaTransactionPrice.price,
                buyAmount: metaTransactionPrice.buyAmount,
                sellAmount: metaTransactionPrice.sellAmount,
                sellTokenAddress,
                buyTokenAddress,
            };
            res.status(HttpStatus.OK).send(metaTransactionPriceResponse);
        } catch (e) {
            // If this is already a transformed error then just re-throw
            if (isAPIError(e)) {
                throw e;
            }
            // Wrap a Revert error as an API revert error
            if (isRevertError(e)) {
                throw new RevertAPIError(e);
            }
            const errorMessage: string = e.message;
            // TODO AssetSwapper can throw raw Errors or InsufficientAssetLiquidityError
            if (
                errorMessage.startsWith(SwapQuoterError.InsufficientAssetLiquidity) ||
                errorMessage.startsWith('NO_OPTIMAL_PATH')
            ) {
                throw new ValidationError([
                    {
                        field: buyAmount ? 'buyAmount' : 'sellAmount',
                        code: ValidationErrorCodes.ValueOutOfRange,
                        reason: SwapQuoterError.InsufficientAssetLiquidity,
                    },
                ]);
            }
            if (errorMessage.startsWith(SwapQuoterError.AssetUnavailable)) {
                throw new ValidationError([
                    {
                        field: 'token',
                        code: ValidationErrorCodes.ValueOutOfRange,
                        reason: e.message,
                    },
                ]);
            }
            logger.info('Uncaught error', e);
            throw new InternalServerError(e.message);
        }
    }
}

const parseGetTransactionRequestParams = (req: express.Request): GetTransactionRequestParams => {
    const takerAddress = req.query.takerAddress;
    const sellToken = req.query.sellToken;
    const buyToken = req.query.buyToken;
    const sellAmount = req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount);
    const slippagePercentage = Number.parseFloat(req.query.slippagePercentage || DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE);
    const excludedSources =
        req.query.excludedSources === undefined
            ? undefined
            : parseUtils.parseStringArrForERC20BridgeSources(req.query.excludedSources.split(','));
    return { takerAddress, sellToken, buyToken, sellAmount, buyAmount, slippagePercentage, excludedSources };
};
