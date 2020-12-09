import {
    AffiliateFee,
    AssetSwapperContractAddresses,
    ERC20BridgeSource,
    ExtensionContractType,
    GetMarketOrdersRfqtOpts,
    getSwapMinBuyAmount,
    Orderbook,
    RfqtFirmQuoteValidator,
    SwapQuote,
    SwapQuoteConsumer,
    SwapQuoteGetOutputOpts,
    SwapQuoter,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
} from '@0x/asset-swapper';
import { ContractAddresses } from '@0x/contract-addresses';
import { WETH9Contract } from '@0x/contract-wrappers';
import { assetDataUtils, ETH_TOKEN_ADDRESS, SupportedProvider } from '@0x/order-utils';
import { MarketOperation } from '@0x/types';
import { BigNumber, decodeThrownErrorAsRevertError, RevertError } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import {
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP,
    CHAIN_ID,
    FIRM_PRICE_AWARE_RFQ_ENABLED,
    INDICATIVE_PRICE_AWARE_RFQ_ENABLED,
    PROTOCOL_FEE_MULTIPLIER,
    RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER,
    RFQT_REQUEST_MAX_RESPONSE_MS,
    SWAP_QUOTER_OPTS,
} from '../config';
import {
    DEFAULT_VALIDATION_GAS_LIMIT,
    GAS_LIMIT_BUFFER_MULTIPLIER,
    NULL_ADDRESS,
    ONE,
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
    TokenMetadata,
    TokenMetadataOptionalSymbol,
} from '../types';
import { ethGasStationUtils } from '../utils/gas_station_utils';
import { marketDepthUtils } from '../utils/market_depth_utils';
import { serviceUtils } from '../utils/service_utils';
import { getTokenMetadataIfExists } from '../utils/token_metadata_utils';

export class SwapService {
    private readonly _provider: SupportedProvider;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _swapQuoteConsumer: SwapQuoteConsumer;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _wethContract: WETH9Contract;
    private readonly _contractAddresses: ContractAddresses;
    private readonly _firmQuoteValidator: RfqtFirmQuoteValidator | undefined;

    private static _getSwapQuotePrice(
        buyAmount: BigNumber | undefined,
        buyTokenDecimals: number,
        sellTokenDecimals: number,
        swapQuote: SwapQuote,
        affiliateFee: PercentageFee,
    ): { price: BigNumber; guaranteedPrice: BigNumber } {
        const { makerAssetAmount, totalTakerAssetAmount } = swapQuote.bestCaseQuoteInfo;
        const { totalTakerAssetAmount: guaranteedTotalTakerAssetAmount } = swapQuote.worstCaseQuoteInfo;
        const guaranteedMakerAssetAmount = getSwapMinBuyAmount(swapQuote);
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

        const isSelling = buyAmount === undefined;
        // NOTE: In order to not communicate a price better than the actual quote we
        // should make sure to always round towards a worse price
        const roundingStrategy = isSelling ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_CEIL;
        // Best price
        const price = isSelling
            ? unitMakerAssetAmount
                  .minus(affiliateFeeUnitMakerAssetAmount)
                  .dividedBy(unitTakerAssetAmount)
                  .decimalPlaces(buyTokenDecimals, roundingStrategy)
            : unitTakerAssetAmount
                  .dividedBy(unitMakerAssetAmount.minus(affiliateFeeUnitMakerAssetAmount))
                  .decimalPlaces(sellTokenDecimals, roundingStrategy);
        // Guaranteed price before revert occurs
        const guaranteedPrice = isSelling
            ? guaranteedUnitMakerAssetAmount
                  .minus(affiliateFeeUnitMakerAssetAmount)
                  .dividedBy(guaranteedUnitTakerAssetAmount)
                  .decimalPlaces(buyTokenDecimals, roundingStrategy)
            : guaranteedUnitTakerAssetAmount
                  .dividedBy(guaranteedUnitMakerAssetAmount.minus(affiliateFeeUnitMakerAssetAmount))
                  .decimalPlaces(sellTokenDecimals, roundingStrategy);
        return {
            price,
            guaranteedPrice,
        };
    }

