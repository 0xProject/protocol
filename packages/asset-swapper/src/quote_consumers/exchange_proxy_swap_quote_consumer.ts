import { ChainId, ContractAddresses } from '@0x/contract-addresses';
import { IZeroExContract, MultiplexFeatureContract } from '@0x/contract-wrappers';
import {
    encodeAffiliateFeeTransformerData,
    encodeCurveLiquidityProviderData,
    encodeFillQuoteTransformerData,
    encodePayTakerTransformerData,
    encodePositiveSlippageFeeTransformerData,
    encodeWethTransformerData,
    ETH_TOKEN_ADDRESS,
    FillQuoteTransformerOrderType,
    FillQuoteTransformerSide,
    findTransformerNonce,
} from '@0x/protocol-utils';
import { BigNumber, providerUtils } from '@0x/utils';
import { SupportedProvider, ZeroExProvider } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../constants';
import {
    AffiliateFeeType,
    CalldataInfo,
    ExchangeProxyContractOpts,
    MarketBuySwapQuote,
    MarketSellSwapQuote,
    SwapQuote,
    SwapQuoteConsumerBase,
    SwapQuoteConsumerOpts,
    SwapQuoteExecutionOpts,
    SwapQuoteGetOutputOpts,
} from '../types';
import { assert } from '../utils/assert';
import {
    CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID,
    MOONISWAP_LIQUIDITY_PROVIDER_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
} from '../utils/market_operation_utils/constants';
import {
    createBridgeDataForBridgeOrder,
    erc20BridgeSourceToBridgeSource,
    poolEncoder,
} from '../utils/market_operation_utils/orders';
import {
    CurveFillData,
    ERC20BridgeSource,
    LiquidityProviderFillData,
    MooniswapFillData,
    OptimizedMarketBridgeOrder,
    UniswapV2FillData,
} from '../utils/market_operation_utils/types';

import {
    multiplexPlpEncoder,
    multiplexRfqEncoder,
    multiplexTransformERC20Encoder,
    multiplexUniswapEncoder,
} from './multiplex_encoders';
import {
    getFQTTransformerDataFromOptimizedOrders,
    isBuyQuote,
    isDirectSwapCompatible,
    isMultiplexBatchFillCompatible,
    isMultiplexMultiHopFillCompatible,
} from './quote_consumer_utils';

// tslint:disable-next-line:custom-no-magic-numbers
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const { NULL_ADDRESS, NULL_BYTES, ZERO_AMOUNT } = constants;

export class ExchangeProxySwapQuoteConsumer implements SwapQuoteConsumerBase {
    public readonly provider: ZeroExProvider;
    public readonly chainId: ChainId;
    public readonly transformerNonces: {
        wethTransformer: number;
        payTakerTransformer: number;
        fillQuoteTransformer: number;
        affiliateFeeTransformer: number;
        positiveSlippageFeeTransformer: number;
    };

    private readonly _exchangeProxy: IZeroExContract;
    private readonly _multiplex: MultiplexFeatureContract;

    constructor(
        supportedProvider: SupportedProvider,
        public readonly contractAddresses: ContractAddresses,
        options: Partial<SwapQuoteConsumerOpts> = {},
    ) {
        const { chainId } = _.merge({}, constants.DEFAULT_SWAP_QUOTER_OPTS, options);
        assert.isNumber('chainId', chainId);
        const provider = providerUtils.standardizeOrThrow(supportedProvider);
        this.provider = provider;
        this.chainId = chainId;
        this.contractAddresses = contractAddresses;
        this._exchangeProxy = new IZeroExContract(contractAddresses.exchangeProxy, supportedProvider);
        this._multiplex = new MultiplexFeatureContract(contractAddresses.exchangeProxy, supportedProvider);
        this.transformerNonces = {
            wethTransformer: findTransformerNonce(
                contractAddresses.transformers.wethTransformer,
                contractAddresses.exchangeProxyTransformerDeployer,
            ),
            payTakerTransformer: findTransformerNonce(
                contractAddresses.transformers.payTakerTransformer,
                contractAddresses.exchangeProxyTransformerDeployer,
            ),
            fillQuoteTransformer: findTransformerNonce(
                contractAddresses.transformers.fillQuoteTransformer,
                contractAddresses.exchangeProxyTransformerDeployer,
            ),
            affiliateFeeTransformer: findTransformerNonce(
                contractAddresses.transformers.affiliateFeeTransformer,
                contractAddresses.exchangeProxyTransformerDeployer,
            ),
            positiveSlippageFeeTransformer: findTransformerNonce(
                contractAddresses.transformers.positiveSlippageFeeTransformer,
                contractAddresses.exchangeProxyTransformerDeployer,
            ),
        };
    }

