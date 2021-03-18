import {
    AffiliateFeeAmount,
    AffiliateFeeType,
    AltRfqtMakerAssetOfferings,
    artifacts,
    AssetSwapperContractAddresses,
    ContractAddresses,
    ERC20BridgeSource,
    FakeTakerContract,
    GetMarketOrdersRfqtOpts,
    Orderbook,
    RfqtFirmQuoteValidator,
    SwapQuote,
    SwapQuoteConsumer,
    SwapQuoteGetOutputOpts,
    SwapQuoter,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
} from '@0x/asset-swapper';
import { WETH9Contract } from '@0x/contract-wrappers';
import { ETH_TOKEN_ADDRESS, RevertError } from '@0x/protocol-utils';
import { MarketOperation, PaginatedCollection } from '@0x/types';
import { BigNumber, decodeThrownErrorAsRevertError } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import axios from 'axios';
import { SupportedProvider } from 'ethereum-types';
import * as _ from 'lodash';

import {
    ALT_RFQ_MM_API_KEY,
    ALT_RFQ_MM_ENDPOINT,
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_MULTIPLEX,
    ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP,
    CHAIN_ID,
    RFQT_REQUEST_MAX_RESPONSE_MS,
    RFQ_PROXY_ADDRESS,
    RFQ_PROXY_PORT,
    SWAP_QUOTER_OPTS,
} from '../config';
import {
    DEFAULT_VALIDATION_GAS_LIMIT,
    GAS_LIMIT_BUFFER_MULTIPLIER,
    NULL_ADDRESS,
    NULL_BYTES,
    ONE,
    ONE_MINUTE_MS,
    UNWRAP_QUOTE_GAS,
    UNWRAP_WETH_GAS,
    WRAP_ETH_GAS,
    WRAP_QUOTE_GAS,
    ZERO,
} from '../constants';
import { InsufficientFundsError } from '../errors';
import { logger } from '../logger';
import { TokenMetadatasForChains } from '../token_metadatas_for_networks';
import {
    AffiliateFee,
    BucketedPriceDepth,
    CalaculateMarketDepthParams,
    ChainId,
    GetSwapQuoteParams,
    GetSwapQuoteResponse,
    Price,
    SwapQuoteResponsePartialTransaction,
    TokenMetadata,
    TokenMetadataOptionalSymbol,
} from '../types';
import { altMarketResponseToAltOfferings } from '../utils/alt_mm_utils';
import { marketDepthUtils } from '../utils/market_depth_utils';
import { paginationUtils } from '../utils/pagination_utils';
import { createResultCache } from '../utils/result_cache';
import { serviceUtils } from '../utils/service_utils';
import { getTokenMetadataIfExists } from '../utils/token_metadata_utils';
import { utils } from '../utils/utils';

export class SwapService {
    private readonly _provider: SupportedProvider;
    private readonly _fakeTaker: FakeTakerContract;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _swapQuoteConsumer: SwapQuoteConsumer;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _wethContract: WETH9Contract;
    private readonly _contractAddresses: ContractAddresses;
    private readonly _firmQuoteValidator: RfqtFirmQuoteValidator | undefined;
    private _altRfqMarketsCache: any;

