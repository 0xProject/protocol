import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { DevUtilsContract } from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import { FillQuoteTransformerOrderType, LimitOrder, RfqOrder } from '@0x/protocol-utils';
import { BigNumber, providerUtils } from '@0x/utils';
import { BlockParamLiteral, SupportedProvider, ZeroExProvider } from 'ethereum-types';
import * as _ from 'lodash';

import { artifacts } from './artifacts';
import { BRIDGE_ADDRESSES_BY_CHAIN, constants } from './constants';
import {
    APIOrder,
    AssetSwapperContractAddresses,
    CalculateSwapQuoteOpts,
    MarketBuySwapQuote,
    MarketOperation,
    MarketSellSwapQuote,
    OrderPrunerPermittedFeeTypes,
    SwapQuote,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
    SwapQuoterRfqtOpts,
} from './types';
import { assert } from './utils/assert';
import { MarketOperationUtils } from './utils/market_operation_utils';
import { BancorService } from './utils/market_operation_utils/bancor_service';
import { DexOrderSampler } from './utils/market_operation_utils/sampler';
import { SourceFilters } from './utils/market_operation_utils/source_filters';
import {
    ERC20BridgeSource,
    MarketDepth,
    MarketDepthSide,
    MarketSideLiquidity,
} from './utils/market_operation_utils/types';
import { orderPrunerUtils } from './utils/order_prune_utils';
import { OrderStateUtils } from './utils/order_state_utils';
import { ProtocolFeeUtils } from './utils/protocol_fee_utils';
import { QuoteRequestor } from './utils/quote_requestor';
import { sortingUtils } from './utils/sorting_utils';
import { SwapQuoteCalculator } from './utils/swap_quote_calculator';
import { getPriceAwareRFQRolloutFlags } from './utils/utils';
import { ERC20BridgeSamplerContract } from './wrappers';

export abstract class Orderbook {
    public abstract getOrdersAsync(makerToken: string, takerToken: string): Promise<APIOrder[]>;
    public abstract getBatchOrdersAsync(makerTokens: string[], takerTokens: string[]): Promise<APIOrder[][]>;
    public async destroyAsync(): Promise<void> {
        return;
    }
}
export class SwapQuoter {
    public readonly provider: ZeroExProvider;
    public readonly orderbook: Orderbook;
    public readonly expiryBufferMs: number;
    public readonly chainId: number;
    public readonly permittedOrderFeeTypes: Set<OrderPrunerPermittedFeeTypes>;
    private readonly _contractAddresses: AssetSwapperContractAddresses;
    private readonly _protocolFeeUtils: ProtocolFeeUtils;
    private readonly _swapQuoteCalculator: SwapQuoteCalculator;
    private readonly _devUtilsContract: DevUtilsContract;
    private readonly _marketOperationUtils: MarketOperationUtils;
    private readonly _orderStateUtils: OrderStateUtils;
    private readonly _rfqtOptions?: SwapQuoterRfqtOpts;

