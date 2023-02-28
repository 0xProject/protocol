import { ChainId, ContractAddresses } from '@0x/contract-addresses';
import {
    encodeAffiliateFeeTransformerData,
    encodeFillQuoteTransformerData,
    encodePayTakerTransformerData,
    encodePositiveSlippageFeeTransformerData,
    encodeWethTransformerData,
    ETH_TOKEN_ADDRESS,
    FillQuoteTransformerSide,
} from '@0x/protocol-utils';
import {
    AffiliateFeeType,
    CalldataInfo,
    ExchangeProxyContractOpts,
    MarketOperation,
    SwapQuote,
    TwoHopOrder,
} from '../../types';
import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../../constants';
import { BigNumber } from '@0x/utils';
import {
    createExchangeProxyWithoutProvider,
    getFQTTransformerDataFromOptimizedOrders,
    getTransformerNonces,
    isBuyQuote,
} from '../quote_consumer_utils';
import { NATIVE_FEE_TOKEN_BY_CHAIN_ID } from '../../utils/market_operation_utils/constants';
import { IZeroExContract } from '@0x/contract-wrappers';
import { TransformerNonces } from '../types';
import { AbstractFeatureRule } from './abstract_feature_rule';
import * as _ from 'lodash';
import { ZERO } from '../../../constants';

// Transformation of `TransformERC20` feature.
interface ERC20Transformation {
    deploymentNonce: number;
    data: string;
}

const { NULL_ADDRESS, ZERO_AMOUNT } = constants;
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);

export class TransformERC20Rule extends AbstractFeatureRule {
    public static create(chainId: ChainId, contractAddresses: ContractAddresses): TransformERC20Rule {
        return new TransformERC20Rule(
            chainId,
            contractAddresses,
            createExchangeProxyWithoutProvider(contractAddresses.exchangeProxy),
            getTransformerNonces(contractAddresses),
        );
    }

    private constructor(
        private readonly chainId: ChainId,
        private readonly contractAddresses: ContractAddresses,
        private readonly exchangeProxy: IZeroExContract,
        private readonly transformerNonces: TransformerNonces,
    ) {
        super();
    }

    // TransformERC20 is the most generic feature that is compatible with all kinds of swaps.
    public isCompatible(): boolean {
        return true;
    }

