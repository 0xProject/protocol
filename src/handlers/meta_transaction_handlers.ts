import { isAPIError, isRevertError } from '@0x/api-utils';
import { isNativeSymbolOrAddress } from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import { StatusCodes } from 'http-status-codes';
import * as _ from 'lodash';

import { AffiliateFeeType, SwapQuoterError } from '../asset-swapper';
import { CHAIN_ID, META_TX_MIN_ALLOWED_SLIPPAGE } from '../config';
import {
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    META_TRANSACTION_DOCS_URL,
    DEFAULT_PRICE_IMPACT_PROTECTION_PERCENTAGE,
    NULL_ADDRESS,
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
import {
    MetaTransactionV1PriceResponse,
    MetaTransactionV1QuoteRequestParams,
    IMetaTransactionService,
    FeeConfigs,
    MetaTransactionV2QuoteRequestParams,
    MetaTransactionV2PriceResponse,
} from '../types';
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
     * Handler for the /meta_transaction/v2/quote endpoint
     */
    public async getV2QuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.body, schemas.metaTransactionQuoteRequestSchema);
        // parse query prams
        const params = parseV2RequestBody(req);
        const { buyTokenAddress, sellTokenAddress } = params;
        const isETHBuy = isNativeSymbolOrAddress(buyTokenAddress, CHAIN_ID);

        // ETH selling isn't supported.
        if (isNativeSymbolOrAddress(sellTokenAddress, CHAIN_ID)) {
            throw new EthSellNotSupportedError();
        }

        try {
            const metaTransactionQuote = await this._metaTransactionService.getMetaTransactionV2QuoteAsync({
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
            logger.info({ errorMessage, stack: e.stack }, 'Uncaught error in `getV2QuoteAsync`');
            throw e;
        }
    }

    /**
     * Handler for the /meta_transaction/v2/price endpoint
     */
    public async getV2PriceAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.body, schemas.metaTransactionQuoteRequestSchema);
        // parse query params
        const params = parseV2RequestBody(req);
        const { buyTokenAddress, sellTokenAddress } = params;

        // ETH selling isn't supported.
        if (isNativeSymbolOrAddress(sellTokenAddress, CHAIN_ID)) {
            throw new EthSellNotSupportedError();
        }
        const isETHBuy = isNativeSymbolOrAddress(buyTokenAddress, CHAIN_ID);

        try {
            const metaTransactionPriceCalculation = await this._metaTransactionService.getMetaTransactionV2PriceAsync({
                ...params,
                from: params.takerAddress,
                isETHBuy,
                isETHSell: false,
            });

            const metaTransactionPriceResponse: MetaTransactionV2PriceResponse = {
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
            logger.info({ errorMessage, stack: e.stack }, 'Uncaught error in `getV2PriceAsync`');
            throw new InternalServerError(e.message);
        }
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
            logger.info({ errorMessage, stack: e.stack }, 'Uncaught error in `getV1QuoteAsync`');
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
            logger.info({ errorMessage, stack: e.stack }, 'Uncaught error in `getV1PriceAsync`');
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

    return {
        takerAddress,
        sellTokenAddress,
        buyTokenAddress,
        sellAmount,
        buyAmount,
        slippagePercentage,
        excludedSources,
        includedSources,
        affiliateFee,
        affiliateAddress,
        integratorId,
        quoteUniqueId,
        priceImpactProtectionPercentage,
    };
}

/**
 * Parse meta-transaction v2 quote and price body.
 */
function parseV2RequestBody(req: express.Request): MetaTransactionV2QuoteRequestParams {
    const affiliateAddress = req.body.affiliateAddress as string | undefined;
    const affiliateFee = {
        feeType: AffiliateFeeType.None,
        recipient: NULL_ADDRESS,
        sellTokenPercentageFee: 0,
        buyTokenPercentageFee: 0,
    };
    const buyAmount = req.body.buyAmount === undefined ? undefined : new BigNumber(req.body.buyAmount as string);
    const buyToken = req.body.buyToken as string;
    const buyTokenAddress = findTokenAddressOrThrowApiError(buyToken, 'buyToken', CHAIN_ID);
    const integratorId = req.body.integratorId as string;
    const quoteUniqueId = req.body.quoteUniqueId as string | undefined;
    const sellAmount = req.body.sellAmount === undefined ? undefined : new BigNumber(req.body.sellAmount as string);
    const sellToken = req.body.sellToken as string;
    const sellTokenAddress = findTokenAddressOrThrowApiError(sellToken, 'sellToken', CHAIN_ID);
    const takerAddress = (req.body.takerAddress as string).toLowerCase();

    const slippagePercentage = parseFloat(req.body.slippagePercentage as string) || DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE;
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
        req.body.priceImpactProtectionPercentage === undefined
            ? DEFAULT_PRICE_IMPACT_PROTECTION_PERCENTAGE
            : Number.parseFloat(req.body.priceImpactProtectionPercentage as string);

    // Note: no RFQT config is passed through here so RFQT is excluded
    const excludedSources =
        req.body.excludedSources === undefined
            ? []
            : parseUtils.parseStringArrForERC20BridgeSources((req.body.excludedSources as string).split(','));

    const includedSources =
        req.body.includedSources === undefined
            ? undefined
            : parseUtils.parseStringArrForERC20BridgeSources((req.body.includedSources as string).split(','));

    const parsedFeeConfigs = _parseFeeConfigs(req);

    return {
        takerAddress,
        sellTokenAddress,
        buyTokenAddress,
        sellAmount,
        buyAmount,
        slippagePercentage,
        excludedSources,
        includedSources,
        affiliateFee,
        affiliateAddress,
        integratorId,
        quoteUniqueId,
        priceImpactProtectionPercentage,
        feeConfigs: parsedFeeConfigs,
    };
}

