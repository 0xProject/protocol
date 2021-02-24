import { ContractAddresses } from '@0x/contract-addresses';
import { IZeroExContract } from '@0x/contract-wrappers';
import {
    encodeAffiliateFeeTransformerData,
    encodeCurveLiquidityProviderData,
    encodeFillQuoteTransformerData,
    encodePayTakerTransformerData,
    encodePositiveSlippageFeeTransformerData,
    encodeWethTransformerData,
    ETH_TOKEN_ADDRESS,
    FillQuoteTransformerData,
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
    MarketOperation,
    MarketSellSwapQuote,
    SwapQuote,
    SwapQuoteConsumerBase,
    SwapQuoteConsumerOpts,
    SwapQuoteExecutionOpts,
    SwapQuoteGetOutputOpts,
} from '../types';
import { assert } from '../utils/assert';
import { CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID } from '../utils/market_operation_utils/constants';
import {
    createBridgeDataForBridgeOrder,
    getERC20BridgeSourceToBridgeSource,
} from '../utils/market_operation_utils/orders';
import {
    CurveFillData,
    ERC20BridgeSource,
    LiquidityProviderFillData,
    NativeLimitOrderFillData,
    NativeRfqOrderFillData,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    OptimizedMarketOrderBase,
    UniswapV2FillData,
} from '../utils/market_operation_utils/types';

// tslint:disable-next-line:custom-no-magic-numbers
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const { NULL_ADDRESS, NULL_BYTES, ZERO_AMOUNT } = constants;

export class ExchangeProxySwapQuoteConsumer implements SwapQuoteConsumerBase {
    public readonly provider: ZeroExProvider;
    public readonly chainId: number;
    public readonly transformerNonces: {
        wethTransformer: number;
        payTakerTransformer: number;
        fillQuoteTransformer: number;
        affiliateFeeTransformer: number;
        positiveSlippageFeeTransformer: number;
    };

    private readonly _exchangeProxy: IZeroExContract;

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
        const { feeType, buyTokenFeeAmount, sellTokenFeeAmount, recipient: feeRecipient } = affiliateFee;

        // VIP routes.
        if (
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap])
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
                allowanceTarget: this.contractAddresses.exchangeProxyAllowanceTarget,
            };
        }

        if (isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.LiquidityProvider])) {
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
                allowanceTarget: this.contractAddresses.exchangeProxyAllowanceTarget,
            };
        }

        if (isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.Curve, ERC20BridgeSource.Swerve])) {
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
                allowanceTarget: this.contractAddresses.exchangeProxyAllowanceTarget,
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
                    token: this.contractAddresses.etherToken,
                    amount: MAX_UINT256,
                }),
            });
        }

        if (feeType === AffiliateFeeType.PositiveSlippageFee && feeRecipient !== NULL_ADDRESS) {
            // bestCaseAmount is increased to cover gas cost of sending positive slipapge fee to fee recipient
            const bestCaseAmount = quote.bestCaseQuoteInfo.makerAssetAmount
                .plus(
                    POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS.multipliedBy(quote.gasPrice).multipliedBy(
                        quote.makerAssetPriceForOneEth,
                    ),
                )
                .decimalPlaces(0, BigNumber.ROUND_CEIL);
            transforms.push({
                deploymentNonce: this.transformerNonces.positiveSlippageFeeTransformer,
                data: encodePositiveSlippageFeeTransformerData({
                    token: isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                    bestCaseAmount,
                    recipient: feeRecipient,
                }),
            });
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
            allowanceTarget: this.contractAddresses.exchangeProxyAllowanceTarget,
        };
    }

    // tslint:disable-next-line:prefer-function-over-method
    public async executeSwapQuoteOrThrowAsync(
        _quote: SwapQuote,
        _opts: Partial<SwapQuoteExecutionOpts>,
    ): Promise<string> {
        throw new Error('Execution not supported for Exchange Proxy quotes');
    }
}

function isDirectSwapCompatible(
    quote: SwapQuote,
    opts: ExchangeProxyContractOpts,
    directSources: ERC20BridgeSource[],
): boolean {
    // Must not be a mtx.
    if (opts.isMetaTransaction) {
        return false;
    }
    // Must not have an affiliate fee.
    if (!opts.affiliateFee.buyTokenFeeAmount.eq(0) || !opts.affiliateFee.sellTokenFeeAmount.eq(0)) {
        return false;
    }
    // Must not have a positive slippage fee.
    if (opts.affiliateFee.feeType === AffiliateFeeType.PositiveSlippageFee) {
        return false;
    }
    // Must be a single order.
    if (quote.orders.length !== 1) {
        return false;
    }
    const order = quote.orders[0];
    if (!directSources.includes(order.source)) {
        return false;
    }
    // VIP does not support selling the entire balance
    if (opts.shouldSellEntireBalance) {
        return false;
    }
    return true;
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
                source: getERC20BridgeSourceToBridgeSource(order.source),
            });
        } else if (isOptimizedLimitOrder(order)) {
            fqtData.limitOrders.push({
                order: order.fillData.order,
                signature: order.fillData.signature,
                maxTakerTokenFillAmount: order.takerAmount,
            });
        } else if (isOptimizedRfqOrder(order)) {
            fqtData.rfqOrders.push({
                order: order.fillData.order,
                signature: order.fillData.signature,
                maxTakerTokenFillAmount: order.takerAmount,
            });
        } else {
            // Should never happen
            throw new Error('Unknown Order type');
        }
        fqtData.fillSequence.push(order.type);
    }
    return fqtData;
}
