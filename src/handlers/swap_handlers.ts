import { RfqtRequestOpts, SwapQuoterError } from '@0x/asset-swapper';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import _ = require('lodash');

import { CHAIN_ID, RFQT_API_KEY_WHITELIST } from '../config';
import {
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    DEFAULT_TOKEN_DECIMALS,
    MARKET_DEPTH_DEFAULT_DISTRIBUTION,
    MARKET_DEPTH_MAX_SAMPLES,
    SWAP_DOCS_URL,
} from '../constants';
import {
    InternalServerError,
    RevertAPIError,
    ValidationError,
    ValidationErrorCodes,
    ValidationErrorReasons,
} from '../errors';
import { logger } from '../logger';
import { isAPIError, isRevertError } from '../middleware/error_handling';
import { schemas } from '../schemas/schemas';
import { SwapService } from '../services/swap_service';
import { TokenMetadatasForChains } from '../token_metadatas_for_networks';
import { CalculateSwapQuoteParams, GetSwapQuoteRequestParams, GetSwapQuoteResponse, SwapVersion } from '../types';
import { parseUtils } from '../utils/parse_utils';
import { schemaUtils } from '../utils/schema_utils';
import { serviceUtils } from '../utils/service_utils';
import {
    findTokenAddressOrThrowApiError,
    getTokenMetadataIfExists,
    isETHSymbol,
    isWETHSymbolOrAddress,
} from '../utils/token_metadata_utils';

import { quoteReportUtils } from './../utils/quote_report_utils';