    /**
     * Instantiates a new SwapQuoter instance
     * @param   supportedProvider   The Provider instance you would like to use for interacting with the Ethereum network.
     * @param   orderbook           An object that conforms to Orderbook, see type for definition.
     * @param   options             Initialization options for the SwapQuoter. See type definition for details.
     *
     * @return  An instance of SwapQuoter
     */
    constructor(supportedProvider: SupportedProvider, orderbook: Orderbook, options: Partial<SwapQuoterOpts> = {}) {
        const {
            chainId,
            expiryBufferMs,
            permittedOrderFeeTypes,
            samplerGasLimit,
            rfqt,
            tokenAdjacencyGraph,
            liquidityProviderRegistry,
        } = _.merge({}, constants.DEFAULT_SWAP_QUOTER_OPTS, options);
        const provider = providerUtils.standardizeOrThrow(supportedProvider);
        assert.isValidOrderbook('orderbook', orderbook);
        assert.isNumber('chainId', chainId);
        assert.isNumber('expiryBufferMs', expiryBufferMs);
        this.chainId = chainId;
        this.provider = provider;
        this.orderbook = orderbook;
        this.expiryBufferMs = expiryBufferMs;
        this.permittedOrderFeeTypes = permittedOrderFeeTypes;

        this._rfqtOptions = rfqt;
        this._contractAddresses = options.contractAddresses || {
            ...getContractAddressesForChainOrThrow(chainId),
            ...BRIDGE_ADDRESSES_BY_CHAIN[chainId],
        };
        this._devUtilsContract = new DevUtilsContract(this._contractAddresses.devUtils, provider);
        this._protocolFeeUtils = ProtocolFeeUtils.getInstance(
            constants.PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
            options.ethGasStationUrl,
        );
        this._orderStateUtils = new OrderStateUtils(this._devUtilsContract);
        // Allow the sampler bytecode to be overwritten using geths override functionality
        const samplerBytecode = _.get(artifacts.ERC20BridgeSampler, 'compilerOutput.evm.deployedBytecode.object');
        const defaultCodeOverrides = samplerBytecode
            ? {
                  [this._contractAddresses.erc20BridgeSampler]: { code: samplerBytecode },
              }
            : {};
        const samplerOverrides = _.assign(
            { block: BlockParamLiteral.Latest, overrides: defaultCodeOverrides },
            options.samplerOverrides,
        );
        const samplerContract = new ERC20BridgeSamplerContract(
            this._contractAddresses.erc20BridgeSampler,
            this.provider,
            {
                gas: samplerGasLimit,
            },
        );

        this._marketOperationUtils = new MarketOperationUtils(
            new DexOrderSampler(
                samplerContract,
                samplerOverrides,
                undefined, // balancer pool cache
                undefined, // cream pool cache
                tokenAdjacencyGraph,
                liquidityProviderRegistry,
                this.chainId === ChainId.Mainnet // Enable Bancor only on Mainnet
                    ? async () => BancorService.createAsync(provider)
                    : async () => undefined,
            ),
            this._contractAddresses,
            {
                chainId,
                exchangeAddress: this._contractAddresses.exchange,
            },
        );
        this._swapQuoteCalculator = new SwapQuoteCalculator(this._marketOperationUtils);
    }

    public async getBatchMarketBuySwapQuoteAsync(
        makerTokens: string[],
        takerToken: string,
        makerAssetBuyAmount: BigNumber[],
        options: Partial<SwapQuoteRequestOpts> = {},
    ): Promise<Array<MarketBuySwapQuote>> {
        makerAssetBuyAmount.map((a, i) => assert.isBigNumber(`makerAssetBuyAmount[${i}]`, a));
        let gasPrice: BigNumber;
        const calculateSwapQuoteOpts = _.merge({}, constants.DEFAULT_SWAP_QUOTE_REQUEST_OPTS, options);
        if (!!options.gasPrice) {
            gasPrice = options.gasPrice;
            assert.isBigNumber('gasPrice', gasPrice);
        } else {
            gasPrice = await this.getGasPriceEstimationOrThrowAsync();
        }

        const apiOrders = await this.orderbook.getBatchOrdersAsync(makerTokens, [takerToken]);
        const allOrders = apiOrders.map(orders => orders.map(o => o.order));
        const allPrunedOrders = allOrders.map((orders, i) => {
            const prunedOrders = orderPrunerUtils.pruneForUsableSignedOrders(
                orders,
                this.permittedOrderFeeTypes,
                this.expiryBufferMs,
            );
            if (prunedOrders.length === 0) {
                return [
                    new LimitOrder({
                        makerToken: makerTokens[i],
                        takerToken,
                        maker: this._contractAddresses.uniswapBridge,
                    }),
                ];
            } else {
                return sortingUtils.sortOrders(prunedOrders);
            }
        });

        const swapQuotes = await this._swapQuoteCalculator.calculateBatchBuySwapQuoteAsync(
            allPrunedOrders,
            makerAssetBuyAmount,
            MarketOperation.Buy,
            gasPrice,
            calculateSwapQuoteOpts,
        );
        return swapQuotes.filter(x => x !== undefined) as MarketBuySwapQuote[];
    }
    /**
     * Get a `SwapQuote` containing all information relevant to fulfilling a swap between a desired ERC20 token address and ERC20 owned by a provided address.
     * You can then pass the `SwapQuote` to a `SwapQuoteConsumer` to execute a buy, or process SwapQuote for on-chain consumption.
     * @param   makerTokenAddress       The address of the maker asset
     * @param   takerTokenAddress       The address of the taker asset
     * @param   makerAssetBuyAmount     The amount of maker asset to swap for.
     * @param   options                 Options for the request. See type definition for more information.
     *
     * @return  An object that conforms to SwapQuote that satisfies the request. See type definition for more information.
     */
    public async getMarketBuySwapQuoteAsync(
        makerToken: string,
        takerToken: string,
        makerAssetBuyAmount: BigNumber,
        options: Partial<SwapQuoteRequestOpts> = {},
    ): Promise<MarketBuySwapQuote> {
        assert.isETHAddressHex('makerToken', makerToken);
        assert.isETHAddressHex('takerToken', takerToken);
        assert.isBigNumber('makerAssetBuyAmount', makerAssetBuyAmount);
        return this._getSwapQuoteAsync(
            makerToken,
            takerToken,
            makerAssetBuyAmount,
            MarketOperation.Buy,
            options,
        ) as Promise<MarketBuySwapQuote>;
    }

