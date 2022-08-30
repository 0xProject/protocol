import { isAPIError, isRevertError } from '@0x/api-utils';
import { isNativeSymbolOrAddress } from '@0x/token-metadata';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';
import * as isValidUUID from 'uuid-validate';

import { SwapQuoterError } from '../asset-swapper';
import { CHAIN_ID } from '../config';
import { API_KEY_HEADER, DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE, META_TRANSACTION_DOCS_URL } from '../constants';
import {
    EthSellNotSupportedError,
    InternalServerError,
    InvalidAPIKeyError,
    RevertAPIError,
    ValidationError,
    ValidationErrorCodes,
    ValidationErrorReasons,
} from '../errors';
import { logger } from '../logger';
import { schemas } from '../schemas';
import { MetaTransactionService } from '../services/meta_transaction_service';
import { GetMetaTransactionPriceResponse, GetTransactionRequestParams } from '../types';
import { findTokenAddressOrThrowApiError } from '../utils/address_utils';
import { parseUtils } from '../utils/parse_utils';
import { priceComparisonUtils } from '../utils/price_comparison_utils';
import { schemaUtils } from '../utils/schema_utils';

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
        const apiKey = req.header(API_KEY_HEADER);
        if (apiKey !== undefined && !isValidUUID(apiKey)) {
            throw new InvalidAPIKeyError();
        }
        // HACK typescript typing does not allow this valid json-schema
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema as any);
        // parse query params
        const params = parseGetTransactionRequestParams(req);
        const { buyTokenAddress, sellTokenAddress } = params;
        const isETHBuy = isNativeSymbolOrAddress(buyTokenAddress, CHAIN_ID);

        // ETH selling isn't supported.
        if (isNativeSymbolOrAddress(sellTokenAddress, CHAIN_ID)) {
            throw new EthSellNotSupportedError();
        }

        try {
            const metaTransactionQuote = await this._metaTransactionService.calculateMetaTransactionQuoteAsync({
                ...params,
                apiKey,
                isETHBuy,
                isETHSell: false,
                from: params.takerAddress,
            });

            const { quoteReport, ...quoteResponse } = metaTransactionQuote;
            if (params.includePriceComparisons && quoteReport) {
                const marketSide = params.sellAmount !== undefined ? MarketOperation.Sell : MarketOperation.Buy;
                quoteResponse.priceComparisons = priceComparisonUtils
                    .getPriceComparisonFromQuote(
                        CHAIN_ID,
                        marketSide,
                        metaTransactionQuote,
                        undefined,
                        DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
                    )
                    ?.map((sc) => priceComparisonUtils.renameNative(sc));
            }

            res.status(HttpStatus.OK).send(quoteResponse);
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
                        field: params.buyAmount ? 'buyAmount' : 'sellAmount',
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
        const apiKey = req.header('0x-api-key');
        if (apiKey !== undefined && !isValidUUID(apiKey)) {
            throw new InvalidAPIKeyError();
            return;
        }
        // HACK typescript typing does not allow this valid json-schema
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema as any);
        // parse query params
        const params = parseGetTransactionRequestParams(req);
        const { buyTokenAddress, sellTokenAddress } = params;

        // ETH selling isn't supported.
        if (isNativeSymbolOrAddress(sellTokenAddress, CHAIN_ID)) {
            throw new EthSellNotSupportedError();
        }
        const isETHBuy = isNativeSymbolOrAddress(buyTokenAddress, CHAIN_ID);

        try {
            const metaTransactionPriceCalculation =
                await this._metaTransactionService.calculateMetaTransactionPriceAsync({
                    ...params,
                    from: params.takerAddress,
                    apiKey,
                    isETHBuy,
                    isETHSell: false,
                });

            const metaTransactionPriceResponse: GetMetaTransactionPriceResponse = {
                ..._.omit(metaTransactionPriceCalculation, 'orders', 'quoteReport', 'estimatedGasTokenRefund'),
                value: metaTransactionPriceCalculation.protocolFee,
                gas: metaTransactionPriceCalculation.estimatedGas,
            };

            // Calculate price comparisons
            const { quoteReport } = metaTransactionPriceCalculation;
            if (params.includePriceComparisons && quoteReport) {
                const marketSide = params.sellAmount !== undefined ? MarketOperation.Sell : MarketOperation.Buy;
                const priceComparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                    CHAIN_ID,
                    marketSide,
                    metaTransactionPriceCalculation,
                    undefined,
                    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
                );
                metaTransactionPriceResponse.priceComparisons = priceComparisons?.map((pc) =>
                    priceComparisonUtils.renameNative(pc),
                );
            }

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
                        field: params.buyAmount ? 'buyAmount' : 'sellAmount',
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
    const takerAddress = (req.query.takerAddress as string).toLowerCase();
    const sellToken = req.query.sellToken as string;
    const buyToken = req.query.buyToken as string;
    const sellTokenAddress = findTokenAddressOrThrowApiError(sellToken, 'sellToken', CHAIN_ID);
    const buyTokenAddress = findTokenAddressOrThrowApiError(buyToken, 'buyToken', CHAIN_ID);

    const sellAmount = req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount as string);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount as string);
    const slippagePercentage = parseFloat(req.query.slippagePercentage as string) || DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE;
    if (slippagePercentage >= 1) {
        throw new ValidationError([
            {
                field: 'slippagePercentage',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: ValidationErrorReasons.PercentageOutOfRange,
            },
        ]);
    }

    // Note: no RFQT config is passed through here so RFQT is excluded
    const excludedSources =
        req.query.excludedSources === undefined
            ? []
            : parseUtils.parseStringArrForERC20BridgeSources((req.query.excludedSources as string).split(','));

    const includedSources =
        req.query.includedSources === undefined
            ? undefined
            : parseUtils.parseStringArrForERC20BridgeSources((req.query.includedSources as string).split(','));

    const affiliateFee = parseUtils.parseAffiliateFeeOptions(req);
    const affiliateAddress = req.query.affiliateAddress as string | undefined;

    const includePriceComparisons = false;

    return {
        takerAddress,
        sellTokenAddress,
        buyTokenAddress,
        sellAmount,
        buyAmount,
        slippagePercentage,
        excludedSources,
        includedSources,
        includePriceComparisons,
        affiliateFee,
        affiliateAddress,
    };
};
