import { ChainId, ContractAddresses } from '@0x/contract-addresses';
import { IZeroExContract } from '@0x/contract-wrappers';
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
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../constants';
import {
    AffiliateFeeType,
    CalldataInfo,
    ExchangeProxyContractOpts,
    MarketBuySwapQuote,
    MarketOperation,
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
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
} from '../utils/market_operation_utils/constants';
import {
    CurveFillData,
    ERC20BridgeSource,
    FinalUniswapV3FillData,
    LiquidityProviderFillData,
    NativeRfqOrderFillData,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    UniswapV2FillData,
} from '../utils/market_operation_utils/types';

import {
    multiplexPlpEncoder,
    multiplexRfqEncoder,
    MultiplexSubcall,
    multiplexTransformERC20Encoder,
    multiplexUniswapEncoder,
} from './multiplex_encoders';
import {
    getFQTTransformerDataFromOptimizedOrders,
    isBuyQuote,
    isDirectSwapCompatible,
    isMultiplexBatchFillCompatible,
    isMultiplexMultiHopFillCompatible,
    requiresTransformERC20,
} from './quote_consumer_utils';

const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const { NULL_ADDRESS, NULL_BYTES, ZERO_AMOUNT } = constants;

// use the same order in IPancakeSwapFeature.sol
const PANCAKE_SWAP_FORKS = [
    ERC20BridgeSource.PancakeSwap,
    ERC20BridgeSource.PancakeSwapV2,
    ERC20BridgeSource.BakerySwap,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.ApeSwap,
    ERC20BridgeSource.CheeseSwap,
];
const FAKE_PROVIDER: any = {
    sendAsync(): void {
        return;
    },
};

export class ExchangeProxySwapQuoteConsumer implements SwapQuoteConsumerBase {
    public readonly chainId: ChainId;
    public readonly transformerNonces: {
        wethTransformer: number;
        payTakerTransformer: number;
        fillQuoteTransformer: number;
        affiliateFeeTransformer: number;
        positiveSlippageFeeTransformer: number;
    };

    private readonly _exchangeProxy: IZeroExContract;

