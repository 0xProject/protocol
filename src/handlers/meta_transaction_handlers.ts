import { isAPIError, isRevertError } from '@0x/api-utils';
import { isNativeSymbolOrAddress } from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import { StatusCodes } from 'http-status-codes';
import * as _ from 'lodash';

import { SwapQuoterError } from '../asset-swapper';
import { CHAIN_ID, META_TX_MIN_ALLOWED_SLIPPAGE } from '../config';
import {
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    META_TRANSACTION_DOCS_URL,
    DEFAULT_PRICE_IMPACT_PROTECTION_PERCENTAGE,
} from '../constants';
import {
    EthSellNotSupportedError,
    InternalServerError,
    RevertAPIError,
    ValidationError,
    ValidationErrorCodes,
    ValidationErrorReasons,
} from '../errors';
import { logger } from '../logger';
import { schemas } from '../schemas';
import { MetaTransactionV1PriceResponse, MetaTransactionV1QuoteRequestParams, IMetaTransactionService } from '../types';
import { findTokenAddressOrThrowApiError } from '../utils/address_utils';
import { parseUtils } from '../utils/parse_utils';
import { schemaUtils } from '../utils/schema_utils';

export class MetaTransactionHandlers {
    private readonly _metaTransactionService: IMetaTransactionService;

    public static rootAsync(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Meta Transaction API. Visit ${META_TRANSACTION_DOCS_URL} for details about this API.`;
        res.status(StatusCodes.OK).send({ message });
    }

    constructor(metaTransactionService: IMetaTransactionService) {
        this._metaTransactionService = metaTransactionService;
    }

    /**
     * Handler for the /meta_transaction/v1/quote endpoint
     */
    public async getV1QuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema);

        // parse query params
        const params = parseV1RequestParams(req);
        const { buyTokenAddress, sellTokenAddress } = params;
        const isETHBuy = isNativeSymbolOrAddress(buyTokenAddress, CHAIN_ID);

        // ETH selling isn't supported.
        if (isNativeSymbolOrAddress(sellTokenAddress, CHAIN_ID)) {
            throw new EthSellNotSupportedError();
        }

        try {
            const metaTransactionQuote = await this._metaTransactionService.getMetaTransactionV1QuoteAsync({
                ...params,
                isETHBuy,
                isETHSell: false,
                from: params.takerAddress,
            });

            res.status(StatusCodes.OK).send(metaTransactionQuote);
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
            throw e;
        }
    }

    /**
     * Handler for the /meta_transaction/v1/price endpoint
     */
    public async getV1PriceAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema);
        // parse query params
        const params = parseV1RequestParams(req);
        const { buyTokenAddress, sellTokenAddress } = params;

        // ETH selling isn't supported.
        if (isNativeSymbolOrAddress(sellTokenAddress, CHAIN_ID)) {
            throw new EthSellNotSupportedError();
        }
        const isETHBuy = isNativeSymbolOrAddress(buyTokenAddress, CHAIN_ID);

        try {
            const metaTransactionPriceCalculation = await this._metaTransactionService.getMetaTransactionV1PriceAsync({
                ...params,
                from: params.takerAddress,
                isETHBuy,
                isETHSell: false,
            });

            const metaTransactionPriceResponse: MetaTransactionV1PriceResponse = {
                ..._.omit(metaTransactionPriceCalculation, 'orders', 'quoteReport', 'estimatedGasTokenRefund'),
                value: metaTransactionPriceCalculation.protocolFee,
                gas: metaTransactionPriceCalculation.estimatedGas,
            };

            res.status(StatusCodes.OK).send(metaTransactionPriceResponse);
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

function parseV1RequestParams(req: express.Request): MetaTransactionV1QuoteRequestParams {
    const affiliateAddress = req.query.affiliateAddress as string | undefined;
    const affiliateFee = parseUtils.parseAffiliateFeeOptions(req);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount as string);
    const buyToken = req.query.buyToken as string;
    const buyTokenAddress = findTokenAddressOrThrowApiError(buyToken, 'buyToken', CHAIN_ID);
    const integratorId = req.query.integratorId as string;
    const quoteUniqueId = req.query.quoteUniqueId as string | undefined;
    const sellAmount = req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount as string);
    const sellToken = req.query.sellToken as string;
    const sellTokenAddress = findTokenAddressOrThrowApiError(sellToken, 'sellToken', CHAIN_ID);
    const takerAddress = (req.query.takerAddress as string).toLowerCase();

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
    if (slippagePercentage < META_TX_MIN_ALLOWED_SLIPPAGE) {
        throw new ValidationError([
            {
                field: 'slippagePercentage',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: ValidationErrorReasons.MinSlippageTooLow,
            },
        ]);
    }

    const priceImpactProtectionPercentage =
        req.query.priceImpactProtectionPercentage === undefined
            ? DEFAULT_PRICE_IMPACT_PROTECTION_PERCENTAGE
            : Number.parseFloat(req.query.priceImpactProtectionPercentage as string);

    // Note: no RFQT config is passed through here so RFQT is excluded
    const excludedSources =
        req.query.excludedSources === undefined
            ? []
            : parseUtils.parseStringArrForERC20BridgeSources((req.query.excludedSources as string).split(','));

    const includedSources =
        req.query.includedSources === undefined
            ? undefined
            : parseUtils.parseStringArrForERC20BridgeSources((req.query.includedSources as string).split(','));

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
        integratorId,
        quoteUniqueId,
        priceImpactProtectionPercentage,
    };
}