/**
 * Parse the fee config param.
 */
function _parseFeeConfigs(req: express.Request): FeeConfigs | undefined {
    let parsedFeeConfigs: FeeConfigs | undefined;

    if (req.body.feeConfigs) {
        const feeConfigs = req.body.feeConfigs;
        parsedFeeConfigs = {};

        // Parse the integrator fee config
        if (feeConfigs.integratorFee) {
            const integratorFee = feeConfigs.integratorFee;

            if (integratorFee.type !== 'volume') {
                throw new ValidationError([
                    {
                        field: 'feeConfigs',
                        code: ValidationErrorCodes.IncorrectFormat,
                        reason: ValidationErrorReasons.InvalidGaslessFeeType,
                    },
                ]);
            }

            const volumePercentage = new BigNumber(integratorFee.volumePercentage as string);
            if (volumePercentage.gte(1)) {
                throw new ValidationError([
                    {
                        field: 'feeConfigs',
                        code: ValidationErrorCodes.ValueOutOfRange,
                        reason: ValidationErrorReasons.PercentageOutOfRange,
                    },
                ]);
            }

            parsedFeeConfigs.integratorFee = {
                type: 'volume',
                feeRecipient: integratorFee.feeRecipient,
                volumePercentage,
            };
        }

        // Parse the 0x fee config
        if (feeConfigs.zeroexFee) {
            const zeroexFee = feeConfigs.zeroexFee;

            if (zeroexFee.type !== 'volume' && zeroexFee.type !== 'integrator_share') {
                throw new ValidationError([
                    {
                        field: 'feeConfigs',
                        code: ValidationErrorCodes.IncorrectFormat,
                        reason: ValidationErrorReasons.InvalidGaslessFeeType,
                    },
                ]);
            }

            if (zeroexFee.type === 'volume') {
                const feePercentage = new BigNumber(zeroexFee.volumePercentage as string);
                if (feePercentage.gte(1)) {
                    throw new ValidationError([
                        {
                            field: 'feeConfigs',
                            code: ValidationErrorCodes.ValueOutOfRange,
                            reason: ValidationErrorReasons.PercentageOutOfRange,
                        },
                    ]);
                }

                parsedFeeConfigs.zeroexFee = {
                    type: 'volume',
                    feeRecipient: zeroexFee.feeRecipient,
                    volumePercentage: feePercentage,
                };
            } else if (zeroexFee.type === 'integrator_share') {
                if (!parsedFeeConfigs.integratorFee) {
                    throw new ValidationError([
                        {
                            field: 'feeConfigs',
                            code: ValidationErrorCodes.IncorrectFormat,
                            reason: ValidationErrorReasons.InvalidGaslessFeeType,
                        },
                    ]);
                }

                const feePercentage = new BigNumber(zeroexFee.integratorSharePercentage as string);
                if (feePercentage.gte(1)) {
                    throw new ValidationError([
                        {
                            field: 'feeConfigs',
                            code: ValidationErrorCodes.ValueOutOfRange,
                            reason: ValidationErrorReasons.PercentageOutOfRange,
                        },
                    ]);
                }

                parsedFeeConfigs.zeroexFee = {
                    type: 'integrator_share',
                    feeRecipient: zeroexFee.feeRecipient,
                    integratorSharePercentage: feePercentage,
                };
            }
        }

        // Parse the gas fee config
        if (feeConfigs.gasFee) {
            const gasFee = feeConfigs.gasFee;

            if (gasFee.type !== 'gas') {
                throw new ValidationError([
                    {
                        field: 'feeConfigs',
                        code: ValidationErrorCodes.IncorrectFormat,
                        reason: ValidationErrorReasons.InvalidGaslessFeeType,
                    },
                ]);
            }

            parsedFeeConfigs.gasFee = {
                type: 'gas',
                feeRecipient: gasFee.feeRecipient,
            };
        }
    }

    return parsedFeeConfigs;
}