    constructor(public readonly contractAddresses: ContractAddresses, options: Partial<SwapQuoteConsumerOpts> = {}) {
        const { chainId } = _.merge({}, constants.DEFAULT_SWAP_QUOTER_OPTS, options);
        assert.isNumber('chainId', chainId);
        this.chainId = chainId;
        this.contractAddresses = contractAddresses;
        this._exchangeProxy = new IZeroExContract(contractAddresses.exchangeProxy, FAKE_PROVIDER);
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
        const { refundReceiver, affiliateFee, isFromETH, isToETH, shouldSellEntireBalance } = optsWithDefaults;

        const sellToken = quote.takerToken;
        const buyToken = quote.makerToken;

        // Take the bounds from the worst case
        const sellAmount = BigNumber.max(
            quote.bestCaseQuoteInfo.totalTakerAmount,
            quote.worstCaseQuoteInfo.totalTakerAmount,
        );
        let minBuyAmount = quote.worstCaseQuoteInfo.makerAmount;
        let ethAmount = quote.worstCaseQuoteInfo.protocolFeeInWeiAmount;

        if (isFromETH) {
            ethAmount = ethAmount.plus(sellAmount);
        }

        const slippedOrders = slipNonNativeOrders(quote);

        // VIP routes.
        if (
            this.chainId === ChainId.Mainnet &&
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap])
        ) {
            const source = slippedOrders[0].source;
            const fillData = (slippedOrders[0] as OptimizedMarketBridgeOrder<UniswapV2FillData>).fillData;
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

        if (
            this.chainId === ChainId.Mainnet &&
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.UniswapV3])
        ) {
            const fillData = (slippedOrders[0] as OptimizedMarketBridgeOrder<FinalUniswapV3FillData>).fillData;
            let _calldataHexString;
            if (isFromETH) {
                _calldataHexString = this._exchangeProxy
                    .sellEthForTokenToUniswapV3(fillData.uniswapPath, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            } else if (isToETH) {
                _calldataHexString = this._exchangeProxy
                    .sellTokenForEthToUniswapV3(fillData.uniswapPath, sellAmount, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            } else {
                _calldataHexString = this._exchangeProxy
                    .sellTokenForTokenToUniswapV3(fillData.uniswapPath, sellAmount, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            }
            return {
                calldataHexString: _calldataHexString,
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (
            this.chainId === ChainId.BSC &&
            isDirectSwapCompatible(quote, optsWithDefaults, [
                ERC20BridgeSource.PancakeSwap,
                ERC20BridgeSource.PancakeSwapV2,
                ERC20BridgeSource.BakerySwap,
                ERC20BridgeSource.SushiSwap,
                ERC20BridgeSource.ApeSwap,
                ERC20BridgeSource.CheeseSwap,
            ])
        ) {
            const source = slippedOrders[0].source;
            const fillData = (slippedOrders[0] as OptimizedMarketBridgeOrder<UniswapV2FillData>).fillData;
            return {
                calldataHexString: this._exchangeProxy
                    .sellToPancakeSwap(
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
                        PANCAKE_SWAP_FORKS.indexOf(source),
                    )
                    .getABIEncodedTransactionData(),
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (
            [ChainId.Mainnet, ChainId.BSC].includes(this.chainId) &&
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.LiquidityProvider])
        ) {
            const fillData = (slippedOrders[0] as OptimizedMarketBridgeOrder<LiquidityProviderFillData>).fillData;
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
            this.chainId === ChainId.Mainnet &&
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.Curve]) &&
            // Curve VIP cannot currently support WETH buy/sell as the functionality needs to WITHDRAW or DEPOSIT
            // into WETH prior/post the trade.
            // ETH buy/sell is supported
            ![sellToken, buyToken].includes(NATIVE_FEE_TOKEN_BY_CHAIN_ID[ChainId.Mainnet])
        ) {
            const fillData = slippedOrders[0].fillData as CurveFillData;
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

        // RFQT VIP
        if (
            [ChainId.Mainnet, ChainId.Polygon].includes(this.chainId) &&
            !isToETH &&
            !isFromETH &&
            quote.orders.every((o) => o.type === FillQuoteTransformerOrderType.Rfq) &&
            !requiresTransformERC20(optsWithDefaults)
        ) {
            const rfqOrdersData = quote.orders.map((o) => o.fillData as NativeRfqOrderFillData);
            const fillAmountPerOrder = (() => {
                // Don't think order taker amounts are clipped to actual sell amount
                // (the last one might be too large) so figure them out manually.
                let remaining = sellAmount;
                const fillAmounts = [];
                for (const o of quote.orders) {
                    const fillAmount = BigNumber.min(o.takerAmount, remaining);
                    fillAmounts.push(fillAmount);
                    remaining = remaining.minus(fillAmount);
                }
                return fillAmounts;
            })();
            const callData =
                quote.orders.length === 1
                    ? this._exchangeProxy
                          .fillRfqOrder(rfqOrdersData[0].order, rfqOrdersData[0].signature, fillAmountPerOrder[0])
                          .getABIEncodedTransactionData()
                    : this._exchangeProxy
                          .batchFillRfqOrders(
                              rfqOrdersData.map((d) => d.order),
                              rfqOrdersData.map((d) => d.signature),
                              fillAmountPerOrder,
                              true,
                          )
                          .getABIEncodedTransactionData();
            return {
                calldataHexString: callData,
                ethAmount: ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (this.chainId === ChainId.Mainnet && isMultiplexBatchFillCompatible(quote, optsWithDefaults)) {
            return {
                calldataHexString: this._encodeMultiplexBatchFillCalldata(
                    { ...quote, orders: slippedOrders },
                    optsWithDefaults,
                ),
                ethAmount,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }
        if (this.chainId === ChainId.Mainnet && isMultiplexMultiHopFillCompatible(quote, optsWithDefaults)) {
            return {
                calldataHexString: this._encodeMultiplexMultiHopFillCalldata(
                    { ...quote, orders: slippedOrders },
                    optsWithDefaults,
                ),
                ethAmount,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        // Build up the transforms.
        const transforms = [];
        // Create a WETH wrapper if coming from ETH.
        // Dont add the wethTransformer to CELO. There is no wrap/unwrap logic for CELO.
        if (isFromETH && this.chainId !== ChainId.Celo) {
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
        const intermediateToken = quote.isTwoHop ? slippedOrders[0].makerToken : NULL_ADDRESS;
        // This transformer will fill the quote.
        if (quote.isTwoHop) {
            const [firstHopOrder, secondHopOrder] = slippedOrders;
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
                    ...getFQTTransformerDataFromOptimizedOrders(slippedOrders),
                    refundReceiver: refundReceiver || NULL_ADDRESS,
                    fillAmount: !isBuyQuote(quote) && shouldSellEntireBalance ? MAX_UINT256 : fillAmount,
                }),
            });
        }
        // Create a WETH unwrapper if going to ETH.
        // Dont add the wethTransformer on CELO. There is no wrap/unwrap logic for CELO.
        if (isToETH && this.chainId !== ChainId.Celo) {
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

        // Return any unspent sell tokens.
        const payTakerTokens = [sellToken];
        // Return any unspent intermediate tokens for two-hop swaps.
        if (quote.isTwoHop) {
            payTakerTokens.push(intermediateToken);
        }
        // Return any unspent ETH. If ETH is the buy token, it will
        // be returned in TransformERC20Feature rather than PayTakerTransformer.
        if (!isToETH) {
            payTakerTokens.push(ETH_TOKEN_ADDRESS);
        }
        // The final transformer will send all funds to the taker.
        transforms.push({
            deploymentNonce: this.transformerNonces.payTakerTransformer,
            data: encodePayTakerTransformerData({
                tokens: payTakerTokens,
                amounts: [],
            }),
        });
        const TO_ETH_ADDRESS = this.chainId === ChainId.Celo ? this.contractAddresses.etherToken : ETH_TOKEN_ADDRESS;
        const calldataHexString = this._exchangeProxy
            .transformERC20(
                isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                isToETH ? TO_ETH_ADDRESS : buyToken,
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

    public async executeSwapQuoteOrThrowAsync(
        _quote: SwapQuote,
        _opts: Partial<SwapQuoteExecutionOpts>,
    ): Promise<string> {
        throw new Error('Execution not supported for Exchange Proxy quotes');
    }

    private _encodeMultiplexBatchFillCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): string {
        const subcalls = [];
        for_loop: for (const [i, order] of quote.orders.entries()) {
            switch_statement: switch (order.source) {
                case ERC20BridgeSource.Native:
                    if (order.type !== FillQuoteTransformerOrderType.Rfq) {
                        // Should never happen because we check `isMultiplexBatchFillCompatible`
                        // before calling this function.
                        throw new Error('Multiplex batch fill only supported for RFQ native orders');
                    }
                    subcalls.push({
                        id: MultiplexSubcall.Rfq,
                        sellAmount: order.takerAmount,
                        data: multiplexRfqEncoder.encode({
                            order: order.fillData.order,
                            signature: order.fillData.signature,
                        }),
                    });
                    break switch_statement;
                case ERC20BridgeSource.UniswapV2:
                case ERC20BridgeSource.SushiSwap:
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV2,
                        sellAmount: order.takerAmount,
                        data: multiplexUniswapEncoder.encode({
                            tokens: (order.fillData as UniswapV2FillData).tokenAddressPath,
                            isSushi: order.source === ERC20BridgeSource.SushiSwap,
                        }),
                    });
                    break switch_statement;
                case ERC20BridgeSource.LiquidityProvider:
                    subcalls.push({
                        id: MultiplexSubcall.LiquidityProvider,
                        sellAmount: order.takerAmount,
                        data: multiplexPlpEncoder.encode({
                            provider: (order.fillData as LiquidityProviderFillData).poolAddress,
                            auxiliaryData: NULL_BYTES,
                        }),
                    });
                    break switch_statement;
                case ERC20BridgeSource.UniswapV3:
                    const fillData = (order as OptimizedMarketBridgeOrder<FinalUniswapV3FillData>).fillData;
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV3,
                        sellAmount: order.takerAmount,
                        data: fillData.uniswapPath,
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
                                tokens: [quote.takerToken],
                                amounts: [],
                            }),
                        },
                    ];
                    subcalls.push({
                        id: MultiplexSubcall.TransformERC20,
                        sellAmount: BigNumber.sum(...quote.orders.slice(i).map((o) => o.takerAmount)),
                        data: multiplexTransformERC20Encoder.encode({
                            transformations,
                        }),
                    });
                    break for_loop;
            }
        }
        if (opts.isFromETH) {
            return this._exchangeProxy
                .multiplexBatchSellEthForToken(quote.makerToken, subcalls, quote.worstCaseQuoteInfo.makerAmount)
                .getABIEncodedTransactionData();
        } else if (opts.isToETH) {
            return this._exchangeProxy
                .multiplexBatchSellTokenForEth(
                    quote.takerToken,
                    subcalls,
                    quote.worstCaseQuoteInfo.totalTakerAmount,
                    quote.worstCaseQuoteInfo.makerAmount,
                )
                .getABIEncodedTransactionData();
        } else {
            return this._exchangeProxy
                .multiplexBatchSellTokenForToken(
                    quote.takerToken,
                    quote.makerToken,
                    subcalls,
                    quote.worstCaseQuoteInfo.totalTakerAmount,
                    quote.worstCaseQuoteInfo.makerAmount,
                )
                .getABIEncodedTransactionData();
        }
    }

    private _encodeMultiplexMultiHopFillCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): string {
        const subcalls = [];
        const [firstHopOrder, secondHopOrder] = quote.orders;
        const intermediateToken = firstHopOrder.makerToken;
        const tokens = [quote.takerToken, intermediateToken, quote.makerToken];

        for (const order of [firstHopOrder, secondHopOrder]) {
            switch (order.source) {
                case ERC20BridgeSource.UniswapV2:
                case ERC20BridgeSource.SushiSwap:
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV2,
                        data: multiplexUniswapEncoder.encode({
                            tokens: (order.fillData as UniswapV2FillData).tokenAddressPath,
                            isSushi: order.source === ERC20BridgeSource.SushiSwap,
                        }),
                    });
                    break;
                case ERC20BridgeSource.LiquidityProvider:
                    subcalls.push({
                        id: MultiplexSubcall.LiquidityProvider,
                        data: multiplexPlpEncoder.encode({
                            provider: (order.fillData as LiquidityProviderFillData).poolAddress,
                            auxiliaryData: NULL_BYTES,
                        }),
                    });
                    break;
                case ERC20BridgeSource.UniswapV3:
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV3,
                        data: (order.fillData as FinalUniswapV3FillData).uniswapPath,
                    });
                    break;
                default:
                    // Should never happen because we check `isMultiplexMultiHopFillCompatible`
                    // before calling this function.
                    throw new Error(`Multiplex multi-hop unsupported source: ${order.source}`);
            }
        }
        if (opts.isFromETH) {
            return this._exchangeProxy
                .multiplexMultiHopSellEthForToken(tokens, subcalls, quote.worstCaseQuoteInfo.makerAmount)
                .getABIEncodedTransactionData();
        } else if (opts.isToETH) {
            return this._exchangeProxy
                .multiplexMultiHopSellTokenForEth(
                    tokens,
                    subcalls,
                    quote.worstCaseQuoteInfo.totalTakerAmount,
                    quote.worstCaseQuoteInfo.makerAmount,
                )
                .getABIEncodedTransactionData();
        } else {
            return this._exchangeProxy
                .multiplexMultiHopSellTokenForToken(
                    tokens,
                    subcalls,
                    quote.worstCaseQuoteInfo.totalTakerAmount,
                    quote.worstCaseQuoteInfo.makerAmount,
                )
                .getABIEncodedTransactionData();
        }
    }
}

function slipNonNativeOrders(quote: MarketSellSwapQuote | MarketBuySwapQuote): OptimizedMarketOrder[] {
    const slippage = getMaxQuoteSlippageRate(quote);
    if (slippage === 0) {
        return quote.orders;
    }
    return quote.orders.map((o) => {
        if (o.source === ERC20BridgeSource.Native) {
            return o;
        }
        return {
            ...o,
            ...(quote.type === MarketOperation.Sell
                ? {
                      makerAmount: o.makerAmount.eq(MAX_UINT256)
                          ? MAX_UINT256
                          : o.makerAmount.times(1 - slippage).integerValue(BigNumber.ROUND_DOWN),
                  }
                : {
                      takerAmount: o.takerAmount.eq(MAX_UINT256)
                          ? MAX_UINT256
                          : o.takerAmount.times(1 + slippage).integerValue(BigNumber.ROUND_UP),
                  }),
        };
    });
}

function getMaxQuoteSlippageRate(quote: MarketBuySwapQuote | MarketSellSwapQuote): number {
    return quote.worstCaseQuoteInfo.slippage;
}