    private static _getSwapQuotePrice(
        buyAmount: BigNumber | undefined,
        buyTokenDecimals: number,
        sellTokenDecimals: number,
        swapQuote: SwapQuote,
        affiliateFee: AffiliateFee,
    ): { price: BigNumber; guaranteedPrice: BigNumber } {
        const { makerAmount, totalTakerAmount } = swapQuote.bestCaseQuoteInfo;
        const {
            totalTakerAmount: guaranteedTotalTakerAmount,
            makerAmount: guaranteedMakerAmount,
        } = swapQuote.worstCaseQuoteInfo;
        const unitMakerAmount = Web3Wrapper.toUnitAmount(makerAmount, buyTokenDecimals);
        const unitTakerAmount = Web3Wrapper.toUnitAmount(totalTakerAmount, sellTokenDecimals);
        const guaranteedUnitMakerAmount = Web3Wrapper.toUnitAmount(guaranteedMakerAmount, buyTokenDecimals);
        const guaranteedUnitTakerAmount = Web3Wrapper.toUnitAmount(guaranteedTotalTakerAmount, sellTokenDecimals);
        const affiliateFeeUnitMakerAmount = guaranteedUnitMakerAmount.times(affiliateFee.buyTokenPercentageFee);

        const isSelling = buyAmount === undefined;
        // NOTE: In order to not communicate a price better than the actual quote we
        // should make sure to always round towards a worse price
        const roundingStrategy = isSelling ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_CEIL;
        // Best price
        const price = isSelling
            ? unitMakerAmount
                  .minus(affiliateFeeUnitMakerAmount)
                  .dividedBy(unitTakerAmount)
                  .decimalPlaces(buyTokenDecimals, roundingStrategy)
            : unitTakerAmount
                  .dividedBy(unitMakerAmount.minus(affiliateFeeUnitMakerAmount))
                  .decimalPlaces(sellTokenDecimals, roundingStrategy);
        // Guaranteed price before revert occurs
        const guaranteedPrice = isSelling
            ? guaranteedUnitMakerAmount
                  .minus(affiliateFeeUnitMakerAmount)
                  .dividedBy(guaranteedUnitTakerAmount)
                  .decimalPlaces(buyTokenDecimals, roundingStrategy)
            : guaranteedUnitTakerAmount
                  .dividedBy(guaranteedUnitMakerAmount.minus(affiliateFeeUnitMakerAmount))
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

        let axiosOpts = {};
        if (RFQ_PROXY_ADDRESS !== undefined && RFQ_PROXY_PORT !== undefined) {
            axiosOpts = {
                proxy: {
                    host: RFQ_PROXY_ADDRESS,
                    port: RFQ_PROXY_PORT,
                },
            };
        }
        const swapQuoterOpts: Partial<SwapQuoterOpts> = {
            ...SWAP_QUOTER_OPTS,
            rfqt: {
                ...SWAP_QUOTER_OPTS.rfqt!,
                warningLogger: logger.warn.bind(logger),
                infoLogger: logger.info.bind(logger),
                axiosInstanceOpts: axiosOpts,
            },
            contractAddresses,
        };
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._swapQuoteConsumer = new SwapQuoteConsumer(this._provider, swapQuoterOpts);
        this._web3Wrapper = new Web3Wrapper(this._provider);

        this._contractAddresses = contractAddresses;
        this._wethContract = new WETH9Contract(this._contractAddresses.etherToken, this._provider);
        this._fakeTaker = new FakeTakerContract(NULL_ADDRESS, this._provider);
    }

    public async calculateSwapQuoteAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        const {
            takerAddress,
            sellAmount,
            buyAmount,
            buyToken,
            sellToken,
            slippagePercentage,
            gasPrice: providedGasPrice,
            isMetaTransaction,
            isETHSell,
            isETHBuy,
            excludedSources,
            includedSources,
            apiKey,
            rfqt,
            affiliateAddress,
            affiliateFee,
            // tslint:disable:boolean-naming
            includePriceComparisons,
            skipValidation,
            // tslint:enable:boolean-naming
            shouldSellEntireBalance,
        } = params;

        let _rfqt: GetMarketOrdersRfqtOpts | undefined;
        // Only enable RFQT if there's an API key and either (a) it's a
        // forwarder transaction (isETHSell===true), (b) there's a taker
        // address present, or (c) it's an indicative quote.
        const shouldEnableRfqt =
            apiKey !== undefined && (isETHSell || takerAddress !== undefined || (rfqt && rfqt.isIndicative));
        if (shouldEnableRfqt) {
            // tslint:disable-next-line:custom-no-magic-numbers
            const altRfqtAssetOfferings = await this._getAltMarketOfferingsAsync(1500);

            _rfqt = {
                ...rfqt,
                intentOnFilling: rfqt && rfqt.intentOnFilling ? true : false,
                apiKey: apiKey!,
                makerEndpointMaxResponseTimeMs: RFQT_REQUEST_MAX_RESPONSE_MS,
                // Note 0xAPI maps takerAddress query parameter to txOrigin as takerAddress is always Exchange Proxy or a VIP
                takerAddress: NULL_ADDRESS,
                txOrigin: takerAddress!,
                firmQuoteValidator: this._firmQuoteValidator,
                altRfqtAssetOfferings,
            };
        }

