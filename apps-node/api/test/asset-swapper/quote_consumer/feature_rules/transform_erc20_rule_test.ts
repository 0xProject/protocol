import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { constants as contractConstants, randomAddress } from '@0x/contracts-test-utils';
import {
    BridgeProtocol,
    decodeAffiliateFeeTransformerData,
    decodeFillQuoteTransformerData,
    decodePayTakerTransformerData,
    decodePositiveSlippageFeeTransformerData,
    decodeWethTransformerData,
    encodeBridgeSourceId,
    ETH_TOKEN_ADDRESS,
    FillQuoteTransformerSide,
    getTransformerAddress,
    ZERO,
} from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import 'mocha';

import { constants, POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS } from '../../../../src/asset-swapper/constants';
import { TransformERC20Rule } from '../../../../src/asset-swapper/quote_consumers/feature_rules/transform_erc20_rule';
import { AffiliateFeeType, ERC20BridgeSource, MarketOperation } from '../../../../src/asset-swapper/types';
import { decodeTransformERC20, getTransformerNonces } from '../../test_utils/decoders';
import {
    createSimpleBuySwapQuoteWithBridgeOrder,
    createSimpleSellSwapQuoteWithBridgeOrder,
    createSwapQuote,
    createTwoHopSellQuote,
    ONE_ETHER,
} from '../../test_utils/test_data';

