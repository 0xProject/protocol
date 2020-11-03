import { assert } from '@0x/assert';
import { ERC20BridgeSource, SwapQuoterError } from '@0x/asset-swapper';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';
import * as isValidUUID from 'uuid-validate';

import { CHAIN_ID } from '../config';
import { API_KEY_HEADER, DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE, META_TRANSACTION_DOCS_URL } from '../constants';
import { TransactionEntity } from '../entities';
import {
    EthSellNotSupportedError,
    GeneralErrorCodes,
    generalErrorCodeToReason,
    InternalServerError,
    NotFoundError,
    RevertAPIError,
    ValidationError,
    ValidationErrorCodes,
    ValidationErrorReasons,
} from '../errors';
import { logger } from '../logger';
import { isAPIError, isRevertError } from '../middleware/error_handling';
import { schemas } from '../schemas/schemas';
import { MetaTransactionService } from '../services/meta_transaction_service';
import {
    ChainId,
    ExchangeProxyMetaTransactionWithoutDomain,
    GetMetaTransactionPriceResponse,
    GetMetaTransactionStatusResponse,
    GetTransactionRequestParams,
    SourceComparison,
} from '../types';
import { parseUtils } from '../utils/parse_utils';
import { priceComparisonUtils } from '../utils/price_comparison_utils';
import { isRateLimitedMetaTransactionResponse, MetaTransactionRateLimiter } from '../utils/rate-limiters';
import { schemaUtils } from '../utils/schema_utils';
import {
    findTokenAddressOrThrowApiError,
    getTokenMetadataIfExists,
    isETHSymbolOrAddress,
} from '../utils/token_metadata_utils';

export class MetaTransactionHandlers {
    private readonly _metaTransactionService: MetaTransactionService;
    private readonly _rateLimiter?: MetaTransactionRateLimiter;

    public static rootAsync(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Meta Transaction API. Visit ${META_TRANSACTION_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    constructor(metaTransactionService: MetaTransactionService, rateLimiter?: MetaTransactionRateLimiter) {
        this._metaTransactionService = metaTransactionService;
        this._rateLimiter = rateLimiter;
    }
    public async getQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const apiKey = req.header(API_KEY_HEADER);
        if (apiKey !== undefined && !isValidUUID(apiKey)) {
            res.status(HttpStatus.BAD_REQUEST).send({
                code: GeneralErrorCodes.InvalidAPIKey,
                reason: generalErrorCodeToReason[GeneralErrorCodes.InvalidAPIKey],
            });
            return;
        }
        // HACK typescript typing does not allow this valid json-schema
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema as any);
        // parse query params
        const params = parseGetTransactionRequestParams(req);
        const {
            takerAddress,
            sellTokenAddress,
            buyTokenAddress,
            sellAmount,
            buyAmount,
            slippagePercentage,
            excludedSources,
            includedSources,
            affiliateAddress,
            affiliateFee,
            // tslint:disable-next-line:boolean-naming
            includePriceComparisons,
        } = params;
        const isETHBuy = isETHSymbolOrAddress(buyTokenAddress);

        // ETH selling isn't supported.
        if (isETHSymbolOrAddress(sellTokenAddress)) {
            throw new EthSellNotSupportedError();
        }

        try {
            const metaTransactionQuote = await this._metaTransactionService.calculateMetaTransactionQuoteAsync({
                takerAddress,
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                sellAmount,
                slippagePercentage,
                excludedSources,
                includedSources,
                apiKey,
                includePriceComparisons,
                isETHBuy,
                isETHSell: false,
                affiliateAddress,
                affiliateFee,
                from: takerAddress,
            });

            let priceComparisons: SourceComparison[] | undefined;
            const { quoteReport, ...quoteResponse } = metaTransactionQuote;
            if (params.includePriceComparisons && quoteReport) {
                priceComparisons = priceComparisonUtils.getPriceComparisonFromQuote(CHAIN_ID, params, {
                    ...metaTransactionQuote,
                    quoteReport,
                    buyTokenAddress,
                    sellTokenAddress,
                });
            }
            const metaTransactionQuoteResponse = {
                ...quoteResponse,
                priceComparisons: priceComparisons
                    ? priceComparisons.map(pc => ({
                          ...pc,
                          name: pc.name === ERC20BridgeSource.Native ? '0x' : pc.name,
                      }))
                    : undefined,
            };

            res.status(HttpStatus.OK).send(metaTransactionQuoteResponse);
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
        const apiKey = req.header('0x-api-key');
        if (apiKey !== undefined && !isValidUUID(apiKey)) {
            res.status(HttpStatus.BAD_REQUEST).send({
                code: GeneralErrorCodes.InvalidAPIKey,
                reason: generalErrorCodeToReason[GeneralErrorCodes.InvalidAPIKey],
            });
            return;
        }
        // HACK typescript typing does not allow this valid json-schema
        schemaUtils.validateSchema(req.query, schemas.metaTransactionQuoteRequestSchema as any);
        // parse query params
        const params = parseGetTransactionRequestParams(req);
        const {
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
            // tslint:disable-next-line:boolean-naming
            includePriceComparisons,
        } = parseGetTransactionRequestParams(req);
        const isETHBuy = isETHSymbolOrAddress(buyTokenAddress);

        // ETH selling isn't supported.
        if (isETHSymbolOrAddress(sellTokenAddress)) {
            throw new EthSellNotSupportedError();
        }

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
                includedSources,
                apiKey,
                includePriceComparisons,
                isETHBuy,
                isETHSell: false,
                affiliateFee,
                affiliateAddress,
            });