        // only generate quote reports for rfqt firm quotes or when price comparison is requested
        const shouldGenerateQuoteReport = includePriceComparisons || (rfqt && rfqt.intentOnFilling);

        let swapQuoteRequestOpts: Partial<SwapQuoteRequestOpts>;
        if (
            isMetaTransaction ||
            // Note: We allow VIP to continue ahead when positive slippage fee is enabled
            affiliateFee.feeType === AffiliateFeeType.PercentageFee
        ) {
            swapQuoteRequestOpts = ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP;
        } else if (isETHBuy || isETHSell) {
            swapQuoteRequestOpts = ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_MULTIPLEX;
        } else {
            swapQuoteRequestOpts = ASSET_SWAPPER_MARKET_ORDERS_OPTS;
        }

        const assetSwapperOpts: Partial<SwapQuoteRequestOpts> = {
            ...swapQuoteRequestOpts,
            bridgeSlippage: slippagePercentage,
            gasPrice: providedGasPrice,
            excludedSources: swapQuoteRequestOpts.excludedSources?.concat(...(excludedSources || [])),
            includedSources,
            rfqt: _rfqt,
            shouldGenerateQuoteReport,
        };

        const marketSide = sellAmount !== undefined ? MarketOperation.Sell : MarketOperation.Buy;
        const amount =
            marketSide === MarketOperation.Sell
                ? sellAmount
                : buyAmount!.times(affiliateFee.buyTokenPercentageFee + 1).integerValue(BigNumber.ROUND_DOWN);

        // Fetch the Swap quote
        const swapQuote = await this._swapQuoter.getSwapQuoteAsync(
            buyToken,
            sellToken,
            amount!, // was validated earlier
            marketSide,
            assetSwapperOpts,
        );

        const {
            makerAmount,
            totalTakerAmount,
            protocolFeeInWeiAmount: bestCaseProtocolFee,
        } = swapQuote.bestCaseQuoteInfo;
        const { protocolFeeInWeiAmount: protocolFee, gas: worstCaseGas } = swapQuote.worstCaseQuoteInfo;
        const { gasPrice, sourceBreakdown, quoteReport } = swapQuote;

        const {
            gasCost: affiliateFeeGasCost,
            buyTokenFeeAmount,
            sellTokenFeeAmount,
        } = serviceUtils.getAffiliateFeeAmounts(swapQuote, affiliateFee);

        // Grab the encoded version of the swap quote
        const { to, value, data, decodedUniqueId, gasOverhead } = await this._getSwapQuotePartialTransactionAsync(
            swapQuote,
            isETHSell,
            isETHBuy,
            isMetaTransaction,
            shouldSellEntireBalance,
            affiliateAddress,
            {
                recipient: affiliateFee.recipient,
                feeType: affiliateFee.feeType,
                buyTokenFeeAmount,
                sellTokenFeeAmount,
            },
        );

        let conservativeBestCaseGasEstimate = new BigNumber(worstCaseGas)
            .plus(affiliateFeeGasCost)
            .plus(isETHSell ? WRAP_ETH_GAS : 0)
            .plus(isETHBuy ? UNWRAP_WETH_GAS : 0);

        // If the taker address is provided we can provide a more accurate gas estimate
        // using eth_gasEstimate
        // If an error occurs we attempt to provide a better message then "Transaction Reverted"
        if (takerAddress && !skipValidation) {
            const estimateGasCallResult = await this._estimateGasOrThrowRevertErrorAsync({
                to,
                data,
                from: takerAddress,
                value,
                gasPrice,
            });
            // Add any underterministic gas overhead the encoded transaction has detected
            estimateGasCallResult.plus(gasOverhead);
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
            swapQuote,
            affiliateFee,
        );

        let adjustedValue = value;

        adjustedValue = isETHSell ? protocolFee.plus(swapQuote.worstCaseQuoteInfo.takerAmount) : protocolFee;

        // No allowance target is needed if this is an ETH sell, so set to 0x000..
        const allowanceTarget = isETHSell ? NULL_ADDRESS : this._contractAddresses.exchangeProxy;

        const { takerAmountPerEth: takerTokenToEthRate, makerAmountPerEth: makerTokenToEthRate } = swapQuote;

