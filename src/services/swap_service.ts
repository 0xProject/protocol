import {
    ExtensionContractType,
    Orderbook,
    ProtocolFeeUtils,
    SwapQuote,
    SwapQuoteConsumer,
    SwapQuoter,
    SwapQuoterOpts,
} from '@0x/asset-swapper';
import { OrderPrunerPermittedFeeTypes } from '@0x/asset-swapper/lib/src/types';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ERC20TokenContract, WETH9Contract } from '@0x/contract-wrappers';
import { assetDataUtils, SupportedProvider } from '@0x/order-utils';
import { BigNumber, decodeThrownErrorAsRevertError, RevertError } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import {
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    CHAIN_ID,
    LIQUIDITY_POOL_REGISTRY_ADDRESS,
    RFQT_API_KEY_WHITELIST,
    RFQT_MAKER_ASSET_OFFERINGS,
    RFQT_SKIP_BUY_REQUESTS,
} from '../config';
import {
    DEFAULT_VALIDATION_GAS_LIMIT,
    GAS_LIMIT_BUFFER_MULTIPLIER,
    GST2_WALLET_ADDRESSES,
    ONE,
    PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
    QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    UNWRAP_QUOTE_GAS,
    WRAP_QUOTE_GAS,
    ZERO,
} from '../constants';
import { logger } from '../logger';
import { TokenMetadatasForChains } from '../token_metadatas_for_networks';
import {
    CalculateSwapQuoteParams,
    GetSwapQuoteResponse,
    GetTokenPricesResponse,
    SwapQuoteResponsePartialTransaction,
    SwapQuoteResponsePrice,
    TokenMetadata,
} from '../types';
import { serviceUtils } from '../utils/service_utils';
import { getTokenMetadataIfExists } from '../utils/token_metadata_utils';

export class SwapService {
    private readonly _provider: SupportedProvider;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _swapQuoteConsumer: SwapQuoteConsumer;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _wethContract: WETH9Contract;
    private readonly _gasTokenContract: ERC20TokenContract;
    private readonly _protocolFeeUtils: ProtocolFeeUtils;
    private readonly _forwarderAddress: string;

    constructor(orderbook: Orderbook, provider: SupportedProvider) {
        this._provider = provider;
        const swapQuoterOpts: Partial<SwapQuoterOpts> = {
            chainId: CHAIN_ID,
            expiryBufferMs: QUOTE_ORDER_EXPIRATION_BUFFER_MS,
            liquidityProviderRegistryAddress: LIQUIDITY_POOL_REGISTRY_ADDRESS,
            rfqt: {
                takerApiKeyWhitelist: RFQT_API_KEY_WHITELIST,
                makerAssetOfferings: RFQT_MAKER_ASSET_OFFERINGS,
                skipBuyRequests: RFQT_SKIP_BUY_REQUESTS,
                warningLogger: logger.warn.bind(logger),
                infoLogger: logger.info.bind(logger),
            },
            permittedOrderFeeTypes: new Set([OrderPrunerPermittedFeeTypes.NoFees]),
        };
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._swapQuoteConsumer = new SwapQuoteConsumer(this._provider, swapQuoterOpts);
        this._web3Wrapper = new Web3Wrapper(this._provider);

        const contractAddresses = getContractAddressesForChainOrThrow(CHAIN_ID);
        this._wethContract = new WETH9Contract(contractAddresses.etherToken, this._provider);
        this._gasTokenContract = new ERC20TokenContract(
            getTokenMetadataIfExists('GST2', CHAIN_ID).tokenAddress,
            this._provider,
        );
        this._protocolFeeUtils = new ProtocolFeeUtils(PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS);
        this._forwarderAddress = contractAddresses.forwarder;
    }