import { chaiSetup } from '../../utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

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

        it('Appends an affiliate fee transformer before the FQT if sell token fees are specified', () => {
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
            const integratorRecipient = randomAddress();
            const sellTokenFeeAmount = ONE_ETHER.times(0.01);

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                sellTokenAffiliateFees: [
                    {
                        recipient: integratorRecipient,
                        buyTokenFeeAmount: ZERO_AMOUNT,
                        sellTokenFeeAmount,
                        feeType: AffiliateFeeType.PercentageFee,
                    },
                ],
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputTokenAmount).to.deep.equal(ONE_ETHER);
            expect(getTransformerNonces(callArgs)).to.deep.eq(
                [NONCES.affiliateFeeTransformer, NONCES.fillQuoteTransformer, NONCES.payTakerTransformer],
                'Correct ordering of the transformers',
            );

            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[0].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal(
                [{ token: TAKER_TOKEN, amount: sellTokenFeeAmount, recipient: integratorRecipient }],
                'Affiliate Fee',
            );
        });

        it('Appends an affiliate fee transformer before the FQT if sell token fees are specified and adjusts `sellAmount` if metaTransactionVersion is v1', () => {
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
            const integratorRecipient = randomAddress();
            const zeroExRecipient = randomAddress();
            const integratorSellTokenFeeAmount = ONE_ETHER.times(0.01);
            const zeroExSellTokenFeeAmount = ONE_ETHER.times(0.04);

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                metaTransactionVersion: 'v1',
                sellTokenAffiliateFees: [
                    {
                        recipient: integratorRecipient,
                        buyTokenFeeAmount: ZERO_AMOUNT,
                        sellTokenFeeAmount: integratorSellTokenFeeAmount,
                        feeType: AffiliateFeeType.PercentageFee,
                    },
                    {
                        recipient: zeroExRecipient,
                        buyTokenFeeAmount: ZERO_AMOUNT,
                        sellTokenFeeAmount: zeroExSellTokenFeeAmount,
                        feeType: AffiliateFeeType.GaslessFee,
                    },
                ],
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputTokenAmount).to.deep.equal(
                ONE_ETHER.plus(integratorSellTokenFeeAmount).plus(zeroExSellTokenFeeAmount),
            );
            expect(getTransformerNonces(callArgs)).to.deep.equal(
                [NONCES.affiliateFeeTransformer, NONCES.fillQuoteTransformer, NONCES.payTakerTransformer],
                'Correct ordering of the transformers',
            );

            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[0].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal(
                [
                    {
                        token: TAKER_TOKEN,
                        amount: integratorSellTokenFeeAmount,
                        recipient: integratorRecipient,
                    },
                    {
                        token: TAKER_TOKEN,
                        amount: zeroExSellTokenFeeAmount,
                        recipient: zeroExRecipient,
                    },
                ],
                'Affiliate Fee',
            );
        });

        it('Appends an AffiliateFeeTransformer before the WETH transformer and FQT and prefers ETH_TOKEN fee if isFromETH when sell token fees are present', () => {
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
            const integratorRecipient = randomAddress();
            const sellTokenFeeAmount = ONE_ETHER.times(0.01);

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                sellTokenAffiliateFees: [
                    {
                        recipient: integratorRecipient,
                        buyTokenFeeAmount: ZERO_AMOUNT,
                        sellTokenFeeAmount,
                        feeType: AffiliateFeeType.PercentageFee,
                    },
                ],
                isFromETH: true,
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputTokenAmount).to.deep.equal(ONE_ETHER);
            expect(getTransformerNonces(callArgs)).to.deep.eq(
                [
                    NONCES.affiliateFeeTransformer,
                    NONCES.wethTransformer,
                    NONCES.fillQuoteTransformer,
                    NONCES.payTakerTransformer,
                ],
                'Correct ordering of the transformers',
            );

            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[0].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal(
                [{ token: ETH_TOKEN_ADDRESS, amount: sellTokenFeeAmount, recipient: integratorRecipient }],
                'Affiliate Fee',
            );
            const wethTransformerData = decodeWethTransformerData(callArgs.transformations[1].data);
            expect(wethTransformerData.amount).to.bignumber.eq(quote.worstCaseQuoteInfo.totalTakerAmount);
            expect(wethTransformerData.token).to.eq(ETH_TOKEN_ADDRESS);
        });

        it('Appends an affiliate fee transformer when buyTokenFeeAmount is provided (Gasless)', () => {
            const recipient = randomAddress();
            const buyTokenFeeAmount = ONE_ETHER.times(0.01);

            const callInfo = rule.createCalldata(
                UNI_V2_SELL_QUOTE,

                {
                    ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                    buyTokenAffiliateFees: [
                        {
                            recipient,
                            buyTokenFeeAmount,
                            sellTokenFeeAmount: ZERO_AMOUNT,
                            feeType: AffiliateFeeType.PercentageFee,
                        },
                    ],
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
                { token: MAKER_TOKEN, amount: buyTokenFeeAmount, recipient },
            ]);
        });

        it('Appends an affiliate fee transformer when buyTokenFeeAmount is provided (Gasless) ', () => {
            const recipient = randomAddress();
            const buyTokenFeeAmount = ONE_ETHER.times(0.01);
            const quote = { ...UNI_V2_SELL_QUOTE, takerAmountPerEth: new BigNumber(0.5) };

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                buyTokenAffiliateFees: [
                    {
                        recipient,
                        buyTokenFeeAmount,
                        sellTokenFeeAmount: ZERO,
                        feeType: AffiliateFeeType.GaslessFee,
                    },
                ],
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.affiliateFeeTransformer,
                NONCES.payTakerTransformer,
            ]);

            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal([
                { token: MAKER_TOKEN, amount: buyTokenFeeAmount, recipient },
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
                buyTokenAffiliateFees: [
                    {
                        recipient,
                        buyTokenFeeAmount: ZERO_AMOUNT,
                        sellTokenFeeAmount: ZERO_AMOUNT,
                        feeType: AffiliateFeeType.PositiveSlippageFee,
                    },
                ],
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

        it('Appends an affiliate fee and positive slippage fee transformer if both are specified', () => {
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
            const integratorRecipient = randomAddress();
            const zeroExRecipient = randomAddress();
            const buyTokenFeeAmount = ONE_ETHER.times(0.01);

            const callInfo = rule.createCalldata(quote, {
                ...constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS,
                buyTokenAffiliateFees: [
                    {
                        recipient: integratorRecipient,
                        buyTokenFeeAmount,
                        sellTokenFeeAmount: ZERO_AMOUNT,
                        feeType: AffiliateFeeType.PercentageFee,
                    },
                ],
                positiveSlippageFee: {
                    recipient: zeroExRecipient,
                    buyTokenFeeAmount: ZERO_AMOUNT,
                    sellTokenFeeAmount: ZERO_AMOUNT,
                    feeType: AffiliateFeeType.PositiveSlippageFee,
                },
            });

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(getTransformerNonces(callArgs)).to.deep.eq(
                [
                    NONCES.fillQuoteTransformer,
                    NONCES.affiliateFeeTransformer,
                    NONCES.positiveSlippageFeeTransformer,
                    NONCES.payTakerTransformer,
                ],
                'Correct ordering of the transformers',
            );

            const positiveSlippageFeeTransformerData = decodePositiveSlippageFeeTransformerData(
                callArgs.transformations[2].data,
            );

            const gasOverhead = POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS.multipliedBy(gasPrice).multipliedBy(
                quote.makerAmountPerEth,
            );
            const affiliateFeeTransformerData = decodeAffiliateFeeTransformerData(callArgs.transformations[1].data);
            expect(affiliateFeeTransformerData.fees).to.deep.equal(
                [{ token: MAKER_TOKEN, amount: buyTokenFeeAmount, recipient: integratorRecipient }],
                'Affiliate Fee',
            );

            expect(positiveSlippageFeeTransformerData).to.deep.equal(
                {
                    token: MAKER_TOKEN,
                    bestCaseAmount: ONE_ETHER.times(2).plus(gasOverhead),
                    recipient: zeroExRecipient,
                },
                'Positive Slippage Fee',
            );
        });

        it('Uses two `FillQuoteTransformer`s when given a two-hop sell quote', () => {
            const quote = createTwoHopSellQuote({
                takerToken: TAKER_TOKEN,
                intermediateToken: INTERMEDIATE_TOKEN,
                makerToken: MAKER_TOKEN,
                firstHopSource: ERC20BridgeSource.UniswapV2,
                secondHopSource: ERC20BridgeSource.SushiSwap,
                takerAmount: ONE_ETHER,
                makerAmount: ONE_ETHER.times(2),
            });

            const callInfo = rule.createCalldata(quote, constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS);

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(ONE_ETHER);
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(ONE_ETHER.times(2));
            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer,
                NONCES.fillQuoteTransformer,
                NONCES.payTakerTransformer,
            ]);

            const firstHopFillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(firstHopFillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(firstHopFillQuoteTransformerData.sellToken).to.eq(TAKER_TOKEN);
            expect(firstHopFillQuoteTransformerData.buyToken).to.eq(INTERMEDIATE_TOKEN);
            expect(firstHopFillQuoteTransformerData.fillAmount).to.bignumber.eq(ONE_ETHER);
            expect(firstHopFillQuoteTransformerData.bridgeOrders).to.be.lengthOf(1);

            const firstHopOrder = firstHopFillQuoteTransformerData.bridgeOrders[0];
            expect(firstHopOrder.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2'));

            const secondHopFillQuoteTransformerData = decodeFillQuoteTransformerData(callArgs.transformations[1].data);
            expect(secondHopFillQuoteTransformerData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(secondHopFillQuoteTransformerData.sellToken).to.eq(INTERMEDIATE_TOKEN);
            expect(secondHopFillQuoteTransformerData.buyToken).to.eq(MAKER_TOKEN);
            expect(secondHopFillQuoteTransformerData.fillAmount).to.bignumber.eq(MAX_UINT256);
            expect(secondHopFillQuoteTransformerData.bridgeOrders).to.be.lengthOf(1);

            const secondHopOrder = secondHopFillQuoteTransformerData.bridgeOrders[0];
            expect(secondHopOrder.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SushiSwap'));

            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[2].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, INTERMEDIATE_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('Returns calldata for a quote with a mix of single hop order and a two hop order', () => {
            // 70% single-hop and 3o% two-hop
            const quote = createSwapQuote({
                side: MarketOperation.Sell,
                takerToken: TAKER_TOKEN,
                makerToken: MAKER_TOKEN,
                takerAmount: ONE_ETHER.times(100),
                makerAmount: ONE_ETHER.times(200),
                createPathParams: {
                    bridgeOrderParams: [
                        {
                            takerToken: TAKER_TOKEN,
                            makerToken: MAKER_TOKEN,
                            source: ERC20BridgeSource.UniswapV2,
                            takerAmount: ONE_ETHER.times(70),
                            makerAmount: ONE_ETHER.times(140),
                        },
                    ],
                    twoHopOrderParams: [
                        {
                            takerToken: TAKER_TOKEN,
                            intermediateToken: INTERMEDIATE_TOKEN,
                            makerToken: MAKER_TOKEN,
                            takerAmount: ONE_ETHER.times(30),
                            makerAmount: ONE_ETHER.times(60),
                            firstHopSource: ERC20BridgeSource.UniswapV2,
                            secondHopSource: ERC20BridgeSource.SushiSwap,
                        },
                    ],
                },
            });

            const callInfo = rule.createCalldata(quote, constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS);

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(ONE_ETHER.times(100));
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(ONE_ETHER.times(200));

            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer, // two-hop
                NONCES.fillQuoteTransformer, // two-hop
                NONCES.fillQuoteTransformer, // single-hop
                NONCES.payTakerTransformer,
            ]);

            const firstHopFqtData = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(firstHopFqtData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(firstHopFqtData.sellToken).to.eq(TAKER_TOKEN);
            expect(firstHopFqtData.buyToken).to.eq(INTERMEDIATE_TOKEN);
            expect(firstHopFqtData.fillAmount).to.bignumber.eq(ONE_ETHER.times(30));
            expect(firstHopFqtData.bridgeOrders).to.be.lengthOf(1);
            const firstHopOrder = firstHopFqtData.bridgeOrders[0];
            expect(firstHopOrder.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2'));

            const secondHopFqtData = decodeFillQuoteTransformerData(callArgs.transformations[1].data);
            expect(secondHopFqtData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(secondHopFqtData.sellToken).to.eq(INTERMEDIATE_TOKEN);
            expect(secondHopFqtData.buyToken).to.eq(MAKER_TOKEN);
            expect(secondHopFqtData.fillAmount).to.bignumber.eq(MAX_UINT256);
            expect(secondHopFqtData.bridgeOrders).to.be.lengthOf(1);
            const secondHopOrder = secondHopFqtData.bridgeOrders[0];
            expect(secondHopOrder.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SushiSwap'));

            const singeHopFqtData = decodeFillQuoteTransformerData(callArgs.transformations[2].data);
            expect(singeHopFqtData.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(singeHopFqtData.fillAmount).to.bignumber.eq(ONE_ETHER.times(70));
            expect(singeHopFqtData.bridgeOrders).to.be.lengthOf(1);
            const bridgeOrder = singeHopFqtData.bridgeOrders[0];
            expect(bridgeOrder.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2'));

            expect(singeHopFqtData.sellToken).to.eq(TAKER_TOKEN);
            expect(singeHopFqtData.buyToken).to.eq(MAKER_TOKEN);

            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[3].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([TAKER_TOKEN, INTERMEDIATE_TOKEN, ETH_TOKEN_ADDRESS]);
        });

        it('Returns calldata for a quote with two two-hop orders', () => {
            const INTERMEDIATE_TOKEN_A = randomAddress();
            const INTERMEDIATE_TOKEN_B = randomAddress();

            // 60% two-hop A, 4o% two-hop B
            const quote = createSwapQuote({
                side: MarketOperation.Sell,
                takerToken: TAKER_TOKEN,
                makerToken: MAKER_TOKEN,
                takerAmount: ONE_ETHER.times(100),
                makerAmount: ONE_ETHER.times(200),
                createPathParams: {
                    twoHopOrderParams: [
                        {
                            takerToken: TAKER_TOKEN,
                            intermediateToken: INTERMEDIATE_TOKEN_A,
                            makerToken: MAKER_TOKEN,
                            takerAmount: ONE_ETHER.times(60),
                            makerAmount: ONE_ETHER.times(120),
                            firstHopSource: ERC20BridgeSource.UniswapV2,
                            secondHopSource: ERC20BridgeSource.SushiSwap,
                        },
                        {
                            takerToken: TAKER_TOKEN,
                            intermediateToken: INTERMEDIATE_TOKEN_B,
                            makerToken: MAKER_TOKEN,
                            takerAmount: ONE_ETHER.times(40),
                            makerAmount: ONE_ETHER.times(80),
                            firstHopSource: ERC20BridgeSource.Dodo,
                            secondHopSource: ERC20BridgeSource.SushiSwap,
                        },
                    ],
                },
            });

            const callInfo = rule.createCalldata(quote, constants.DEFAULT_EXCHANGE_PROXY_EXTENSION_CONTRACT_OPTS);

            const callArgs = decodeTransformERC20(callInfo.calldataHexString);
            expect(callArgs.inputToken).to.eq(TAKER_TOKEN);
            expect(callArgs.outputToken).to.eq(MAKER_TOKEN);
            expect(callArgs.inputTokenAmount).to.bignumber.eq(ONE_ETHER.times(100));
            expect(callArgs.minOutputTokenAmount).to.bignumber.eq(ONE_ETHER.times(200));

            expect(getTransformerNonces(callArgs)).to.deep.eq([
                NONCES.fillQuoteTransformer, // two-hop A
                NONCES.fillQuoteTransformer, // two-hop A
                NONCES.fillQuoteTransformer, // two-hop B
                NONCES.fillQuoteTransformer, // two-hop B
                NONCES.payTakerTransformer,
            ]);

            // Two-Hop A
            const firstHopFqtDataA = decodeFillQuoteTransformerData(callArgs.transformations[0].data);
            expect(firstHopFqtDataA.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(firstHopFqtDataA.sellToken).to.eq(TAKER_TOKEN);
            expect(firstHopFqtDataA.buyToken).to.eq(INTERMEDIATE_TOKEN_A);
            expect(firstHopFqtDataA.fillAmount).to.bignumber.eq(ONE_ETHER.times(60));
            expect(firstHopFqtDataA.bridgeOrders).to.be.lengthOf(1);
            const firstHopOrderA = firstHopFqtDataA.bridgeOrders[0];
            expect(firstHopOrderA.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'UniswapV2'));

            const secondHopFqtDataA = decodeFillQuoteTransformerData(callArgs.transformations[1].data);
            expect(secondHopFqtDataA.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(secondHopFqtDataA.sellToken).to.eq(INTERMEDIATE_TOKEN_A);
            expect(secondHopFqtDataA.buyToken).to.eq(MAKER_TOKEN);
            expect(secondHopFqtDataA.fillAmount).to.bignumber.eq(MAX_UINT256);
            expect(secondHopFqtDataA.bridgeOrders).to.be.lengthOf(1);
            const secondHopOrderA = secondHopFqtDataA.bridgeOrders[0];
            expect(secondHopOrderA.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SushiSwap'));

            // Two-Hop B
            const firstHopFqtDataB = decodeFillQuoteTransformerData(callArgs.transformations[2].data);
            expect(firstHopFqtDataB.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(firstHopFqtDataB.sellToken).to.eq(TAKER_TOKEN);
            expect(firstHopFqtDataB.buyToken).to.eq(INTERMEDIATE_TOKEN_B);
            expect(firstHopFqtDataB.fillAmount).to.bignumber.eq(ONE_ETHER.times(40));
            expect(firstHopFqtDataB.bridgeOrders).to.be.lengthOf(1);
            const firstHopOrderB = firstHopFqtDataB.bridgeOrders[0];
            expect(firstHopOrderB.source).to.eq(encodeBridgeSourceId(BridgeProtocol.Dodo, 'Dodo'));

            const secondHopFqtDataB = decodeFillQuoteTransformerData(callArgs.transformations[3].data);
            expect(secondHopFqtDataB.side).to.eq(FillQuoteTransformerSide.Sell);
            expect(secondHopFqtDataB.sellToken).to.eq(INTERMEDIATE_TOKEN_B);
            expect(secondHopFqtDataB.buyToken).to.eq(MAKER_TOKEN);
            expect(secondHopFqtDataB.fillAmount).to.bignumber.eq(MAX_UINT256);
            expect(secondHopFqtDataB.bridgeOrders).to.be.lengthOf(1);
            const secondHopOrderB = secondHopFqtDataB.bridgeOrders[0];
            expect(secondHopOrderB.source).to.eq(encodeBridgeSourceId(BridgeProtocol.UniswapV2, 'SushiSwap'));

            const payTakerTransformerData = decodePayTakerTransformerData(callArgs.transformations[4].data);
            expect(payTakerTransformerData.amounts).to.deep.eq([]);
            expect(payTakerTransformerData.tokens).to.deep.eq([
                TAKER_TOKEN,
                INTERMEDIATE_TOKEN_A,
                INTERMEDIATE_TOKEN_B,
                ETH_TOKEN_ADDRESS,
            ]);
        });

        it('Uses max amount for when shouldSellEntireBalance is true (single hop)', () => {
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
