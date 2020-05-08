import {
    ExtensionContractType,
    Orderbook,
    ProtocolFeeUtils,
    SwapQuoteConsumer,
    SwapQuoter,
    SwapQuoterOpts,
} from '@0x/asset-swapper';
import { OrderPrunerPermittedFeeTypes } from '@0x/asset-swapper/lib/src/types';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { WETH9Contract } from '@0x/contract-wrappers';
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
    GAS_LIMIT_BUFFER_PERCENTAGE,
    ONE,
    PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
    QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    UNWRAP_QUOTE_GAS,
    WRAP_QUOTE_GAS,
    ZERO,
} from '../constants';
import { logger } from '../logger';
import { TokenMetadatasForChains } from '../token_metadatas_for_networks';
import { CalculateSwapQuoteParams, GetSwapQuoteResponse, GetTokenPricesResponse, TokenMetadata } from '../types';
import { serviceUtils } from '../utils/service_utils';

export class SwapService {
    private readonly _provider: SupportedProvider;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _swapQuoteConsumer: SwapQuoteConsumer;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _wethContract: WETH9Contract;
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
        this._protocolFeeUtils = new ProtocolFeeUtils(PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS);
        this._forwarderAddress = contractAddresses.forwarder;
    }

    public async calculateSwapQuoteAsync(params: CalculateSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        let swapQuote;
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
            affiliateAddress,
            apiKey,
            rfqt,
            // tslint:disable-next-line:boolean-naming
            skipValidation,
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
            swapQuote = await this._swapQuoter.getMarketSellSwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                sellAmount,
                assetSwapperOpts,
            );
        } else if (buyAmount !== undefined) {
            swapQuote = await this._swapQuoter.getMarketBuySwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                assetSwapperOpts,
            );
        } else {
            throw new Error('sellAmount or buyAmount required');
        }
        const attributedSwapQuote = serviceUtils.attributeSwapQuoteOrders(swapQuote);
        const {
            makerAssetAmount,
            totalTakerAssetAmount,
            protocolFeeInWeiAmount: protocolFee,
        } = attributedSwapQuote.bestCaseQuoteInfo;
        const {
            makerAssetAmount: guaranteedMakerAssetAmount,
            totalTakerAssetAmount: guaranteedTotalTakerAssetAmount,
            gas,
        } = attributedSwapQuote.worstCaseQuoteInfo;
        const { orders, gasPrice, sourceBreakdown } = attributedSwapQuote;

        // If ETH was specified as the token to sell then we use the Forwarder
        const extensionContractType = isETHSell ? ExtensionContractType.Forwarder : ExtensionContractType.None;
        const {
            calldataHexString: data,
            ethAmount: value,
            toAddress: to,
        } = await this._swapQuoteConsumer.getCalldataOrThrowAsync(attributedSwapQuote, {
            useExtensionContract: extensionContractType,
        });

        const affiliatedData = serviceUtils.attributeCallData(data, affiliateAddress);

        let suggestedGasEstimate = new BigNumber(gas);
        if (!skipValidation && from) {
            // Force a revert error if the takerAddress does not have enough ETH.
            const txDataValue =
                extensionContractType === ExtensionContractType.Forwarder
                    ? BigNumber.min(value, await this._web3Wrapper.getBalanceInWeiAsync(from))
                    : value;
            const gasEstimate = await this._estimateGasOrThrowRevertErrorAsync({
                to,
                data: affiliatedData,
                from,
                value: txDataValue,
                gasPrice,
            });
            // Take the max of the faux estimate or the real estimate
            suggestedGasEstimate = BigNumber.max(gasEstimate, suggestedGasEstimate);
        }
        // Add a buffer to the gas estimate
        suggestedGasEstimate = suggestedGasEstimate.times(GAS_LIMIT_BUFFER_PERCENTAGE + 1).integerValue();

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

        const apiSwapQuote: GetSwapQuoteResponse = {
            price,
            guaranteedPrice,
            to,
            data: affiliatedData,
            value,
            gas: suggestedGasEstimate,
            from,
            gasPrice,
            protocolFee,
            buyTokenAddress,
            sellTokenAddress,
            buyAmount: makerAssetAmount,
            sellAmount: totalTakerAssetAmount,
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
            from,
            gasPrice,
            protocolFee: ZERO,
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
        // Perform this concurrently
        // if the call fails the gas estimation will also fail, we can throw a more helpful
        // error message than gas estimation failure
        const estimateGasPromise = this._web3Wrapper.estimateGasAsync(txData).catch(_e => 0);
        await this._throwIfCallIsRevertErrorAsync(txData);
        const gas = await estimateGasPromise;
        return new BigNumber(gas);
    }

    private async _throwIfCallIsRevertErrorAsync(txData: Partial<TxData>): Promise<void> {
        let callResult;
        let revertError;
        try {
            callResult = await this._web3Wrapper.callAsync(txData);
        } catch (e) {
            // RPCSubprovider can throw if .error exists on the response payload
            // This `error` response occurs from Parity nodes (incl Alchemy) but not on INFURA (geth)
            revertError = decodeThrownErrorAsRevertError(e);
            throw revertError;
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
}