    public async getCalldataOrThrowAsync(
        quote: MarketBuySwapQuote | MarketSellSwapQuote,
        opts: Partial<SwapQuoteGetOutputOpts> = {},
    ): Promise<CalldataInfo> {
        const optsWithDefaults: ExchangeProxyContractOpts = {
            ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
            ...opts.extensionContractOpts,
        };
        // tslint:disable-next-line:no-object-literal-type-assertion
        const { refundReceiver, affiliateFee, isFromETH, isToETH, shouldSellEntireBalance } = optsWithDefaults;

        const sellToken = quote.takerToken;
        const buyToken = quote.makerToken;

        // Take the bounds from the worst case
        const sellAmount = quote.worstCaseQuoteInfo.totalTakerAmount;
        let minBuyAmount = quote.worstCaseQuoteInfo.makerAmount;
        let ethAmount = quote.worstCaseQuoteInfo.protocolFeeInWeiAmount;

        if (isFromETH) {
            ethAmount = ethAmount.plus(sellAmount);
        }

        // VIP routes.
        if (
            isDirectSwapCompatible(quote, this.chainId, optsWithDefaults, [
                ERC20BridgeSource.UniswapV2,
                ERC20BridgeSource.SushiSwap,
            ])
        ) {
            const source = quote.orders[0].source;
            const fillData = (quote.orders[0] as OptimizedMarketBridgeOrder<UniswapV2FillData>).fillData;
            return {
                calldataHexString: this._exchangeProxy
                    .sellToUniswap(
                        fillData.tokenAddressPath.map((a, i) => {
                            if (i === 0 && isFromETH) {
                                return ETH_TOKEN_ADDRESS;
                            }
                            if (i === fillData.tokenAddressPath.length - 1 && isToETH) {
                                return ETH_TOKEN_ADDRESS;
                            }
                            return a;
                        }),
                        sellAmount,
                        minBuyAmount,
                        source === ERC20BridgeSource.SushiSwap,
                    )
                    .getABIEncodedTransactionData(),
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (isDirectSwapCompatible(quote, this.chainId, optsWithDefaults, [ERC20BridgeSource.LiquidityProvider])) {
            const fillData = (quote.orders[0] as OptimizedMarketBridgeOrder<LiquidityProviderFillData>).fillData;
            const target = fillData.poolAddress;
            return {
                calldataHexString: this._exchangeProxy
                    .sellToLiquidityProvider(
                        isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                        isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                        target,
                        NULL_ADDRESS,
                        sellAmount,
                        minBuyAmount,
                        NULL_BYTES,
                    )
                    .getABIEncodedTransactionData(),
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (
            isDirectSwapCompatible(quote, this.chainId, optsWithDefaults, [
                ERC20BridgeSource.Curve,
                ERC20BridgeSource.Swerve,
            ])
        ) {
            const fillData = quote.orders[0].fills[0].fillData as CurveFillData;
            return {
                calldataHexString: this._exchangeProxy
                    .sellToLiquidityProvider(
                        isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                        isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                        CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID[this.chainId],
                        NULL_ADDRESS,
                        sellAmount,
                        minBuyAmount,
                        encodeCurveLiquidityProviderData({
                            curveAddress: fillData.pool.poolAddress,
                            exchangeFunctionSelector: fillData.pool.exchangeFunctionSelector,
                            fromCoinIdx: new BigNumber(fillData.fromTokenIdx),
                            toCoinIdx: new BigNumber(fillData.toTokenIdx),
                        }),
                    )
                    .getABIEncodedTransactionData(),
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (isDirectSwapCompatible(quote, this.chainId, optsWithDefaults, [ERC20BridgeSource.Mooniswap])) {
            const fillData = quote.orders[0].fills[0].fillData as MooniswapFillData;
            return {
                calldataHexString: this._exchangeProxy
                    .sellToLiquidityProvider(
                        isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                        isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                        MOONISWAP_LIQUIDITY_PROVIDER_BY_CHAIN_ID[this.chainId],
                        NULL_ADDRESS,
                        sellAmount,
                        minBuyAmount,
                        poolEncoder.encode([fillData.poolAddress]),
                    )
                    .getABIEncodedTransactionData(),
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this.contractAddresses.exchangeProxy,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (isMultiplexBatchFillCompatible(quote, optsWithDefaults)) {
            return {
                calldataHexString: this._encodeMultiplexBatchFillCalldata(quote),
                ethAmount,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }
        if (isMultiplexMultiHopFillCompatible(quote, optsWithDefaults)) {
            return {
                calldataHexString: this._encodeMultiplexMultiHopFillCalldata(quote, optsWithDefaults),
                ethAmount,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        // Build up the transforms.
        const transforms = [];
        if (isFromETH) {
            // Create a WETH wrapper if coming from ETH.
            transforms.push({
                deploymentNonce: this.transformerNonces.wethTransformer,
                data: encodeWethTransformerData({
                    token: ETH_TOKEN_ADDRESS,
                    amount: shouldSellEntireBalance ? MAX_UINT256 : sellAmount,
                }),
            });
        }

        // If it's two hop we have an intermediate token this is needed to encode the individual FQT
        // and we also want to ensure no dust amount is left in the flash wallet
        const intermediateToken = quote.isTwoHop ? quote.orders[0].makerToken : NULL_ADDRESS;
        // This transformer will fill the quote.
        if (quote.isTwoHop) {
            const [firstHopOrder, secondHopOrder] = quote.orders;
            transforms.push({
                deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                data: encodeFillQuoteTransformerData({
                    side: FillQuoteTransformerSide.Sell,
                    sellToken,
                    buyToken: intermediateToken,
                    ...getFQTTransformerDataFromOptimizedOrders([firstHopOrder]),
                    refundReceiver: refundReceiver || NULL_ADDRESS,
                    fillAmount: shouldSellEntireBalance ? MAX_UINT256 : firstHopOrder.takerAmount,
                }),
            });
            transforms.push({
                deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                data: encodeFillQuoteTransformerData({
                    side: FillQuoteTransformerSide.Sell,
                    buyToken,
                    sellToken: intermediateToken,
                    ...getFQTTransformerDataFromOptimizedOrders([secondHopOrder]),
                    refundReceiver: refundReceiver || NULL_ADDRESS,
                    fillAmount: MAX_UINT256,
                }),
            });
        } else {
            const fillAmount = isBuyQuote(quote) ? quote.makerTokenFillAmount : quote.takerTokenFillAmount;

            transforms.push({
                deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                data: encodeFillQuoteTransformerData({
                    side: isBuyQuote(quote) ? FillQuoteTransformerSide.Buy : FillQuoteTransformerSide.Sell,
                    sellToken,
                    buyToken,
                    ...getFQTTransformerDataFromOptimizedOrders(quote.orders),
                    refundReceiver: refundReceiver || NULL_ADDRESS,
                    fillAmount: !isBuyQuote(quote) && shouldSellEntireBalance ? MAX_UINT256 : fillAmount,
                }),
            });
        }

        if (isToETH) {
            // Create a WETH unwrapper if going to ETH.
            transforms.push({
                deploymentNonce: this.transformerNonces.wethTransformer,
                data: encodeWethTransformerData({
                    token: NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId],
                    amount: MAX_UINT256,
                }),
            });
        }

        const { feeType, buyTokenFeeAmount, sellTokenFeeAmount, recipient: feeRecipient } = affiliateFee;
        let gasOverhead = ZERO_AMOUNT;
        if (feeType === AffiliateFeeType.PositiveSlippageFee && feeRecipient !== NULL_ADDRESS) {
            // bestCaseAmountWithSurplus is used to cover gas cost of sending positive slipapge fee to fee recipient
            // this helps avoid sending dust amounts which are not worth the gas cost to transfer
            let bestCaseAmountWithSurplus = quote.bestCaseQuoteInfo.makerAmount
                .plus(
                    POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS.multipliedBy(quote.gasPrice).multipliedBy(
                        quote.makerAmountPerEth,
                    ),
                )
                .integerValue();
            // In the event makerAmountPerEth is unknown, we only allow for positive slippage which is greater than
            // the best case amount
            bestCaseAmountWithSurplus = BigNumber.max(bestCaseAmountWithSurplus, quote.bestCaseQuoteInfo.makerAmount);
            transforms.push({
                deploymentNonce: this.transformerNonces.positiveSlippageFeeTransformer,
                data: encodePositiveSlippageFeeTransformerData({
                    token: isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                    bestCaseAmount: BigNumber.max(bestCaseAmountWithSurplus, quote.bestCaseQuoteInfo.makerAmount),
                    recipient: feeRecipient,
                }),
            });
            // This may not be visible at eth_estimateGas time, so we explicitly add overhead
            gasOverhead = POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS;
        } else if (feeType === AffiliateFeeType.PercentageFee && feeRecipient !== NULL_ADDRESS) {
            // This transformer pays affiliate fees.
            if (buyTokenFeeAmount.isGreaterThan(0)) {
                transforms.push({
                    deploymentNonce: this.transformerNonces.affiliateFeeTransformer,
                    data: encodeAffiliateFeeTransformerData({
                        fees: [
                            {
                                token: isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                                amount: buyTokenFeeAmount,
                                recipient: feeRecipient,
                            },
                        ],
                    }),
                });
                // Adjust the minimum buy amount by the fee.
                minBuyAmount = BigNumber.max(0, minBuyAmount.minus(buyTokenFeeAmount));
            }
            if (sellTokenFeeAmount.isGreaterThan(0)) {
                throw new Error('Affiliate fees denominated in sell token are not yet supported');
            }
        }

        // The final transformer will send all funds to the taker.
        transforms.push({
            deploymentNonce: this.transformerNonces.payTakerTransformer,
            data: encodePayTakerTransformerData({
                tokens: [sellToken, buyToken, ETH_TOKEN_ADDRESS].concat(quote.isTwoHop ? intermediateToken : []),
                amounts: [],
            }),
        });

        const calldataHexString = this._exchangeProxy
            .transformERC20(
                isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                shouldSellEntireBalance ? MAX_UINT256 : sellAmount,
                minBuyAmount,
                transforms,
            )
            .getABIEncodedTransactionData();

        return {
            calldataHexString,
            ethAmount,
            toAddress: this._exchangeProxy.address,
            allowanceTarget: this._exchangeProxy.address,
            gasOverhead,
        };
    }

    // tslint:disable-next-line:prefer-function-over-method
    public async executeSwapQuoteOrThrowAsync(
        _quote: SwapQuote,
        _opts: Partial<SwapQuoteExecutionOpts>,
    ): Promise<string> {
        throw new Error('Execution not supported for Exchange Proxy quotes');
    }

    private _encodeMultiplexBatchFillCalldata(quote: SwapQuote): string {
        const wrappedBatchCalls = [];
        for_loop: for (const [i, order] of quote.orders.entries()) {
            switch_statement: switch (order.source) {
                case ERC20BridgeSource.Native:
                    if (order.type !== FillQuoteTransformerOrderType.Rfq) {
                        // Should never happen because we check `isMultiplexBatchFillCompatible`
                        // before calling this function.
                        throw new Error('Multiplex batch fill only supported for RFQ native orders');
                    }
                    wrappedBatchCalls.push({
                        selector: this._exchangeProxy.getSelector('_fillRfqOrder'),
                        sellAmount: order.takerAmount,
                        data: multiplexRfqEncoder.encode({
                            order: order.fillData.order,
                            signature: order.fillData.signature,
                        }),
                    });
                    break switch_statement;
                case ERC20BridgeSource.UniswapV2:
                case ERC20BridgeSource.SushiSwap:
                    wrappedBatchCalls.push({
                        selector: this._multiplex.getSelector('_sellToUniswap'),
                        sellAmount: order.takerAmount,
                        data: multiplexUniswapEncoder.encode({
                            tokens: (order.fillData as UniswapV2FillData).tokenAddressPath,
                            isSushi: order.source === ERC20BridgeSource.SushiSwap,
                        }),
                    });
                    break switch_statement;
                case ERC20BridgeSource.LiquidityProvider:
                    wrappedBatchCalls.push({
                        selector: this._multiplex.getSelector('_sellToLiquidityProvider'),
                        sellAmount: order.takerAmount,
                        data: multiplexPlpEncoder.encode({
                            provider: (order.fillData as LiquidityProviderFillData).poolAddress,
                            auxiliaryData: NULL_BYTES,
                        }),
                    });
                    break switch_statement;
                default:
                    const fqtData = encodeFillQuoteTransformerData({
                        side: FillQuoteTransformerSide.Sell,
                        sellToken: quote.takerToken,
                        buyToken: quote.makerToken,
                        ...getFQTTransformerDataFromOptimizedOrders(quote.orders.slice(i)),
                        refundReceiver: NULL_ADDRESS,
                        fillAmount: MAX_UINT256,
                    });
                    const transformations = [
                        { deploymentNonce: this.transformerNonces.fillQuoteTransformer, data: fqtData },
                        {
                            deploymentNonce: this.transformerNonces.payTakerTransformer,
                            data: encodePayTakerTransformerData({
                                tokens: [quote.takerToken, quote.makerToken],
                                amounts: [],
                            }),
                        },
                    ];
                    wrappedBatchCalls.push({
                        selector: this._exchangeProxy.getSelector('_transformERC20'),
                        sellAmount: BigNumber.sum(...quote.orders.slice(i).map(o => o.takerAmount)),
                        data: multiplexTransformERC20Encoder.encode({
                            transformations,
                            ethValue: constants.ZERO_AMOUNT,
                        }),
                    });
                    break for_loop;
            }
        }
        return this._exchangeProxy
            .batchFill(
                {
                    inputToken: quote.takerToken,
                    outputToken: quote.makerToken,
                    sellAmount: quote.worstCaseQuoteInfo.totalTakerAmount,
                    calls: wrappedBatchCalls,
                },
                quote.worstCaseQuoteInfo.makerAmount,
            )
            .getABIEncodedTransactionData();
    }

function isBuyQuote(quote: SwapQuote): quote is MarketBuySwapQuote {
    return quote.type === MarketOperation.Buy;
}

function isOptimizedBridgeOrder(x: OptimizedMarketOrder): x is OptimizedMarketBridgeOrder {
    return x.type === FillQuoteTransformerOrderType.Bridge;
}

function isOptimizedLimitOrder(x: OptimizedMarketOrder): x is OptimizedMarketOrderBase<NativeLimitOrderFillData> {
    return x.type === FillQuoteTransformerOrderType.Limit;
}

function isOptimizedRfqOrder(x: OptimizedMarketOrder): x is OptimizedMarketOrderBase<NativeRfqOrderFillData> {
    return x.type === FillQuoteTransformerOrderType.Rfq;
}

function getFQTTransformerDataFromOptimizedOrders(
    orders: OptimizedMarketOrder[],
): Pick<FillQuoteTransformerData, 'bridgeOrders' | 'limitOrders' | 'rfqOrders' | 'fillSequence'> {
    const fqtData: Pick<FillQuoteTransformerData, 'bridgeOrders' | 'limitOrders' | 'rfqOrders' | 'fillSequence'> = {
        bridgeOrders: [],
        limitOrders: [],
        rfqOrders: [],
        fillSequence: [],
    };

    for (const order of orders) {
        if (isOptimizedBridgeOrder(order)) {
            fqtData.bridgeOrders.push({
                bridgeData: createBridgeDataForBridgeOrder(order),
                makerTokenAmount: order.makerAmount,
                takerTokenAmount: order.takerAmount,
                source: erc20BridgeSourceToBridgeSource(order.source),
            });
        }
        const [firstHopOrder, secondHopOrder] = quote.orders;
        const intermediateToken = firstHopOrder.makerToken;
        for (const order of [firstHopOrder, secondHopOrder]) {
            switch (order.source) {
                case ERC20BridgeSource.UniswapV2:
                case ERC20BridgeSource.SushiSwap:
                    wrappedMultiHopCalls.push({
                        selector: this._multiplex.getSelector('_sellToUniswap'),
                        data: multiplexUniswapEncoder.encode({
                            tokens: (order.fillData as UniswapV2FillData).tokenAddressPath,
                            isSushi: order.source === ERC20BridgeSource.SushiSwap,
                        }),
                    });
                    break;
                case ERC20BridgeSource.LiquidityProvider:
                    wrappedMultiHopCalls.push({
                        selector: this._multiplex.getSelector('_sellToLiquidityProvider'),
                        data: multiplexPlpEncoder.encode({
                            provider: (order.fillData as LiquidityProviderFillData).poolAddress,
                            auxiliaryData: NULL_BYTES,
                        }),
                    });
                    break;
                default:
                    // Note: we'll need to redeploy TransformERC20Feature before we can
                    //       use other sources
                    // Should never happen because we check `isMultiplexMultiHopFillCompatible`
                    // before calling this function.
                    throw new Error(`Multiplex multi-hop unsupported source: ${order.source}`);
            }
        }
        if (opts.isToETH) {
            wrappedMultiHopCalls.push({
                selector: weth.getSelector('withdraw'),
                data: NULL_BYTES,
            });
        }
        return this._exchangeProxy
            .multiHopFill(
                {
                    tokens: [quote.takerToken, intermediateToken, quote.makerToken],
                    sellAmount: quote.worstCaseQuoteInfo.totalTakerAmount,
                    calls: wrappedMultiHopCalls,
                },
                quote.worstCaseQuoteInfo.makerAmount,
            )
            .getABIEncodedTransactionData();
    }
}
