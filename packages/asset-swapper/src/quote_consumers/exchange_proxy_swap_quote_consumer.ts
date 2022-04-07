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
import { BigNumber, hexUtils } from '@0x/utils';
import * as _ from 'lodash';

import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../constants';
import {
    Address,
    AffiliateFeeType,
    Bytes,
    CalldataInfo,
    ExchangeProxyContractOpts,
    MarketBuySwapQuote,
    MarketSellSwapQuote,
    SwapQuote,
    SwapQuoteConsumerBase,
    SwapQuoteConsumerOpts,
    SwapQuoteExecutionOpts,
    SwapQuoteGetOutputOpts,
    SwapQuoteLiquidityProviderBridgeOrder,
    SwapQuoteUniswapV2BridgeOrder,
    SwapQuoteUniswapV3BridgeOrder,
    SwapQuoteCurveBridgeOrder,
    SwapQuoteMooniswapBridgeOrder,
    SwapQuoteHop,
    SwapQuoteGenericBridgeOrder,
    SwapQuoteOrder,
} from '../types';
import { valueByChainId } from '../utils/utils';
import {
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
} from '../utils/market_operation_utils/constants';
import {
    ERC20BridgeSource,
<<<<<<< HEAD
=======
    FinalUniswapV3FillData,
    LiquidityProviderFillData,
    MooniswapFillData,
    NativeRfqOrderFillData,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    UniswapV2FillData,
>>>>>>> 955ad4971 (add real VIP support for eligible RFQT swaps (#458))
} from '../utils/market_operation_utils/types';

import {
    multiplexPlpEncoder,
    multiplexRfqEncoder,
    MultiplexSubcall,
    multiplexTransformERC20Encoder,
    multiplexUniswapEncoder,
    multiplexBatchSellEncoder,
} from './multiplex_encoders';
import {
    getFQTTransformerDataFromOptimizedOrders,
    isBuyQuote,
    isDirectSwapCompatible,
    isMultiplexBatchFillCompatible,
    isMultiplexMultiHopFillCompatible,
    requiresTransformERC20,
} from './quote_consumer_utils';

// tslint:disable-next-line:custom-no-magic-numbers
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const { NULL_ADDRESS, NULL_BYTES, ZERO_AMOUNT } = constants;

// use the same order in IPancakeSwapFeature.sol
const PANCAKE_SWAP_FORKS = [
    ERC20BridgeSource.PancakeSwap,
    ERC20BridgeSource.PancakeSwapV2,
    ERC20BridgeSource.BakerySwap,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.ApeSwap,
    ERC20BridgeSource.CafeSwap,
    ERC20BridgeSource.CheeseSwap,
    ERC20BridgeSource.JulSwap,
];

const FAKE_PROVIDER: any = {
    sendAsync(): void {
        return;
    },
};

const CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x561b94454b65614ae3db0897b74303f4acf7cc75',
        [ChainId.Ropsten]: '0xae241c6fc7f28f6dc0cb58b4112ba7f63fcaf5e2',
    },
    NULL_ADDRESS,
);

