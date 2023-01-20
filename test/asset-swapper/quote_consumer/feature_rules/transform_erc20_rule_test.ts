import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { constants as contractConstants, getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import {
    BridgeProtocol,
    decodeAffiliateFeeTransformerData,
    decodeFillQuoteTransformerData,
    decodePayTakerTransformerData,
    decodePositiveSlippageFeeTransformerData,
    decodeWethTransformerData,
    encodeBridgeSourceId,
    ETH_TOKEN_ADDRESS,
    FillQuoteTransformerLimitOrderInfo,
    FillQuoteTransformerOrderType,
    FillQuoteTransformerSide,
    getTransformerAddress,
    LimitOrderFields,
    ZERO,
} from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';

import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../../../../src/asset-swapper/constants';
import { TransformERC20Rule } from '../../../../src/asset-swapper/quote_consumers/feature_rules/transform_erc20_rule';
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
    IPath,
} from '../../../../src/asset-swapper/types';
import { decodeTransformERC20, getTransformerNonces } from '../../test_utils/decoders';
import {
    createSimpleBuySwapQuoteWithBridgeOrder,
    createSimpleSellSwapQuoteWithBridgeOrder,
    ONE_ETHER,
} from '../../test_utils/test_data';

import { chaiSetup } from '../../utils/chai_setup';
import { getRandomAmount, getRandomSignature } from '../../utils/utils';

chaiSetup.configure();
const expect = chai.expect;

const { NULL_ADDRESS } = constants;
const { MAX_UINT256, ZERO_AMOUNT } = contractConstants;