    /**
     * Get a `SwapQuote` containing all information relevant to fulfilling a swap between a desired ERC20 token address and ERC20 owned by a provided address.
     * You can then pass the `SwapQuote` to a `SwapQuoteConsumer` to execute a buy, or process SwapQuote for on-chain consumption.
     * @param   makerTokenAddress       The address of the maker asset
     * @param   takerTokenAddress       The address of the taker asset
     * @param   takerAssetSellAmount     The amount of taker asset to sell.
     * @param   options                  Options for the request. See type definition for more information.
     *
     * @return  An object that conforms to SwapQuote that satisfies the request. See type definition for more information.
     */
    public async getMarketSellSwapQuoteAsync(
        makerToken: string,
        takerToken: string,
        takerAssetSellAmount: BigNumber,
        options: Partial<SwapQuoteRequestOpts> = {},
    ): Promise<MarketSellSwapQuote> {
        assert.isETHAddressHex('makerToken', makerToken);
        assert.isETHAddressHex('takerToken', takerToken);
        assert.isBigNumber('takerAssetSellAmount', takerAssetSellAmount);
        return this._getSwapQuoteAsync(
            makerToken,
            takerToken,
            takerAssetSellAmount,
            MarketOperation.Sell,
            options,
        ) as Promise<MarketSellSwapQuote>;
    }

    /**
     * Returns the bids and asks liquidity for the entire market.
     * For certain sources (like AMM's) it is recommended to provide a practical maximum takerAssetAmount.
     * @param   makerTokenAddress The address of the maker asset
     * @param   takerTokenAddress The address of the taker asset
     * @param   takerAssetAmount  The amount to sell and buy for the bids and asks.
     *
     * @return  An object that conforms to MarketDepth that contains all of the samples and liquidity
     *          information for the source.
     */
    public async getBidAskLiquidityForMakerTakerAssetPairAsync(
        makerToken: string,
        takerToken: string,
        takerAssetAmount: BigNumber,
        options: Partial<SwapQuoteRequestOpts> = {},
    ): Promise<MarketDepth> {
        assert.isString('makerToken', makerToken);
        assert.isString('takerToken', takerToken);
        const sourceFilters = new SourceFilters([], options.excludedSources, options.includedSources);
        let [sellOrders, buyOrders] = !sourceFilters.isAllowed(ERC20BridgeSource.Native)
            ? [[], []]
            : await Promise.all([
                  this.orderbook.getOrdersAsync(makerToken, takerToken),
                  this.orderbook.getOrdersAsync(takerToken, makerToken),
              ]);
        if (!sellOrders || sellOrders.length === 0) {
            sellOrders = [
                {
                    metaData: {},
                    order: new LimitOrder({
                        makerToken,
                        takerToken,
                        maker: this._contractAddresses.uniswapBridge,
                    }),
                },
            ];
        }
        if (!buyOrders || buyOrders.length === 0) {
            buyOrders = [
                {
                    metaData: {},
                    order: new LimitOrder({
                        takerToken,
                        makerToken,
                        maker: this._contractAddresses.uniswapBridge,
                    }),
                },
            ];
        }
        const getMarketDepthSide = (marketSideLiquidity: MarketSideLiquidity): MarketDepthSide => {
            const { dexQuotes, nativeOrders } = marketSideLiquidity.quotes;
            const { side } = marketSideLiquidity;

            return [
                ...dexQuotes,
                nativeOrders.map(o => {
                    // When sell order fillable amount is taker
                    // When buy order fillable amount is maker
                    const scaleFactor = o.orderFillableAmount.div(
                        side === MarketOperation.Sell ? o.order.takerAmount : o.order.makerAmount,
                    );
                    return {
                        input: (side === MarketOperation.Sell ? o.order.takerAmount : o.order.makerAmount)
                            .times(scaleFactor)
                            .integerValue(),
                        output: (side === MarketOperation.Sell ? o.order.makerAmount : o.order.takerAmount)
                            .times(scaleFactor)
                            .integerValue(),
                        fillData: o,
                        source: ERC20BridgeSource.Native,
                    };
                }),
            ];
        };
        const [bids, asks] = await Promise.all([
            this._marketOperationUtils.getMarketBuyLiquidityAsync(
                (buyOrders || []).map(o => ({ order: o.order, orderType: FillQuoteTransformerOrderType.Limit })),
                takerAssetAmount,
                options,
            ),
            this._marketOperationUtils.getMarketSellLiquidityAsync(
                (sellOrders || []).map(o => ({ order: o.order, orderType: FillQuoteTransformerOrderType.Limit })),
                takerAssetAmount,
                options,
            ),
        ]);
        return {
            bids: getMarketDepthSide(bids),
            asks: getMarketDepthSide(asks),
            makerTokenDecimals: asks.makerTokenDecimals,
            takerTokenDecimals: asks.takerTokenDecimals,
        };
    }