    public createCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): CalldataInfo {
        // TODO(kyu-c): further breakdown calldata creation logic.
        const {
            sellTokenAffiliateFees,
            buyTokenAffiliateFees,
            positiveSlippageFee,
            isFromETH,
            isToETH,
            shouldSellEntireBalance,
            metaTransactionVersion,
        } = opts;

        const swapContext = this.getSwapContext(quote, opts);
        const { sellToken, buyToken, ethAmount } = swapContext;
        let { minBuyAmount, sellAmount } = swapContext;

        // Build up the transformations.
        const transformations = [] as ERC20Transformation[];

        // Create an AffiliateFeeTransformer if there are fees in sell token.
        // Must be before the FillQuoteTransformer.
        // Also prefer to take fees in ETH if possible, so must be before the WETH transformer.
        if (sellTokenAffiliateFees.length > 0) {
            transformations.push({
                deploymentNonce: this.transformerNonces.affiliateFeeTransformer,
                data: encodeAffiliateFeeTransformerData({
                    fees: sellTokenAffiliateFees
                        .filter((fee) => fee.sellTokenFeeAmount.gt(0))
                        .map((fee) => ({
                            token: isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                            amount: fee.sellTokenFeeAmount,
                            recipient: fee.recipient,
                        })),
                }),
            });

            // Adjust the sell amount by the fee for meta-transaction v1. We don't need to adjust the amount for v2
            // since fee transfer won't happen in `transformERC20`
            if (metaTransactionVersion === 'v1') {
                const totalSellTokenFeeAmount = sellTokenAffiliateFees.reduce(
                    (totalSellTokenFeeAmount, sellTokenAffiliateFees) =>
                        totalSellTokenFeeAmount.plus(sellTokenAffiliateFees.sellTokenFeeAmount),
                    ZERO,
                );
                sellAmount = sellAmount.plus(totalSellTokenFeeAmount);
            }
        }

        // Create a WETH wrapper if coming from ETH.
        // Don't add the wethTransformer to CELO. There is no wrap/unwrap logic for CELO.
        if (isFromETH && this.chainId !== ChainId.Celo) {
            transformations.push({
                deploymentNonce: this.transformerNonces.wethTransformer,
                data: encodeWethTransformerData({
                    token: ETH_TOKEN_ADDRESS,
                    amount: shouldSellEntireBalance ? MAX_UINT256 : sellAmount,
                }),
            });
        }

        // Add the FillQuoteTransformer (FQT), which will convert the sell token to the buy token.
        transformations.push(...this.createFillQuoteTransformations(quote, opts));

        // Create a WETH unwrapper if going to ETH.
        // Dont add the wethTransformer on CELO. There is no wrap/unwrap logic for CELO.
        if (isToETH && this.chainId !== ChainId.Celo) {
            transformations.push({
                deploymentNonce: this.transformerNonces.wethTransformer,
                data: encodeWethTransformerData({
                    token: NATIVE_FEE_TOKEN_BY_CHAIN_ID[this.chainId],
                    amount: MAX_UINT256,
                }),
            });
        }

        let gasOverhead = ZERO_AMOUNT;
        const buyTokenFees = [...buyTokenAffiliateFees];
        positiveSlippageFee && buyTokenFees.push(positiveSlippageFee); // Append positive slippage fee if present
        buyTokenFees.forEach((fee) => {
            const { feeType, buyTokenFeeAmount, recipient: feeRecipient } = fee;
            if (feeRecipient === NULL_ADDRESS) {
                return;
            } else if (feeType === AffiliateFeeType.None) {
                return;
            } else if (feeType === AffiliateFeeType.PositiveSlippageFee) {
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
                bestCaseAmountWithSurplus = BigNumber.max(
                    bestCaseAmountWithSurplus,
                    quote.bestCaseQuoteInfo.makerAmount,
                );
                transformations.push({
                    deploymentNonce: this.transformerNonces.positiveSlippageFeeTransformer,
                    data: encodePositiveSlippageFeeTransformerData({
                        token: isToETH ? ETH_TOKEN_ADDRESS : buyToken,
                        bestCaseAmount: bestCaseAmountWithSurplus,
                        recipient: feeRecipient,
                    }),
                });
                // This may not be visible at eth_estimateGas time, so we explicitly add overhead
                gasOverhead = POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS.plus(gasOverhead);
            } else if (feeType === AffiliateFeeType.PercentageFee) {
                // This transformer pays affiliate fees.
                if (buyTokenFeeAmount.isGreaterThan(0)) {
                    transformations.push({
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
            } else if (feeType === AffiliateFeeType.GaslessFee) {
                if (buyTokenFeeAmount.isGreaterThan(0)) {
                    transformations.push({
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
            } else {
                // A compile time check that we've handled all cases of feeType
                ((_: never) => {
                    throw new Error('unreachable');
                })(feeType);
            }
        });
        transformations.push(this.createPayTakerTransformation(quote, opts));

        const TO_ETH_ADDRESS = this.chainId === ChainId.Celo ? this.contractAddresses.etherToken : ETH_TOKEN_ADDRESS;
        const calldataHexString = this.exchangeProxy
            .transformERC20(
                isFromETH ? ETH_TOKEN_ADDRESS : sellToken,
                isToETH ? TO_ETH_ADDRESS : buyToken,
                shouldSellEntireBalance ? MAX_UINT256 : sellAmount,
                minBuyAmount,
                transformations,
            )
            .getABIEncodedTransactionData();

        return {
            calldataHexString,
            ethAmount,
            toAddress: this.exchangeProxy.address,
            allowanceTarget: this.exchangeProxy.address,
            gasOverhead,
        };
    }

    private createFillQuoteTransformations(quote: SwapQuote, opts: ExchangeProxyContractOpts): ERC20Transformation[] {
        const transformations = [...this.createTwoHopTransformations(quote, opts)];

        const nonTwoHopTransformation = this.createNonTwoHopTransformation(quote, opts);
        if (nonTwoHopTransformation !== undefined) {
            transformations.push(nonTwoHopTransformation);
        }

        return transformations;
    }

    private createTwoHopTransformations(quote: SwapQuote, opts: ExchangeProxyContractOpts): ERC20Transformation[] {
        // This transformer will fill the quote.
        // TODO: handle `shouldSellEntireBalance` outside.
        const { refundReceiver, shouldSellEntireBalance } = opts;
        const { sellToken, buyToken, maxSlippage } = this.getSwapContext(quote, opts);
        const slippedTwoHopOrders = quote.path.getSlippedOrdersByType(maxSlippage).twoHopOrders;

        return _.flatMap(slippedTwoHopOrders, ({ firstHopOrder, secondHopOrder }) => {
            const intermediateToken = firstHopOrder.makerToken;
            return [
                {
                    deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                    data: encodeFillQuoteTransformerData({
                        side: FillQuoteTransformerSide.Sell,
                        sellToken,
                        buyToken: intermediateToken,
                        ...getFQTTransformerDataFromOptimizedOrders([firstHopOrder]),
                        refundReceiver: refundReceiver || NULL_ADDRESS,
                        fillAmount:
                            !isBuyQuote(quote) && shouldSellEntireBalance ? MAX_UINT256 : firstHopOrder.takerAmount,
                    }),
                },
                {
                    deploymentNonce: this.transformerNonces.fillQuoteTransformer,
                    data: encodeFillQuoteTransformerData({
                        side: FillQuoteTransformerSide.Sell,
                        buyToken,
                        sellToken: intermediateToken,
                        ...getFQTTransformerDataFromOptimizedOrders([secondHopOrder]),
                        refundReceiver: refundReceiver || NULL_ADDRESS,
                        fillAmount: MAX_UINT256,
                    }),
                },
            ];
        });
    }

    private createNonTwoHopTransformation(
        quote: SwapQuote,
        opts: ExchangeProxyContractOpts,
    ): ERC20Transformation | undefined {
        const { refundReceiver, shouldSellEntireBalance } = opts;
        const { sellToken, buyToken, maxSlippage } = this.getSwapContext(quote, opts);
        const slippedOrdersByType = quote.path.getSlippedOrdersByType(maxSlippage);

        const fillAmount = getNonTwoHopFillAmount(quote);
        const nonTwoHopOrders = [...slippedOrdersByType.nativeOrders, ...slippedOrdersByType.bridgeOrders];

        if (nonTwoHopOrders.length === 0) {
            return undefined;
        }

        // TODO: handle `shouldSellEntireBalance` outside.
        return {
            deploymentNonce: this.transformerNonces.fillQuoteTransformer,
            data: encodeFillQuoteTransformerData({
                side: isBuyQuote(quote) ? FillQuoteTransformerSide.Buy : FillQuoteTransformerSide.Sell,
                sellToken,
                buyToken,
                ...getFQTTransformerDataFromOptimizedOrders(nonTwoHopOrders),
                refundReceiver: refundReceiver || NULL_ADDRESS,
                fillAmount: !isBuyQuote(quote) && shouldSellEntireBalance ? MAX_UINT256 : fillAmount,
            }),
        };
    }

    private createPayTakerTransformation(quote: SwapQuote, opts: ExchangeProxyContractOpts): ERC20Transformation {
        const { sellToken } = this.getSwapContext(quote, opts);
        // Return any unspent sell tokens (including intermediate tokens from two hops if any).
        const payTakerTokens = [sellToken, ...getIntermediateTokens(quote.path.getOrdersByType().twoHopOrders)];

        // Return any unspent ETH. If ETH is the buy token, it will
        // be returned in TransformERC20Feature rather than PayTakerTransformer.
        if (!opts.isToETH) {
            payTakerTokens.push(ETH_TOKEN_ADDRESS);
        }
        // The final transformer will send all funds to the taker.
        return {
            deploymentNonce: this.transformerNonces.payTakerTransformer,
            data: encodePayTakerTransformerData({
                tokens: payTakerTokens,
                amounts: [],
            }),
        };
    }
}

function getIntermediateTokens(twoHopOrders: readonly TwoHopOrder[]): string[] {
    return twoHopOrders.map((twoHopOrder) => twoHopOrder.firstHopOrder.makerToken);
}

function getNonTwoHopFillAmount(quote: SwapQuote): BigNumber {
    const twoHopFillAmount = getTwoHopFillAmount(quote.type, quote.path.getOrdersByType().twoHopOrders);

    if (isBuyQuote(quote)) {
        return quote.makerTokenFillAmount.minus(twoHopFillAmount);
    }

    return quote.takerTokenFillAmount.minus(twoHopFillAmount);
}

function getTwoHopFillAmount(side: MarketOperation, twoHopOrders: readonly TwoHopOrder[]): BigNumber {
    // BigNumber.sum() is NaN...
    if (side === MarketOperation.Sell) {
        return BigNumber.sum(new BigNumber(0), ...twoHopOrders.map(({ firstHopOrder }) => firstHopOrder.takerAmount));
    }

    return BigNumber.sum(new BigNumber(0), ...twoHopOrders.map(({ secondHopOrder }) => secondHopOrder.makerAmount));
}
