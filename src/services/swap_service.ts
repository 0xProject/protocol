import {
    AffiliateFee,
    ERC20BridgeSource,
    ExtensionContractType,
    getSwapMinBuyAmount,
    Orderbook,
    RfqtRequestOpts,
    SwapQuote,
    SwapQuoteConsumer,
    SwapQuoteGetOutputOpts,
    SwapQuoter,
} from '@0x/asset-swapper';
import { SwapQuoteRequestOpts, SwapQuoterOpts } from '@0x/asset-swapper/lib/src/types';
import { ContractAddresses } from '@0x/contract-addresses';
import { WETH9Contract } from '@0x/contract-wrappers';
import { assetDataUtils, SupportedProvider } from '@0x/order-utils';
import { MarketOperation } from '@0x/types';
import { BigNumber, decodeThrownErrorAsRevertError, RevertError } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import {
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP,
    CHAIN_ID,
    PROTOCOL_FEE_MULTIPLIER,
    RFQT_REQUEST_MAX_RESPONSE_MS,
    SWAP_QUOTER_OPTS,
} from '../config';
import {
    DEFAULT_VALIDATION_GAS_LIMIT,
    GAS_LIMIT_BUFFER_MULTIPLIER,
    NULL_ADDRESS,
    ONE,
    TEN_MINUTES_MS,
    UNWRAP_QUOTE_GAS,
    UNWRAP_WETH_GAS,
    WRAP_ETH_GAS,
    WRAP_QUOTE_GAS,
    ZERO,
} from '../constants';
import { InsufficientFundsError, ValidationError, ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { TokenMetadatasForChains } from '../token_metadatas_for_networks';
import {
    BucketedPriceDepth,
    CalaculateMarketDepthParams,
    CalculateSwapQuoteParams,
    GetSwapQuoteResponse,
    GetTokenPricesResponse,
    PercentageFee,
    SwapQuoteResponsePartialTransaction,
    SwapQuoteResponsePrice,
    TokenMetadata,
} from '../types';
import { marketDepthUtils } from '../utils/market_depth_utils';
import { createResultCache, ResultCache } from '../utils/result_cache';
import { serviceUtils } from '../utils/service_utils';

export class SwapService {
    private readonly _provider: SupportedProvider;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _swapQuoteConsumer: SwapQuoteConsumer;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _wethContract: WETH9Contract;
    private readonly _contractAddresses: ContractAddresses;
    // Result caches, stored for a few minutes and refetched
    // when the result has expired
    private readonly _tokenDecimalResultCache: ResultCache<number>;

    constructor(orderbook: Orderbook, provider: SupportedProvider, contractAddresses: ContractAddresses) {
        this._provider = provider;
        const swapQuoterOpts: Partial<SwapQuoterOpts> = {
            ...SWAP_QUOTER_OPTS,
            rfqt: {
                ...SWAP_QUOTER_OPTS.rfqt,
                warningLogger: logger.warn.bind(logger),
                infoLogger: logger.info.bind(logger),
            },
            contractAddresses,
        };
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._swapQuoteConsumer = new SwapQuoteConsumer(this._provider, swapQuoterOpts);
        this._web3Wrapper = new Web3Wrapper(this._provider);

        this._contractAddresses = contractAddresses;
        this._wethContract = new WETH9Contract(this._contractAddresses.etherToken, this._provider);
        this._tokenDecimalResultCache = createResultCache<number>(
            (tokenAddress: string) => serviceUtils.fetchTokenDecimalsIfRequiredAsync(tokenAddress, this._web3Wrapper),
            // tslint:disable-next-line:custom-no-magic-numbers
            TEN_MINUTES_MS * 6 * 24,
        );
    }

    public async calculateSwapQuoteAsync(params: CalculateSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        const {
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            isETHSell,
            isETHBuy,
            isMetaTransaction,
            from,
            affiliateAddress,
            // tslint:disable-next-line:boolean-naming
            skipValidation,
            affiliateFee,
        } = params;
        const swapQuote = await this._getMarketBuyOrSellQuoteAsync(params);

        const attributedSwapQuote = {
            ...swapQuote,
            orders: serviceUtils.attributeSwapQuoteOrders(swapQuote.orders),
        };
        const {
            makerAssetAmount,
            totalTakerAssetAmount,
            protocolFeeInWeiAmount: bestCaseProtocolFee,
        } = attributedSwapQuote.bestCaseQuoteInfo;
        const { protocolFeeInWeiAmount: protocolFee, gas: worstCaseGas } = attributedSwapQuote.worstCaseQuoteInfo;
        const { orders, gasPrice, sourceBreakdown, quoteReport } = attributedSwapQuote;

        const {
            gasCost: affiliateFeeGasCost,
            buyTokenFeeAmount,
            sellTokenFeeAmount,
        } = serviceUtils.getAffiliateFeeAmounts(swapQuote, affiliateFee);
        const { to, value, data, decodedUniqueId } = await this._getSwapQuotePartialTransactionAsync(
            swapQuote,
            isETHSell,
            isETHBuy,
            isMetaTransaction,
            affiliateAddress,
            { recipient: affiliateFee.recipient, buyTokenFeeAmount, sellTokenFeeAmount },
        );

        let conservativeBestCaseGasEstimate = new BigNumber(worstCaseGas)
            .plus(affiliateFeeGasCost)
            .plus(isETHSell ? WRAP_ETH_GAS : 0)
            .plus(isETHBuy ? UNWRAP_WETH_GAS : 0);

        if (!skipValidation && from) {
            const estimateGasCallResult = await this._estimateGasOrThrowRevertErrorAsync({
                to,
                data,
                from,
                value,
                gasPrice,
            });
            // Take the max of the faux estimate or the real estimate
            conservativeBestCaseGasEstimate = BigNumber.max(
                // Add a little buffer to eth_estimateGas as it is not always correct
                estimateGasCallResult.times(GAS_LIMIT_BUFFER_MULTIPLIER).integerValue(),
                conservativeBestCaseGasEstimate,
            );
        }
        // If any sources can be undeterministic in gas costs, we add a buffer
        const hasUndeterministicFills = _.flatten(swapQuote.orders.map(order => order.fills)).some(fill =>
            [ERC20BridgeSource.Native, ERC20BridgeSource.MultiBridge].includes(fill.source),
        );
        const undeterministicMultiplier = hasUndeterministicFills ? GAS_LIMIT_BUFFER_MULTIPLIER : 1;
        // Add a buffer to get the worst case gas estimate
        const worstCaseGasEstimate = conservativeBestCaseGasEstimate.times(undeterministicMultiplier).integerValue();
        const { price, guaranteedPrice } = await this._getSwapQuotePriceAsync(
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            attributedSwapQuote,
            affiliateFee,
        );

        let adjustedWorstCaseProtocolFee = protocolFee;
        let adjustedValue = value;

        const erc20AllowanceTarget = this._contractAddresses.exchangeProxyAllowanceTarget;
        // With v1 we are able to fill bridges directly so the protocol fee is lower
        const nativeFills = _.flatten(swapQuote.orders.map(order => order.fills)).filter(
            fill => fill.source === ERC20BridgeSource.Native,
        );
        adjustedWorstCaseProtocolFee = new BigNumber(PROTOCOL_FEE_MULTIPLIER).times(gasPrice).times(nativeFills.length);
        adjustedValue = isETHSell
            ? adjustedWorstCaseProtocolFee.plus(swapQuote.worstCaseQuoteInfo.takerAssetAmount)
            : adjustedWorstCaseProtocolFee;

        const allowanceTarget = isETHSell ? NULL_ADDRESS : erc20AllowanceTarget;

        const apiSwapQuote: GetSwapQuoteResponse = {
            price,
            guaranteedPrice,
            to,
            data,
            value: adjustedValue,
            gas: worstCaseGasEstimate,
            estimatedGas: conservativeBestCaseGasEstimate,
            from,
            gasPrice,
            protocolFee: adjustedWorstCaseProtocolFee,
            minimumProtocolFee: BigNumber.min(adjustedWorstCaseProtocolFee, bestCaseProtocolFee),
            buyTokenAddress,
            sellTokenAddress,
            buyAmount: makerAssetAmount.minus(buyTokenFeeAmount),
            sellAmount: totalTakerAssetAmount,
            sources: serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
            orders: serviceUtils.cleanSignedOrderFields(orders),
            allowanceTarget,
            decodedUniqueId,
            quoteReport,
        };
        return apiSwapQuote;
    }

    public async getSwapQuoteForWrapAsync(params: CalculateSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        return this._getSwapQuoteForWethAsync(params, false);
    }

    public async getSwapQuoteForUnwrapAsync(params: CalculateSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        return this._getSwapQuoteForWethAsync(params, true);
    }

    public async getTokenPricesAsync(sellToken: TokenMetadata, unitAmount: BigNumber): Promise<GetTokenPricesResponse> {
        // Gets the price for buying 1 unit (not base unit as this is different between tokens with differing decimals)
        // returns price in sellToken units, e.g What is the price of 1 ZRX (in DAI)
        // Equivalent to performing multiple swap quotes selling sellToken and buying 1 whole buy token
        const takerAssetData = assetDataUtils.encodeERC20AssetData(sellToken.tokenAddress);
        const queryAssetData = TokenMetadatasForChains.filter(m => m.symbol !== sellToken.symbol).filter(
            m => m.tokenAddresses[CHAIN_ID] !== NULL_ADDRESS,
        );
        const chunkSize = 15;
        const assetDataChunks = _.chunk(queryAssetData, chunkSize);
        const allResults = _.flatten(
            await Promise.all(
                assetDataChunks.map(async a => {
                    const encodedAssetData = a.map(m =>
                        assetDataUtils.encodeERC20AssetData(m.tokenAddresses[CHAIN_ID]),
                    );
                    const amounts = a.map(m => Web3Wrapper.toBaseUnitAmount(unitAmount, m.decimals));
                    const quotes = await this._swapQuoter.getBatchMarketBuySwapQuoteForAssetDataAsync(
                        encodedAssetData,
                        takerAssetData,
                        amounts,
                        {
                            ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
                            bridgeSlippage: 0,
                            maxFallbackSlippage: 0,
                            numSamples: 1,
                        },
                    );
                    return quotes;
                }),
            ),
        );

        const prices = allResults
            .map((quote, i) => {
                if (!quote) {
                    return undefined;
                }
                const buyTokenDecimals = queryAssetData[i].decimals;
                const sellTokenDecimals = sellToken.decimals;
                const { makerAssetAmount, totalTakerAssetAmount } = quote.bestCaseQuoteInfo;
                const unitMakerAssetAmount = Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
                const unitTakerAssetAmount = Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
                const price = unitTakerAssetAmount.dividedBy(unitMakerAssetAmount).decimalPlaces(sellTokenDecimals);
                return {
                    symbol: queryAssetData[i].symbol,
                    price,
                };
            })
            .filter(p => p) as GetTokenPricesResponse;
        return prices;
    }

    public async calculateMarketDepthAsync(
        params: CalaculateMarketDepthParams,
    ): Promise<{
        asks: { depth: BucketedPriceDepth[] };
        bids: { depth: BucketedPriceDepth[] };
    }> {
        const {
            buyToken,
            sellToken,
            sellAmount,
            numSamples,
            sampleDistributionBase,
            excludedSources,
            includedSources,
        } = params;
        const marketDepth = await this._swapQuoter.getBidAskLiquidityForMakerTakerAssetPairAsync(
            buyToken.tokenAddress,
            sellToken.tokenAddress,
            sellAmount,
            {
                numSamples,
                excludedSources: [
                    ...(excludedSources || []),
                    ERC20BridgeSource.MultiBridge,
                    ERC20BridgeSource.Bancor,
                    ERC20BridgeSource.MultiHop,
                ],
                includedSources,
                sampleDistributionBase,
            },
        );

        const maxEndSlippagePercentage = 20;
        const scalePriceByDecimals = (priceDepth: BucketedPriceDepth[]) =>
            priceDepth.map(b => ({
                ...b,
                price: b.price.times(new BigNumber(10).pow(sellToken.decimals - buyToken.decimals)),
            }));
        const askDepth = scalePriceByDecimals(
            marketDepthUtils.calculateDepthForSide(
                marketDepth.asks,
                MarketOperation.Sell,
                numSamples * 2,
                sampleDistributionBase,
                maxEndSlippagePercentage,
            ),
        );
        const bidDepth = scalePriceByDecimals(
            marketDepthUtils.calculateDepthForSide(
                marketDepth.bids,
                MarketOperation.Buy,
                numSamples * 2,
                sampleDistributionBase,
                maxEndSlippagePercentage,
            ),
        );
        return {
            // We're buying buyToken and SELLING sellToken (DAI) (50k)
            // Price goes from HIGH to LOW
            asks: { depth: askDepth },
            // We're BUYING sellToken (DAI) (50k) and selling buyToken
            // Price goes from LOW to HIGH
            bids: { depth: bidDepth },
        };
    }

    private async _getSwapQuoteForWethAsync(
        params: CalculateSwapQuoteParams,
        isUnwrap: boolean,
    ): Promise<GetSwapQuoteResponse> {
        const {
            from,
            buyTokenAddress,
            sellTokenAddress,
            buyAmount,
            sellAmount,
            affiliateAddress,
            gasPrice: providedGasPrice,
        } = params;
        const amount = buyAmount || sellAmount;
        if (amount === undefined) {
            throw new Error('sellAmount or buyAmount required');
        }
        const data = (isUnwrap
            ? this._wethContract.withdraw(amount)
            : this._wethContract.deposit()
        ).getABIEncodedTransactionData();
        const value = isUnwrap ? ZERO : amount;
        const attributedCalldata = serviceUtils.attributeCallData(data, affiliateAddress);
        // TODO: consider not using protocol fee utils due to lack of need for an aggresive gas price for wrapping/unwrapping
        const gasPrice = providedGasPrice || (await this._swapQuoter.getGasPriceEstimationOrThrowAsync());
        const gasEstimate = isUnwrap ? UNWRAP_QUOTE_GAS : WRAP_QUOTE_GAS;
        const apiSwapQuote: GetSwapQuoteResponse = {
            price: ONE,
            guaranteedPrice: ONE,
            to: this._wethContract.address,
            data: attributedCalldata.affiliatedData,
            decodedUniqueId: attributedCalldata.decodedUniqueId,
            value,
            gas: gasEstimate,
            estimatedGas: gasEstimate,
            from,
            gasPrice,
            protocolFee: ZERO,
            minimumProtocolFee: ZERO,
            buyTokenAddress,
            sellTokenAddress,
            buyAmount: amount,
            sellAmount: amount,
            sources: [],
            orders: [],
            allowanceTarget: NULL_ADDRESS,
        };
        return apiSwapQuote;
    }

    private async _estimateGasOrThrowRevertErrorAsync(txData: Partial<TxData>): Promise<BigNumber> {
        const gas = await this._web3Wrapper.estimateGasAsync(txData).catch(_e => DEFAULT_VALIDATION_GAS_LIMIT);
        await this._throwIfCallIsRevertErrorAsync({ ...txData, gas });
        return new BigNumber(gas);
    }

    private async _throwIfCallIsRevertErrorAsync(txData: Partial<TxData>): Promise<void> {
        let callResult;
        let revertError;
        try {
            callResult = await this._web3Wrapper.callAsync(txData);
        } catch (e) {
            if (e.message && /insufficient funds/.test(e.message)) {
                throw new InsufficientFundsError();
            }
            // RPCSubprovider can throw if .error exists on the response payload
            // This `error` response occurs from Parity nodes (incl Alchemy) and Geth nodes >= 1.9.14
            // Geth 1.9.15
            if (e.message && /execution reverted/.test(e.message) && e.data) {
                try {
                    revertError = RevertError.decode(e.data, false);
                } catch (e) {
                    logger.error(`Could not decode revert error: ${e}`);
                    throw new Error(e.message);
                }
            } else {
                revertError = decodeThrownErrorAsRevertError(e);
            }
            if (revertError) {
                throw revertError;
            }
        }
        try {
            revertError = RevertError.decode(callResult, false);
        } catch (e) {
            // No revert error
        }
        if (revertError) {
            throw revertError;
        }
    }
    private async _getMarketBuyOrSellQuoteAsync(params: CalculateSwapQuoteParams): Promise<SwapQuote> {
        const {
            sellAmount,
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            slippagePercentage,
            gasPrice: providedGasPrice,
            isETHSell,
            isMetaTransaction,
            from,
            excludedSources,
            includedSources,
            apiKey,
            rfqt,
            affiliateFee,
            // tslint:disable-next-line:boolean-naming
            includePriceComparisons,
        } = params;
        let _rfqt: RfqtRequestOpts | undefined;
        const isAllExcluded = Object.values(ERC20BridgeSource).every(s => excludedSources.includes(s));
        if (isAllExcluded) {
            throw new ValidationError([
                {
                    field: 'excludedSources',
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: 'Request excluded all sources',
                },
            ]);
        }
        // Only enable RFQT if there's an API key and either (a) it's a
        // forwarder transaction (isETHSell===true), (b) there's a taker
        // address present, or (c) it's an indicative quote.
        if (apiKey !== undefined && (isETHSell || from !== undefined || (rfqt && rfqt.isIndicative))) {
            // The taker is always the ExchangeProxy's FlashWallet
            // as it allows us to optionally transform assets (i.e Deposit ETH into WETH)
            // Since the FlashWallet is the taker it needs to be forwarded to the quote provider
            const takerAddress = this._contractAddresses.exchangeProxyFlashWallet;

            _rfqt = {
                ...rfqt,
                intentOnFilling: rfqt && rfqt.intentOnFilling ? true : false,
                apiKey,
                makerEndpointMaxResponseTimeMs: RFQT_REQUEST_MAX_RESPONSE_MS,
                takerAddress,
            };
        }

        // only generate quote reports for rfqt firm quotes or when price comparison is requested
        const shouldGenerateQuoteReport = includePriceComparisons || (rfqt && rfqt.intentOnFilling);

        const swapQuoteRequestOpts: Partial<SwapQuoteRequestOpts> =
            isMetaTransaction || affiliateFee.buyTokenPercentageFee > 0 || affiliateFee.sellTokenPercentageFee > 0
                ? ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP
                : ASSET_SWAPPER_MARKET_ORDERS_OPTS;

        const assetSwapperOpts: Partial<SwapQuoteRequestOpts> = {
            ...swapQuoteRequestOpts,
            bridgeSlippage: slippagePercentage,
            gasPrice: providedGasPrice,
            excludedSources: swapQuoteRequestOpts.excludedSources.concat(...(excludedSources || [])),
            includedSources,
            rfqt: _rfqt,
            shouldGenerateQuoteReport,
        };
        if (sellAmount !== undefined) {
            return this._swapQuoter.getMarketSellSwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                sellAmount,
                assetSwapperOpts,
            );
        } else if (buyAmount !== undefined) {
            const buyAmountScaled = buyAmount
                .times(affiliateFee.buyTokenPercentageFee + 1)
                .integerValue(BigNumber.ROUND_DOWN);
            return this._swapQuoter.getMarketBuySwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                buyAmountScaled,
                assetSwapperOpts,
            );
        } else {
            throw new Error('sellAmount or buyAmount required');
        }
    }

    private async _getSwapQuotePartialTransactionAsync(
        swapQuote: SwapQuote,
        isFromETH: boolean,
        isToETH: boolean,
        isMetaTransaction: boolean,
        affiliateAddress: string,
        affiliateFee: AffiliateFee,
    ): Promise<SwapQuoteResponsePartialTransaction> {
        const opts: Partial<SwapQuoteGetOutputOpts> = {
            useExtensionContract: ExtensionContractType.ExchangeProxy,
            extensionContractOpts: { isFromETH, isToETH, isMetaTransaction, affiliateFee },
        };

        const {
            calldataHexString: data,
            ethAmount: value,
            toAddress: to,
        } = await this._swapQuoteConsumer.getCalldataOrThrowAsync(swapQuote, opts);

        const { affiliatedData, decodedUniqueId } = serviceUtils.attributeCallData(data, affiliateAddress);
        return {
            to,
            value,
            data: affiliatedData,
            decodedUniqueId,
        };
    }

    private async _getSwapQuotePriceAsync(
        buyAmount: BigNumber,
        buyTokenAddress: string,
        sellTokenAddress: string,
        swapQuote: SwapQuote,
        affiliateFee: PercentageFee,
    ): Promise<SwapQuoteResponsePrice> {
        const { makerAssetAmount, totalTakerAssetAmount } = swapQuote.bestCaseQuoteInfo;
        const { totalTakerAssetAmount: guaranteedTotalTakerAssetAmount } = swapQuote.worstCaseQuoteInfo;
        const guaranteedMakerAssetAmount = getSwapMinBuyAmount(swapQuote);
        const buyTokenDecimals = (await this._tokenDecimalResultCache.getResultAsync(buyTokenAddress)).result;
        const sellTokenDecimals = (await this._tokenDecimalResultCache.getResultAsync(sellTokenAddress)).result;
        const unitMakerAssetAmount = Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
        const unitTakerAssetAmount = Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
        const guaranteedUnitMakerAssetAmount = Web3Wrapper.toUnitAmount(guaranteedMakerAssetAmount, buyTokenDecimals);
        const guaranteedUnitTakerAssetAmount = Web3Wrapper.toUnitAmount(
            guaranteedTotalTakerAssetAmount,
            sellTokenDecimals,
        );
        const affiliateFeeUnitMakerAssetAmount = guaranteedUnitMakerAssetAmount.times(
            affiliateFee.buyTokenPercentageFee,
        );
        // Best price
        const price =
            buyAmount === undefined
                ? unitMakerAssetAmount
                      .minus(affiliateFeeUnitMakerAssetAmount)
                      .dividedBy(unitTakerAssetAmount)
                      .decimalPlaces(sellTokenDecimals)
                : unitTakerAssetAmount
                      .dividedBy(unitMakerAssetAmount.minus(affiliateFeeUnitMakerAssetAmount))
                      .decimalPlaces(buyTokenDecimals);
        // Guaranteed price before revert occurs
        const guaranteedPrice =
            buyAmount === undefined
                ? guaranteedUnitMakerAssetAmount
                      .minus(affiliateFeeUnitMakerAssetAmount)
                      .dividedBy(guaranteedUnitTakerAssetAmount)
                      .decimalPlaces(sellTokenDecimals)
                : guaranteedUnitTakerAssetAmount
                      .dividedBy(guaranteedUnitMakerAssetAmount.minus(affiliateFeeUnitMakerAssetAmount))
                      .decimalPlaces(buyTokenDecimals);
        return {
            price,
            guaranteedPrice,
        };
    }
}

// tslint:disable:max-file-line-count