    /**
     * Returns the recommended gas price for a fast transaction
     */
    public async getGasPriceEstimationOrThrowAsync(): Promise<BigNumber> {
        return this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
    }

    /**
     * Destroys any subscriptions or connections.
     */
    public async destroyAsync(): Promise<void> {
        await this._protocolFeeUtils.destroyAsync();
        await this.orderbook.destroyAsync();
    }

    /**
     * Utility function to get assetData for Ether token.
     */
    public async getEtherTokenAssetDataOrThrowAsync(): Promise<string> {
        return assetDataUtils.encodeERC20AssetData(this._contractAddresses.etherToken);
    }

    /**
     * Grab orders from the order provider, prunes for valid orders with provided OrderPruner options
     * @param   makerAssetData      The makerAssetData of the desired asset to swap for (for more info: https://github.com/0xProject/0x-protocol-specification/blob/master/v2/v2-specification.md).
     * @param   takerAssetData      The takerAssetData of the asset to swap makerAssetData for (for more info: https://github.com/0xProject/0x-protocol-specification/blob/master/v2/v2-specification.md).
     */
    private async _getLimitOrdersAsync(makerToken: string, takerToken: string): Promise<LimitOrder[]> {
        assert.isETHAddressHex('makerToken', makerToken);
        assert.isETHAddressHex('takerToken', takerToken);
        // get orders
        const apiOrders = await this.orderbook.getOrdersAsync(makerToken, takerToken); // todo(xianny)
        const orders = _.map(apiOrders, o => o.order);
        const prunedOrders = orderPrunerUtils.pruneForUsableSignedOrders(
            orders,
            this.permittedOrderFeeTypes,
            this.expiryBufferMs,
        );
        return prunedOrders;
    }

