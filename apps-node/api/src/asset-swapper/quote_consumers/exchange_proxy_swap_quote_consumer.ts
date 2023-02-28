import { ChainId, ContractAddresses } from '@0x/contract-addresses';
import { IZeroExContract } from '@0x/contract-wrappers';
import {
    encodeCurveLiquidityProviderData,
    encodeFillQuoteTransformerData,
    encodePayTakerTransformerData,
    ETH_TOKEN_ADDRESS,
    FillQuoteTransformerOrderType,
    FillQuoteTransformerSide,
} from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { constants } from '../constants';
import {
    CalldataInfo,
    ExchangeProxyContractOpts,
    MarketBuySwapQuote,
    MarketSellSwapQuote,
    SwapQuote,
    SwapQuoteConsumer,
} from '../types';
import { assert } from '../utils/utils';
import {
    CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
} from '../utils/market_operation_utils/constants';
import { CurveFillData, FinalTickDEXMultiPathFillData, UniswapV2FillData } from '../utils/market_operation_utils/types';

import {
    ERC20BridgeSource,
    NativeOtcOrderFillData,
    NativeRfqOrderFillData,
    OptimizedMarketBridgeOrder,
} from '../types';

import {
    multiplexOtcOrder,
    multiplexRfqEncoder,
    MultiplexSubcall,
    multiplexTransformERC20Encoder,
    multiplexUniswapEncoder,
} from './multiplex_encoders';
import {
    createExchangeProxyWithoutProvider,
    getFQTTransformerDataFromOptimizedOrders,
    getMaxQuoteSlippageRate,
    getTransformerNonces,
    isDirectSwapCompatible,
    isMultiplexBatchFillCompatible,
    isMultiplexMultiHopFillCompatible,
    requiresTransformERC20,
} from './quote_consumer_utils';
import { TransformerNonces } from './types';
import { FeatureRuleRegistryImpl } from './feature_rules/feature_rule_registry';
import { FeatureRuleRegistry } from './feature_rules/types';

const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const { NULL_ADDRESS, ZERO_AMOUNT } = constants;

// use the same order in IPancakeSwapFeature.sol
const PANCAKE_SWAP_FORKS = [
    ERC20BridgeSource.PancakeSwap,
    ERC20BridgeSource.PancakeSwapV2,
    ERC20BridgeSource.BakerySwap,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.ApeSwap,
];

export class ExchangeProxySwapQuoteConsumer implements SwapQuoteConsumer {
    public static create(chainId: ChainId, contractAddresses: ContractAddresses): ExchangeProxySwapQuoteConsumer {
        const exchangeProxy = createExchangeProxyWithoutProvider(contractAddresses.exchangeProxy);
        const transformerNonces = getTransformerNonces(contractAddresses);
        // NOTES: consider injecting registry instead of relying on FeatureRuleRegistryImpl.
        const featureRuleRegistry = FeatureRuleRegistryImpl.create(chainId, contractAddresses);
        return new ExchangeProxySwapQuoteConsumer(chainId, exchangeProxy, transformerNonces, featureRuleRegistry);
    }

    private constructor(
        private readonly chainId: ChainId,
        private readonly exchangeProxy: IZeroExContract,
        private readonly transformerNonces: TransformerNonces,
        private readonly featureRuleRegistry: FeatureRuleRegistry,
    ) {}

