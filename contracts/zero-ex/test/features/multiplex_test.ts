import {
    artifacts as erc20Artifacts,
    ERC20TokenContract,
    WETH9Contract,
    WETH9DepositEventArgs,
    WETH9Events,
    WETH9WithdrawalEventArgs,
} from '@0x/contracts-erc20';
import { blockchainTests, constants, expect, filterLogsToArguments, toBaseUnitAmount } from '@0x/contracts-test-utils';
import {
    BridgeProtocol,
    encodeBridgeSourceId,
    encodeFillQuoteTransformerData,
    encodePayTakerTransformerData,
    FillQuoteTransformerOrderType,
    FillQuoteTransformerSide,
    findTransformerNonce,
    RfqOrder,
    SIGNATURE_ABI,
} from '@0x/protocol-utils';
import { AbiEncoder, BigNumber, logUtils } from '@0x/utils';
import * as _ from 'lodash';

import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { getRandomRfqOrder } from '../utils/orders';
import {
    BridgeAdapterBridgeFillEventArgs,
    BridgeAdapterEvents,
    IUniswapV2PairEvents,
    IUniswapV2PairSwapEventArgs,
    IZeroExContract,
    IZeroExEvents,
    IZeroExRfqOrderFilledEventArgs,
    MultiplexFeatureContract,
    MultiplexFeatureEvents,
    MultiplexFeatureLiquidityProviderSwapEventArgs,
    SimpleFunctionRegistryFeatureContract,
} from '../wrappers';

const HIGH_BIT = new BigNumber(2).pow(255);
function encodeFractionalFillAmount(frac: number): BigNumber {
    return HIGH_BIT.plus(new BigNumber(frac).times('1e18').integerValue());
}

const EP_GOVERNOR = '0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e';
const DAI_WALLET = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';
const WETH_WALLET = '0x1e0447b19bb6ecfdae1e4ae1694b0c3659614e4e';
const USDC_WALLET = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';
blockchainTests.configure({
    fork: {
        unlockedAccounts: [EP_GOVERNOR, DAI_WALLET, WETH_WALLET, USDC_WALLET],
    },
});

interface WrappedBatchCall {
    selector: string;
    sellAmount: BigNumber;
    data: string;
}

