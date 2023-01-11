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
    ZERO,
} from '@0x/protocol-utils';
import { AbiEncoder, BigNumber, hexUtils } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';

import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../../src/asset-swapper/constants';
import { ExchangeProxySwapQuoteConsumer } from '../../src/asset-swapper/quote_consumers/exchange_proxy_swap_quote_consumer';
import {
    AffiliateFeeType,
    MarketBuySwapQuote,
    MarketOperation,
    MarketSellSwapQuote,
    ERC20BridgeSource,
    Fill,
    NativeFillData,
    OptimizedLimitOrder,
    OptimizedOrder,
} from '../../src/asset-swapper/types';
import { Path } from '../../src/asset-swapper/utils/market_operation_utils/path';

import { chaiSetup } from './utils/chai_setup';
import { getRandomAmount, getRandomSignature } from './utils/utils';

chaiSetup.configure();
const expect = chai.expect;

const { NULL_ADDRESS } = constants;
const { MAX_UINT256, ZERO_AMOUNT } = contractConstants;

describe('ExchangeProxySwapQuoteConsumer', () => {
    const CHAIN_ID = 1;
    const TAKER_TOKEN = randomAddress();
    const MAKER_TOKEN = randomAddress();
    const INTERMEDIATE_TOKEN = randomAddress();
    const TRANSFORMER_DEPLOYER = randomAddress();
    const TRANSFORMER_NONCES = {
        wethTransformer: 1,
        payTakerTransformer: 2,
        fillQuoteTransformer: 3,
        affiliateFeeTransformer: 4,
        positiveSlippageFeeTransformer: 5,
    };
    const contractAddresses = {
        ...getContractAddressesForChainOrThrow(CHAIN_ID),
        exchangeProxy: randomAddress(),
        exchangeProxyAllowanceTarget: randomAddress(),
        exchangeProxyTransformerDeployer: TRANSFORMER_DEPLOYER,
        transformers: {
            wethTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, TRANSFORMER_NONCES.wethTransformer),
            payTakerTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, TRANSFORMER_NONCES.payTakerTransformer),
            fillQuoteTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, TRANSFORMER_NONCES.fillQuoteTransformer),
            affiliateFeeTransformer: getTransformerAddress(
                TRANSFORMER_DEPLOYER,
                TRANSFORMER_NONCES.affiliateFeeTransformer,
            ),
            positiveSlippageFeeTransformer: getTransformerAddress(
                TRANSFORMER_DEPLOYER,
                TRANSFORMER_NONCES.positiveSlippageFeeTransformer,
            ),
        },
    };
    let consumer: ExchangeProxySwapQuoteConsumer;

    before(() => {
        consumer = new ExchangeProxySwapQuoteConsumer(CHAIN_ID, contractAddresses);
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
            fill: {} as Fill<NativeFillData>,
            ...optimizerFields,
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
            path: {
                getOrdersByType: () => ({ nativeOrders: [order], twoHopOrders: [], bridgeOrders: [] }),
                getOrders: () => [order],
                getSlippedOrders: (_maxSlippage: number) => [order],
                hasTwoHop: () => false,
            },
            makerTokenDecimals: 18,
            takerTokenDecimals: 18,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
            sourceBreakdown: {} as any,
            bestCaseQuoteInfo: {
                makerAmount: makerTokenFillAmount,
                takerAmount: takerTokenFillAmount,
                totalTakerAmount: takerTokenFillAmount,
                gas: Math.floor(Math.random() * 8e6),
                protocolFeeInWeiAmount: getRandomAmount(),
                slippage: 0,
            },
            worstCaseQuoteInfo: {
                makerAmount: makerTokenFillAmount,
                takerAmount: takerTokenFillAmount,
                totalTakerAmount: takerTokenFillAmount,
                gas: Math.floor(Math.random() * 8e6),
                protocolFeeInWeiAmount: getRandomAmount(),
                slippage: 0,
            },
            makerAmountPerEth: getRandomInteger(1, 1e9),
            takerAmountPerEth: getRandomInteger(1, 1e9),
            ...(side === MarketOperation.Buy
                ? { type: MarketOperation.Buy, makerTokenFillAmount }
                : { type: MarketOperation.Sell, takerTokenFillAmount }),
            blockNumber: 1337420,
        };
    }

    function getRandomTwoHopQuote(side: MarketOperation): MarketBuySwapQuote | MarketSellSwapQuote {
        const firstHopOrder = getRandomOptimizedMarketOrder(
            { makerToken: INTERMEDIATE_TOKEN },
            { makerToken: INTERMEDIATE_TOKEN },
        );
        const secondHopOrder = getRandomOptimizedMarketOrder(
            { takerToken: INTERMEDIATE_TOKEN },
            { takerToken: INTERMEDIATE_TOKEN },
        );
        return {
            ...getRandomQuote(side),
            path: {
                getOrders: () => [firstHopOrder, secondHopOrder],
                getSlippedOrders: (_maxSlippage: number) => [firstHopOrder, secondHopOrder],
                hasTwoHop: () => true,
            } as unknown as Path,

            isTwoHop: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
        } as any;
    }

    function getRandomSellQuote(): MarketSellSwapQuote {
        return getRandomQuote(MarketOperation.Sell) as MarketSellSwapQuote;
    }

    function getRandomBuyQuote(): MarketBuySwapQuote {
        return getRandomQuote(MarketOperation.Buy) as MarketBuySwapQuote;
    }

    type PlainOrder = Exclude<LimitOrderFields, ['chainId', 'exchangeAddress']>;

    function cleanOrders(orders: readonly OptimizedOrder[]): PlainOrder[] {
        return orders.map(
            (o) =>
                _.omit(
                    {
                        ...o.fillData,
                        order: _.omit((o.fillData as FillQuoteTransformerLimitOrderInfo).order, [
                            'chainId',
                            'verifyingContract',
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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
        transformations: {
            deploymentNonce: BigNumber;
            data: string;
        }[];
    }

    describe('getCalldataOrThrow()', () => {
        it('can produce a sell quote', () => {
            const quote = getRandomSellQuote();
            const callInfo = consumer.getCalldataOrThrow(quote);
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(2);
            expect(callArgs.transformations[0].deploymentNonce.toNumber()).to.be.eq(3);
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.be.eq(2);
            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(quote.takerTokenFillAmount);
            expect(fillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders(quote.path.getOrders()));
            expect(fillQuoteTransformerData.limitOrders.map((o) => o.signature)).to.deep.eq(
                (quote.path.getOrders() as OptimizedLimitOrder[]).map((o) => o.fillData.signature),
            );
            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('can produce a buy quote', () => {
            const quote = getRandomBuyQuote();
            const callInfo = consumer.getCalldataOrThrow(quote);
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(2);
            expect(callArgs.transformations[0].deploymentNonce.toNumber()).to.be.eq(
                TRANSFORMER_NONCES.fillQuoteTransformer,
            );
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.be.eq(
                TRANSFORMER_NONCES.payTakerTransformer,
            );
            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Buy);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(quote.makerTokenFillAmount);
            expect(fillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders(quote.path.getOrders()));
            expect(fillQuoteTransformerData.limitOrders.map((o) => o.signature)).to.deep.eq(
                (quote.path.getOrders() as OptimizedLimitOrder[]).map((o) => o.fillData.signature),
            );
            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('ERC20 -> ERC20 does not have a WETH transformer', () => {
            const quote = getRandomSellQuote();
            const callInfo = consumer.getCalldataOrThrow(quote);
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            const nonces = callArgs.transformations.map((t) => t.deploymentNonce);
            expect(nonces).to.not.include(TRANSFORMER_NONCES.wethTransformer);
        });

        it('ETH -> ERC20 has a WETH transformer before the fill', () => {
            const quote = getRandomSellQuote();
            const callInfo = consumer.getCalldataOrThrow(quote, {
                extensionContractOpts: { isFromETH: true },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[0].deploymentNonce.toNumber()).to.eq(TRANSFORMER_NONCES.wethTransformer);
            const wethTransformerData = decodeWethTransformerData(callArgs.transformations[0].data);
            expect(wethTransformerData.amount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(wethTransformerData.token).to.eq(ETH_TOKEN_ADDRESS);
        });

        it('ERC20 -> ETH has a WETH transformer after the fill', () => {
            const quote = getRandomSellQuote();
            const callInfo = consumer.getCalldataOrThrow(quote, {
                extensionContractOpts: { isToETH: true },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(TRANSFORMER_NONCES.wethTransformer);
            const wethTransformerData = decodeWethTransformerData(callArgs.transformations[1].data);
            expect(wethTransformerData.amount).to.bignumber.eq(MAX_UINT256);
            expect(wethTransformerData.token).to.eq(contractAddresses.etherToken);
        });
        it('Appends an affiliate fee transformer after the fill if a buy token affiliate fee is provided', () => {
            const quote = getRandomSellQuote();
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: getRandomAmount(),
                sellTokenFeeAmount: ZERO_AMOUNT,
                feeType: AffiliateFeeType.PercentageFee,
            };
            const callInfo = consumer.getCalldataOrThrow(quote, {
                extensionContractOpts: { affiliateFee },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(
                TRANSFORMER_NONCES.affiliateFeeTransformer,
            );
            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal([
                { token: MAKER_TOKEN, amount: affiliateFee.buyTokenFeeAmount, recipient: affiliateFee.recipient },
            ]);
        });
        it('Appends an affiliate fee transformer if conversion to native token is known', () => {
            const quote = getRandomSellQuote();
            quote.takerAmountPerEth = new BigNumber(0.5);
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: getRandomAmount(),
                sellTokenFeeAmount: ZERO,
                feeType: AffiliateFeeType.GaslessFee,
            };
            const callInfo = consumer.getCalldataOrThrow(quote, {
                extensionContractOpts: { affiliateFee },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(
                TRANSFORMER_NONCES.affiliateFeeTransformer,
            );
            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal([
                { token: MAKER_TOKEN, amount: affiliateFee.buyTokenFeeAmount, recipient: affiliateFee.recipient },
            ]);
        });
        it('Appends an affiliate fee transformer if conversion to native token is unknown of 0.1%', () => {
            const quote = getRandomSellQuote();
            quote.takerAmountPerEth = new BigNumber(0);
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: getRandomAmount(),
                sellTokenFeeAmount: ZERO,
                feeType: AffiliateFeeType.GaslessFee,
            };
            const callInfo = consumer.getCalldataOrThrow(quote, {
                extensionContractOpts: { affiliateFee },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(
                TRANSFORMER_NONCES.affiliateFeeTransformer,
            );
            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal([
                { token: MAKER_TOKEN, amount: affiliateFee.buyTokenFeeAmount, recipient: affiliateFee.recipient },
            ]);
        });
        it('Appends a positive slippage affiliate fee transformer after the fill if the positive slippage fee feeType is specified', () => {
            const quote = getRandomSellQuote();
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: ZERO_AMOUNT,
                sellTokenFeeAmount: ZERO_AMOUNT,
                feeType: AffiliateFeeType.PositiveSlippageFee,
            };
            const callInfo = consumer.getCalldataOrThrow(quote, {
                extensionContractOpts: { affiliateFee },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.eq(
                TRANSFORMER_NONCES.positiveSlippageFeeTransformer,
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
        it('Throws if a sell token affiliate fee is provided', () => {
            const quote = getRandomSellQuote();
            const affiliateFee = {
                recipient: randomAddress(),
                buyTokenFeeAmount: ZERO_AMOUNT,
                sellTokenFeeAmount: getRandomAmount(),
                feeType: AffiliateFeeType.PercentageFee,
            };
            expect(() =>
                consumer.getCalldataOrThrow(quote, {
                    extensionContractOpts: { affiliateFee },
                }),
            ).to.throw('Affiliate fees denominated in sell token are not yet supported');
        });
        it('Uses two `FillQuoteTransformer`s if given two-hop sell quote', () => {
            const quote = getRandomTwoHopQuote(MarketOperation.Sell) as MarketSellSwapQuote;
            const callInfo = consumer.getCalldataOrThrow(quote);
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(3);
            expect(callArgs.transformations[0].deploymentNonce.toNumber() === TRANSFORMER_NONCES.fillQuoteTransformer);
            expect(callArgs.transformations[1].deploymentNonce.toNumber() === TRANSFORMER_NONCES.fillQuoteTransformer);
            expect(callArgs.transformations[2].deploymentNonce.toNumber() === TRANSFORMER_NONCES.payTakerTransformer);
            const [firstHopOrder, secondHopOrder] = quote.path.getOrders();
            const firstHopFillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(firstHopFillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(firstHopFillQuoteTransformerData.fillAmount).to.bignumber.eq(firstHopOrder.takerAmount);
            expect(firstHopFillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders([firstHopOrder]));
            expect(firstHopFillQuoteTransformerData.limitOrders.map((o) => o.signature)).to.deep.eq([
                (firstHopOrder as OptimizedLimitOrder).fillData.signature,
            ]);
            expect(firstHopFillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(firstHopFillQuoteTransformerData.buyToken).to.eq(INTERMEDIATE_TOKEN);
            const secondHopFillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[1].data);
            expect(secondHopFillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(secondHopFillQuoteTransformerData.fillAmount).to.bignumber.eq(contractConstants.MAX_UINT256);
            expect(secondHopFillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders([secondHopOrder]));
            expect(secondHopFillQuoteTransformerData.limitOrders.map((o) => o.signature)).to.deep.eq([
                (secondHopOrder as OptimizedLimitOrder).fillData.signature,
            ]);
            expect(secondHopFillQuoteTransformerData.sellToken).to.eq(INTERMEDIATE_TOKEN);
            expect(secondHopFillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[2].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, INTERMEDIATE_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('allows selling the entire balance for CFL', () => {
            const quote = getRandomSellQuote();
            const callInfo = consumer.getCalldataOrThrow(quote, {
                extensionContractOpts: { shouldSellEntireBalance: true },
            });
            const callArgs = transformERC20Encoder.decode(callInfo.calldataHexString) as TransformERC20Args;
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(MAX_UINT256);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(callArgs.transformations).to.be.length(2);
            expect(callArgs.transformations[0].deploymentNonce.toNumber()).to.be.eq(
                TRANSFORMER_NONCES.fillQuoteTransformer,
            );
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.be.eq(
                TRANSFORMER_NONCES.payTakerTransformer,
            );
            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(MAX_UINT256);
            expect(fillQuoteTransformerData.limitOrders).to.deep.eq(cleanOrders(quote.path.getOrders()));
            expect(fillQuoteTransformerData.limitOrders.map((o) => o.signature)).to.deep.eq(
                (quote.path.getOrders() as OptimizedLimitOrder[]).map((o) => o.fillData.signature),
            );
            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });
    });
});
