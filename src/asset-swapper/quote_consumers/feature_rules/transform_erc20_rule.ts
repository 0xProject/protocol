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
import { AffiliateFeeType, CalldataInfo, ExchangeProxyContractOpts, SwapQuote } from '../../types';
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
        const { refundReceiver, affiliateFee, isFromETH, isToETH, shouldSellEntireBalance } = opts;

        const swapContext = this.getSwapContext(quote, opts);
        const { sellToken, buyToken, sellAmount, ethAmount, maxSlippage } = swapContext;
        let minBuyAmount = swapContext.minBuyAmount;

        const slippedOrders = quote.path.getSlippedOrders(maxSlippage);

        // Build up the transformations.
        const transformations = [] as ERC20Transformation[];
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

        // If it's two hop we have an intermediate token this is needed to encode the individual FQT
        // and we also want to ensure no dust amount is left in the flash wallet
        const intermediateToken = quote.path.hasTwoHop() ? slippedOrders[0].makerToken : NULL_ADDRESS;
        // This transformer will fill the quote.
        if (quote.path.hasTwoHop()) {
            const [firstHopOrder, secondHopOrder] = slippedOrders;
            transformations.push({
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
            transformations.push({
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
            transformations.push({
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
            transformations.push({
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
            transformations.push({
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
            if (sellTokenFeeAmount.isGreaterThan(0)) {
                throw new Error('Affiliate fees denominated in sell token are not yet supported');
            }
        } else if (feeType === AffiliateFeeType.GaslessFee && feeRecipient !== NULL_ADDRESS) {
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
            if (sellTokenFeeAmount.isGreaterThan(0)) {
                throw new Error('Affiliate fees denominated in sell token are not yet supported');
            }
        }

        // Return any unspent sell tokens.
        const payTakerTokens = [sellToken];
        // Return any unspent intermediate tokens for two-hop swaps.
        if (quote.path.hasTwoHop()) {
            payTakerTokens.push(intermediateToken);
        }
        // Return any unspent ETH. If ETH is the buy token, it will
        // be returned in TransformERC20Feature rather than PayTakerTransformer.
        if (!isToETH) {
            payTakerTokens.push(ETH_TOKEN_ADDRESS);
        }
        // The final transformer will send all funds to the taker.
        transformations.push({
            deploymentNonce: this.transformerNonces.payTakerTransformer,
            data: encodePayTakerTransformerData({
                tokens: payTakerTokens,
                amounts: [],
            }),
        });
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
}