            let priceComparisons: SourceComparison[] | undefined;
            const { quoteReport } = metaTransactionPrice;
            if (params.includePriceComparisons && quoteReport) {
                priceComparisons = priceComparisonUtils.getPriceComparisonFromQuote(CHAIN_ID, params, {
                    ...metaTransactionPrice,
                    quoteReport,
                    buyTokenAddress,
                    sellTokenAddress,
                });
            }

            const metaTransactionPriceResponse: GetMetaTransactionPriceResponse = {
                price: metaTransactionPrice.price,
                buyAmount: metaTransactionPrice.buyAmount!,
                sellAmount: metaTransactionPrice.sellAmount!,
                sellTokenAddress,
                buyTokenAddress,
                sources: metaTransactionPrice.sources,
                value: metaTransactionPrice.protocolFee,
                gasPrice: metaTransactionPrice.gasPrice,
                gas: metaTransactionPrice.estimatedGas,
                estimatedGas: metaTransactionPrice.estimatedGas,
                protocolFee: metaTransactionPrice.protocolFee,
                minimumProtocolFee: metaTransactionPrice.minimumProtocolFee,
                allowanceTarget: metaTransactionPrice.allowanceTarget,
                priceComparisons: priceComparisons
                    ? priceComparisons.map(pc => ({
                          ...pc,
                          name: pc.name === ERC20BridgeSource.Native ? '0x' : pc.name,
                      }))
                    : undefined,
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
    public async submitTransactionIfWhitelistedAsync(req: express.Request, res: express.Response): Promise<void> {
        const apiKey = req.header('0x-api-key');
        const affiliateAddress = req.query.affiliateAddress as string | undefined;
        if (apiKey !== undefined && !isValidUUID(apiKey)) {
            res.status(HttpStatus.BAD_REQUEST).send({
                code: GeneralErrorCodes.InvalidAPIKey,
                reason: generalErrorCodeToReason[GeneralErrorCodes.InvalidAPIKey],
            });
            return;
        }
        // TODO(kimpers): Refactor this to use published 5.2 @0x/json-schemas
        schemaUtils.validateSchema(req.body, schemas.metaTransactionFillRequestSchema);

        // parse the request body
        const { mtx, signature } = parsePostTransactionRequestBody(req);
        const mtxHash = this._metaTransactionService.getTransactionHash(mtx);
        const transactionInDatabase = await this._metaTransactionService.findTransactionByHashAsync(mtxHash);
        if (transactionInDatabase !== undefined) {
            // user attemps to submit a mtx already present in the database
            res.status(HttpStatus.OK).send(marshallTransactionEntity(transactionInDatabase));
            return;
        }
        try {
            await this._metaTransactionService.validateTransactionIsFillableAsync(mtx, signature);

            const ethTx = await this._metaTransactionService.generatePartialExecuteTransactionEthereumTransactionAsync(
                mtx,
                signature,
            );

            // If eligible for free txn relay, submit it, otherwise, return unsigned Ethereum txn
            if (apiKey !== undefined && MetaTransactionService.isEligibleForFreeMetaTxn(apiKey)) {
                // If Metatxn service is not live then we reject
                const isLive = await this._metaTransactionService.isSignerLiveAsync();
                if (!isLive) {
                    res.status(HttpStatus.NOT_FOUND).send({
                        code: GeneralErrorCodes.ServiceDisabled,
                        reason: generalErrorCodeToReason[GeneralErrorCodes.ServiceDisabled],
                    });
                    return;
                }
                if (this._rateLimiter !== undefined) {
                    const rateLimitResponse = await this._rateLimiter.isAllowedAsync({
                        apiKey,
                        takerAddress: mtx.signer,
                    });
                    if (isRateLimitedMetaTransactionResponse(rateLimitResponse)) {
                        res.status(HttpStatus.TOO_MANY_REQUESTS).send({
                            code: GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker,
                            reason: rateLimitResponse.reason,
                            ethereumTransaction: {
                                data: ethTx.data,
                                gasPrice: ethTx.gasPrice,
                                gas: ethTx.gas,
                                value: ethTx.value,
                                to: ethTx.to,
                            },
                        });
                        return;
                    }
                }
                const result = await this._metaTransactionService.submitTransactionAsync(
                    mtxHash,
                    mtx,
                    signature,
                    apiKey,
                    affiliateAddress,
                );
                res.status(HttpStatus.OK).send(result);
            } else {
                res.status(HttpStatus.FORBIDDEN).send({
                    code: GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker,
                    reason: generalErrorCodeToReason[GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker],
                    ethereumTransaction: {
                        data: ethTx.data,
                        gasPrice: ethTx.gasPrice,
                        gas: ethTx.gas,
                        value: ethTx.value,
                        to: ethTx.to,
                    },
                });
            }
        } catch (e) {
            // If this is already a transformed error then just re-throw
            if (isAPIError(e)) {
                throw e;
            }
            // Wrap a Revert error as an API revert error
            if (isRevertError(e)) {
                throw new RevertAPIError(e);
            }
            logger.info('Uncaught error', e);
            throw new InternalServerError(e.message);
        }
    }
    public async getTransactionStatusAsync(req: express.Request, res: express.Response): Promise<void> {
        const transactionHash = req.params.txHash;
        try {
            assert.isHexString('transactionHash', transactionHash);
        } catch (e) {
            throw new ValidationError([
                {
                    field: 'txHash',
                    code: ValidationErrorCodes.InvalidSignatureOrHash,
                    reason: e.message,
                },
            ]);
        }
        const tx = await this._metaTransactionService.findTransactionByHashAsync(transactionHash);
        if (tx === undefined) {
            throw new NotFoundError();
        } else {
            res.status(HttpStatus.OK).send(marshallTransactionEntity(tx));
        }
    }
    public async getSignerStatusAsync(_req: express.Request, res: express.Response): Promise<void> {
        try {
            const isLive = await this._metaTransactionService.isSignerLiveAsync();
            res.status(HttpStatus.OK).send({ isLive });
        } catch (e) {
            logger.error('Uncaught error: ', e);
            throw new InternalServerError('failed to check signer status');
        }
    }
}

const parseGetTransactionRequestParams = (req: express.Request): GetTransactionRequestParams => {
    const takerAddress = req.query.takerAddress as string;
    const sellToken = req.query.sellToken as string;
    const buyToken = req.query.buyToken as string;
    const sellTokenAddress = findTokenAddressOrThrowApiError(sellToken, 'sellToken', CHAIN_ID);
    const buyTokenAddress = findTokenAddressOrThrowApiError(buyToken, 'buyToken', CHAIN_ID);

    const sellAmount = req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount as string);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount as string);
    const slippagePercentage = parseFloat(req.query.slippagePercentage as string) || DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE;
    if (slippagePercentage > 1) {
        throw new ValidationError([
            {
                field: 'slippagePercentage',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: ValidationErrorReasons.PercentageOutOfRange,
            },
        ]);
    }
    const _excludedSources =
        req.query.excludedSources === undefined
            ? []
            : parseUtils.parseStringArrForERC20BridgeSources((req.query.excludedSources as string).split(','));

    // tslint:disable-next-line:boolean-naming
    const includePriceComparisons = req.query.includePriceComparisons === 'true' ? true : false;

    const includedSources =
        req.query.includedSources === undefined
            ? undefined
            : parseUtils.parseStringArrForERC20BridgeSources((req.query.includedSources as string).split(','));
    // Exclude Bancor as a source unless swap involves BNT token
    const bntAddress = getTokenMetadataIfExists('bnt', ChainId.Mainnet)!.tokenAddress;
    const isBNT = sellTokenAddress.toLowerCase() === bntAddress || buyTokenAddress.toLowerCase() === bntAddress;
    const excludedSources = isBNT ? _excludedSources : _excludedSources.concat(ERC20BridgeSource.Bancor);

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

    const affiliateAddress = req.query.affiliateAddress as string | undefined;

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

