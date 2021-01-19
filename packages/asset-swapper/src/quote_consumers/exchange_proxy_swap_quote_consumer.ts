import { ContractAddresses } from '@0x/contract-addresses';
import { IZeroExContract } from '@0x/contract-wrappers';
import {
    encodeAffiliateFeeTransformerData,
    encodeFillQuoteTransformerData,
    encodePayTakerTransformerData,
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

import { constants } from '../constants';
import {
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
import { ERC20BridgeSource, UniswapV2FillData } from '../utils/market_operation_utils/types';

import { getSwapMinBuyAmount } from './utils';

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
        };
    }

    public async getCalldataOrThrowAsync(
        quote: MarketBuySwapQuote | MarketSellSwapQuote,
        opts: Partial<SwapQuoteGetOutputOpts> = {},
    ): Promise<CalldataInfo> {
        assert.isValidSwapQuote('quote', quote);
        const optsWithDefaults: ExchangeProxyContractOpts = {
            ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
            ...opts.extensionContractOpts,
        };
        // tslint:disable-next-line:no-object-literal-type-assertion
        const { refundReceiver, affiliateFee, isFromETH, isToETH, shouldSellEntireBalance } = optsWithDefaults;

        const sellToken = quote.takerToken;
        const buyToken = quote.makerToken;
        const sellAmount = quote.worstCaseQuoteInfo.totalTakerAssetAmount;
        let minBuyAmount = getSwapMinBuyAmount(quote);
        let ethAmount = quote.worstCaseQuoteInfo.protocolFeeInWeiAmount;
        if (isFromETH) {
            ethAmount = ethAmount.plus(sellAmount);
        }
        const { buyTokenFeeAmount, sellTokenFeeAmount, recipient: feeRecipient } = affiliateFee;

        // VIP routes.
        if (
            isDirectSwapCompatible(quote, optsWithDefaults, [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap])
        ) {
            const source = quote.orders[0].fills[0].source;
            const fillData = quote.orders[0].fills[0].fillData as UniswapV2FillData;
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
            const target = quote.orders[0].order.makerAddress; // TODO (xianny)
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

        const intermediateToken = quote.isTwoHop ? quote.orders[0].order.makerToken : NULL_ADDRESS;
        // This transformer will fill the quote.
        if (quote.isTwoHop) {
            const [firstHopOrder, secondHopOrder] = quote.orders;
            transforms.push({
                deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                data: encodeFillQuoteTransformerData({
                    side: FillQuoteTransformerSide.Sell,
                    sellToken,
                    buyToken: intermediateToken,
                    bridgeOrders: [firstHopOrder],
                    limitOrders: [],
                    rfqOrders: [],
                    fillSequence: [FillQuoteTransformerOrderType.Bridge],
                    refundReceiver: refundReceiver || NULL_ADDRESS,
                    fillAmount: shouldSellEntireBalance ? MAX_UINT256 : firstHopOrder.takerTokenAmount,
                }),
            });
            transforms.push({
                deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                data: encodeFillQuoteTransformerData({
                    side: FillQuoteTransformerSide.Sell,
                    buyToken,
                    sellToken: intermediateToken,
                    bridgeOrders: [secondHopOrder],
                    limitOrders: [],
                    rfqOrders: [],
                    fillSequence: [FillQuoteTransformerOrderType.Bridge],
                    refundReceiver: refundReceiver || NULL_ADDRESS,
                    fillAmount: MAX_UINT256,
                }),
            });
        } else {
            const fillAmount = isBuyQuote(quote) ? quote.makerAssetFillAmount : quote.takerAssetFillAmount;

            const { bridgeOrders, limitOrders, rfqOrders, fillSequence } = getFQTTransformerDataForOrders(quote.orders);
            transforms.push({
                deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                data: encodeFillQuoteTransformerData({
                    side: isBuyQuote(quote) ? FillQuoteTransformerSide.Buy : FillQuoteTransformerSide.Sell,
                    sellToken,
                    buyToken,
                    bridgeOrders,
                    limitOrders,
                    rfqOrders,
                    fillSequence,
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

        // This transformer pays affiliate fees.
        if (buyTokenFeeAmount.isGreaterThan(0) && feeRecipient !== NULL_ADDRESS) {
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
        if (sellTokenFeeAmount.isGreaterThan(0) && feeRecipient !== NULL_ADDRESS) {
            throw new Error('Affiliate fees denominated in sell token are not yet supported');
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

function isBuyQuote(quote: SwapQuote): quote is MarketBuySwapQuote {
    return quote.type === MarketOperation.Buy;
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
    // Must be a single order.
    if (quote.orders.length !== 1) {
        return false;
    }
    const order = quote.orders[0];
    // With a single underlying fill/source.
    if (order.fills.length !== 1) {
        return false;
    }
    const fill = order.fills[0];
    if (!directSources.includes(fill.source)) {
        return false;
    }
    // VIP does not support selling the entire balance
    if (opts.shouldSellEntireBalance) {
        return false;
    }
    return true;
}

// TODO (xianny)
function getFQTTransformerDataForOrders(
    orders: SwapQuoteOrder[],
): Pick<FillQuoteTransformerData, 'bridgeOrders' | 'limitOrders' | 'rfqOrders' | 'fillSequence'> {
    const fillSequence = [];
    const typeToArray = {
        [FillQuoteTransformerOrderType.Bridge]: [],
        [FillQuoteTransformerOrderType.Limit]: [],
        [FillQuoteTransformerOrderType.Rfq]: [],
    };

    for (const order of orders) {
        typeToArray[order.orderType].push(order.order);
        fillSequence.push(order.orderType);
    }
    return {
        bridgeOrders: typeToArray[FillQuoteTransformerOrderType.Bridge],
        limitOrders: typeToArray[FillQuoteTransformerOrderType.Limit],
        rfqOrders: typeToArray[FillQuoteTransformerOrderType.Rfq],
        fillSequence,
    };
}