        // Convert into unit amounts
        const wethToken = getTokenMetadataIfExists('WETH', CHAIN_ID)!;
        const sellTokenToEthRate = takerTokenToEthRate
            .times(new BigNumber(10).pow(wethToken.decimals - takerTokenDecimals))
            .decimalPlaces(takerTokenDecimals);
        const buyTokenToEthRate = makerTokenToEthRate
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
            from: takerAddress,
            gasPrice,
            protocolFee,
            minimumProtocolFee: BigNumber.min(protocolFee, bestCaseProtocolFee),
            // NOTE: Internally all ETH trades are for WETH, we just wrap/unwrap automatically
            buyTokenAddress: isETHBuy ? ETH_TOKEN_ADDRESS : buyToken,
            sellTokenAddress: isETHSell ? ETH_TOKEN_ADDRESS : sellToken,
            buyAmount: makerAmount.minus(buyTokenFeeAmount),
            sellAmount: totalTakerAmount,
            sources: serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
            orders: swapQuote.orders,
            allowanceTarget,
            decodedUniqueId,
            sellTokenToEthRate,
            buyTokenToEthRate,
            quoteReport,
        };
        return apiSwapQuote;
    }

    public async getSwapQuoteForWrapAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        return this._getSwapQuoteForWethAsync(params, false);
    }

    public async getSwapQuoteForUnwrapAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        return this._getSwapQuoteForWethAsync(params, true);
    }

    public async getTokenPricesAsync(
        sellToken: TokenMetadata,
        unitAmount: BigNumber,
        page: number,
        perPage: number,
    ): Promise<PaginatedCollection<Price>> {
        // Gets the price for buying 1 unit (not base unit as this is different between tokens with differing decimals)
        // returns price in sellToken units, e.g What is the price of 1 ZRX (in DAI)
        // Equivalent to performing multiple swap quotes selling sellToken and buying 1 whole buy token
        const takerToken = sellToken.tokenAddress;
        const queryTokenData = TokenMetadatasForChains.filter(m => m.symbol !== sellToken.symbol).filter(
            m => m.tokenAddresses[CHAIN_ID] !== NULL_ADDRESS,
        );
        const paginatedTokens = paginationUtils.paginate(queryTokenData, page, perPage);
        const chunkSize = 20;
        const queryTokenChunks = _.chunk(paginatedTokens.records, chunkSize);
        const allResults = (
            await Promise.all(
                queryTokenChunks.map(async tokens => {
                    const makerTokens = tokens.map(t => t.tokenAddresses[CHAIN_ID]);
                    const amounts = tokens.map(t => Web3Wrapper.toBaseUnitAmount(unitAmount, t.decimals));
                    const quotes = await this._swapQuoter.getBatchMarketBuySwapQuoteAsync(
                        makerTokens,
                        takerToken,
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
            )
        )
            .filter(x => x !== undefined)
            .reduce((acc, x) => acc.concat(x), []); // flatten

        const prices = allResults
            .map((quote, i) => {
                const buyTokenDecimals = new BigNumber(quote.makerTokenDecimals).toNumber();
                const sellTokenDecimals = new BigNumber(quote.takerTokenDecimals).toNumber();
                const symbol = queryTokenData.find(data => data.tokenAddresses[CHAIN_ID] === quote.makerToken)?.symbol;
                const { makerAmount, totalTakerAmount } = quote.bestCaseQuoteInfo;
                const unitMakerAmount = Web3Wrapper.toUnitAmount(makerAmount, buyTokenDecimals);
                const unitTakerAmount = Web3Wrapper.toUnitAmount(totalTakerAmount, sellTokenDecimals);
                const price = unitTakerAmount
                    .dividedBy(unitMakerAmount)
                    .decimalPlaces(sellTokenDecimals, BigNumber.ROUND_CEIL);
                return {
                    symbol,
                    price,
                };
            })
            .filter(p => p) as Price[];

        // Add ETH into the prices list as it is not a token
        const wethData = prices.find((p: Price) => p.symbol === 'WETH');
        if (wethData) {
            prices.push({ ...wethData, symbol: 'ETH' });
        }
        return { ...paginatedTokens, records: prices };
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
        params: GetSwapQuoteParams,
        isUnwrap: boolean,
    ): Promise<GetSwapQuoteResponse> {
        const {
            takerAddress,
            buyToken,
            sellToken,
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
            from: takerAddress,
            gasPrice,
            protocolFee: ZERO,
            minimumProtocolFee: ZERO,
            buyTokenAddress: buyToken,
            sellTokenAddress: sellToken,
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
        let revertError;
        let gasEstimate = ZERO;
        let callResult: {
            success: boolean;
            resultData: string;
            gasUsed: BigNumber;
        } = { success: false, resultData: NULL_BYTES, gasUsed: ZERO };
        let callResultGanacheRaw: string | undefined;
        try {
            // NOTE: Ganache does not support overrides
            if (CHAIN_ID === ChainId.Ganache) {
                const gas = await this._web3Wrapper.estimateGasAsync(txData).catch(_e => DEFAULT_VALIDATION_GAS_LIMIT);
                callResultGanacheRaw = await this._web3Wrapper.callAsync({
                    ...txData,
                    gas,
                });
                gasEstimate = new BigNumber(gas);
            } else {
                // Split out the `to` and `data` so it doesn't override
                const { data, to, ...rest } = txData;
                callResult = await this._fakeTaker.execute(to!, data!).callAsync({
                    ...rest,
                    // Set the `to` to be the user address with a fake contract at that address
                    to: txData.from!,
                    // TODO jacob this has issues with protocol fees, but a gas amount is needed to use gasPrice
                    gasPrice: 0,
                    overrides: {
                        // Override the user address with the Fake Taker contract
                        [txData.from!]: {
                            code: _.get(artifacts.FakeTaker, 'compilerOutput.evm.deployedBytecode.object'),
                        },
                    },
                });

                gasEstimate = callResult.gasUsed.plus(utils.calculateCallDataGas(data!));
            }
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
            if (callResultGanacheRaw) {
                revertError = RevertError.decode(callResultGanacheRaw, false);
            } else if (callResult! && !callResult.success) {
                revertError = RevertError.decode(callResult.resultData, false);
            }
        } catch (e) {
            // No revert error
        }
        if (revertError) {
            throw revertError;
        }
        return gasEstimate;
    }

    private async _getSwapQuotePartialTransactionAsync(
        swapQuote: SwapQuote,
        isFromETH: boolean,
        isToETH: boolean,
        isMetaTransaction: boolean,
        shouldSellEntireBalance: boolean,
        affiliateAddress: string | undefined,
        affiliateFee: AffiliateFeeAmount,
    ): Promise<SwapQuoteResponsePartialTransaction & { gasOverhead: BigNumber }> {
        const opts: Partial<SwapQuoteGetOutputOpts> = {
            extensionContractOpts: { isFromETH, isToETH, isMetaTransaction, shouldSellEntireBalance, affiliateFee },
        };

        const {
            calldataHexString: data,
            ethAmount: value,
            toAddress: to,
            gasOverhead,
        } = await this._swapQuoteConsumer.getCalldataOrThrowAsync(swapQuote, opts);

        const { affiliatedData, decodedUniqueId } = serviceUtils.attributeCallData(data, affiliateAddress);
        return {
            to,
            value,
            data: affiliatedData,
            decodedUniqueId,
            gasOverhead,
        };
    }

    private async _getAltMarketOfferingsAsync(timeoutMs: number): Promise<AltRfqtMakerAssetOfferings> {
        if (!this._altRfqMarketsCache) {
            this._altRfqMarketsCache = createResultCache<AltRfqtMakerAssetOfferings>(async () => {
                if (ALT_RFQ_MM_ENDPOINT === undefined || ALT_RFQ_MM_API_KEY === undefined) {
                    return {};
                }
                try {
                    const response = await axios.get(`${ALT_RFQ_MM_ENDPOINT}/markets`, {
                        headers: { Authorization: `Bearer ${ALT_RFQ_MM_API_KEY}` },
                        timeout: timeoutMs,
                    });

                    return altMarketResponseToAltOfferings(response.data, ALT_RFQ_MM_ENDPOINT);
                } catch (err) {
                    logger.warn(`error fetching alt RFQ markets: ${err}`);
                    return {};
                }
                // refresh cache every 6 hours
                // tslint:disable-next-line:custom-no-magic-numbers
            }, ONE_MINUTE_MS * 360);
        }

        return (await this._altRfqMarketsCache.getResultAsync()).result;
    }
}

// tslint:disable:max-file-line-count
