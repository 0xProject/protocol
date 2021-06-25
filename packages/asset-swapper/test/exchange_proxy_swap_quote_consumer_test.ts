import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { constants as contractConstants, getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import {
    decodeAffiliateFeeTransformerData,
    decodeFillQuoteTransformerData,
    decodePayTakerTransformerData,
    decodePositiveSlippageFeeTransformerData,
    decodeWethTransformerData,
    ETH_TOKEN_ADDRESS,
    FillQuoteTransformerLimitOrderInfo,
    FillQuoteTransformerOrderType,
    FillQuoteTransformerSide,
    getTransformerAddress,
    LimitOrderFields,
} from '@0x/protocol-utils';
import { AbiEncoder, BigNumber, hexUtils } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';

import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../src/constants';
import { ExchangeProxySwapQuoteConsumer } from '../src/quote_consumers/exchange_proxy_swap_quote_consumer';
import { AffiliateFeeType, MarketBuySwapQuote, MarketOperation, MarketSellSwapQuote } from '../src/types';
import {
    ERC20BridgeSource,
    OptimizedLimitOrder,
    OptimizedMarketOrder,
} from '../src/utils/market_operation_utils/types';

import { chaiSetup } from './utils/chai_setup';
import { getRandomAmount, getRandomSignature } from './utils/utils';

chaiSetup.configure();
const expect = chai.expect;

const { NULL_ADDRESS } = constants;
const { MAX_UINT256, ZERO_AMOUNT } = contractConstants;

// tslint:disable: custom-no-magic-numbers

describe('ExchangeProxySwapQuoteConsumer', () => {
    const CHAIN_ID = 1;
    const TAKER_TOKEN = randomAddress();
    const MAKER_TOKEN = randomAddress();
    const INTERMEDIATE_TOKEN = randomAddress();
    const TRANSFORMER_DEPLOYER = randomAddress();
    const contractAddresses = {
        ...getContractAddressesForChainOrThrow(CHAIN_ID),
        exchangeProxy: randomAddress(),
        exchangeProxyAllowanceTarget: randomAddress(),
        exchangeProxyTransformerDeployer: TRANSFORMER_DEPLOYER,
        transformers: {
            wethTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, 1),
            payTakerTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, 2),
            fillQuoteTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, 3),
            affiliateFeeTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, 4),
            positiveSlippageFeeTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, 5),
        },
    };
    let consumer: ExchangeProxySwapQuoteConsumer;

    before(async () => {
        consumer = new ExchangeProxySwapQuoteConsumer(contractAddresses, { chainId: CHAIN_ID });
    });

    function getRandomOrder(orderFields?: Partial<LimitOrderFields>): LimitOrderFields {
        return {
            chainId: CHAIN_ID,
            verifyingContract: contractAddresses.exchangeProxy,
            expiry: getRandomInteger(1, 2e9),
            feeRecipient: randomAddress(),
            sender: randomAddress(),
            pool: hexUtils.random(32),
            maker: randomAddress(),
            makerAmount: getRandomAmount(),
            takerAmount: getRandomAmount(),
            takerTokenFeeAmount: getRandomAmount(),
            salt: getRandomAmount(2e9),
            taker: NULL_ADDRESS,
            makerToken: MAKER_TOKEN,
            takerToken: TAKER_TOKEN,
            ...orderFields,
        };
    }

    function getRandomOptimizedMarketOrder(
        optimizerFields?: Partial<OptimizedLimitOrder>,
        orderFields?: Partial<LimitOrderFields>,
    ): OptimizedLimitOrder {
        const order = getRandomOrder(orderFields);
        return {
            source: ERC20BridgeSource.Native,
            fillData: {
                order,
                signature: getRandomSignature(),
                maxTakerTokenFillAmount: order.takerAmount,
            },
            type: FillQuoteTransformerOrderType.Limit,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            makerAmount: order.makerAmount,
            takerAmount: order.takerAmount,
            fills: [],
            ...optimizerFields,
            gasUsed: new BigNumber(1),
        };
    }

    function getRandomQuote(side: MarketOperation): MarketBuySwapQuote | MarketSellSwapQuote {
        const order = getRandomOptimizedMarketOrder();
        const makerTokenFillAmount = order.makerAmount;
        const takerTokenFillAmount = order.takerAmount;
        return {
            gasPrice: getRandomInteger(1, 1e9),
            makerToken: MAKER_TOKEN,
            takerToken: TAKER_TOKEN,
            orders: [order],
            makerTokenDecimals: 18,
            takerTokenDecimals: 18,
            sourceBreakdown: {} as any,
            isTwoHop: false,
            bestCaseQuoteInfo: {
                makerAmount: makerTokenFillAmount,
                takerAmount: takerTokenFillAmount,
                totalTakerAmount: takerTokenFillAmount,
                gas: Math.floor(Math.random() * 8e6),
                protocolFeeInWeiAmount: getRandomAmount(),
                feeTakerTokenAmount: getRandomAmount(),
            },
            worstCaseQuoteInfo: {
                makerAmount: makerTokenFillAmount,
                takerAmount: takerTokenFillAmount,
                totalTakerAmount: takerTokenFillAmount,
                gas: Math.floor(Math.random() * 8e6),
                protocolFeeInWeiAmount: getRandomAmount(),
                feeTakerTokenAmount: getRandomAmount(),
            },
            makerAmountPerEth: getRandomInteger(1, 1e9),
            takerAmountPerEth: getRandomInteger(1, 1e9),
            ...(side === MarketOperation.Buy
                ? { type: MarketOperation.Buy, makerTokenFillAmount }
                : { type: MarketOperation.Sell, takerTokenFillAmount }),
        };
    }

    function getRandomTwoHopQuote(side: MarketOperation): MarketBuySwapQuote | MarketSellSwapQuote {
        return {
            ...getRandomQuote(side),
            orders: [
                getRandomOptimizedMarketOrder({ makerToken: INTERMEDIATE_TOKEN }, { makerToken: INTERMEDIATE_TOKEN }),
                getRandomOptimizedMarketOrder({ takerToken: INTERMEDIATE_TOKEN }, { takerToken: INTERMEDIATE_TOKEN }),
            ],
            isTwoHop: true,
        } as any;
    }

    function getRandomSellQuote(): MarketSellSwapQuote {
        return getRandomQuote(MarketOperation.Sell) as MarketSellSwapQuote;
    }

    function getRandomBuyQuote(): MarketBuySwapQuote {
        return getRandomQuote(MarketOperation.Buy) as MarketBuySwapQuote;
    }

    type PlainOrder = Exclude<LimitOrderFields, ['chainId', 'exchangeAddress']>;

    function cleanOrders(orders: OptimizedMarketOrder[]): PlainOrder[] {
        return orders.map(
            o =>
                _.omit(
                    {
                        ...o.fillData,
                        order: _.omit((o.fillData as FillQuoteTransformerLimitOrderInfo).order, [
                            'chainId',
                            'verifyingContract',
                        ]) as any,
                    },
                    [
                        'fillableMakerAssetAmount',
                        'fillableTakerAssetAmount',
                        'fillableTakerFeeAmount',
                        'fills',
                        'chainId',
                        'verifyingContract',
                    ],
                ) as PlainOrder,
        );
    }

    const transformERC20Encoder = AbiEncoder.createMethod('transformERC20', [
        { type: 'address', name: 'inputToken' },
        { type: 'address', name: 'outputToken' },
        { type: 'uint256', name: 'inputTokenAmount' },
        { type: 'uint256', name: 'minOutputTokenAmount' },
        {
            type: 'tuple[]',
            name: 'transformations',
            components: [
                { type: 'uint32', name: 'deploymentNonce' },
                { type: 'bytes', name: 'data' },
            ],
        },
    ]);

    interface TransformERC20Args {
        inputToken: string;
        outputToken: string;
        inputTokenAmount: BigNumber;
        minOutputTokenAmount: BigNumber;
        transformations: Array<{
            deploymentNonce: BigNumber;
            data: string;
        }>;
    }

    // const liquidityProviderEncoder = AbiEncoder.createMethod('sellToLiquidityProvider', [
    //     { type: 'address', name: 'inputToken' },
    //     { type: 'address', name: 'outputToken' },
    //     { type: 'address', name: 'target' },
    //     { type: 'address', name: 'recipient' },
    //     { type: 'uint256', name: 'sellAmount' },
    //     { type: 'uint256', name: 'minBuyAmount' },
    //     { type: 'bytes', name: 'auxiliaryData' },
    // ]);

    // interface LiquidityProviderArgs {
    //     inputToken: string;
    //     outputToken: string;
    //     target: string;
    //     recipient: string;
    //     sellAmount: BigNumber;
    //     minBuyAmount: BigNumber;
    //     auxiliaryData: string;
    // }

    describe('getCalldataOrThrow()', () => {
        it('can produce a sell quote', async () => {
            const quote = getRandomSellQuote();
            const callInfo = await consumer.getCalldataOrThrowAsync(quote);
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(2);
            expect(
                callArgs.transformations[0].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.fillQuoteTransformer,
            );
            expect(
                callArgs.transformations[1].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.payTakerTransformer,
            );
            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(quote.takerTokenFillAmount);
            expect(fillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders(quote.orders));
            expect(fillQuoteTransformerData.limitOrders.map(o => o.signature)).to.deep.eq(
                (quote.orders as OptimizedLimitOrder[]).map(o => o.fillData.signature),
            );
            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, MAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('can produce a buy quote', async () => {
            const quote = getRandomBuyQuote();
            const callInfo = await consumer.getCalldataOrThrowAsync(quote);
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(2);
            expect(
                callArgs.transformations[0].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.fillQuoteTransformer,
            );
            expect(
                callArgs.transformations[1].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.payTakerTransformer,
            );
            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Buy);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(quote.makerTokenFillAmount);
            expect(fillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders(quote.orders));
            expect(fillQuoteTransformerData.limitOrders.map(o => o.signature)).to.deep.eq(
                (quote.orders as OptimizedLimitOrder[]).map(o => o.fillData.signature),
            );
            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, MAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('ERC20 -> ERC20 does not have a WETH transformer', async () => {
            const quote = getRandomSellQuote();
            const callInfo = await consumer.getCalldataOrThrowAsync(quote);
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            const nonces = callArgs.transformations.map(t => t.deploymentNonce);
            expect(nonces).to.not.include(consumer.transformerNonces.wethTransformer);
        });

        it('ETH -> ERC20 has a WETH transformer before the fill', async () => {
            const quote = getRandomSellQuote();
            const callInfo = await consumer.getCalldataOrThrowAsync(quote, {
                extensionContractOpts: { isFromETH: true },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[0].deploymentNonce.toNumber()).to.eq(
                consumer.transformerNonces.wethTransformer,
            );
            const wethTransformerData = decodeWethTransformerData(callArgs.transformations[0].data);
            expect(wethTransformerData.amount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(wethTransformerData.token).to.eq(ETH_TOKEN_ADDRESS);
        });

        it('ERC20 -> ETH has a WETH transformer after the fill', async () => {
            const quote = getRandomSellQuote();
            const callInfo = await consumer.getCalldataOrThrowAsync(quote, {
                extensionContractOpts: { isToETH: true },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(
                consumer.transformerNonces.wethTransformer,
            );
            const wethTransformerData = decodeWethTransformerData(callArgs.transformations[1].data);
            expect(wethTransformerData.amount).to.bignumber.eq(MAX_UINT256);
            expect(wethTransformerData.token).to.eq(contractAddresses.etherToken);
        });
        it('Appends an affiliate fee transformer after the fill if a buy token affiliate fee is provided', async () => {
            const quote = getRandomSellQuote();
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: getRandomAmount(),
                sellTokenFeeAmount: ZERO_AMOUNT,
                feeType: AffiliateFeeType.PercentageFee,
            };
            const callInfo = await consumer.getCalldataOrThrowAsync(quote, {
                extensionContractOpts: { affiliateFee },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(
                consumer.transformerNonces.affiliateFeeTransformer,
            );
            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal([
                { token: MAKER_TOKEN, amount: affiliateFee.buyTokenFeeAmount, recipient: affiliateFee.recipient },
            ]);
        });
        it('Appends a positive slippage affiliate fee transformer after the fill if the positive slippage fee feeType is specified', async () => {
            const quote = getRandomSellQuote();
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: ZERO_AMOUNT,
                sellTokenFeeAmount: ZERO_AMOUNT,
                feeType: AffiliateFeeType.PositiveSlippageFee,
            };
            const callInfo = await consumer.getCalldataOrThrowAsync(quote, {
                extensionContractOpts: { affiliateFee },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(
                consumer.transformerNonces.positiveSlippageFeeTransformer,
            );
            const positiveSlippageFeeTransformerData = decodePositiveSlippageFeeTransformerData(
                callArgs.transformations[1].data,
            );
            const bestCaseAmount = quote.bestCaseQuoteInfo.makerAmount.plus(
                POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS.multipliedBy(quote.gasPrice).multipliedBy(
                    quote.makerAmountPerEth,
                ),
            );
            expect(positiveSlippageFeeTransformerData).to.deep.equal({
                token: MAKER_TOKEN,
                bestCaseAmount,
                recipient: affiliateFee.recipient,
            });
        });
        it('Throws if a sell token affiliate fee is provided', async () => {
            const quote = getRandomSellQuote();
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: ZERO_AMOUNT,
                sellTokenFeeAmount: getRandomAmount(),
                feeType: AffiliateFeeType.PercentageFee,
            };
            expect(
                consumer.getCalldataOrThrowAsync(quote, {
                    extensionContractOpts: { affiliateFee },
                }),
            ).to.eventually.be.rejectedWith('Affiliate fees denominated in sell token are not yet supported');
        });
        it('Uses two `FillQuoteTransformer`s if given two-hop sell quote', async () => {
            const quote = getRandomTwoHopQuote(MarketOperation.Sell) as MarketSellSwapQuote;
            const callInfo = await consumer.getCalldataOrThrowAsync(quote, {
                extensionContractOpts: { isTwoHop: true },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(3);
            expect(
                callArgs.transformations[0].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.fillQuoteTransformer,
            );
            expect(
                callArgs.transformations[1].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.fillQuoteTransformer,
            );
            expect(
                callArgs.transformations[2].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.payTakerTransformer,
            );
            const [firstHopOrder, secondHopOrder] = quote.orders;
            const firstHopFillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(firstHopFillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(firstHopFillQuoteTransformerData.fillAmount).to.bignumber.eq(firstHopOrder.takerAmount);
            expect(firstHopFillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders([firstHopOrder]));
            expect(firstHopFillQuoteTransformerData.limitOrders.map(o => o.signature)).to.deep.eq([
                (firstHopOrder as OptimizedLimitOrder).fillData.signature,
            ]);
            expect(firstHopFillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(firstHopFillQuoteTransformerData.buyToken).to.eq(INTERMEDIATE_TOKEN);
            const secondHopFillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[1].data);
            expect(secondHopFillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(secondHopFillQuoteTransformerData.fillAmount).to.bignumber.eq(contractConstants.MAX_UINT256);
            expect(secondHopFillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders([secondHopOrder]));
            expect(secondHopFillQuoteTransformerData.limitOrders.map(o => o.signature)).to.deep.eq([
                (secondHopOrder as OptimizedLimitOrder).fillData.signature,
            ]);
            expect(secondHopFillQuoteTransformerData.sellToken).to.eq(INTERMEDIATE_TOKEN);
            expect(secondHopFillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[2].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([
                TAKER_TOKEN,
                MAKER_TOKEN,
                ETH_TOKEN_ADDRESS,
                INTERMEDIATE_TOKEN,
            ]);
        });
        // it.skip('Uses the `LiquidityProviderFeature` if given a single LiquidityProvider order', async () => {
        //     const quote = {
        //         ...getRandomSellQuote(),
        //         orders: [
        //             {
        //                 ...getRandomOrder(),
        //                 fills: [
        //                     {
        //                         source: ERC20BridgeSource.LiquidityProvider,
        //                         sourcePathId: '',
        //                         input: constants.ZERO_AMOUNT,
        //                         output: constants.ZERO_AMOUNT,
        //                         subFills: [],
        //                     },
        //                 ],
        //             },
        //         ],
        //     };
        //     const callInfo = await consumer.getCalldataOrThrowAsync(quote);
        //     const callArgs = liquidityProviderEncoder.decode(callInfo.calldataHexString) as LiquidityProviderArgs;
        //     expect(callArgs).to.deep.equal({
        //         inputToken: TAKER_TOKEN,
        //         outputToken: MAKER_TOKEN,
        //         target: quote.orders[0].makerAddress,
        //         recipient: constants.NULL_ADDRESS,
        //         sellAmount: quote.worstCaseQuoteInfo.feeTakerTokenAmount,
        //         minBuyAmount: getSwapMinBuyAmount(quote),
        //         auxiliaryData: constants.NULL_BYTES,
        //     });
        // });
        it('allows selling the entire balance for CFL', async () => {
            const quote = getRandomSellQuote();
            const callInfo = await consumer.getCalldataOrThrowAsync(quote, {
                extensionContractOpts: { shouldSellEntireBalance: true },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(MAX_UINT256);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(2);
            expect(
                callArgs.transformations[0].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.fillQuoteTransformer,
            );
            expect(
                callArgs.transformations[1].deploymentNonce.toNumber() ===
                    consumer.transformerNonces.payTakerTransformer,
            );
            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(MAX_UINT256);
            expect(fillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders(quote.orders));
            expect(fillQuoteTransformerData.limitOrders.map(o => o.signature)).to.deep.eq(
                (quote.orders as OptimizedLimitOrder[]).map(o => o.fillData.signature),
            );
            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, MAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });
    });
});