blockchainTests.fork.skip('Multiplex feature', env => {
    const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const dai = new ERC20TokenContract(DAI_ADDRESS, env.provider, env.txDefaults);
    const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const weth = new WETH9Contract(WETH_ADDRESS, env.provider, env.txDefaults);
    const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const usdt = new ERC20TokenContract(USDT_ADDRESS, env.provider, env.txDefaults);
    const LON_ADDRESS = '0x0000000000095413afc295d19edeb1ad7b71c952';
    const PLP_SANDBOX_ADDRESS = '0x407b4128e9ecad8769b2332312a9f655cb9f5f3a';
    const WETH_DAI_PLP_ADDRESS = '0x1db681925786441ba82adefac7bf492089665ca0';
    const WETH_USDC_PLP_ADDRESS = '0x8463c03c0c57ff19fa8b431e0d3a34e2df89888e';
    const USDC_USDT_PLP_ADDRESS = '0xc340ef96449514cea4dfa11d847a06d7f03d437c';
    const BALANCER_WETH_DAI = '0x8b6e6e7b5b3801fed2cafd4b22b8a16c2f2db21a';
    const CURVE_BRIDGE_SOURCE_ID = encodeBridgeSourceId(BridgeProtocol.Curve, 'Curve');
    const BALANCER_BRIDGE_SOURCE_ID = encodeBridgeSourceId(BridgeProtocol.Bancor, 'Balancer');
    const fqtNonce = findTransformerNonce(
        '0xfa6282736af206cb4cfc5cb786d82aecdf1186f9',
        '0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb',
    );
    const payTakerNonce = findTransformerNonce(
        '0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e',
        '0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb',
    );

    let zeroEx: IZeroExContract;
    let multiplex: MultiplexFeatureContract;
    let rfqMaker: string;
    let flashWalletAddress: string;

    before(async () => {
        const erc20Abis = _.mapValues(erc20Artifacts, v => v.compilerOutput.abi);
        [rfqMaker] = await env.getAccountAddressesAsync();
        zeroEx = new IZeroExContract('0xdef1c0ded9bec7f1a1670819833240f027b25eff', env.provider, env.txDefaults, {
            ...abis,
            ...erc20Abis,
        });
        flashWalletAddress = await zeroEx.getTransformWallet().callAsync();
        const registry = new SimpleFunctionRegistryFeatureContract(zeroEx.address, env.provider, env.txDefaults, {
            ...abis,
            ...erc20Abis,
        });
        multiplex = new MultiplexFeatureContract(zeroEx.address, env.provider, env.txDefaults, {
            ...abis,
            ...erc20Abis,
        });
        const multiplexImpl = await MultiplexFeatureContract.deployFrom0xArtifactAsync(
            artifacts.MultiplexFeature,
            env.provider,
            env.txDefaults,
            artifacts,
            zeroEx.address,
            WETH_ADDRESS,
            PLP_SANDBOX_ADDRESS,
        );
        await registry
            .extend(multiplex.getSelector('batchFill'), multiplexImpl.address)
            .awaitTransactionSuccessAsync({ from: EP_GOVERNOR, gasPrice: 0 }, { shouldValidate: false });
        await registry
            .extend(multiplex.getSelector('multiHopFill'), multiplexImpl.address)
            .awaitTransactionSuccessAsync({ from: EP_GOVERNOR, gasPrice: 0 }, { shouldValidate: false });
        await dai
            .approve(zeroEx.address, constants.MAX_UINT256)
            .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
        await weth
            .transfer(rfqMaker, toBaseUnitAmount(100))
            .awaitTransactionSuccessAsync({ from: WETH_WALLET, gasPrice: 0 }, { shouldValidate: false });
        await weth
            .approve(zeroEx.address, constants.MAX_UINT256)
            .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0 }, { shouldValidate: false });
    });
    describe('batchFill', () => {
        let rfqDataEncoder: AbiEncoder.DataType;
        let uniswapCall: WrappedBatchCall;
        let sushiswapCall: WrappedBatchCall;
        let plpCall: WrappedBatchCall;
        let rfqCall: WrappedBatchCall;
        let rfqOrder: RfqOrder;
        before(async () => {
            rfqDataEncoder = AbiEncoder.create([
                { name: 'order', type: 'tuple', components: RfqOrder.STRUCT_ABI },
                { name: 'signature', type: 'tuple', components: SIGNATURE_ABI },
            ]);
            rfqOrder = getRandomRfqOrder({
                maker: rfqMaker,
                verifyingContract: zeroEx.address,
                chainId: 1,
                takerToken: DAI_ADDRESS,
                makerToken: WETH_ADDRESS,
                makerAmount: toBaseUnitAmount(100),
                takerAmount: toBaseUnitAmount(100),
                txOrigin: DAI_WALLET,
            });
            rfqCall = {
                selector: zeroEx.getSelector('_fillRfqOrder'),
                sellAmount: toBaseUnitAmount(1),
                data: rfqDataEncoder.encode({
                    order: rfqOrder,
                    signature: await rfqOrder.getSignatureWithProviderAsync(env.provider),
                }),
            };
            const uniswapDataEncoder = AbiEncoder.create([
                { name: 'tokens', type: 'address[]' },
                { name: 'isSushi', type: 'bool' },
            ]);
            const plpDataEncoder = AbiEncoder.create([
                { name: 'provider', type: 'address' },
                { name: 'auxiliaryData', type: 'bytes' },
            ]);
            uniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: toBaseUnitAmount(1.01),
                data: uniswapDataEncoder.encode({ tokens: [DAI_ADDRESS, WETH_ADDRESS], isSushi: false }),
            };
            sushiswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                sellAmount: toBaseUnitAmount(1.02),
                data: uniswapDataEncoder.encode({ tokens: [DAI_ADDRESS, WETH_ADDRESS], isSushi: true }),
            };
            plpCall = {
                selector: multiplex.getSelector('_sellToLiquidityProvider'),
                sellAmount: toBaseUnitAmount(1.03),
                data: plpDataEncoder.encode({
                    provider: WETH_DAI_PLP_ADDRESS,
                    auxiliaryData: constants.NULL_BYTES,
                }),
            };
        });
        it('MultiplexFeature.batchFill(RFQ, unused Uniswap fallback)', async () => {
            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: rfqCall.sellAmount,
                calls: [rfqCall, uniswapCall],
            };
            const tx = await multiplex
                .batchFill(batchFillData, constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            logUtils.log(`${tx.gasUsed} gas used`);

            const [rfqEvent] = filterLogsToArguments<IZeroExRfqOrderFilledEventArgs>(
                tx.logs,
                IZeroExEvents.RfqOrderFilled,
            );
            expect(rfqEvent.maker).to.equal(rfqMaker);
            expect(rfqEvent.taker).to.equal(DAI_WALLET);
            expect(rfqEvent.makerToken).to.equal(WETH_ADDRESS);
            expect(rfqEvent.takerToken).to.equal(DAI_ADDRESS);
            expect(rfqEvent.takerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
            expect(rfqEvent.makerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
        });
        it('MultiplexFeature.batchFill(expired RFQ, Uniswap fallback)', async () => {
            const expiredRfqOrder = getRandomRfqOrder({
                maker: rfqMaker,
                verifyingContract: zeroEx.address,
                chainId: 1,
                takerToken: DAI_ADDRESS,
                makerToken: WETH_ADDRESS,
                makerAmount: toBaseUnitAmount(100),
                takerAmount: toBaseUnitAmount(100),
                txOrigin: DAI_WALLET,
                expiry: new BigNumber(0),
            });
            const expiredRfqCall = {
                selector: zeroEx.getSelector('_fillRfqOrder'),
                sellAmount: toBaseUnitAmount(1.23),
                data: rfqDataEncoder.encode({
                    order: expiredRfqOrder,
                    signature: await expiredRfqOrder.getSignatureWithProviderAsync(env.provider),
                }),
            };

            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: expiredRfqCall.sellAmount,
                calls: [expiredRfqCall, uniswapCall],
            };
            const tx = await multiplex
                .batchFill(batchFillData, constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            logUtils.log(`${tx.gasUsed} gas used`);
            const [uniswapEvent] = filterLogsToArguments<IUniswapV2PairSwapEventArgs>(
                tx.logs,
                IUniswapV2PairEvents.Swap,
            );
            expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(DAI_WALLET);
            expect(
                BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In),
                'Uniswap Swap event input amount',
            ).to.bignumber.equal(uniswapCall.sellAmount);
            expect(
                BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out),
                'Uniswap Swap event output amount',
            ).to.bignumber.gt(0);
        });
        it('MultiplexFeature.batchFill(expired RFQ, Balancer FQT fallback)', async () => {
            const expiredRfqOrder = getRandomRfqOrder({
                maker: rfqMaker,
                verifyingContract: zeroEx.address,
                chainId: 1,
                takerToken: DAI_ADDRESS,
                makerToken: WETH_ADDRESS,
                makerAmount: toBaseUnitAmount(100),
                takerAmount: toBaseUnitAmount(100),
                txOrigin: DAI_WALLET,
                expiry: new BigNumber(0),
            });
            const expiredRfqCall = {
                selector: zeroEx.getSelector('_fillRfqOrder'),
                sellAmount: toBaseUnitAmount(1.23),
                data: rfqDataEncoder.encode({
                    order: expiredRfqOrder,
                    signature: await expiredRfqOrder.getSignatureWithProviderAsync(env.provider),
                }),
            };
            const poolEncoder = AbiEncoder.create([{ name: 'poolAddress', type: 'address' }]);
            const fqtData = encodeFillQuoteTransformerData({
                side: FillQuoteTransformerSide.Sell,
                sellToken: DAI_ADDRESS,
                buyToken: WETH_ADDRESS,
                bridgeOrders: [
                    {
                        source: BALANCER_BRIDGE_SOURCE_ID,
                        takerTokenAmount: expiredRfqCall.sellAmount,
                        makerTokenAmount: expiredRfqCall.sellAmount,
                        bridgeData: poolEncoder.encode([BALANCER_WETH_DAI]),
                    },
                ],
                limitOrders: [],
                rfqOrders: [],
                fillSequence: [FillQuoteTransformerOrderType.Bridge],
                fillAmount: expiredRfqCall.sellAmount,
                refundReceiver: constants.NULL_ADDRESS,
            });
            const payTakerData = encodePayTakerTransformerData({
                tokens: [WETH_ADDRESS],
                amounts: [constants.MAX_UINT256],
            });
            const transformERC20Encoder = AbiEncoder.create([
                {
                    name: 'transformations',
                    type: 'tuple[]',
                    components: [
                        { name: 'deploymentNonce', type: 'uint32' },
                        { name: 'data', type: 'bytes' },
                    ],
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
                    ethValue: constants.ZERO_AMOUNT,
                }),
            };

            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: expiredRfqCall.sellAmount,
                calls: [expiredRfqCall, balancerFqtCall],
            };
            const tx = await multiplex
                .batchFill(batchFillData, constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            logUtils.log(`${tx.gasUsed} gas used`);
            const [bridgeFillEvent] = filterLogsToArguments<BridgeAdapterBridgeFillEventArgs>(
                tx.logs,
                BridgeAdapterEvents.BridgeFill,
            );
            expect(bridgeFillEvent.source).to.bignumber.equal(BALANCER_BRIDGE_SOURCE_ID);
            expect(bridgeFillEvent.inputToken).to.equal(DAI_ADDRESS);
            expect(bridgeFillEvent.outputToken).to.equal(WETH_ADDRESS);
            expect(bridgeFillEvent.inputTokenAmount).to.bignumber.equal(expiredRfqCall.sellAmount);
            expect(bridgeFillEvent.outputTokenAmount).to.bignumber.gt(0);
        });
        it('MultiplexFeature.batchFill(Sushiswap, PLP, Uniswap, RFQ)', async () => {
            const batchFillData = {
                inputToken: DAI_ADDRESS,
                outputToken: WETH_ADDRESS,
                sellAmount: BigNumber.sum(
                    sushiswapCall.sellAmount,
                    plpCall.sellAmount,
                    uniswapCall.sellAmount,
                    rfqCall.sellAmount,
                ),
                calls: [sushiswapCall, plpCall, uniswapCall, rfqCall],
            };
            const tx = await multiplex
                .batchFill(batchFillData, constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            logUtils.log(`${tx.gasUsed} gas used`);
            const [sushiswapEvent, uniswapEvent] = filterLogsToArguments<IUniswapV2PairSwapEventArgs>(
                tx.logs,
                IUniswapV2PairEvents.Swap,
            );
            expect(sushiswapEvent.sender, 'Sushiswap Swap event sender').to.equal(zeroEx.address);
            expect(sushiswapEvent.to, 'Sushiswap Swap event to').to.equal(DAI_WALLET);
            expect(
                BigNumber.max(sushiswapEvent.amount0In, sushiswapEvent.amount1In),
                'Sushiswap Swap event input amount',
            ).to.bignumber.equal(sushiswapCall.sellAmount);
            expect(
                BigNumber.max(sushiswapEvent.amount0Out, sushiswapEvent.amount1Out),
                'Sushiswap Swap event output amount',
            ).to.bignumber.gt(0);
            expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(DAI_WALLET);
            expect(
                BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In),
                'Uniswap Swap event input amount',
            ).to.bignumber.equal(uniswapCall.sellAmount);
            expect(
                BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out),
                'Uniswap Swap event output amount',
            ).to.bignumber.gt(0);

            const [plpEvent] = filterLogsToArguments<MultiplexFeatureLiquidityProviderSwapEventArgs>(
                tx.logs,
                MultiplexFeatureEvents.LiquidityProviderSwap,
            );
            expect(plpEvent.inputToken, 'LiquidityProviderSwap event inputToken').to.equal(batchFillData.inputToken);
            expect(plpEvent.outputToken, 'LiquidityProviderSwap event outputToken').to.equal(batchFillData.outputToken);
            expect(plpEvent.inputTokenAmount, 'LiquidityProviderSwap event inputToken').to.bignumber.equal(
                plpCall.sellAmount,
            );
            expect(plpEvent.outputTokenAmount, 'LiquidityProviderSwap event outputTokenAmount').to.bignumber.gt(0);
            expect(plpEvent.provider, 'LiquidityProviderSwap event provider address').to.equal(WETH_DAI_PLP_ADDRESS);
            expect(plpEvent.recipient, 'LiquidityProviderSwap event recipient address').to.equal(DAI_WALLET);

            const [rfqEvent] = filterLogsToArguments<IZeroExRfqOrderFilledEventArgs>(
                tx.logs,
                IZeroExEvents.RfqOrderFilled,
            );
            expect(rfqEvent.maker).to.equal(rfqMaker);
            expect(rfqEvent.taker).to.equal(DAI_WALLET);
            expect(rfqEvent.makerToken).to.equal(WETH_ADDRESS);
            expect(rfqEvent.takerToken).to.equal(DAI_ADDRESS);
            expect(rfqEvent.takerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
            expect(rfqEvent.makerTokenFilledAmount).to.bignumber.equal(rfqCall.sellAmount);
        });
    });
    describe('multiHopFill', () => {
        let uniswapDataEncoder: AbiEncoder.DataType;
        let plpDataEncoder: AbiEncoder.DataType;
        let curveEncoder: AbiEncoder.DataType;
        let transformERC20Encoder: AbiEncoder.DataType;
        let batchFillEncoder: AbiEncoder.DataType;
        let multiHopFillEncoder: AbiEncoder.DataType;

        before(async () => {
            uniswapDataEncoder = AbiEncoder.create([
                { name: 'tokens', type: 'address[]' },
                { name: 'isSushi', type: 'bool' },
            ]);
            plpDataEncoder = AbiEncoder.create([
                { name: 'provider', type: 'address' },
                { name: 'auxiliaryData', type: 'bytes' },
            ]);
            curveEncoder = AbiEncoder.create([
                { name: 'curveAddress', type: 'address' },
                { name: 'exchangeFunctionSelector', type: 'bytes4' },
                { name: 'fromTokenIdx', type: 'int128' },
                { name: 'toTokenIdx', type: 'int128' },
            ]);
            transformERC20Encoder = AbiEncoder.create([
                {
                    name: 'transformations',
                    type: 'tuple[]',
                    components: [
                        { name: 'deploymentNonce', type: 'uint32' },
                        { name: 'data', type: 'bytes' },
                    ],
                },
                { name: 'ethValue', type: 'uint256' },
            ]);
            batchFillEncoder = AbiEncoder.create([
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
            multiHopFillEncoder = AbiEncoder.create([
                { name: 'tokens', type: 'address[]' },
                {
                    name: 'calls',
                    type: 'tuple[]',
                    components: [
                        { name: 'selector', type: 'bytes4' },
                        { name: 'data', type: 'bytes' },
                    ],
                },
                { name: 'ethValue', type: 'uint256' },
            ]);
        });
        it('MultiplexFeature.multiHopFill(DAI ––Curve––> USDC ––Uni––> WETH ––unwrap––> ETH)', async () => {
            const sellAmount = toBaseUnitAmount(1000000); // 1M DAI
            const fqtData = encodeFillQuoteTransformerData({
                side: FillQuoteTransformerSide.Sell,
                sellToken: DAI_ADDRESS,
                buyToken: USDC_ADDRESS,
                bridgeOrders: [
                    {
                        source: CURVE_BRIDGE_SOURCE_ID,
                        takerTokenAmount: sellAmount,
                        makerTokenAmount: sellAmount,
                        bridgeData: curveEncoder.encode([
                            '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', // 3-pool
                            '0x3df02124', // `exchange` selector
                            0, // DAI
                            1, // USDC
                        ]),
                    },
                ],
                limitOrders: [],
                rfqOrders: [],
                fillSequence: [FillQuoteTransformerOrderType.Bridge],
                fillAmount: sellAmount,
                refundReceiver: constants.NULL_ADDRESS,
            });
            const payTakerData = encodePayTakerTransformerData({
                tokens: [USDC_ADDRESS],
                amounts: [constants.MAX_UINT256],
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
                    ethValue: constants.ZERO_AMOUNT,
                }),
            };
            const uniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                data: uniswapDataEncoder.encode({ tokens: [USDC_ADDRESS, WETH_ADDRESS], isSushi: false }),
            };
            const unwrapEthCall = {
                selector: weth.getSelector('withdraw'),
                data: constants.NULL_BYTES,
            };
            const multiHopFillData = {
                tokens: [DAI_ADDRESS, USDC_ADDRESS, WETH_ADDRESS, ETH_TOKEN_ADDRESS],
                sellAmount,
                calls: [curveFqtCall, uniswapCall, unwrapEthCall],
            };
            const tx = await multiplex
                .multiHopFill(multiHopFillData, constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync({ from: DAI_WALLET, gasPrice: 0 }, { shouldValidate: false });
            logUtils.log(`${tx.gasUsed} gas used`);
            const [bridgeFillEvent] = filterLogsToArguments<BridgeAdapterBridgeFillEventArgs>(
                tx.logs,
                BridgeAdapterEvents.BridgeFill,
            );
            expect(bridgeFillEvent.source).to.bignumber.equal(CURVE_BRIDGE_SOURCE_ID);
            expect(bridgeFillEvent.inputToken).to.equal(DAI_ADDRESS);
            expect(bridgeFillEvent.outputToken).to.equal(USDC_ADDRESS);
            expect(bridgeFillEvent.inputTokenAmount).to.bignumber.equal(sellAmount);
            expect(bridgeFillEvent.outputTokenAmount).to.bignumber.gt(0);
            const [uniswapEvent] = filterLogsToArguments<IUniswapV2PairSwapEventArgs>(
                tx.logs,
                IUniswapV2PairEvents.Swap,
            );
            expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(zeroEx.address);
            const uniswapInputAmount = BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In);
            expect(uniswapInputAmount, 'Uniswap Swap event input amount').to.bignumber.equal(
                bridgeFillEvent.outputTokenAmount,
            );
            const uniswapOutputAmount = BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out);
            expect(uniswapOutputAmount, 'Uniswap Swap event output amount').to.bignumber.gt(0);
            const [wethWithdrawalEvent] = filterLogsToArguments<WETH9WithdrawalEventArgs>(
                tx.logs,
                WETH9Events.Withdrawal,
            );
            expect(wethWithdrawalEvent._owner, 'WETH Withdrawal event _owner').to.equal(zeroEx.address);
            expect(wethWithdrawalEvent._value, 'WETH Withdrawal event _value').to.bignumber.equal(uniswapOutputAmount);
        });
        it('MultiplexFeature.multiHopFill(ETH ––wrap–-> WETH ––Uni––> USDC ––Curve––> DAI)', async () => {
            const sellAmount = toBaseUnitAmount(1); // 1 ETH
            const fqtData = encodeFillQuoteTransformerData({
                side: FillQuoteTransformerSide.Sell,
                sellToken: USDC_ADDRESS,
                buyToken: DAI_ADDRESS,
                bridgeOrders: [
                    {
                        source: CURVE_BRIDGE_SOURCE_ID,
                        takerTokenAmount: constants.MAX_UINT256,
                        makerTokenAmount: constants.MAX_UINT256,
                        bridgeData: curveEncoder.encode([
                            '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', // 3-pool
                            '0x3df02124', // `exchange` selector
                            1, // USDC
                            0, // DAI
                        ]),
                    },
                ],
                limitOrders: [],
                rfqOrders: [],
                fillSequence: [FillQuoteTransformerOrderType.Bridge],
                fillAmount: constants.MAX_UINT256,
                refundReceiver: constants.NULL_ADDRESS,
            });
            const payTakerData = encodePayTakerTransformerData({
                tokens: [DAI_ADDRESS],
                amounts: [constants.MAX_UINT256],
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
                    ethValue: constants.ZERO_AMOUNT,
                }),
            };
            const uniswapCall = {
                selector: multiplex.getSelector('_sellToUniswap'),
                data: uniswapDataEncoder.encode({ tokens: [WETH_ADDRESS, USDC_ADDRESS], isSushi: false }),
            };
            const wrapEthCall = {
                selector: weth.getSelector('deposit'),
                data: constants.NULL_BYTES,
            };
            const multiHopFillData = {
                tokens: [ETH_TOKEN_ADDRESS, WETH_ADDRESS, USDC_ADDRESS, DAI_ADDRESS],
                sellAmount,
                calls: [wrapEthCall, uniswapCall, curveFqtCall],
            };
            const tx = await multiplex
                .multiHopFill(multiHopFillData, constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync(
                    { from: rfqMaker, gasPrice: 0, value: sellAmount },
                    { shouldValidate: false },
                );
            logUtils.log(`${tx.gasUsed} gas used`);

            const [wethDepositEvent] = filterLogsToArguments<WETH9DepositEventArgs>(tx.logs, WETH9Events.Deposit);
            expect(wethDepositEvent._owner, 'WETH Deposit event _owner').to.equal(zeroEx.address);
            expect(wethDepositEvent._value, 'WETH Deposit event _value').to.bignumber.equal(sellAmount);

            const [uniswapEvent] = filterLogsToArguments<IUniswapV2PairSwapEventArgs>(
                tx.logs,
                IUniswapV2PairEvents.Swap,
            );
            expect(uniswapEvent.sender, 'Uniswap Swap event sender').to.equal(zeroEx.address);
            expect(uniswapEvent.to, 'Uniswap Swap event to').to.equal(flashWalletAddress);
            const uniswapInputAmount = BigNumber.max(uniswapEvent.amount0In, uniswapEvent.amount1In);
            expect(uniswapInputAmount, 'Uniswap Swap event input amount').to.bignumber.equal(sellAmount);
            const uniswapOutputAmount = BigNumber.max(uniswapEvent.amount0Out, uniswapEvent.amount1Out);
            expect(uniswapOutputAmount, 'Uniswap Swap event output amount').to.bignumber.gt(0);

            const [bridgeFillEvent] = filterLogsToArguments<BridgeAdapterBridgeFillEventArgs>(
                tx.logs,
                BridgeAdapterEvents.BridgeFill,
            );
            expect(bridgeFillEvent.source).to.bignumber.equal(CURVE_BRIDGE_SOURCE_ID);
            expect(bridgeFillEvent.inputToken).to.equal(USDC_ADDRESS);
            expect(bridgeFillEvent.outputToken).to.equal(DAI_ADDRESS);
            expect(bridgeFillEvent.inputTokenAmount).to.bignumber.equal(uniswapOutputAmount);
            expect(bridgeFillEvent.outputTokenAmount).to.bignumber.gt(0);
        });
        it.skip('MultiplexFeature.multiHopFill() complex scenario', async () => {
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
            await weth
                .approve(zeroEx.address, constants.MAX_UINT256)
                .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0 }, { shouldValidate: false });
            await usdt
                .approve(zeroEx.address, constants.MAX_UINT256)
                .awaitTransactionSuccessAsync({ from: rfqMaker, gasPrice: 0 }, { shouldValidate: false });

            const sellAmount = toBaseUnitAmount(1); // 1 ETH
            const wethUsdcPlpCall = {
                selector: multiplex.getSelector('_sellToLiquidityProvider'),
                data: plpDataEncoder.encode({
                    provider: WETH_USDC_PLP_ADDRESS,
                    auxiliaryData: constants.NULL_BYTES,
                }),
            };
            const usdcUsdtPlpCall = {
                selector: multiplex.getSelector('_sellToLiquidityProvider'),
                data: plpDataEncoder.encode({
                    provider: USDC_USDT_PLP_ADDRESS,
                    auxiliaryData: constants.NULL_BYTES,
                }),
            };
            const wethUsdcUsdtMultiHopCall = {
                selector: multiplex.getSelector('_multiHopFill'),
                sellAmount: encodeFractionalFillAmount(0.25),
                data: multiHopFillEncoder.encode({
                    tokens: [WETH_ADDRESS, USDC_ADDRESS, USDT_ADDRESS],
                    calls: [wethUsdcPlpCall, usdcUsdtPlpCall],
                    ethValue: constants.ZERO_AMOUNT,
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
                    ethValue: constants.ZERO_AMOUNT,
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
                    ethValue: constants.ZERO_AMOUNT,
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
                    ethValue: constants.ZERO_AMOUNT,
                }),
            };
            const wrapEthCall = {
                selector: weth.getSelector('deposit'),
                data: constants.NULL_BYTES,
            };
            const multiHopFillData = {
                tokens: [ETH_TOKEN_ADDRESS, WETH_ADDRESS, LON_ADDRESS],
                sellAmount,
                calls: [wrapEthCall, wethLonBatchFillCall],
            };
            const tx = await multiplex
                .multiHopFill(multiHopFillData, constants.ZERO_AMOUNT)
                .awaitTransactionSuccessAsync(
                    { from: rfqMaker, gasPrice: 0, value: sellAmount },
                    { shouldValidate: false },
                );
            logUtils.log(`${tx.gasUsed} gas used`);
        });
    });
});