    /**
     * General function for getting swap quote, conditionally uses different logic per specified marketOperation
     */
    private async _getSwapQuoteAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        options: Partial<SwapQuoteRequestOpts>,
    ): Promise<SwapQuote> {
        const opts = _.merge({}, constants.DEFAULT_SWAP_QUOTE_REQUEST_OPTS, options);
        let gasPrice: BigNumber;
        if (!!opts.gasPrice) {
            gasPrice = opts.gasPrice;
            assert.isBigNumber('gasPrice', gasPrice);
        } else {
            gasPrice = await this.getGasPriceEstimationOrThrowAsync();
        }

        const sourceFilters = new SourceFilters([], opts.excludedSources, opts.includedSources);

        // If RFQT is enabled and `nativeExclusivelyRFQT` is set, then `ERC20BridgeSource.Native` should
        // never be excluded.
        if (
            opts.rfqt &&
            opts.rfqt.nativeExclusivelyRFQT === true &&
            !sourceFilters.isAllowed(ERC20BridgeSource.Native)
        ) {
            throw new Error('Native liquidity cannot be excluded if "rfqt.nativeExclusivelyRFQT" is set');
        }

        // If an API key was provided, but the key is not whitelisted, raise a warning and disable RFQ
        if (opts.rfqt && opts.rfqt.apiKey && !this._isApiKeyWhitelisted(opts.rfqt.apiKey)) {
            if (this._rfqtOptions && this._rfqtOptions.warningLogger) {
                this._rfqtOptions.warningLogger(
                    {
                        apiKey: opts.rfqt.apiKey,
                    },
                    'Attempt at using an RFQ API key that is not whitelisted. Disabling RFQ for the request lifetime.',
                );
            }
            opts.rfqt = undefined;
        }

        // Otherwise check other RFQ options
        let proceedWithRfq = false;
        if (
            opts.rfqt && // This is an RFQT-enabled API request
            !getPriceAwareRFQRolloutFlags(opts.rfqt.priceAwareRFQFlag).isFirmPriceAwareEnabled && // If Price-aware RFQ is enabled, firm quotes are requested later on in the process.
            opts.rfqt.intentOnFilling && // The requestor is asking for a firm quote
            opts.rfqt.apiKey &&
            this._isApiKeyWhitelisted(opts.rfqt.apiKey) && // A valid API key was provided
            sourceFilters.isAllowed(ERC20BridgeSource.Native) // Native liquidity is not excluded
        ) {
            if (!opts.rfqt.takerAddress || opts.rfqt.takerAddress === constants.NULL_ADDRESS) {
                throw new Error('RFQ-T firm quote requests must specify a taker address');
            }
            proceedWithRfq = true;
        }
        const rfqtOptions = this._rfqtOptions;
        const quoteRequestor = new QuoteRequestor(
            rfqtOptions ? rfqtOptions.makerAssetOfferings || {} : {},
            rfqtOptions ? rfqtOptions.warningLogger : undefined,
            rfqtOptions ? rfqtOptions.infoLogger : undefined,
            this.expiryBufferMs,
        );

        // Get RFQ orders if valid
        const rfqOrdersPromise = proceedWithRfq
            ? quoteRequestor.requestRfqtFirmQuotesAsync(
                  makerToken,
                  takerToken,
                  assetFillAmount,
                  marketOperation,
                  undefined,
                  opts.rfqt!,
              )
            : [];

        // Get SRA orders (limit orders)
        const skipOpenOrderbook =
            !sourceFilters.isAllowed(ERC20BridgeSource.Native) ||
            (opts.rfqt && opts.rfqt.nativeExclusivelyRFQT === true);
        const limitOrdersPromise = skipOpenOrderbook
            ? Promise.resolve([])
            : this._getLimitOrdersAsync(makerToken, takerToken);

        // Join the results together
        const nativeOrders: {
            order: LimitOrder | RfqOrder;
            orderType: FillQuoteTransformerOrderType;
        }[] = await Promise.all([limitOrdersPromise, rfqOrdersPromise]).then((results: [LimitOrder[], RfqOrder[]]) => {
            const limitOrders = results[0].map(order => ({ order, orderType: FillQuoteTransformerOrderType.Limit }));
            const rfqOrders = results[1].map(order => ({ order, orderType: FillQuoteTransformerOrderType.Rfq }));
            return [...limitOrders, ...rfqOrders];
        });

        // if no native orders, pass in a dummy order for the sampler to have required metadata for sampling
        if (nativeOrders.length === 0) {
            nativeOrders.push({
                order: new LimitOrder({
                    makerToken,
                    takerToken,
                    chainId: 1,
                    maker: this._contractAddresses.uniswapBridge,
                }),
                orderType: FillQuoteTransformerOrderType.Limit,
            });
        }

        const calcOpts: CalculateSwapQuoteOpts = opts;
        if (calcOpts.rfqt !== undefined) {
            calcOpts.rfqt.quoteRequestor = quoteRequestor;
        }

        const swapQuote = await this._swapQuoteCalculator.calculateSwapQuoteAsync(
            nativeOrders,
            assetFillAmount,
            gasPrice,
            marketOperation,
            calcOpts,
        );
        return swapQuote;
    }
    private _isApiKeyWhitelisted(apiKey: string): boolean {
        const whitelistedApiKeys = this._rfqtOptions ? this._rfqtOptions.takerApiKeyWhitelist : [];
        return whitelistedApiKeys.includes(apiKey);
    }
}
// tslint:disable-next-line: max-file-line-count