const MOONISWAP_LIQUIDITY_PROVIDER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xa2033d6ba88756ce6a87584d69dc87bda9a4f889',
        [ChainId.Ropsten]: '0x87e0393aee0fb8c10b8653c6507c182264fe5a34',
    },
    NULL_ADDRESS,
);


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

    constructor(public readonly contractAddresses: ContractAddresses, options: SwapQuoteConsumerOpts) {
        const { chainId } = options;
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
        // tslint:disable-next-line:no-object-literal-type-assertion
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

        // VIP routes.
        if (
            this.chainId === ChainId.Mainnet &&
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap])
        ) {
            const order = quote.hops[0].orders[0] as SwapQuoteUniswapV2BridgeOrder;
            const { source } = order;
            const { fillData } = order;
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
            const order = quote.hops[0].orders[0] as SwapQuoteUniswapV3BridgeOrder;
            const { fillData } = order;
            let _calldataHexString;
            if (isFromETH) {
                _calldataHexString = this._exchangeProxy
                    .sellEthForTokenToUniswapV3(fillData.encodedPath, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            } else if (isToETH) {
                _calldataHexString = this._exchangeProxy
                    .sellTokenForEthToUniswapV3(fillData.encodedPath, sellAmount, minBuyAmount, NULL_ADDRESS)
                    .getABIEncodedTransactionData();
            } else {
                _calldataHexString = this._exchangeProxy
                    .sellTokenForTokenToUniswapV3(fillData.encodedPath, sellAmount, minBuyAmount, NULL_ADDRESS)
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
                ERC20BridgeSource.CafeSwap,
                ERC20BridgeSource.CheeseSwap,
                ERC20BridgeSource.JulSwap,
            ])
        ) {
            const order = quote.hops[0].orders[0] as SwapQuoteUniswapV2BridgeOrder;
            const { source, fillData } = order;
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
            const { fillData } = quote.hops[0].orders[0] as SwapQuoteLiquidityProviderBridgeOrder;
            return {
                calldataHexString: this._exchangeProxy
                    .sellToLiquidityProvider(
                        isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                        isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                        fillData.poolAddress,
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
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.Curve, ERC20BridgeSource.Swerve]) &&
            // Curve VIP cannot currently support WETH buy/sell as the functionality needs to WITHDRAW or DEPOSIT
            // into WETH prior/post the trade.
            // ETH buy/sell is supported
            ![sellToken, buyToken].includes(NATIVE_FEE_TOKEN_BY_CHAIN_ID[ChainId.Mainnet])
        ) {
            const { fillData } = quote.hops[0].orders[0] as SwapQuoteCurveBridgeOrder;
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
                            curveAddress: fillData.poolAddress,
                            exchangeFunctionSelector: fillData.exchangeFunctionSelector,
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

        if (
            this.chainId === ChainId.Mainnet &&
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.Mooniswap])
        ) {
            const { fillData } = quote.hops[0].orders[0] as SwapQuoteMooniswapBridgeOrder;
            return {
                calldataHexString: this._exchangeProxy
                    .sellToLiquidityProvider(
                        isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                        isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                        MOONISWAP_LIQUIDITY_PROVIDER_BY_CHAIN_ID[this.chainId],
                        NULL_ADDRESS,
                        sellAmount,
                        minBuyAmount,
                        encodeAddress(fillData.poolAddress),
                    )
                    .getABIEncodedTransactionData(),
                ethAmount: isFromETH ? sellAmount : ZERO_AMOUNT,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this.contractAddresses.exchangeProxy,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        // RFQT VIP
        if (
            [ChainId.Mainnet, ChainId.Polygon].includes(this.chainId) &&
            !isToETH &&
            !isFromETH &&
            quote.orders.every(o => o.type === FillQuoteTransformerOrderType.Rfq) &&
            !requiresTransformERC20(optsWithDefaults)
        ) {
            const rfqOrdersData = quote.orders.map(o => o.fillData as NativeRfqOrderFillData);
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
                              rfqOrdersData.map(d => d.order),
                              rfqOrdersData.map(d => d.signature),
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
                    quote.hops[0],
                    optsWithDefaults,
                ),
                ethAmount,
                toAddress: this._exchangeProxy.address,
                allowanceTarget: this._exchangeProxy.address,
                gasOverhead: ZERO_AMOUNT,
            };
        }

        // Sort hops so they always flow taker -> maker
        const orderedHops = isBuyQuote(quote) ? quote.hops.slice().reverse() : quote.hops;
        if (this.chainId === ChainId.Mainnet && isMultiplexMultiHopFillCompatible(quote, optsWithDefaults)) {
            return {
                calldataHexString: this._encodeMultiplexMultiHopFillCalldata(
                    orderedHops,
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

        for (const [i, hop] of orderedHops.entries()) {
            let fillAmount = !isBuyQuote(quote)
                ? shouldSellEntireBalance ? MAX_UINT256 : hop.takerAmount
                : hop.makerAmount;
            let side = !isBuyQuote(quote) ? FillQuoteTransformerSide.Sell : FillQuoteTransformerSide.Buy;
            if (orderedHops.length > 1) { // Multi-hop.
                // Multi-hop is always a sell.
                side = FillQuoteTransformerSide.Sell;
                // Subsequent multi-hops always sell entire balance.
                fillAmount = i > 0 ? MAX_UINT256 : hop.takerAmount;
            }
            transforms.push({
                deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                data: encodeFillQuoteTransformerData({
                    side,
                    fillAmount,
                    sellToken: hop.takerToken,
                    buyToken: hop.makerToken,
                    ...getFQTTransformerDataFromOptimizedOrders(hop.orders),
                    refundReceiver: refundReceiver || NULL_ADDRESS,
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

    // tslint:disable-next-line:prefer-function-over-method
    public async executeSwapQuoteOrThrowAsync(
        _quote: SwapQuote,
        _opts: Partial<SwapQuoteExecutionOpts>,
    ): Promise<string> {
        throw new Error('Execution not supported for Exchange Proxy quotes');
    }

    private _encodeMultiplexBatchFillCalldata(hop: SwapQuoteHop, opts: ExchangeProxyContractOpts): string {
        const subcalls = this._getMultiplexBatchSellSubcalls(hop.orders);
        if (opts.isFromETH) {
            return this._exchangeProxy
                .multiplexBatchSellEthForToken(hop.makerToken, subcalls, hop.minMakerAmount)
                .getABIEncodedTransactionData();
        } else if (opts.isToETH) {
            return this._exchangeProxy
                .multiplexBatchSellTokenForEth(
                    hop.takerToken,
                    subcalls,
                    hop.maxTakerAmount,
                    hop.minMakerAmount,
                )
                .getABIEncodedTransactionData();
        } else {
            return this._exchangeProxy
                .multiplexBatchSellTokenForToken(
                    hop.takerToken,
                    hop.makerToken,
                    subcalls,
                    hop.maxTakerAmount,
                    hop.minMakerAmount,
                )
                .getABIEncodedTransactionData();
        }
    }

    private _encodeMultiplexMultiHopFillCalldata(hops: SwapQuoteHop[], opts: ExchangeProxyContractOpts): string {
        const subcalls = [];
        for (const hop of hops) {
            if (hop.orders.length !== 1) {
                subcalls.push({
                    id: MultiplexSubcall.BatchSell,
                    data: multiplexBatchSellEncoder.encode({ subcalls: this._getMultiplexBatchSellSubcalls(hop.orders) }),
                });
                continue;
            }
            const order = hop.orders[0] as SwapQuoteGenericBridgeOrder;
            switch (order.source) {
                case ERC20BridgeSource.UniswapV2:
                case ERC20BridgeSource.SushiSwap:
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV2,
                        data: multiplexUniswapEncoder.encode({
                            tokens: (order as SwapQuoteUniswapV2BridgeOrder).fillData.tokenAddressPath,
                            isSushi: order.source === ERC20BridgeSource.SushiSwap,
                        }),
                    });
                    break;
                case ERC20BridgeSource.LiquidityProvider:
                    subcalls.push({
                        id: MultiplexSubcall.LiquidityProvider,
                        data: multiplexPlpEncoder.encode({
                            provider: (order as SwapQuoteLiquidityProviderBridgeOrder).fillData.poolAddress,
                            auxiliaryData: NULL_BYTES,
                        }),
                    });
                    break;
                case ERC20BridgeSource.UniswapV3:
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV3,
                        data: (order as SwapQuoteUniswapV3BridgeOrder).fillData.encodedPath,
                    });
                    break;
                default:
                    // Should never happen because we check `isMultiplexMultiHopFillCompatible`
                    // before calling this function.
                    throw new Error(`Multiplex multi-hop unsupported source: ${order.source}`);
            }
        }
        const tokenPath = getTokenPathFromHops(hops);
        const firstHop = hops[0];
        const lastHop = hops[hops.length - 1];
        if (opts.isFromETH) {
            return this._exchangeProxy
                .multiplexMultiHopSellEthForToken(tokenPath, subcalls, lastHop.minMakerAmount)
                .getABIEncodedTransactionData();
        } else if (opts.isToETH) {
            return this._exchangeProxy
                .multiplexMultiHopSellTokenForEth(
                    tokenPath,
                    subcalls,
                    firstHop.maxTakerAmount,
                    lastHop.minMakerAmount,
                )
                .getABIEncodedTransactionData();
        } else {
            return this._exchangeProxy
                .multiplexMultiHopSellTokenForToken(
                    tokenPath,
                    subcalls,
                    firstHop.maxTakerAmount,
                    lastHop.minMakerAmount,
                )
                .getABIEncodedTransactionData();
        }
    }

    private _getMultiplexBatchSellSubcalls(orders: SwapQuoteOrder[]): any[] {
        const subcalls = [];
        for_loop: for (const [i, order] of orders.entries()) {
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
                        sellAmount: (order as SwapQuoteUniswapV2BridgeOrder).maxTakerAmount,
                        data: multiplexUniswapEncoder.encode({
                            tokens: (order as SwapQuoteUniswapV2BridgeOrder).fillData.tokenAddressPath,
                            isSushi: order.source === ERC20BridgeSource.SushiSwap,
                        }),
                    });
                    break switch_statement;
                case ERC20BridgeSource.LiquidityProvider:
                    subcalls.push({
                        id: MultiplexSubcall.LiquidityProvider,
                        sellAmount: (order as SwapQuoteLiquidityProviderBridgeOrder).maxTakerAmount,
                        data: multiplexPlpEncoder.encode({
                            provider: (order as SwapQuoteLiquidityProviderBridgeOrder).fillData.poolAddress,
                            auxiliaryData: NULL_BYTES,
                        }),
                    });
                    break switch_statement;
                case ERC20BridgeSource.UniswapV3:
                    subcalls.push({
                        id: MultiplexSubcall.UniswapV3,
                        sellAmount: (order as SwapQuoteUniswapV3BridgeOrder).maxTakerAmount,
                        data: (order as SwapQuoteUniswapV3BridgeOrder).fillData.encodedPath,
                    });
                    break switch_statement;
                default:
                    const fqtData = encodeFillQuoteTransformerData({
                        side: FillQuoteTransformerSide.Sell,
                        sellToken: order.takerToken,
                        buyToken: order.makerToken,
                        ...getFQTTransformerDataFromOptimizedOrders(orders.slice(i)),
                        refundReceiver: NULL_ADDRESS,
                        fillAmount: MAX_UINT256,
                    });
                    const transformations = [
                        { deploymentNonce: this.transformerNonces.fillQuoteTransformer, data: fqtData },
                        // TODO(lawrence): needed?
                        // {
                        //     deploymentNonce: this.transformerNonces.payTakerTransformer,
                        //     data: encodePayTakerTransformerData({
                        //         tokens: [hop.takerToken],
                        //         amounts: [],
                        //     }),
                        // },
                    ];
                    subcalls.push({
                        id: MultiplexSubcall.TransformERC20,
                        sellAmount: BigNumber.sum(
                            ...orders.slice(i)
                                .map(o => (o as SwapQuoteGenericBridgeOrder).maxTakerAmount),
                        ),
                        data: multiplexTransformERC20Encoder.encode({
                            transformations,
                        }),
                    });
                    break for_loop;
            }
        }
        return subcalls;
    }
}

function getTokenPathFromHops(hops: SwapQuoteHop[]): Address[] {
    const path = [];
    for (const [i, hop] of hops.entries()) {
        path.push(hop.takerToken);
        if (i === hops.length - 1) {
            path.push(hop.makerToken);
        }
    }
    return path;
}

function encodeAddress(address: Address): Bytes {
    return hexUtils.leftPad(hexUtils.slice(address, 0, 20));
}