    public getCalldataOrThrow(
        quote: MarketBuySwapQuote | MarketSellSwapQuote,
        opts: Partial<ExchangeProxyContractOpts> = {},
    ): CalldataInfo {
        const optsWithDefaults: ExchangeProxyContractOpts = {
            ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
            ...opts,
        };
        const { isFromETH, isToETH } = optsWithDefaults;

        const sellToken = quote.takerToken;
        const buyToken = quote.makerToken;
        // Take the bounds from the worst case
        const sellAmount = BigNumber.max(
            quote.bestCaseQuoteInfo.totalTakerAmount,
            quote.worstCaseQuoteInfo.totalTakerAmount,
        );
        const minBuyAmount = quote.worstCaseQuoteInfo.makerAmount;
        let ethAmount = quote.worstCaseQuoteInfo.protocolFeeInWeiAmount;

        if (isFromETH) {
            ethAmount = ethAmount.plus(sellAmount);
        }

        const maxSlippage = getMaxQuoteSlippageRate(quote);
        const slippedOrders = quote.path.getSlippedOrders(maxSlippage);

        const uniswapV2Rule = this.featureRuleRegistry.getUniswapV2Rule();
        if (uniswapV2Rule.isCompatible(quote, optsWithDefaults)) {
            return uniswapV2Rule.createCalldata(quote, optsWithDefaults);
        }

        // VIP routes.
        if (
            this.chainId === ChainId.Mainnet &&
            isDirectSwapCompatible(quote.path, optsWithDefaults, [ERC20BridgeSource.UniswapV3])
        ) {
            const fillData = (slippedOrders[0] as OptimizedMarketBridgeOrder<FinalTickDEXMultiPathFillData>).fillData;
            let _calldataHexString;
            if (isFromETH) {
                _calldataHexString = this.exchangeProxy
                    .sellEthForTokenToUniswapV3(fillData.path, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            } else if (isToETH) {
                _calldataHexString = this.exchangeProxy
                    .sellTokenForEthToUniswapV3(fillData.path, sellAmount, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            } else {
                _calldataHexString = this.exchangeProxy
                    .sellTokenForTokenToUniswapV3(fillData.path, sellAmount, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            }
            return {
                calldataHexString: _calldataHexString,
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this.exchangeProxy.address,
                allowanceTarget: this.exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (
            this.chainId === ChainId.BSC &&
            isDirectSwapCompatible(quote.path, optsWithDefaults, [
                ERC20BridgeSource.PancakeSwap,
                ERC20BridgeSource.PancakeSwapV2,
                ERC20BridgeSource.BakerySwap,
                ERC20BridgeSource.SushiSwap,
                ERC20BridgeSource.ApeSwap,
            ])
        ) {
            const source = slippedOrders[0].source;
            const fillData = (slippedOrders[0] as OptimizedMarketBridgeOrder<UniswapV2FillData>).fillData;
            return {
                calldataHexString: this.exchangeProxy
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
                toAddress: this.exchangeProxy.address,
                allowanceTarget: this.exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (
            this.chainId === ChainId.Mainnet &&
            isDirectSwapCompatible(quote.path, optsWithDefaults, [ERC20BridgeSource.Curve]) &&
            // Curve VIP cannot currently support WETH buy/sell as the functionality needs to WITHDRAW or DEPOSIT
            // into WETH prior/post the trade.
            // ETH buy/sell is supported
            ![sellToken, buyToken].includes(NATIVE_FEE_TOKEN_BY_CHAIN_ID[ChainId.Mainnet])
        ) {
            const fillData = slippedOrders[0].fillData as CurveFillData;
            return {
                calldataHexString: this.exchangeProxy
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
                toAddress: this.exchangeProxy.address,
                allowanceTarget: this.exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        // RFQT VIP
        if (
            [ChainId.Mainnet, ChainId.Polygon].includes(this.chainId) &&
            !isToETH &&
            !isFromETH &&
            slippedOrders.every((o) => o.type === FillQuoteTransformerOrderType.Rfq) &&
            !requiresTransformERC20(optsWithDefaults)
        ) {
            const rfqOrdersData = slippedOrders.map((o) => o.fillData as NativeRfqOrderFillData);
            const fillAmountPerOrder = (() => {
                // Don't think order taker amounts are clipped to actual sell amount
                // (the last one might be too large) so figure them out manually.
                let remaining = sellAmount;
                const fillAmounts = [];
                for (const o of slippedOrders) {
                    const fillAmount = BigNumber.min(o.takerAmount, remaining);
                    fillAmounts.push(fillAmount);
                    remaining = remaining.minus(fillAmount);
                }
                return fillAmounts;
            })();
            const callData =
                slippedOrders.length === 1
                    ? this.exchangeProxy
                          .fillRfqOrder(rfqOrdersData[0].order, rfqOrdersData[0].signature, fillAmountPerOrder[0])
                          .getABIEncodedTransactionData()
                    : this.exchangeProxy
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
                toAddress: this.exchangeProxy.address,
                allowanceTarget: this.exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        // OTC orders
        // if we have more than one otc order we want to batch fill them through multiplex
        if (
            [ChainId.Mainnet, ChainId.Polygon, ChainId.PolygonMumbai].includes(this.chainId) && // @todo goerli?
            slippedOrders.every((o) => o.type === FillQuoteTransformerOrderType.Otc) &&
            !requiresTransformERC20(optsWithDefaults) &&
            slippedOrders.length === 1
        ) {
            const otcOrdersData = slippedOrders.map((o) => o.fillData as NativeOtcOrderFillData);

            let callData;

            // if the otc orders takerToken is the native asset
            if (isFromETH) {
                callData = this.exchangeProxy
                    .fillOtcOrderWithEth(otcOrdersData[0].order, otcOrdersData[0].signature)
                    .getABIEncodedTransactionData();
            }
            // if the otc orders makerToken is the native asset
            else if (isToETH) {
                callData = this.exchangeProxy
                    .fillOtcOrderForEth(otcOrdersData[0].order, otcOrdersData[0].signature, sellAmount)
                    .getABIEncodedTransactionData();
            } else {
                // if the otc order contains 2 erc20 tokens
                callData = this.exchangeProxy
                    .fillOtcOrder(otcOrdersData[0].order, otcOrdersData[0].signature, sellAmount)
                    .getABIEncodedTransactionData();
            }
            return {
                calldataHexString: callData,
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this.exchangeProxy.address,
                allowanceTarget: this.exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (this.chainId === ChainId.Mainnet && isMultiplexBatchFillCompatible(quote, optsWithDefaults)) {
            return {
                calldataHexString: this.encodeMultiplexBatchFillCalldata(quote, optsWithDefaults),
                ethAmount,
                toAddress: this.exchangeProxy.address,
                allowanceTarget: this.exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        if (this.chainId === ChainId.Mainnet && isMultiplexMultiHopFillCompatible(quote.path, optsWithDefaults)) {
            return {
                calldataHexString: this.encodeMultiplexMultiHopFillCalldata(quote, optsWithDefaults),
                ethAmount,
                toAddress: this.exchangeProxy.address,
                allowanceTarget: this.exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        // TODO(kyu-c): move the rest of the feature calldata generation logic to the rule/registry.

        return this.featureRuleRegistry.getTransformErc20Rule().createCalldata(quote, optsWithDefaults);
    }

    private encodeMultiplexBatchFillCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): string {
        const maxSlippage = getMaxQuoteSlippageRate(quote);
        const slippedOrders = quote.path.getSlippedOrders(maxSlippage);
        const subcalls = [];
        for_loop: for (const [i, order] of slippedOrders.entries()) {
            switch_statement: switch (order.source) {
                case ERC20BridgeSource.Native:
                    if (
                        order.type !== FillQuoteTransformerOrderType.Rfq &&
                        order.type !== FillQuoteTransformerOrderType.Otc
                    ) {
                        // Should never happen because we check `isMultiplexBatchFillCompatible`
                        // before calling this function.
                        throw new Error('Multiplex batch fill only supported for RFQ native orders and OTC Orders');
                    }
                    if (order.type !== FillQuoteTransformerOrderType.Otc) {
                        subcalls.push({
                            id: MultiplexSubcall.Rfq,
                            sellAmount: order.takerAmount,
                            data: multiplexRfqEncoder.encode({
                                order: order.fillData.order,
                                signature: order.fillData.signature,
                            }),
                        });
                    } else {
                        subcalls.push({
                            id: MultiplexSubcall.Otc,
                            sellAmount: order.takerAmount,
                            data: multiplexOtcOrder.encode({
                                order: order.fillData.order,
                                signature: order.fillData.signature,
                            }),
                        });
                    }
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
                case ERC20BridgeSource.UniswapV3: {
                    const fillData = (order as OptimizedMarketBridgeOrder<FinalTickDEXMultiPathFillData>).fillData;
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV3,
                        sellAmount: order.takerAmount,
                        data: fillData.path,
                    });
                    break switch_statement;
                }
                default: {
                    const fqtData = encodeFillQuoteTransformerData({
                        side: FillQuoteTransformerSide.Sell,
                        sellToken: quote.takerToken,
                        buyToken: quote.makerToken,
                        ...getFQTTransformerDataFromOptimizedOrders(slippedOrders.slice(i)),
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
                        sellAmount: BigNumber.sum(...slippedOrders.slice(i).map((o) => o.takerAmount)),
                        data: multiplexTransformERC20Encoder.encode({
                            transformations,
                        }),
                    });
                    break for_loop;
                }
            }
        }
        if (opts.isFromETH) {
            return this.exchangeProxy
                .multiplexBatchSellEthForToken(quote.makerToken, subcalls, quote.worstCaseQuoteInfo.makerAmount)
                .getABIEncodedTransactionData();
        } else if (opts.isToETH) {
            return this.exchangeProxy
                .multiplexBatchSellTokenForEth(
                    quote.takerToken,
                    subcalls,
                    quote.worstCaseQuoteInfo.totalTakerAmount,
                    quote.worstCaseQuoteInfo.makerAmount,
                )
                .getABIEncodedTransactionData();
        } else {
            return this.exchangeProxy
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

    private encodeMultiplexMultiHopFillCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): string {
        const maxSlippage = getMaxQuoteSlippageRate(quote);
        const { nativeOrders, bridgeOrders, twoHopOrders } = quote.path.getSlippedOrdersByType(maxSlippage);
        // Should have been checked with `isMultiplexMultiHopFillCompatible`.
        assert.assert(
            nativeOrders.length === 0 && bridgeOrders.length === 0,
            'non-multihop should not go through multiplexMultihop',
        );
        assert.assert(twoHopOrders.length === 1, 'multiplexMultiHop only supports single multihop order ');

        const { firstHopOrder, secondHopOrder } = twoHopOrders[0];
        const intermediateToken = firstHopOrder.makerToken;
        const tokens = [quote.takerToken, intermediateToken, quote.makerToken];
        const subcalls = [];
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
                case ERC20BridgeSource.UniswapV3:
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV3,
                        data: (order.fillData as FinalTickDEXMultiPathFillData).path,
                    });
                    break;
                default:
                    // Should never happen because we check `isMultiplexMultiHopFillCompatible`
                    // before calling this function.
                    throw new Error(`Multiplex multi-hop unsupported source: ${order.source}`);
            }
        }
        if (opts.isFromETH) {
            return this.exchangeProxy
                .multiplexMultiHopSellEthForToken(tokens, subcalls, quote.worstCaseQuoteInfo.makerAmount)
                .getABIEncodedTransactionData();
        } else if (opts.isToETH) {
            return this.exchangeProxy
                .multiplexMultiHopSellTokenForEth(
                    tokens,
                    subcalls,
                    quote.worstCaseQuoteInfo.totalTakerAmount,
                    quote.worstCaseQuoteInfo.makerAmount,
                )
                .getABIEncodedTransactionData();
        } else {
            return this.exchangeProxy
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