    public async calculateSwapQuoteAsync(params: CalculateSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        const {
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            isETHSell,
            from,
            affiliateAddress,
            // tslint:disable-next-line:boolean-naming
            skipValidation,
        } = params;
        const swapQuote = await this._getMarketBuyOrSellQuoteAsync(params);

        const attributedSwapQuote = serviceUtils.attributeSwapQuoteOrders(swapQuote);
        const {
            makerAssetAmount,
            totalTakerAssetAmount,
            protocolFeeInWeiAmount: minimumProtocolFee,
        } = attributedSwapQuote.bestCaseQuoteInfo;
        const { protocolFeeInWeiAmount: protocolFee, gas: worstCaseGas } = attributedSwapQuote.worstCaseQuoteInfo;
        const { orders, gasPrice, sourceBreakdown } = attributedSwapQuote;

        const { to, value, data } = await this._getSwapQuotePartialTransactionAsync(
            swapQuote,
            isETHSell,
            affiliateAddress,
        );
        let gst2Balance = ZERO;
        try {
            gst2Balance = await this._gasTokenContract.balanceOf(GST2_WALLET_ADDRESSES[CHAIN_ID]).callAsync();
        } catch (err) {
            logger.error(err);
        }
        const { gasTokenRefund, gasTokenGasCost } = serviceUtils.getEstimatedGasTokenRefundInfo(
            attributedSwapQuote.orders,
            gst2Balance,
        );

        let conservativeBestCaseGasEstimate = new BigNumber(worstCaseGas).plus(gasTokenGasCost);
        if (!skipValidation && from) {
            // Force a revert error if the takerAddress does not have enough ETH.
            const txDataValue = isETHSell
                ? BigNumber.min(value, await this._web3Wrapper.getBalanceInWeiAsync(from))
                : value;
            const estimateGasCallResult = await this._estimateGasOrThrowRevertErrorAsync({
                to,
                data,
                from,
                value: txDataValue,
                gasPrice,
            });
            // Take the max of the faux estimate or the real estimate
            conservativeBestCaseGasEstimate = BigNumber.max(estimateGasCallResult, conservativeBestCaseGasEstimate);
        }
        // Add a buffer to get the worst case gas estimate
        const worstCaseGasEstimate = conservativeBestCaseGasEstimate.times(GAS_LIMIT_BUFFER_MULTIPLIER).integerValue();
        // Cap the refund at 50% our best estimate
        const estimatedGasTokenRefund = BigNumber.min(
            conservativeBestCaseGasEstimate.div(2),
            gasTokenRefund,
        ).decimalPlaces(0);
        const { price, guaranteedPrice } = await this._getSwapQuotePriceAsync(
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            attributedSwapQuote,
        );

        const apiSwapQuote: GetSwapQuoteResponse = {
            price,
            guaranteedPrice,
            to,
            data,
            value,
            gas: worstCaseGasEstimate,
            estimatedGas: conservativeBestCaseGasEstimate,
            from,
            gasPrice,
            protocolFee,
            minimumProtocolFee,
            buyTokenAddress,
            sellTokenAddress,
            buyAmount: makerAssetAmount,
            sellAmount: totalTakerAssetAmount,
            estimatedGasTokenRefund,
            sources: serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
            orders: serviceUtils.cleanSignedOrderFields(orders),
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
        const queryAssetData = TokenMetadatasForChains.filter(m => m.symbol !== sellToken.symbol);
        const chunkSize = 20;
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
                            numSamples: 3,
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
                const price = unitTakerAssetAmount.dividedBy(unitMakerAssetAmount).decimalPlaces(buyTokenDecimals);
                return {
                    symbol: queryAssetData[i].symbol,
                    price,
                };
            })
            .filter(p => p) as GetTokenPricesResponse;
        return prices;
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
        const affiliatedData = serviceUtils.attributeCallData(data, affiliateAddress);
        // TODO: consider not using protocol fee utils due to lack of need for an aggresive gas price for wrapping/unwrapping
        const gasPrice = providedGasPrice || (await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync());
        const gasEstimate = isUnwrap ? UNWRAP_QUOTE_GAS : WRAP_QUOTE_GAS;
        const apiSwapQuote: GetSwapQuoteResponse = {
            price: ONE,
            guaranteedPrice: ONE,
            to: this._wethContract.address,
            data: affiliatedData,
            value,
            gas: gasEstimate,
            estimatedGas: gasEstimate,
            from,
            gasPrice,
            protocolFee: ZERO,
            minimumProtocolFee: ZERO,
            estimatedGasTokenRefund: ZERO,
            buyTokenAddress,
            sellTokenAddress,
            buyAmount: amount,
            sellAmount: amount,
            sources: [],
            orders: [],
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
            // RPCSubprovider can throw if .error exists on the response payload
            // This `error` response occurs from Parity nodes (incl Alchemy) and Geth nodes >= 1.9.14
            // Geth 1.9.15
            if (e.message && /execution reverted/.test(e.message) && e.data) {
                try {
                    revertError = RevertError.decode(e.data, false);
                } catch (e) {
                    // No revert error
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
            from,
            excludedSources,
            apiKey,
            rfqt,
            // tslint:disable-next-line:boolean-naming
        } = params;
        let _rfqt;
        if (apiKey !== undefined && (isETHSell || from !== undefined)) {
            _rfqt = {
                ...rfqt,
                intentOnFilling: rfqt && rfqt.intentOnFilling ? true : false,
                apiKey,
                // If this is a forwarder transaction, then we want to request quotes with the taker as the
                // forwarder contract. If it's not, then we want to request quotes with the taker set to the
                // API's takerAddress query parameter, which in this context is known as `from`.
                takerAddress: isETHSell ? this._forwarderAddress : from || '',
            };
        }
        const assetSwapperOpts = {
            ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
            slippagePercentage,
            bridgeSlippage: slippagePercentage,
            gasPrice: providedGasPrice,
            excludedSources, // TODO(dave4506): overrides the excluded sources selected by chainId
            rfqt: _rfqt,
        };
        if (sellAmount !== undefined) {
            return this._swapQuoter.getMarketSellSwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                sellAmount,
                assetSwapperOpts,
            );
        } else if (buyAmount !== undefined) {
            return this._swapQuoter.getMarketBuySwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                assetSwapperOpts,
            );
        } else {
            throw new Error('sellAmount or buyAmount required');
        }
    }

    private async _getSwapQuotePartialTransactionAsync(
        swapQuote: SwapQuote,
        isETHSell: boolean,
        affiliateAddress: string,
    ): Promise<SwapQuoteResponsePartialTransaction> {
        const extensionContractType = isETHSell ? ExtensionContractType.Forwarder : ExtensionContractType.None;
        const {
            calldataHexString: data,
            ethAmount: value,
            toAddress: to,
        } = await this._swapQuoteConsumer.getCalldataOrThrowAsync(swapQuote, {
            useExtensionContract: extensionContractType,
        });

        const affiliatedData = serviceUtils.attributeCallData(data, affiliateAddress);
        return {
            to,
            value,
            data: affiliatedData,
        };
    }

    private async _getSwapQuotePriceAsync(
        buyAmount: BigNumber,
        buyTokenAddress: string,
        sellTokenAddress: string,
        swapQuote: SwapQuote,
    ): Promise<SwapQuoteResponsePrice> {
        const { makerAssetAmount, totalTakerAssetAmount } = swapQuote.bestCaseQuoteInfo;
        const {
            makerAssetAmount: guaranteedMakerAssetAmount,
            totalTakerAssetAmount: guaranteedTotalTakerAssetAmount,
        } = swapQuote.worstCaseQuoteInfo;
        const buyTokenDecimals = await serviceUtils.fetchTokenDecimalsIfRequiredAsync(
            buyTokenAddress,
            this._web3Wrapper,
        );
        const sellTokenDecimals = await serviceUtils.fetchTokenDecimalsIfRequiredAsync(
            sellTokenAddress,
            this._web3Wrapper,
        );
        const unitMakerAssetAmount = Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
        const unitTakerAssetAMount = Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
        // Best price
        const price =
            buyAmount === undefined
                ? unitMakerAssetAmount.dividedBy(unitTakerAssetAMount).decimalPlaces(sellTokenDecimals)
                : unitTakerAssetAMount.dividedBy(unitMakerAssetAmount).decimalPlaces(buyTokenDecimals);
        // Guaranteed price before revert occurs
        const guaranteedUnitMakerAssetAmount = Web3Wrapper.toUnitAmount(guaranteedMakerAssetAmount, buyTokenDecimals);
        const guaranteedUnitTakerAssetAMount = Web3Wrapper.toUnitAmount(
            guaranteedTotalTakerAssetAmount,
            sellTokenDecimals,
        );
        const guaranteedPrice =
            buyAmount === undefined
                ? guaranteedUnitMakerAssetAmount
                      .dividedBy(guaranteedUnitTakerAssetAMount)
                      .decimalPlaces(sellTokenDecimals)
                : guaranteedUnitTakerAssetAMount
                      .dividedBy(guaranteedUnitMakerAssetAmount)
                      .decimalPlaces(buyTokenDecimals);
        return {
            price,
            guaranteedPrice,
        };
    }
}
