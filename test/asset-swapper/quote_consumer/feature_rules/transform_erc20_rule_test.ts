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
import { AffiliateFeeType, ERC20BridgeSource } from '../../../../src/asset-swapper/types';
import { decodeTransformERC20, getTransformerNonces } from '../../test_utils/decoders';
import {
    createSimpleBuySwapQuoteWithBridgeOrder,
    createSimpleSellSwapQuoteWithBridgeOrder,
    createTwoHopSellQuote,
    ONE_ETHER,
} from '../../test_utils/test_data';

import { chaiSetup } from '../../utils/chai_setup';
import { getRandomAmount } from '../../utils/utils';

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