export class SwapHandlers {
    private readonly _swapService: SwapService;
    public static rootAsync(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Swap API. Visit ${SWAP_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    constructor(swapService: SwapService) {
        this._swapService = swapService;
    }

    public async getSwapQuoteAsync(
        swapVersion: SwapVersion,
        req: express.Request,
        res: express.Response,
    ): Promise<void> {
        const params = parseGetSwapQuoteRequestParams(req, 'quote');
        const quote = await this._calculateSwapQuoteAsync(params, swapVersion);
        if (params.rfqt !== undefined) {
            logger.info({
                firmQuoteServed: {
                    taker: params.takerAddress,
                    apiKey: params.apiKey,
                    buyToken: params.buyToken,
                    sellToken: params.sellToken,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    makers: quote.orders.map(order => order.makerAddress),
                },
            });
            if (quote.quoteReport && params.rfqt && params.rfqt.intentOnFilling) {
                quoteReportUtils.logQuoteReport({
                    quoteReport: quote.quoteReport,
                    submissionBy: 'taker',
                    decodedUniqueId: quote.decodedUniqueId,
                });
            }
        }
        const cleanedQuote = _.omit(quote, 'quoteReport', 'decodedUniqueId');
        res.status(HttpStatus.OK).send(cleanedQuote);
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async getSwapTokensAsync(_req: express.Request, res: express.Response): Promise<void> {
        const tokens = TokenMetadatasForChains.map(tm => ({
            symbol: tm.symbol,
            address: tm.tokenAddresses[CHAIN_ID],
            name: tm.name,
            decimals: tm.decimals,
        }));
        const filteredTokens = tokens.filter(t => t.address !== NULL_ADDRESS);
        res.status(HttpStatus.OK).send({ records: filteredTokens });
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async getSwapPriceAsync(
        swapVersion: SwapVersion,
        req: express.Request,
        res: express.Response,
    ): Promise<void> {
        const params = parseGetSwapQuoteRequestParams(req, 'price');
        const quote = await this._calculateSwapQuoteAsync({ ...params, skipValidation: true }, swapVersion);
        logger.info({
            indicativeQuoteServed: {
                taker: params.takerAddress,
                apiKey: params.apiKey,
                buyToken: params.buyToken,
                sellToken: params.sellToken,
                buyAmount: params.buyAmount,
                sellAmount: params.sellAmount,
                makers: quote.orders.map(o => o.makerAddress),
            },
        });

        const response = {
            price: quote.price,
            value: quote.value,
            gasPrice: quote.gasPrice,
            gas: quote.gas,
            estimatedGas: quote.estimatedGas,
            protocolFee: quote.protocolFee,
            minimumProtocolFee: quote.minimumProtocolFee,
            buyTokenAddress: quote.buyTokenAddress,
            buyAmount: quote.buyAmount,
            sellTokenAddress: quote.sellTokenAddress,
            sellAmount: quote.sellAmount,
            sources: quote.sources,
            estimatedGasTokenRefund: quote.estimatedGasTokenRefund,
            allowanceTarget: quote.allowanceTarget,
        };
        res.status(HttpStatus.OK).send(response);
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async getTokenPricesAsync(req: express.Request, res: express.Response): Promise<void> {
        const symbolOrAddress = (req.query.sellToken as string) || 'WETH';
        const baseAsset = getTokenMetadataIfExists(symbolOrAddress, CHAIN_ID);
        if (!baseAsset) {
            throw new ValidationError([
                {
                    field: 'sellToken',
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: `Could not find token ${symbolOrAddress}`,
                },
            ]);
        }
        const unitAmount = new BigNumber(1);
        const records = await this._swapService.getTokenPricesAsync(baseAsset, unitAmount);
        res.status(HttpStatus.OK).send({ records });
    }

    public async getMarketDepthAsync(req: express.Request, res: express.Response): Promise<void> {
        const makerToken = {
            decimals: DEFAULT_TOKEN_DECIMALS,
            tokenAddress: req.query.buyToken,
            ...getTokenMetadataIfExists(req.query.buyToken as string, CHAIN_ID),
        };
        const takerToken = {
            decimals: DEFAULT_TOKEN_DECIMALS,
            tokenAddress: req.query.sellToken,
            ...getTokenMetadataIfExists(req.query.sellToken as string, CHAIN_ID),
        };
        if (makerToken.tokenAddress === takerToken.tokenAddress) {
            throw new ValidationError([
                {
                    field: 'buyToken',
                    code: ValidationErrorCodes.InvalidAddress,
                    reason: `Invalid pair ${takerToken.tokenAddress}/${makerToken.tokenAddress}`,
                },
            ]);
        }
        const response = await this._swapService.calculateMarketDepthAsync({
            buyToken: makerToken,
            sellToken: takerToken,
            sellAmount: new BigNumber(req.query.sellAmount as string),
            // tslint:disable-next-line:radix custom-no-magic-numbers
            numSamples: req.query.numSamples ? parseInt(req.query.numSamples as string) : MARKET_DEPTH_MAX_SAMPLES,
            sampleDistributionBase: req.query.sampleDistributionBase
                ? parseFloat(req.query.sampleDistributionBase as string)
                : MARKET_DEPTH_DEFAULT_DISTRIBUTION,
            excludedSources:
                req.query.excludedSources === undefined
                    ? []
                    : parseUtils.parseStringArrForERC20BridgeSources((req.query.excludedSources as string).split(',')),
        });
        res.status(HttpStatus.OK).send({ ...response, buyToken: makerToken, sellToken: takerToken });
    }

    private async _calculateSwapQuoteAsync(
        params: GetSwapQuoteRequestParams,
        swapVersion: SwapVersion,
    ): Promise<GetSwapQuoteResponse> {
        const {
            sellToken,
            buyToken,
            sellAmount,
            buyAmount,
            takerAddress,
            slippagePercentage,
            gasPrice,
            excludedSources,
            affiliateAddress,
            rfqt,
            // tslint:disable-next-line:boolean-naming
            skipValidation,
            apiKey,
            affiliateFee,
        } = params;

        const isETHSell = isETHSymbol(sellToken);
        const isETHBuy = isETHSymbol(buyToken);
        const sellTokenAddress = findTokenAddressOrThrowApiError(sellToken, 'sellToken', CHAIN_ID);
        const buyTokenAddress = findTokenAddressOrThrowApiError(buyToken, 'buyToken', CHAIN_ID);
        const isWrap = isETHSell && isWETHSymbolOrAddress(buyToken, CHAIN_ID);
        const isUnwrap = isWETHSymbolOrAddress(sellToken, CHAIN_ID) && isETHBuy;
        // if token addresses are the same but a unwrap or wrap operation is requested, ignore error
        if (!isUnwrap && !isWrap && sellTokenAddress === buyTokenAddress) {
            throw new ValidationError(
                ['buyToken', 'sellToken'].map(field => {
                    return {
                        field,
                        code: ValidationErrorCodes.RequiredField,
                        reason: 'buyToken and sellToken must be different',
                    };
                }),
            );
        }

        // if V0 (no ExchangeProxy) and buyToken is ETH, throw
        if (swapVersion === SwapVersion.V0 && !isUnwrap && isETHSymbol(buyToken)) {
            throw new ValidationError([
                {
                    field: 'buyToken',
                    code: ValidationErrorCodes.TokenNotSupported,
                    reason: "Buying ETH is unsupported (set to 'WETH' to received wrapped Ether)",
                },
            ]);
        }

        if (swapVersion === SwapVersion.V0 && affiliateFee.buyTokenPercentageFee > 0) {
            throw new ValidationError([
                {
                    field: 'buyTokenPercentageFee',
                    code: ValidationErrorCodes.UnsupportedOption,
                    reason: 'Affiliate fees are unsupported in v0',
                },
            ]);
        }

        const calculateSwapQuoteParams: CalculateSwapQuoteParams = {
            buyTokenAddress,
            sellTokenAddress,
            buyAmount,
            sellAmount,
            from: takerAddress,
            isETHSell,
            isETHBuy,
            slippagePercentage,
            gasPrice,
            excludedSources,
            affiliateAddress,
            apiKey,
            rfqt:
                rfqt === undefined
                    ? undefined
                    : {
                          intentOnFilling: rfqt.intentOnFilling,
                          isIndicative: rfqt.isIndicative,
                          nativeExclusivelyRFQT: rfqt.nativeExclusivelyRFQT,
                      },
            skipValidation,
            swapVersion,
            affiliateFee,
        };
        try {
            let swapQuote: GetSwapQuoteResponse;
            if (isUnwrap) {
                swapQuote = await this._swapService.getSwapQuoteForUnwrapAsync(calculateSwapQuoteParams);
            } else if (isWrap) {
                swapQuote = await this._swapService.getSwapQuoteForWrapAsync(calculateSwapQuoteParams);
            } else {
                swapQuote = await this._swapService.calculateSwapQuoteAsync(calculateSwapQuoteParams);
            }
            return swapQuote;
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

const parseGetSwapQuoteRequestParams = (
    req: express.Request,
    endpoint: 'price' | 'quote',
): GetSwapQuoteRequestParams => {
    // HACK typescript typing does not allow this valid json-schema
    schemaUtils.validateSchema(req.query, schemas.swapQuoteRequestSchema as any);
    const takerAddress = req.query.takerAddress as string;
    const sellToken = req.query.sellToken as string;
    const buyToken = req.query.buyToken as string;
    const sellAmount = req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount as string);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount as string);
    const gasPrice = req.query.gasPrice === undefined ? undefined : new BigNumber(req.query.gasPrice as string);
    const slippagePercentage =
        Number.parseFloat(req.query.slippagePercentage as string) || DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE;
    if (slippagePercentage > 1) {
        throw new ValidationError([
            {
                field: 'slippagePercentage',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: ValidationErrorReasons.PercentageOutOfRange,
            },
        ]);
    }

    const feeRecipient = req.query.feeRecipient as string;
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
    const affiliateFee = feeRecipient
        ? {
              recipient: feeRecipient,
              sellTokenPercentageFee,
              buyTokenPercentageFee,
          }
        : {
              recipient: NULL_ADDRESS,
              sellTokenPercentageFee: 0,
              buyTokenPercentageFee: 0,
          };

    const apiKey = req.header('0x-api-key');
    // tslint:disable-next-line: boolean-naming
    const { excludedSources, nativeExclusivelyRFQT } = parseUtils.parseRequestForExcludedSources(
        {
            excludedSources: req.query.excludedSources as string | undefined,
            includedSources: req.query.includedSources as string | undefined,
            intentOnFilling: req.query.intentOnFilling as string | undefined,
            takerAddress,
            apiKey,
        },
        RFQT_API_KEY_WHITELIST,
        endpoint,
    );

    // Determine if any other sources should be excluded
    const updatedExcludedSources = serviceUtils.determineExcludedSources(
        excludedSources,
        apiKey,
        RFQT_API_KEY_WHITELIST,
    );

    const affiliateAddress = req.query.affiliateAddress as string;
    const rfqt: Pick<RfqtRequestOpts, 'intentOnFilling' | 'isIndicative' | 'nativeExclusivelyRFQT'> =
        takerAddress && apiKey
            ? {
                  intentOnFilling: endpoint === 'quote' && req.query.intentOnFilling === 'true',
                  isIndicative: endpoint === 'price',
                  nativeExclusivelyRFQT,
              }
            : undefined;
    // tslint:disable-next-line:boolean-naming
    const skipValidation = req.query.skipValidation === undefined ? false : req.query.skipValidation === 'true';
    return {
        takerAddress,
        sellToken,
        buyToken,
        sellAmount,
        buyAmount,
        slippagePercentage,
        gasPrice,
        excludedSources: updatedExcludedSources,
        affiliateAddress,
        rfqt,
        skipValidation,
        apiKey,
        affiliateFee,
    };
};