interface PostTransactionRequestBody {
    mtx: ExchangeProxyMetaTransactionWithoutDomain;
    signature: string;
}

const parsePostTransactionRequestBody = (req: any): PostTransactionRequestBody => {
    const requestBody = req.body;
    const signature = requestBody.signature;
    const mtx: ExchangeProxyMetaTransactionWithoutDomain = {
        signer: requestBody.transaction.signer,
        sender: requestBody.transaction.sender,
        salt: new BigNumber(requestBody.transaction.salt),
        expirationTimeSeconds: new BigNumber(requestBody.transaction.expirationTimeSeconds),
        minGasPrice: new BigNumber(requestBody.transaction.minGasPrice),
        maxGasPrice: new BigNumber(requestBody.transaction.maxGasPrice),
        callData: requestBody.transaction.callData,
        value: new BigNumber(requestBody.transaction.value),
        feeToken: requestBody.transaction.feeToken,
        feeAmount: new BigNumber(requestBody.transaction.feeAmount),
    };
    return {
        mtx,
        signature,
    };
};

const marshallTransactionEntity = (tx: TransactionEntity): GetMetaTransactionStatusResponse => {
    return {
        refHash: tx.refHash,
        hash: tx.txHash,
        status: tx.status,
        gasPrice: tx.gasPrice,
        updatedAt: tx.updatedAt,
        blockNumber: tx.blockNumber,
        expectedMinedInSec: tx.expectedMinedInSec,
        ethereumTxStatus: _.isNil(tx.txStatus) ? undefined : tx.txStatus,
    };
}; // tslint:disable-next-line: max-file-line-count