describe('TransformERC20Rule', () => {
    const CHAIN_ID = 1;
    const TAKER_TOKEN = randomAddress();
    const MAKER_TOKEN = randomAddress();
    const INTERMEDIATE_TOKEN = randomAddress();
    const TRANSFORMER_DEPLOYER = randomAddress();
    const NONCES = {
        wethTransformer: 1,
        payTakerTransformer: 2,
        fillQuoteTransformer: 3,
        affiliateFeeTransformer: 4,
        positiveSlippageFeeTransformer: 5,
    };
    const contractAddresses: ContractAddresses = {
        ...getContractAddressesForChainOrThrow(CHAIN_ID),
        exchangeProxy: randomAddress(),
        exchangeProxyTransformerDeployer: TRANSFORMER_DEPLOYER,
        transformers: {
            wethTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, NONCES.wethTransformer),
            payTakerTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, NONCES.payTakerTransformer),
            fillQuoteTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, NONCES.fillQuoteTransformer),
            affiliateFeeTransformer: getTransformerAddress(TRANSFORMER_DEPLOYER, NONCES.affiliateFeeTransformer),
            positiveSlippageFeeTransformer: getTransformerAddress(
                TRANSFORMER_DEPLOYER,
                NONCES.positiveSlippageFeeTransformer,
            ),
        },
    };

    const rule = TransformERC20Rule.create(CHAIN_ID, contractAddresses);

    // TODO: move away from random test data.
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
        const ordersByType = { nativeOrders: [order], twoHopOrders: [], bridgeOrders: [] };
        const makerTokenFillAmount = order.makerAmount;
        const takerTokenFillAmount = order.takerAmount;
        return {
            gasPrice: getRandomInteger(1, 1e9),
            makerToken: MAKER_TOKEN,
            takerToken: TAKER_TOKEN,
            path: {
                getOrders: () => [order],
                getOrdersByType: () => ordersByType,
                getSlippedOrders: () => [order],
                getSlippedOrdersByType: () => ordersByType,
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
        const ordersByType = {
            twoHopOrders: [{ firstHopOrder, secondHopOrder }],
            nativeOrders: [],
            bridgeOrders: [],
        };

        return {
            ...getRandomQuote(side),
            path: {
                getOrders: () => [firstHopOrder, secondHopOrder],
                getSlippedOrders: (_maxSlippage: number) => [firstHopOrder, secondHopOrder],
                getOrdersByType: () => ordersByType,
                getSlippedOrdersByType: () => ordersByType,
                hasTwoHop: () => true,
            } as IPath,
        };
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

    describe('createCalldata()', () => {
        const UNI_V2_SELL_QUOTE = createSimpleSellSwapQuoteWithBridgeOrder({
            source: ERC20BridgeSource.UniswapV2,
            takerToken: TAKER_TOKEN,
            makerToken: MAKER_TOKEN,
            takerAmount: ONE_ETHER,
            makerAmount: ONE_ETHER.times(2),
            slippage: 0,
        });

        it('can produce a sell calldata', () => {
            const callInfo = rule.createCalldata(
                UNI_V2_SELL_QUOTE,
                constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
            );

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(UNI_V2_SELL_QUOTE.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(UNI_V2_SELL_QUOTE.worstCaseQuoteInfo.makerAmount);

            expect(callArgs.transformations).to.be.length(2);
            expect(callArgs.transformations[0].deploymentNonce.toNumber()).to.be.eq(NONCES.fillQuoteTransformer);
            expect(callArgs.transformations[1].deploymentNonce.toNumber()).to.be.eq(NONCES.payTakerTransformer);

            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(UNI_V2_SELL_QUOTE.takerTokenFillAmount);
            expect(fillQuoteTransformerData.bridgeOrders).to.be.lengthOf(1);

            const bridgeOrder = fillQuoteTransformerData.bridgeOrders[0];
            expect(bridgeOrder.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2'));

            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);

            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('can produce a buy calldata', () => {
            const quote = createSimpleBuySwapQuoteWithBridgeOrder({
                source: ERC20BridgeSource.UniswapV2,
                takerToken: TAKER_TOKEN,
                makerToken: MAKER_TOKEN,
                takerAmount: ONE_ETHER,
                makerAmount: ONE_ETHER.times(2),
                slippage: 0,
            });

            const callInfo = rule.createCalldata(quote, constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS);

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.payTakerTransformer,
            ]);

            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Buy);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(quote.makerTokenFillAmount);

            const bridgeOrder = fillQuoteTransformerData.bridgeOrders[0];
            expect(bridgeOrder.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2'));

            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);

            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[1].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('ERC20 -> ERC20 does not have a WETH transformer', () => {
            const callInfo = rule.createCalldata(
                UNI_V2_SELL_QUOTE,
                constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
            );

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);

            const nonces = callArgs.transformations.map((t) => t.deploymentNonce.toNumber());
            expect(nonces).to.not.include(NONCES.wethTransformer);
        });

        it('ETH -> ERC20 has the correct ethAmount`', () => {
            const callInfo = rule.createCalldata(UNI_V2_SELL_QUOTE, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                isFromETH: true,
            });

            expect(callInfo.ethAmount).to.bignumber.eq(UNI_V2_SELL_QUOTE.takerTokenFillAmount);
        });

        it('ETH -> ERC20 has a WETH transformer before the fill', () => {
            const callInfo = rule.createCalldata(UNI_V2_SELL_QUOTE, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                isFromETH: true,
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.wethTransformer,
                NONCES.fillQuoteTransformer,
                NONCES.payTakerTransformer,
            ]);

            const wethTransformerData = decodeWethTransformerData(callArgs.transformations[0].data);
            expect(wethTransformerData.amount).to.bignumber.eq(UNI_V2_SELL_QUOTE.worstCaseQuoteInfo.totalTakerAmount);
            expect(wethTransformerData.token).to.eq(ETH_TOKEN_ADDRESS);
        });

        it('ERC20 -> ETH has a WETH transformer after the fill', () => {
            const callInfo = rule.createCalldata(UNI_V2_SELL_QUOTE, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                isToETH: true,
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.wethTransformer,
                NONCES.payTakerTransformer,
            ]);
            const wethTransformerData = decodeWethTransformerData(callArgs.transformations[1].data);
            expect(wethTransformerData.amount).to.bignumber.eq(MAX_UINT256);
            expect(wethTransformerData.token).to.eq(contractAddresses.etherToken);
        });

        it('Appends an affiliate fee transformer when buyTokenFeeAmount is provided (Gasless)', () => {
            const recipient = randomAddress();

            const callInfo = rule.createCalldata(
                UNI_V2_SELL_QUOTE,

                {
                    ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                    affiliateFee: {
                        recipient,
                        buyTokenFeeAmount: ONE_ETHER.times(0.01),
                        sellTokenFeeAmount: ZERO_AMOUNT,
                        feeType: AffiliateFeeType.PercentageFee,
                    },
                },
            );

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.affiliateFeeTransformer,
                NONCES.payTakerTransformer,
            ]);

            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal([
                { token: MAKER_TOKEN, amount: ONE_ETHER.times(0.01), recipient },
            ]);
        });

        it('Appends an affiliate fee transformer when buyTokenFeeAmount is provided (Gasless) ', () => {
            const recipient = randomAddress();
            const quote = { ...UNI_V2_SELL_QUOTE, takerAmountPerEth: new BigNumber(0.5) };

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                affiliateFee: {
                    recipient,
                    buyTokenFeeAmount: ONE_ETHER.times(0.01),
                    sellTokenFeeAmount: ZERO,
                    feeType: AffiliateFeeType.GaslessFee,
                },
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.affiliateFeeTransformer,
                NONCES.payTakerTransformer,
            ]);

            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal([
                { token: MAKER_TOKEN, amount: ONE_ETHER.times(0.01), recipient },
            ]);
        });

        it('Appends a positive slippage affiliate fee transformer after the fill if the positive slippage fee feeType is specified', () => {
            const gasPrice = 20_000_000_000;
            const makerAmountPerEth = new BigNumber(2);
            const quote = createSimpleSellSwapQuoteWithBridgeOrder({
                source: ERC20BridgeSource.UniswapV2,
                takerToken: TAKER_TOKEN,
                makerToken: MAKER_TOKEN,
                takerAmount: ONE_ETHER,
                makerAmount: ONE_ETHER.times(2),
                makerAmountPerEth,
                gasPrice,
                slippage: 0,
            });
            const recipient = randomAddress();

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                affiliateFee: {
                    recipient,
                    buyTokenFeeAmount: ZERO_AMOUNT,
                    sellTokenFeeAmount: ZERO_AMOUNT,
                    feeType: AffiliateFeeType.PositiveSlippageFee,
                },
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.positiveSlippageFeeTransformer,
                NONCES.payTakerTransformer,
            ]);

            const positiveSlippageFeeTransformerData = decodePositiveSlippageFeeTransformerData(
                callArgs.transformations[1].data,
            );

            const gasOverhead = POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS.multipliedBy(gasPrice).multipliedBy(
                quote.makerAmountPerEth,
            );
            expect(positiveSlippageFeeTransformerData).to.deep.equal({
                token: MAKER_TOKEN,
                bestCaseAmount: ONE_ETHER.times(2).plus(gasOverhead),
                recipient,
            });
        });

        it('Throws if a sell token affiliate fee is provided', () => {
            expect(() =>
                rule.createCalldata(UNI_V2_SELL_QUOTE, {
                    ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                    affiliateFee: {
                        recipient: randomAddress(),
                        buyTokenFeeAmount: ZERO_AMOUNT,
                        sellTokenFeeAmount: getRandomAmount(),
                        feeType: AffiliateFeeType.PercentageFee,
                    },
                }),
            ).to.throw('Affiliate fees denominated in sell token are not yet supported');
        });

        it('Uses two `FillQuoteTransformer`s if given two-hop sell quote', () => {
            // TODO(kyu-c): move away from random test data.
            const quote = getRandomTwoHopQuote(MarketOperation.Sell) as MarketSellSwapQuote;

            const callInfo = rule.createCalldata(quote, constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS);

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(quote.worstCaseQuoteInfo.makerAmount);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.fillQuoteTransformer,
                NONCES.payTakerTransformer,
            ]);

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

        it('Uses max amount for when shouldSellEntireBalance', () => {
            const quote = createSimpleSellSwapQuoteWithBridgeOrder({
                source: ERC20BridgeSource.UniswapV2,
                takerToken: TAKER_TOKEN,
                makerToken: MAKER_TOKEN,
                takerAmount: ONE_ETHER,
                makerAmount: ONE_ETHER.times(2),
                slippage: 0,
            });

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                shouldSellEntireBalance: true,
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(MAX_UINT256);

            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.payTakerTransformer,
            ]);

            const fillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(fillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(fillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(fillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            expect(fillQuoteTransformerData.fillAmount).to.bignumber.eq(MAX_UINT256);
        });
    });
});
