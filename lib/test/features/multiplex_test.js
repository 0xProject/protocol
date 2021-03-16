"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_erc20_1 = require("@0x/contracts-erc20");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const protocol_utils_1 = require("@0x/protocol-utils");
const utils_1 = require("@0x/utils");
const _ = require("lodash");
const artifacts_1 = require("../artifacts");
const abis_1 = require("../utils/abis");
const orders_1 = require("../utils/orders");
const wrappers_1 = require("../wrappers");
const HIGH_BIT = new utils_1.BigNumber(2).pow(255);
function encodeFractionalFillAmount(frac) {
    return HIGH_BIT.plus(new utils_1.BigNumber(frac).times('1e18').integerValue());
}
const EP_GOVERNOR = '0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e';
const DAI_WALLET = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';
const WETH_WALLET = '0x1e0447b19bb6ecfdae1e4ae1694b0c3659614e4e';
const USDC_WALLET = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';
contracts_test_utils_1.blockchainTests.configure({
    fork: {
        unlockedAccounts: [EP_GOVERNOR, DAI_WALLET, WETH_WALLET, USDC_WALLET],
    },
});
contracts_test_utils_1.blockchainTests.fork.skip('Multiplex feature', env => {
    const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const dai = new contracts_erc20_1.ERC20TokenContract(DAI_ADDRESS, env.provider, env.txDefaults);
    const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const weth = new contracts_erc20_1.WETH9Contract(WETH_ADDRESS, env.provider, env.txDefaults);
    const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const usdt = new contracts_erc20_1.ERC20TokenContract(USDT_ADDRESS, env.provider, env.txDefaults);
    const LON_ADDRESS = '0x0000000000095413afc295d19edeb1ad7b71c952';
    const PLP_SANDBOX_ADDRESS = '0x407b4128e9ecad8769b2332312a9f655cb9f5f3a';
    const WETH_DAI_PLP_ADDRESS = '0x1db681925786441ba82adefac7bf492089665ca0';
    const WETH_USDC_PLP_ADDRESS = '0x8463c03c0c57ff19fa8b431e0d3a34e2df89888e';
    const USDC_USDT_PLP_ADDRESS = '0xc340ef96449514cea4dfa11d847a06d7f03d437c';
    const GREEDY_TOKENS_BLOOM_FILTER = '0x0000100800000480002c00401000000820000000000000020000001010800001';
    const BALANCER_WETH_DAI = '0x8b6e6e7b5b3801fed2cafd4b22b8a16c2f2db21a';
    const fqtNonce = protocol_utils_1.findTransformerNonce('0xfa6282736af206cb4cfc5cb786d82aecdf1186f9', '0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb');
    const payTakerNonce = protocol_utils_1.findTransformerNonce('0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e', '0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb');
    let zeroEx;
    let multiplex;
    let rfqMaker;
    let flashWalletAddress;
    before(() => __awaiter(this, void 0, void 0, function* () {
        const erc20Abis = _.mapValues(contracts_erc20_1.artifacts, v => v.compilerOutput.abi);
        [rfqMaker] = yield env.getAccountAddressesAsync();
        zeroEx = new wrappers_1.IZeroExContract('0xdef1c0ded9bec7f1a1670819833240f027b25eff', env.provider, env.txDefaults, Object.assign({}, abis_1.abis, erc20Abis));
        flashWalletAddress = yield zeroEx.getTransformWallet().callAsync();
        const registry = new wrappers_1.SimpleFunctionRegistryFeatureContract(zeroEx.address, env.provider, env.txDefaults, Object.assign({}, abis_1.abis, erc20Abis));
        multiplex = new wrappers_1.MultiplexFeatureContract(zeroEx.address, env.provider, env.txDefaults, Object.assign({}, abis_1.abis, erc20Abis));
        const multiplexImpl = yield wrappers_1.MultiplexFeatureContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.MultiplexFeature, env.provider, env.txDefaults, artifacts_1.artifacts, zeroEx.address, WETH_ADDRESS, PLP_SANDBOX_ADDRESS, GREEDY_TOKENS_BLOOM_FILTER);
        yield registry
            .extend(multiplex.getSelector('batchFill'), multiplexImpl.address)
            .awaitTransactionSuccessAsync({ from: EP_GOVERNOR, gasPrice: 0 }, { shouldValidate: false });
        yield registry
            .extend(multiplex.getSelector('multiHopFill'), multiplexImpl.address)
            .awaitTransactionSuccessAsync({ from: EP_GOVERNOR, gasPrice: 0 }, { shouldValidate: false });
        yield dai
            .approve(zeroEx.address, contracts_test_utils_1.constants.MAX_UINT256)
            .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
        yield weth
            .transfer(rfqMaker, contracts_test_utils_1.toBaseUnitAmount(100))
            .awaitTransactionSuccessAsync({ from: WETH_WALLET, gasPrice: 0 }, { shouldValidate: false });
        yield weth
            .approve(zeroEx.address, contracts_test_utils_1.constants.MAX_UINT256)
            .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0 }, { shouldValidate: false });
    }));
    describe('batchFill', () => {
        let rfqDataEncoder;
        let uniswapCall;
        let sushiswapCall;
        let plpCall;
        let rfqCall;
        let rfqOrder;
        before(() => __awaiter(this, void 0, void 0, function* () {
            rfqDataEncoder = utils_1.AbiEncoder.create([
                { name: 'order', type: 'tuple', components: protocol_utils_1.RfqOrder.STRUCT_ABI },
                { name: 'signature', type: 'tuple', components: protocol_utils_1.SIGNATURE_ABI },
            ]);
            rfqOrder = orders_1.getRandomRfqOrder({
                maker: rfqMaker,
                verifyingContract: zeroEx.address,
                chainId: 1,
                takerToken: DAI_ADDRESS,
                makerToken: WETH_ADDRESS,
                makerAmount: contracts_test_utils_1.toBaseUnitAmount(100),
                takerAmount: contracts_test_utils_1.toBaseUnitAmount(100),
                txOrigin: DAI_WALLET,
            });
            rfqCall = {
                selector: zeroEx.getSelector('_fillRfqOrder'),
                sellAmount: contracts_test_utils_1.toBaseUnitAmount(1),
                data: rfqDataEncoder.encode({
                    order: rfqOrder,
                    signature: yield rfqOrder.getSignatureWithProviderAsync(env.provider),
                }),
            };
            const uniswapDataEncoder = utils_1.AbiEncoder.create([
                { name: 'tokens', type: 'address[]' },
                { name: 'isSushi', type: 'bool' },
            ]);
            const plpDataEncoder = utils_1.AbiEncoder.create([
                { name: 'provider', type: 'address' },
                { name: 'auxiliaryData', type: 'bytes' },
            ]);
            uniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: contracts_test_utils_1.toBaseUnitAmount(1.01),
                data: uniswapDataEncoder.encode({ tokens: [DAI_ADDRESS, WETH_ADDRESS], isSushi: false }),
            };
            sushiswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: contracts_test_utils_1.toBaseUnitAmount(1.02),
                data: uniswapDataEncoder.encode({ tokens: [DAI_ADDRESS, WETH_ADDRESS], isSushi: true }),
            };
            plpCall = {
                selector: multiplex.getSelector('_sellToLiquidityProvider'),
                sellAmount: contracts_test_utils_1.toBaseUnitAmount(1.03),
                data: plpDataEncoder.encode({
                    provider: WETH_DAI_PLP_ADDRESS,
                    auxiliaryData: contracts_test_utils_1.constants.NULL_BYTES,
                }),
            };
        }));
        it('MultiplexFeature.batchFill(RFQ, unused Uniswap fallback)', () => __awaiter(this, void 0, void 0, function* () {
            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: rfqCall.sellAmount,
                calls: [rfqCall, uniswapCall],
            };
            const tx = yield multiplex
                .batchFill(batchFillData, contracts_test_utils_1.constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            utils_1.logUtils.log(`${tx.gasUsed} gas used`);
            const [rfqEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.IZeroExEvents.RfqOrderFilled);
            contracts_test_utils_1.expect(rfqEvent.maker).to.equal(rfqMaker);
            contracts_test_utils_1.expect(rfqEvent.taker).to.equal(DAI_WALLET);
            contracts_test_utils_1.expect(rfqEvent.makerToken).to.equal(WETH_ADDRESS);
            contracts_test_utils_1.expect(rfqEvent.takerToken).to.equal(DAI_ADDRESS);
            contracts_test_utils_1.expect(rfqEvent.takerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
            contracts_test_utils_1.expect(rfqEvent.makerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
        }));
        it('MultiplexFeature.batchFill(expired RFQ, Uniswap fallback)', () => __awaiter(this, void 0, void 0, function* () {
            const expiredRfqOrder = orders_1.getRandomRfqOrder({
                maker: rfqMaker,
                verifyingContract: zeroEx.address,
                chainId: 1,
                takerToken: DAI_ADDRESS,
                makerToken: WETH_ADDRESS,
                makerAmount: contracts_test_utils_1.toBaseUnitAmount(100),
                takerAmount: contracts_test_utils_1.toBaseUnitAmount(100),
                txOrigin: DAI_WALLET,
                expiry: new utils_1.BigNumber(0),
            });
            const expiredRfqCall = {
                selector: zeroEx.getSelector('_fillRfqOrder'),
                sellAmount: contracts_test_utils_1.toBaseUnitAmount(1.23),
                data: rfqDataEncoder.encode({
                    order: expiredRfqOrder,
                    signature: yield expiredRfqOrder.getSignatureWithProviderAsync(env.provider),
                }),
            };
            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: expiredRfqCall.sellAmount,
                calls: [expiredRfqCall, uniswapCall],
            };
            const tx = yield multiplex
                .batchFill(batchFillData, contracts_test_utils_1.constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            utils_1.logUtils.log(`${tx.gasUsed} gas used`);
            const [uniswapEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.IUniswapV2PairEvents.Swap);
            contracts_test_utils_1.expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            contracts_test_utils_1.expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(DAI_WALLET);
            contracts_test_utils_1.expect(utils_1.BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In), 'Uniswap Swap event input amount').to.bignumber.equal(uniswapCall.sellAmount);
            contracts_test_utils_1.expect(utils_1.BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out), 'Uniswap Swap event output amount').to.bignumber.gt(0);
        }));
        it('MultiplexFeature.batchFill(expired RFQ, Balancer FQT fallback)', () => __awaiter(this, void 0, void 0, function* () {
            const expiredRfqOrder = orders_1.getRandomRfqOrder({
                maker: rfqMaker,
                verifyingContract: zeroEx.address,
                chainId: 1,
                takerToken: DAI_ADDRESS,
                makerToken: WETH_ADDRESS,
                makerAmount: contracts_test_utils_1.toBaseUnitAmount(100),
                takerAmount: contracts_test_utils_1.toBaseUnitAmount(100),
                txOrigin: DAI_WALLET,
                expiry: new utils_1.BigNumber(0),
            });
            const expiredRfqCall = {
                selector: zeroEx.getSelector('_fillRfqOrder'),
                sellAmount: contracts_test_utils_1.toBaseUnitAmount(1.23),
                data: rfqDataEncoder.encode({
                    order: expiredRfqOrder,
                    signature: yield expiredRfqOrder.getSignatureWithProviderAsync(env.provider),
                }),
            };
            const poolEncoder = utils_1.AbiEncoder.create([{ name: 'poolAddress', type: 'address' }]);
            const fqtData = protocol_utils_1.encodeFillQuoteTransformerData({
                side: protocol_utils_1.FillQuoteTransformerSide.Sell,
                sellToken: DAI_ADDRESS,
                buyToken: WETH_ADDRESS,
                bridgeOrders: [
                    {
                        source: protocol_utils_1.BridgeSource.Balancer,
                        takerTokenAmount: expiredRfqCall.sellAmount,
                        makerTokenAmount: expiredRfqCall.sellAmount,
                        bridgeData: poolEncoder.encode([BALANCER_WETH_DAI]),
                    },
                ],
                limitOrders: [],
                rfqOrders: [],
                fillSequence: [protocol_utils_1.FillQuoteTransformerOrderType.Bridge],
                fillAmount: expiredRfqCall.sellAmount,
                refundReceiver: contracts_test_utils_1.constants.NULL_ADDRESS,
            });
            const payTakerData = protocol_utils_1.encodePayTakerTransformerData({
                tokens: [WETH_ADDRESS],
                amounts: [contracts_test_utils_1.constants.MAX_UINT256],
            });
            const transformERC20Encoder = utils_1.AbiEncoder.create([
                {
                    name: 'transformations',
                    type: 'tuple[]',
                    components: [{ name: 'deploymentNonce', type: 'uint32' }, { name: 'data', type: 'bytes' }],
                },
                { name: 'ethValue', type: 'uint256' },
            ]);
            const balancerFqtCall = {
                selector: zeroEx.getSelector('_transformERC20'),
                sellAmount: expiredRfqCall.sellAmount,
                data: transformERC20Encoder.encode({
                    transformations: [
                        {
                            deploymentNonce: fqtNonce,
                            data: fqtData,
                        },
                        {
                            deploymentNonce: payTakerNonce,
                            data: payTakerData,
                        },
                    ],
                    ethValue: contracts_test_utils_1.constants.ZERO_AMOUNT,
                }),
            };
            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: expiredRfqCall.sellAmount,
                calls: [expiredRfqCall, balancerFqtCall],
            };
            const tx = yield multiplex
                .batchFill(batchFillData, contracts_test_utils_1.constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            utils_1.logUtils.log(`${tx.gasUsed} gas used`);
            const [bridgeFillEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.BridgeAdapterEvents.BridgeFill);
            contracts_test_utils_1.expect(bridgeFillEvent.source).to.bignumber.equal(protocol_utils_1.BridgeSource.Balancer);
            contracts_test_utils_1.expect(bridgeFillEvent.inputToken).to.equal(DAI_ADDRESS);
            contracts_test_utils_1.expect(bridgeFillEvent.outputToken).to.equal(WETH_ADDRESS);
            contracts_test_utils_1.expect(bridgeFillEvent.inputTokenAmount).to.bignumber.equal(expiredRfqCall.sellAmount);
            contracts_test_utils_1.expect(bridgeFillEvent.outputTokenAmount).to.bignumber.gt(0);
        }));
        it('MultiplexFeature.batchFill(Sushiswap, PLP, Uniswap, RFQ)', () => __awaiter(this, void 0, void 0, function* () {
            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: utils_1.BigNumber.sum(sushiswapCall.sellAmount, plpCall.sellAmount, uniswapCall.sellAmount, rfqCall.sellAmount),
                calls: [sushiswapCall, plpCall, uniswapCall, rfqCall],
            };
            const tx = yield multiplex
                .batchFill(batchFillData, contracts_test_utils_1.constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            utils_1.logUtils.log(`${tx.gasUsed} gas used`);
            const [sushiswapEvent, uniswapEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.IUniswapV2PairEvents.Swap);
            contracts_test_utils_1.expect(sushiswapEvent.sender, 'Sushiswap Swap event sender').to.equal(zeroEx.address);
            contracts_test_utils_1.expect(sushiswapEvent.to, 'Sushiswap Swap event to').to.equal(DAI_WALLET);
            contracts_test_utils_1.expect(utils_1.BigNumber.max(sushiswapEvent.amount0In, sushiswapEvent.amount1In), 'Sushiswap Swap event input amount').to.bignumber.equal(sushiswapCall.sellAmount);
            contracts_test_utils_1.expect(utils_1.BigNumber.max(sushiswapEvent.amount0Out, sushiswapEvent.amount1Out), 'Sushiswap Swap event output amount').to.bignumber.gt(0);
            contracts_test_utils_1.expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            contracts_test_utils_1.expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(DAI_WALLET);
            contracts_test_utils_1.expect(utils_1.BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In), 'Uniswap Swap event input amount').to.bignumber.equal(uniswapCall.sellAmount);
            contracts_test_utils_1.expect(utils_1.BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out), 'Uniswap Swap event output amount').to.bignumber.gt(0);
            const [plpEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.MultiplexFeatureEvents.LiquidityProviderSwap);
            contracts_test_utils_1.expect(plpEvent.inputToken, 'LiquidityProviderSwap event inputToken').to.equal(batchFillData.inputToken);
            contracts_test_utils_1.expect(plpEvent.outputToken, 'LiquidityProviderSwap event outputToken').to.equal(batchFillData.outputToken);
            contracts_test_utils_1.expect(plpEvent.inputTokenAmount, 'LiquidityProviderSwap event inputToken').to.bignumber.equal(plpCall.sellAmount);
            contracts_test_utils_1.expect(plpEvent.outputTokenAmount, 'LiquidityProviderSwap event outputTokenAmount').to.bignumber.gt(0);
            contracts_test_utils_1.expect(plpEvent.provider, 'LiquidityProviderSwap event provider address').to.equal(WETH_DAI_PLP_ADDRESS);
            contracts_test_utils_1.expect(plpEvent.recipient, 'LiquidityProviderSwap event recipient address').to.equal(DAI_WALLET);
            const [rfqEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.IZeroExEvents.RfqOrderFilled);
            contracts_test_utils_1.expect(rfqEvent.maker).to.equal(rfqMaker);
            contracts_test_utils_1.expect(rfqEvent.taker).to.equal(DAI_WALLET);
            contracts_test_utils_1.expect(rfqEvent.makerToken).to.equal(WETH_ADDRESS);
            contracts_test_utils_1.expect(rfqEvent.takerToken).to.equal(DAI_ADDRESS);
            contracts_test_utils_1.expect(rfqEvent.takerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
            contracts_test_utils_1.expect(rfqEvent.makerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
        }));
    });
    describe('multiHopFill', () => {
        let uniswapDataEncoder;
        let plpDataEncoder;
        let curveEncoder;
        let transformERC20Encoder;
        let batchFillEncoder;
        let multiHopFillEncoder;
        before(() => __awaiter(this, void 0, void 0, function* () {
            uniswapDataEncoder = utils_1.AbiEncoder.create([
                { name: 'tokens', type: 'address[]' },
                { name: 'isSushi', type: 'bool' },
            ]);
            plpDataEncoder = utils_1.AbiEncoder.create([
                { name: 'provider', type: 'address' },
                { name: 'auxiliaryData', type: 'bytes' },
            ]);
            curveEncoder = utils_1.AbiEncoder.create([
                { name: 'curveAddress', type: 'address' },
                { name: 'exchangeFunctionSelector', type: 'bytes4' },
                { name: 'fromTokenIdx', type: 'int128' },
                { name: 'toTokenIdx', type: 'int128' },
            ]);
            transformERC20Encoder = utils_1.AbiEncoder.create([
                {
                    name: 'transformations',
                    type: 'tuple[]',
                    components: [{ name: 'deploymentNonce', type: 'uint32' }, { name: 'data', type: 'bytes' }],
                },
                { name: 'ethValue', type: 'uint256' },
            ]);
            batchFillEncoder = utils_1.AbiEncoder.create([
                {
                    name: 'calls',
                    type: 'tuple[]',
                    components: [
                        { name: 'selector', type: 'bytes4' },
                        { name: 'sellAmount', type: 'uint256' },
                        { name: 'data', type: 'bytes' },
                    ],
                },
                { name: 'ethValue', type: 'uint256' },
            ]);
            multiHopFillEncoder = utils_1.AbiEncoder.create([
                { name: 'tokens', type: 'address[]' },
                {
                    name: 'calls',
                    type: 'tuple[]',
                    components: [{ name: 'selector', type: 'bytes4' }, { name: 'data', type: 'bytes' }],
                },
                { name: 'ethValue', type: 'uint256' },
            ]);
        }));
        it('MultiplexFeature.multiHopFill(DAI ––Curve––> USDC ––Uni––> WETH ––unwrap––> ETH)', () => __awaiter(this, void 0, void 0, function* () {
            const sellAmount = contracts_test_utils_1.toBaseUnitAmount(1000000); // 1M DAI
            const fqtData = protocol_utils_1.encodeFillQuoteTransformerData({
                side: protocol_utils_1.FillQuoteTransformerSide.Sell,
                sellToken: DAI_ADDRESS,
                buyToken: USDC_ADDRESS,
                bridgeOrders: [
                    {
                        source: protocol_utils_1.BridgeSource.Curve,
                        takerTokenAmount: sellAmount,
                        makerTokenAmount: sellAmount,
                        bridgeData: curveEncoder.encode([
                            '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7',
                            '0x3df02124',
                            0,
                            1,
                        ]),
                    },
                ],
                limitOrders: [],
                rfqOrders: [],
                fillSequence: [protocol_utils_1.FillQuoteTransformerOrderType.Bridge],
                fillAmount: sellAmount,
                refundReceiver: contracts_test_utils_1.constants.NULL_ADDRESS,
            });
            const payTakerData = protocol_utils_1.encodePayTakerTransformerData({
                tokens: [USDC_ADDRESS],
                amounts: [contracts_test_utils_1.constants.MAX_UINT256],
            });
            const curveFqtCall = {
                selector: zeroEx.getSelector('_transformERC20'),
                sellAmount,
                data: transformERC20Encoder.encode({
                    transformations: [
                        {
                            deploymentNonce: fqtNonce,
                            data: fqtData,
                        },
                        {
                            deploymentNonce: payTakerNonce,
                            data: payTakerData,
                        },
                    ],
                    ethValue: contracts_test_utils_1.constants.ZERO_AMOUNT,
                }),
            };
            const uniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                data: uniswapDataEncoder.encode({ tokens: [USDC_ADDRESS, WETH_ADDRESS], isSushi: false }),
            };
            const unwrapEthCall = {
                selector: weth.getSelector('withdraw'),
                data: contracts_test_utils_1.constants.NULL_BYTES,
            };
            const multiHopFillData = {
                tokens: [DAI_ADDRESS, USDC_ADDRESS, WETH_ADDRESS, ETH_TOKEN_ADDRESS],
                sellAmount,
                calls: [curveFqtCall, uniswapCall, unwrapEthCall],
            };
            const tx = yield multiplex
                .multiHopFill(multiHopFillData, contracts_test_utils_1.constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            utils_1.logUtils.log(`${tx.gasUsed} gas used`);
            const [bridgeFillEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.BridgeAdapterEvents.BridgeFill);
            contracts_test_utils_1.expect(bridgeFillEvent.source).to.bignumber.equal(protocol_utils_1.BridgeSource.Curve);
            contracts_test_utils_1.expect(bridgeFillEvent.inputToken).to.equal(DAI_ADDRESS);
            contracts_test_utils_1.expect(bridgeFillEvent.outputToken).to.equal(USDC_ADDRESS);
            contracts_test_utils_1.expect(bridgeFillEvent.inputTokenAmount).to.bignumber.equal(sellAmount);
            contracts_test_utils_1.expect(bridgeFillEvent.outputTokenAmount).to.bignumber.gt(0);
            const [uniswapEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.IUniswapV2PairEvents.Swap);
            contracts_test_utils_1.expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            contracts_test_utils_1.expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(zeroEx.address);
            const uniswapInputAmount = utils_1.BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In);
            contracts_test_utils_1.expect(uniswapInputAmount, 'Uniswap Swap event input amount').to.bignumber.equal(bridgeFillEvent.outputTokenAmount);
            const uniswapOutputAmount = utils_1.BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out);
            contracts_test_utils_1.expect(uniswapOutputAmount, 'Uniswap Swap event output amount').to.bignumber.gt(0);
            const [wethWithdrawalEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, contracts_erc20_1.WETH9Events.Withdrawal);
            contracts_test_utils_1.expect(wethWithdrawalEvent._owner, 'WETH Withdrawal event _owner').to.equal(zeroEx.address);
            contracts_test_utils_1.expect(wethWithdrawalEvent._value, 'WETH Withdrawal event _value').to.bignumber.equal(uniswapOutputAmount);
        }));
        it('MultiplexFeature.multiHopFill(ETH ––wrap–-> WETH ––Uni––> USDC ––Curve––> DAI)', () => __awaiter(this, void 0, void 0, function* () {
            const sellAmount = contracts_test_utils_1.toBaseUnitAmount(1); // 1 ETH
            const fqtData = protocol_utils_1.encodeFillQuoteTransformerData({
                side: protocol_utils_1.FillQuoteTransformerSide.Sell,
                sellToken: USDC_ADDRESS,
                buyToken: DAI_ADDRESS,
                bridgeOrders: [
                    {
                        source: protocol_utils_1.BridgeSource.Curve,
                        takerTokenAmount: contracts_test_utils_1.constants.MAX_UINT256,
                        makerTokenAmount: contracts_test_utils_1.constants.MAX_UINT256,
                        bridgeData: curveEncoder.encode([
                            '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7',
                            '0x3df02124',
                            1,
                            0,
                        ]),
                    },
                ],
                limitOrders: [],
                rfqOrders: [],
                fillSequence: [protocol_utils_1.FillQuoteTransformerOrderType.Bridge],
                fillAmount: contracts_test_utils_1.constants.MAX_UINT256,
                refundReceiver: contracts_test_utils_1.constants.NULL_ADDRESS,
            });
            const payTakerData = protocol_utils_1.encodePayTakerTransformerData({
                tokens: [DAI_ADDRESS],
                amounts: [contracts_test_utils_1.constants.MAX_UINT256],
            });
            const curveFqtCall = {
                selector: zeroEx.getSelector('_transformERC20'),
                data: transformERC20Encoder.encode({
                    transformations: [
                        {
                            deploymentNonce: fqtNonce,
                            data: fqtData,
                        },
                        {
                            deploymentNonce: payTakerNonce,
                            data: payTakerData,
                        },
                    ],
                    ethValue: contracts_test_utils_1.constants.ZERO_AMOUNT,
                }),
            };
            const uniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                data: uniswapDataEncoder.encode({ tokens: [WETH_ADDRESS, USDC_ADDRESS], isSushi: false }),
            };
            const wrapEthCall = {
                selector: weth.getSelector('deposit'),
                data: contracts_test_utils_1.constants.NULL_BYTES,
            };
            const multiHopFillData = {
                tokens: [ETH_TOKEN_ADDRESS, WETH_ADDRESS, USDC_ADDRESS, DAI_ADDRESS],
                sellAmount,
                calls: [wrapEthCall, uniswapCall, curveFqtCall],
            };
            const tx = yield multiplex
                .multiHopFill(multiHopFillData, contracts_test_utils_1.constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0, value: sellAmount }, { shouldValidate: false });
            utils_1.logUtils.log(`${tx.gasUsed} gas used`);
            const [wethDepositEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, contracts_erc20_1.WETH9Events.Deposit);
            contracts_test_utils_1.expect(wethDepositEvent._owner, 'WETH Deposit event _owner').to.equal(zeroEx.address);
            contracts_test_utils_1.expect(wethDepositEvent._value, 'WETH Deposit event _value').to.bignumber.equal(sellAmount);
            const [uniswapEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.IUniswapV2PairEvents.Swap);
            contracts_test_utils_1.expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            contracts_test_utils_1.expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(flashWalletAddress);
            const uniswapInputAmount = utils_1.BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In);
            contracts_test_utils_1.expect(uniswapInputAmount, 'Uniswap Swap event input amount').to.bignumber.equal(sellAmount);
            const uniswapOutputAmount = utils_1.BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out);
            contracts_test_utils_1.expect(uniswapOutputAmount, 'Uniswap Swap event output amount').to.bignumber.gt(0);
            const [bridgeFillEvent] = contracts_test_utils_1.filterLogsToArguments(tx.logs, wrappers_1.BridgeAdapterEvents.BridgeFill);
            contracts_test_utils_1.expect(bridgeFillEvent.source).to.bignumber.equal(protocol_utils_1.BridgeSource.Curve);
            contracts_test_utils_1.expect(bridgeFillEvent.inputToken).to.equal(USDC_ADDRESS);
            contracts_test_utils_1.expect(bridgeFillEvent.outputToken).to.equal(DAI_ADDRESS);
            contracts_test_utils_1.expect(bridgeFillEvent.inputTokenAmount).to.bignumber.equal(uniswapOutputAmount);
            contracts_test_utils_1.expect(bridgeFillEvent.outputTokenAmount).to.bignumber.gt(0);
        }));
        it.skip('MultiplexFeature.multiHopFill() complex scenario', () => __awaiter(this, void 0, void 0, function* () {
            /*

                                      /––––PLP–––> USDC
                                     /                \
                                    /                 PLP
                                   /––Uni (via USDC)–––\
                                  /                    V
                ETH ––wrap––> WETH ––––Uni/Sushi–––> USDT ––Sushi––> LON
                                \                                      ^
                                 ––––––––––––––– Uni –––––––––––––––––/
            */
            // Taker has to have approved the EP for the intermediate tokens :/
            yield weth
                .approve(zeroEx.address, contracts_test_utils_1.constants.MAX_UINT256)
                .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0 }, { shouldValidate: false });
            yield usdt
                .approve(zeroEx.address, contracts_test_utils_1.constants.MAX_UINT256)
                .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0 }, { shouldValidate: false });
            const sellAmount = contracts_test_utils_1.toBaseUnitAmount(1); // 1 ETH
            const wethUsdcPlpCall = {
                selector: multiplex.getSelector('_sellToLiquidityProvider'),
                data: plpDataEncoder.encode({
                    provider: WETH_USDC_PLP_ADDRESS,
                    auxiliaryData: contracts_test_utils_1.constants.NULL_BYTES,
                }),
            };
            const usdcUsdtPlpCall = {
                selector: multiplex.getSelector('_sellToLiquidityProvider'),
                data: plpDataEncoder.encode({
                    provider: USDC_USDT_PLP_ADDRESS,
                    auxiliaryData: contracts_test_utils_1.constants.NULL_BYTES,
                }),
            };
            const wethUsdcUsdtMultiHopCall = {
                selector: multiplex.getSelector('_multiHopFill'),
                sellAmount: encodeFractionalFillAmount(0.25),
                data: multiHopFillEncoder.encode({
                    tokens: [WETH_ADDRESS, USDC_ADDRESS, USDT_ADDRESS],
                    calls: [wethUsdcPlpCall, usdcUsdtPlpCall],
                    ethValue: contracts_test_utils_1.constants.ZERO_AMOUNT,
                }),
            };
            const wethUsdcUsdtUniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: encodeFractionalFillAmount(0.25),
                data: uniswapDataEncoder.encode({ tokens: [WETH_ADDRESS, USDC_ADDRESS, USDT_ADDRESS], isSushi: false }),
            };
            const wethUsdtUniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: encodeFractionalFillAmount(0.25),
                data: uniswapDataEncoder.encode({ tokens: [WETH_ADDRESS, USDT_ADDRESS], isSushi: false }),
            };
            const wethUsdtSushiswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: encodeFractionalFillAmount(0.25),
                data: uniswapDataEncoder.encode({ tokens: [WETH_ADDRESS, USDT_ADDRESS], isSushi: true }),
            };
            const wethUsdtBatchCall = {
                selector: multiplex.getSelector('_batchFill'),
                data: batchFillEncoder.encode({
                    calls: [
                        wethUsdcUsdtMultiHopCall,
                        wethUsdcUsdtUniswapCall,
                        wethUsdtUniswapCall,
                        wethUsdtSushiswapCall,
                    ],
                    ethValue: contracts_test_utils_1.constants.ZERO_AMOUNT,
                }),
            };
            const usdtLonSushiCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                data: uniswapDataEncoder.encode({ tokens: [USDT_ADDRESS, LON_ADDRESS], isSushi: true }),
            };
            const wethUsdtLonMultiHopCall = {
                selector: multiplex.getSelector('_multiHopFill'),
                sellAmount: encodeFractionalFillAmount(0.8),
                data: multiHopFillEncoder.encode({
                    tokens: [WETH_ADDRESS, USDT_ADDRESS],
                    calls: [wethUsdtBatchCall, usdtLonSushiCall],
                    ethValue: contracts_test_utils_1.constants.ZERO_AMOUNT,
                }),
            };
            const wethLonUniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: encodeFractionalFillAmount(0.2),
                data: uniswapDataEncoder.encode({ tokens: [WETH_ADDRESS, LON_ADDRESS], isSushi: false }),
            };
            const wethLonBatchFillCall = {
                selector: multiplex.getSelector('_batchFill'),
                data: batchFillEncoder.encode({
                    calls: [wethUsdtLonMultiHopCall, wethLonUniswapCall],
                    ethValue: contracts_test_utils_1.constants.ZERO_AMOUNT,
                }),
            };
            const wrapEthCall = {
                selector: weth.getSelector('deposit'),
                data: contracts_test_utils_1.constants.NULL_BYTES,
            };
            const multiHopFillData = {
                tokens: [ETH_TOKEN_ADDRESS, WETH_ADDRESS, LON_ADDRESS],
                sellAmount,
                calls: [wrapEthCall, wethLonBatchFillCall],
            };
            const tx = yield multiplex
                .multiHopFill(multiHopFillData, contracts_test_utils_1.constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0, value: sellAmount }, { shouldValidate: false });
            utils_1.logUtils.log(`${tx.gasUsed} gas used`);
        }));
    });
});
//# sourceMappingURL=multiplex_test.js.map