    constructor(
        orderbook: Orderbook,
        provider: SupportedProvider,
        contractAddresses: AssetSwapperContractAddresses,
        firmQuoteValidator?: RfqtFirmQuoteValidator | undefined,
    ) {
        this._provider = provider;
        this._firmQuoteValidator = firmQuoteValidator;
        const swapQuoterOpts: Partial<SwapQuoterOpts> = {
            ...SWAP_QUOTER_OPTS,
            rfqt: {
                ...SWAP_QUOTER_OPTS.rfqt!,
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
            shouldSellEntireBalance,
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
            shouldSellEntireBalance,
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
        const { makerTokenDecimals, takerTokenDecimals } = swapQuote;
        const { price, guaranteedPrice } = SwapService._getSwapQuotePrice(
            buyAmount,
            makerTokenDecimals,
            takerTokenDecimals,
            attributedSwapQuote,
            affiliateFee,
        );

        let adjustedWorstCaseProtocolFee = protocolFee;
        let adjustedValue = value;

        // If the entire caller amount is requested to be sold, this requires the new allowance target
        // i.e the exchange proxy. The old allowance target will eventually be deprecated
        const erc20AllowanceTarget = shouldSellEntireBalance
            ? this._contractAddresses.exchangeProxy
            : this._contractAddresses.exchangeProxyAllowanceTarget;

        // With v1 we are able to fill bridges directly so the protocol fee is lower
        const nativeFills = _.flatten(swapQuote.orders.map(order => order.fills)).filter(
            fill => fill.source === ERC20BridgeSource.Native,
        );

        const hasRFQTOrders = swapQuote.orders.some(order => {
            const isNativeOrder = order.fills.some(fill => fill.source === ERC20BridgeSource.Native);
            const hasTakerAddress = order.takerAddress !== NULL_ADDRESS;

            return isNativeOrder && hasTakerAddress;
        });

        // NOTE: Takers have a tendency to bump the gas price in order to speed up their trades
        // for Native orders this often leads to an insufficient protocol fee being included and
        // potential RFQT orders cannot be filled, so to avoid this we pad the protocol fee amount
        // specifically when RFQT orders are included in the quote
        if (hasRFQTOrders) {
            const maxGasPricePadding = gasPrice.times(RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER);
            const fastestGasPrice = await ethGasStationUtils.getGasPriceOrThrowAsync('fastest').catch(err => {
                logger.error(err, 'Failed to fetch ETH Gas Station fastest gas price');

                // Failed to fetch fastest gas estimate, use max padded fast instead
                return maxGasPricePadding;
            });

            // Use the fastest price but make sure it's never more than max padding and never less than supplied gas price
            const paddedGasPrice = BigNumber.max(BigNumber.min(fastestGasPrice, maxGasPricePadding), gasPrice);

            adjustedWorstCaseProtocolFee = new BigNumber(PROTOCOL_FEE_MULTIPLIER)
                .times(paddedGasPrice)
                .times(nativeFills.length);
        } else {
            adjustedWorstCaseProtocolFee = new BigNumber(PROTOCOL_FEE_MULTIPLIER)
                .times(gasPrice)
                .times(nativeFills.length);
        }

        adjustedValue = isETHSell
            ? adjustedWorstCaseProtocolFee.plus(swapQuote.worstCaseQuoteInfo.takerAssetAmount)
            : adjustedWorstCaseProtocolFee;

        const allowanceTarget = isETHSell ? NULL_ADDRESS : erc20AllowanceTarget;

        const { takerAssetToEthRate, makerAssetToEthRate } = swapQuote;

        // Convert into unit amounts
        const wethToken = getTokenMetadataIfExists('WETH', CHAIN_ID)!;
        const sellTokenToEthRate = takerAssetToEthRate
            .times(new BigNumber(10).pow(wethToken.decimals - takerTokenDecimals))
            .decimalPlaces(takerTokenDecimals);
        const buyTokenToEthRate = makerAssetToEthRate
            .times(new BigNumber(10).pow(wethToken.decimals - makerTokenDecimals))
            .decimalPlaces(makerTokenDecimals);

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
            // NOTE: Internally all ETH trades are for WETH, we just wrap/unwrap automatically
            buyTokenAddress: isETHBuy ? ETH_TOKEN_ADDRESS : buyTokenAddress,
            sellTokenAddress: isETHSell ? ETH_TOKEN_ADDRESS : sellTokenAddress,
            buyAmount: makerAssetAmount.minus(buyTokenFeeAmount),
            sellAmount: totalTakerAssetAmount,
            sources: serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
            orders: serviceUtils.cleanSignedOrderFields(orders),
            allowanceTarget,
            decodedUniqueId,
            sellTokenToEthRate,
            buyTokenToEthRate,
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
                const price = unitTakerAssetAmount
                    .dividedBy(unitMakerAssetAmount)
                    .decimalPlaces(sellTokenDecimals, BigNumber.ROUND_CEIL);
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
        buyToken: TokenMetadataOptionalSymbol;
        sellToken: TokenMetadataOptionalSymbol;
    }> {
        const {
            buyToken: buyToken,
            sellToken: sellToken,
            sellAmount,
            numSamples,
            sampleDistributionBase,
            excludedSources,
            includedSources,
        } = params;

        const marketDepth = await this._swapQuoter.getBidAskLiquidityForMakerTakerAssetPairAsync(
            buyToken,
            sellToken,
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
                price: b.price.times(
                    new BigNumber(10).pow(marketDepth.takerTokenDecimals - marketDepth.makerTokenDecimals),
                ),
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
            buyToken: {
                tokenAddress: buyToken,
                decimals: marketDepth.makerTokenDecimals,
            },
            sellToken: {
                tokenAddress: sellToken,
                decimals: marketDepth.takerTokenDecimals,
            },
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
            sellTokenToEthRate: new BigNumber(1),
            buyTokenToEthRate: new BigNumber(1),
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
            if (callResult) {
                revertError = RevertError.decode(callResult, false);
            }
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
            buyTokenAddress: rawBuyTokenAddress,
            sellTokenAddress: rawSellTokenAddress,
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
        // Normalize to lower case
        const sellTokenAddress = rawSellTokenAddress.toLowerCase();
        const buyTokenAddress = rawBuyTokenAddress.toLowerCase();
        let _rfqt: GetMarketOrdersRfqtOpts | undefined;
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
                priceAwareRFQFlag: {
                    isFirmPriceAwareEnabled: FIRM_PRICE_AWARE_RFQ_ENABLED,
                    isIndicativePriceAwareEnabled: INDICATIVE_PRICE_AWARE_RFQ_ENABLED,
                },
                firmQuoteValidator: this._firmQuoteValidator,
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
            excludedSources: swapQuoteRequestOpts.excludedSources?.concat(...(excludedSources || [])),
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
        shouldSellEntireBalance: boolean,
        affiliateAddress: string | undefined,
        affiliateFee: AffiliateFee,
    ): Promise<SwapQuoteResponsePartialTransaction> {
        const opts: Partial<SwapQuoteGetOutputOpts> = {
            useExtensionContract: ExtensionContractType.ExchangeProxy,
            extensionContractOpts: { isFromETH, isToETH, isMetaTransaction, shouldSellEntireBalance, affiliateFee },
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
}

// tslint:disable:max-file-line-count
