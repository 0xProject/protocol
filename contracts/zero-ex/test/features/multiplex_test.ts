import {
    blockchainTests,
    constants,
    expect,
    getRandomInteger,
    toBaseUnitAmount,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import { OtcOrder, RfqOrder, SIGNATURE_ABI } from '@0x/protocol-utils';
import { AbiEncoder, BigNumber, hexUtils } from '@0x/utils';
import { LogWithDecodedArgs } from 'ethereum-types';

import { IZeroExContract, IZeroExEvents } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import { getRandomOtcOrder, getRandomRfqOrder } from '../utils/orders';
import {
    IOwnableFeatureContract,
    LiquidityProviderSandboxContract,
    MultiplexFeatureContract,
    MultiplexFeatureEvents,
    OtcOrdersFeatureContract,
    TestLiquidityProviderContract,
    TestMintableERC20TokenContract,
    TestMintableERC20TokenEvents,
    TestMintTokenERC20TransformerContract,
    TestMintTokenERC20TransformerEvents,
    TestUniswapV2FactoryContract,
    TestUniswapV2FactoryPoolCreatedEventArgs,
    TestUniswapV2PoolContract,
    TestUniswapV3FactoryContract,
    TestUniswapV3FactoryPoolCreatedEventArgs,
    TestUniswapV3PoolContract,
    TestWethContract,
    TestWethEvents,
    UniswapV3FeatureContract,
} from '../wrappers';

interface TransferEvent {
    token: string;
    from: string;
    to: string;
    value?: BigNumber;
}

enum MultiplexSubcall {
    Invalid,
    Rfq,
    Otc,
    UniswapV2,
    UniswapV3,
    LiquidityProvider,
    TransformERC20,
    BatchSell,
    MultiHopSell,
}

interface MultiHopSellSubcall {
    id: MultiplexSubcall;
    data: string;
}

interface BatchSellSubcall extends MultiHopSellSubcall {
    sellAmount: BigNumber;
}

const HIGH_BIT = new BigNumber(2).pow(255);
function encodeFractionalFillAmount(frac: number): BigNumber {
    return HIGH_BIT.plus(new BigNumber(frac).times('1e18').integerValue());
}

blockchainTests.resets('MultiplexFeature', env => {
    const POOL_FEE = 1234;

    let zeroEx: IZeroExContract;
    let multiplex: MultiplexFeatureContract;
    let flashWalletAddress: string;
    let sandbox: LiquidityProviderSandboxContract;
    let liquidityProvider: TestLiquidityProviderContract;
    let sushiFactory: TestUniswapV2FactoryContract;
    let uniV2Factory: TestUniswapV2FactoryContract;
    let uniV3Factory: TestUniswapV3FactoryContract;
    let dai: TestMintableERC20TokenContract;
    let shib: TestMintableERC20TokenContract;
    let zrx: TestMintableERC20TokenContract;
    let weth: TestWethContract;
    let owner: string;
    let maker: string;
    let taker: string;
    let transformerNonce: number;

    //////////////// Deployment utility functions ////////////////
    async function migrateOtcOrdersFeatureAsync(): Promise<void> {
        const featureImpl = await OtcOrdersFeatureContract.deployFrom0xArtifactAsync(
            artifacts.OtcOrdersFeature,
            env.provider,
            env.txDefaults,
            artifacts,
            zeroEx.address,
            weth.address,
        );
        await new IOwnableFeatureContract(zeroEx.address, env.provider, env.txDefaults)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
    }

    async function migrateLiquidityProviderContractsAsync(): Promise<void> {
        sandbox = await LiquidityProviderSandboxContract.deployFrom0xArtifactAsync(
            artifacts.LiquidityProviderSandbox,
            env.provider,
            env.txDefaults,
            artifacts,
            zeroEx.address,
        );
        liquidityProvider = await TestLiquidityProviderContract.deployFrom0xArtifactAsync(
            artifacts.TestLiquidityProvider,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    }

    async function migrateUniswapV2ContractsAsync(): Promise<void> {
        sushiFactory = await TestUniswapV2FactoryContract.deployFrom0xArtifactAsync(
            artifacts.TestUniswapV2Factory,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        uniV2Factory = await TestUniswapV2FactoryContract.deployFrom0xArtifactAsync(
            artifacts.TestUniswapV2Factory,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    }

    async function migrateUniswapV3ContractsAsync(): Promise<void> {
        uniV3Factory = await TestUniswapV3FactoryContract.deployFrom0xArtifactAsync(
            artifacts.TestUniswapV3Factory,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        const featureImpl = await UniswapV3FeatureContract.deployFrom0xArtifactAsync(
            artifacts.TestUniswapV3Feature,
            env.provider,
            env.txDefaults,
            artifacts,
            weth.address,
            uniV3Factory.address,
            await uniV3Factory.POOL_INIT_CODE_HASH().callAsync(),
        );
        await new IOwnableFeatureContract(zeroEx.address, env.provider, env.txDefaults)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
    }

    //////////////// Miscellaneous utils ////////////////

    function isWethContract(t: TestMintableERC20TokenContract | TestWethContract): t is TestWethContract {
        return !!(t as any).deposit;
    }

    async function mintToAsync(
        token: TestMintableERC20TokenContract | TestWethContract,
        recipient: string,
        amount: BigNumber,
    ): Promise<void> {
        if (isWethContract(token)) {
            await token.depositTo(recipient).awaitTransactionSuccessAsync({ value: amount });
        } else {
            await token.mint(recipient, amount).awaitTransactionSuccessAsync();
        }
    }

    //////////////// Deploy Uniswap pools ////////////////

    async function createUniswapV2PoolAsync(
        factory: TestUniswapV2FactoryContract,
        token0: TestMintableERC20TokenContract | TestWethContract,
        token1: TestMintableERC20TokenContract | TestWethContract,
        balance0: BigNumber = toBaseUnitAmount(10),
        balance1: BigNumber = toBaseUnitAmount(10),
    ): Promise<TestUniswapV2PoolContract> {
        const r = await factory.createPool(token0.address, token1.address).awaitTransactionSuccessAsync();
        const pool = new TestUniswapV2PoolContract(
            (r.logs[0] as LogWithDecodedArgs<TestUniswapV2FactoryPoolCreatedEventArgs>).args.pool,
            env.provider,
            env.txDefaults,
        );
        await mintToAsync(token0, pool.address, balance0);
        await mintToAsync(token1, pool.address, balance1);
        if (token0.address < token1.address) {
            await pool.setReserves(balance0, balance1, constants.ZERO_AMOUNT).awaitTransactionSuccessAsync();
        } else {
            await pool.setReserves(balance1, balance0, constants.ZERO_AMOUNT).awaitTransactionSuccessAsync();
        }
        return pool;
    }

    async function createUniswapV3PoolAsync(
        token0: TestMintableERC20TokenContract | TestWethContract,
        token1: TestMintableERC20TokenContract | TestWethContract,
        balance0: BigNumber = toBaseUnitAmount(10),
        balance1: BigNumber = toBaseUnitAmount(10),
    ): Promise<TestUniswapV3PoolContract> {
        const r = await uniV3Factory
            .createPool(token0.address, token1.address, new BigNumber(POOL_FEE))
            .awaitTransactionSuccessAsync();
        const pool = new TestUniswapV3PoolContract(
            (r.logs[0] as LogWithDecodedArgs<TestUniswapV3FactoryPoolCreatedEventArgs>).args.pool,
            env.provider,
            env.txDefaults,
        );
        await mintToAsync(token0, pool.address, balance0);
        await mintToAsync(token1, pool.address, balance1);
        return pool;
    }

    //////////////// Generate subcalls ////////////////

    function getTestRfqOrder(overrides: Partial<RfqOrder> = {}): RfqOrder {
        return getRandomRfqOrder({
            maker,
            verifyingContract: zeroEx.address,
            chainId: 1337,
            takerToken: dai.address,
            makerToken: zrx.address,
            makerAmount: toBaseUnitAmount(1),
            takerAmount: toBaseUnitAmount(1),
            txOrigin: taker,
            ...overrides,
        });
    }
    async function getRfqSubcallAsync(
        rfqOrder: RfqOrder,
        sellAmount: BigNumber = rfqOrder.takerAmount,
    ): Promise<BatchSellSubcall> {
        const rfqDataEncoder = AbiEncoder.create([
            { name: 'order', type: 'tuple', components: RfqOrder.STRUCT_ABI },
            { name: 'signature', type: 'tuple', components: SIGNATURE_ABI },
        ]);
        const makerToken =
            rfqOrder.makerToken === weth.address
                ? weth
                : new TestMintableERC20TokenContract(rfqOrder.makerToken, env.provider, env.txDefaults);
        await mintToAsync(makerToken, rfqOrder.maker, rfqOrder.makerAmount);
        return {
            id: MultiplexSubcall.Rfq,
            sellAmount,
            data: rfqDataEncoder.encode({
                order: rfqOrder,
                signature: await rfqOrder.getSignatureWithProviderAsync(env.provider),
            }),
        };
    }

    function getTestOtcOrder(fields: Partial<OtcOrder> = {}): OtcOrder {
        return getRandomOtcOrder({
            maker,
            verifyingContract: zeroEx.address,
            chainId: 1337,
            takerToken: dai.address,
            makerToken: zrx.address,
            makerAmount: toBaseUnitAmount(1),
            takerAmount: toBaseUnitAmount(1),
            taker,
            txOrigin: taker,
            ...fields,
        });
    }
    async function getOtcSubcallAsync(
        otcOrder: OtcOrder,
        sellAmount: BigNumber = otcOrder.takerAmount,
    ): Promise<BatchSellSubcall> {
        const otcDataEncoder = AbiEncoder.create([
            { name: 'order', type: 'tuple', components: OtcOrder.STRUCT_ABI },
            { name: 'signature', type: 'tuple', components: SIGNATURE_ABI },
        ]);
        const makerToken =
            otcOrder.makerToken === weth.address
                ? weth
                : new TestMintableERC20TokenContract(otcOrder.makerToken, env.provider, env.txDefaults);
        await mintToAsync(makerToken, otcOrder.maker, otcOrder.makerAmount);
        return {
            id: MultiplexSubcall.Otc,
            sellAmount,
            data: otcDataEncoder.encode({
                order: otcOrder,
                signature: await otcOrder.getSignatureWithProviderAsync(env.provider),
            }),
        };
    }

    function getUniswapV2MultiHopSubcall(tokens: string[], isSushi = false): MultiHopSellSubcall {
        const uniswapDataEncoder = AbiEncoder.create([
            { name: 'tokens', type: 'address[]' },
            { name: 'isSushi', type: 'bool' },
        ]);
        return {
            id: MultiplexSubcall.UniswapV2,
            data: uniswapDataEncoder.encode({ tokens, isSushi }),
        };
    }
    function getUniswapV2BatchSubcall(
        tokens: string[],
        sellAmount: BigNumber = getRandomInteger(1, toBaseUnitAmount(1)),
        isSushi = false,
    ): BatchSellSubcall {
        return {
            ...getUniswapV2MultiHopSubcall(tokens, isSushi),
            sellAmount,
        };
    }

    function getUniswapV3MultiHopSubcall(
        tokens_: Array<TestMintableERC20TokenContract | TestWethContract>,
    ): MultiHopSellSubcall {
        const elems: string[] = [];
        tokens_.forEach((t, i) => {
            if (i) {
                elems.push(hexUtils.leftPad(POOL_FEE, 3));
            }
            elems.push(hexUtils.leftPad(t.address, 20));
        });
        const data = hexUtils.concat(...elems);

        return {
            id: MultiplexSubcall.UniswapV3,
            data,
        };
    }
    function getUniswapV3BatchSubcall(
        tokens: Array<TestMintableERC20TokenContract | TestWethContract>,
        sellAmount: BigNumber = getRandomInteger(1, toBaseUnitAmount(1)),
    ): BatchSellSubcall {
        return {
            ...getUniswapV3MultiHopSubcall(tokens),
            sellAmount,
        };
    }

    function getLiquidityProviderMultiHopSubcall(): MultiHopSellSubcall {
        const plpDataEncoder = AbiEncoder.create([
            { name: 'provider', type: 'address' },
            { name: 'auxiliaryData', type: 'bytes' },
        ]);
        return {
            id: MultiplexSubcall.LiquidityProvider,
            data: plpDataEncoder.encode({
                provider: liquidityProvider.address,
                auxiliaryData: constants.NULL_BYTES,
            }),
        };
    }
    function getLiquidityProviderBatchSubcall(
        sellAmount: BigNumber = getRandomInteger(1, toBaseUnitAmount(1)),
    ): BatchSellSubcall {
        return {
            ...getLiquidityProviderMultiHopSubcall(),
            sellAmount,
        };
    }

    function getTransformERC20Subcall(
        inputToken: string,
        outputToken: string,
        sellAmount: BigNumber = getRandomInteger(1, toBaseUnitAmount(1)),
        mintAmount: BigNumber = getRandomInteger(1, toBaseUnitAmount(1)),
    ): BatchSellSubcall {
        const transformERC20Encoder = AbiEncoder.create([
            {
                name: 'transformations',
                type: 'tuple[]',
                components: [
                    { name: 'deploymentNonce', type: 'uint32' },
                    { name: 'data', type: 'bytes' },
                ],
            },
        ]);
        const transformDataEncoder = AbiEncoder.create([
            {
                name: 'data',
                type: 'tuple',
                components: [
                    { name: 'inputToken', type: 'address' },
                    { name: 'outputToken', type: 'address' },
                    { name: 'burnAmount', type: 'uint256' },
                    { name: 'mintAmount', type: 'uint256' },
                    { name: 'feeAmount', type: 'uint256' },
                ],
            },
        ]);
        return {
            id: MultiplexSubcall.TransformERC20,
            sellAmount,
            data: transformERC20Encoder.encode({
                transformations: [
                    {
                        deploymentNonce: transformerNonce,
                        data: transformDataEncoder.encode([
                            {
                                inputToken,
                                outputToken,
                                burnAmount: constants.ZERO_AMOUNT,
                                mintAmount,
                                feeAmount: constants.ZERO_AMOUNT,
                            },
                        ]),
                    },
                ],
            }),
        };
    }

    function getNestedBatchSellSubcall(calls: BatchSellSubcall[]): MultiHopSellSubcall {
        const batchSellDataEncoder = AbiEncoder.create([
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'id', type: 'uint8' },
                    { name: 'sellAmount', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                ],
            },
        ]);
        return {
            id: MultiplexSubcall.BatchSell,
            data: batchSellDataEncoder.encode({ calls }),
        };
    }

    function getNestedMultiHopSellSubcall(
        tokens: string[],
        calls: MultiHopSellSubcall[],
        sellAmount: BigNumber = getRandomInteger(1, toBaseUnitAmount(1)),
    ): BatchSellSubcall {
        const multiHopSellDataEncoder = AbiEncoder.create([
            {
                name: 'tokens',
                type: 'address[]',
            },
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'id', type: 'uint8' },
                    { name: 'data', type: 'bytes' },
                ],
            },
        ]);
        return {
            id: MultiplexSubcall.MultiHopSell,
            sellAmount,
            data: multiHopSellDataEncoder.encode({ tokens, calls }),
        };
    }

    before(async () => {
        [owner, maker, taker] = await env.getAccountAddressesAsync();
        zeroEx = await fullMigrateAsync(owner, env.provider, env.txDefaults, {});
        flashWalletAddress = await zeroEx.getTransformWallet().callAsync();

        [dai, shib, zrx] = await Promise.all(
            [...new Array(3)].map(async () =>
                TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
                    artifacts.TestMintableERC20Token,
                    env.provider,
                    env.txDefaults,
                    artifacts,
                ),
            ),
        );
        weth = await TestWethContract.deployFrom0xArtifactAsync(
            artifacts.TestWeth,
            env.provider,
            env.txDefaults,
            artifacts,
        );

        await Promise.all([
            ...[dai, shib, zrx, weth].map(t =>
                t.approve(zeroEx.address, constants.MAX_UINT256).awaitTransactionSuccessAsync({ from: taker }),
            ),
            ...[dai, shib, zrx, weth].map(t =>
                t.approve(zeroEx.address, constants.MAX_UINT256).awaitTransactionSuccessAsync({ from: maker }),
            ),
        ]);
        await migrateOtcOrdersFeatureAsync();
        await migrateLiquidityProviderContractsAsync();
        await migrateUniswapV2ContractsAsync();
        await migrateUniswapV3ContractsAsync();
        transformerNonce = await env.web3Wrapper.getAccountNonceAsync(owner);
        await TestMintTokenERC20TransformerContract.deployFrom0xArtifactAsync(
            artifacts.TestMintTokenERC20Transformer,
            env.provider,
            env.txDefaults,
            artifacts,
        );

        const featureImpl = await MultiplexFeatureContract.deployFrom0xArtifactAsync(
            artifacts.MultiplexFeature,
            env.provider,
            env.txDefaults,
            artifacts,
            zeroEx.address,
            weth.address,
            sandbox.address,
            uniV2Factory.address,
            sushiFactory.address,
            await uniV2Factory.POOL_INIT_CODE_HASH().callAsync(),
            await sushiFactory.POOL_INIT_CODE_HASH().callAsync(),
        );
        await new IOwnableFeatureContract(zeroEx.address, env.provider, env.txDefaults)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
        multiplex = new MultiplexFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis);
    });

    describe('batch sells', () => {
        describe('multiplexBatchSellTokenForToken', () => {
            it('reverts if minBuyAmount is not satisfied', async () => {
                const order = getTestRfqOrder();
                const rfqSubcall = await getRfqSubcallAsync(order);
                await mintToAsync(dai, taker, rfqSubcall.sellAmount);

                const tx = multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [rfqSubcall],
                        order.takerAmount,
                        order.makerAmount.plus(1),
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                return expect(tx).to.revertWith('MultiplexFeature::_multiplexBatchSell/UNDERBOUGHT');
            });
            it('reverts if given an invalid subcall type', async () => {
                const invalidSubcall: BatchSellSubcall = {
                    id: MultiplexSubcall.Invalid,
                    sellAmount: toBaseUnitAmount(1),
                    data: constants.NULL_BYTES,
                };
                const tx = multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [invalidSubcall],
                        invalidSubcall.sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                return expect(tx).to.revertWith('MultiplexFeature::_executeBatchSell/INVALID_SUBCALL');
            });
            it('reverts if the full sell amount is not sold', async () => {
                const order = getTestRfqOrder();
                const rfqSubcall = await getRfqSubcallAsync(order);
                await mintToAsync(dai, taker, rfqSubcall.sellAmount);

                const tx = multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [rfqSubcall],
                        order.takerAmount.plus(1),
                        order.makerAmount,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                return expect(tx).to.revertWith('MultiplexFeature::_executeBatchSell/INCORRECT_AMOUNT_SOLD');
            });
            it('RFQ, fallback(UniswapV2)', async () => {
                const order = getTestRfqOrder();
                const rfqSubcall = await getRfqSubcallAsync(order);
                await createUniswapV2PoolAsync(uniV2Factory, dai, zrx);
                await mintToAsync(dai, taker, rfqSubcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [rfqSubcall, getUniswapV2BatchSubcall([dai.address, zrx.address], order.takerAmount)],
                        order.takerAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            orderHash: order.getHash(),
                            maker,
                            taker,
                            makerToken: order.makerToken,
                            takerToken: order.takerToken,
                            takerTokenFilledAmount: order.takerAmount,
                            makerTokenFilledAmount: order.makerAmount,
                            pool: order.pool,
                        },
                    ],
                    IZeroExEvents.RfqOrderFilled,
                );
            });
            it('OTC, fallback(UniswapV2)', async () => {
                const order = getTestOtcOrder();
                const otcSubcall = await getOtcSubcallAsync(order);
                await createUniswapV2PoolAsync(uniV2Factory, dai, zrx);
                await mintToAsync(dai, taker, otcSubcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [otcSubcall, getUniswapV2BatchSubcall([dai.address, zrx.address], order.takerAmount)],
                        order.takerAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            orderHash: order.getHash(),
                            maker,
                            taker,
                            makerToken: order.makerToken,
                            takerToken: order.takerToken,
                            takerTokenFilledAmount: order.takerAmount,
                            makerTokenFilledAmount: order.makerAmount,
                        },
                    ],
                    IZeroExEvents.OtcOrderFilled,
                );
            });
            it('expired RFQ, fallback(UniswapV2)', async () => {
                const order = getTestRfqOrder({ expiry: constants.ZERO_AMOUNT });
                const rfqSubcall = await getRfqSubcallAsync(order);
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, dai, zrx);
                await mintToAsync(dai, taker, rfqSubcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [rfqSubcall, getUniswapV2BatchSubcall([dai.address, zrx.address], order.takerAmount)],
                        order.takerAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            orderHash: order.getHash(),
                            maker,
                            expiry: order.expiry,
                        },
                    ],
                    MultiplexFeatureEvents.ExpiredRfqOrder,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: uniswap.address,
                            value: order.takerAmount,
                        },
                        {
                            token: zrx.address,
                            from: uniswap.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('expired OTC, fallback(UniswapV2)', async () => {
                const order = getTestOtcOrder({ expiry: constants.ZERO_AMOUNT });
                const otcSubcall = await getOtcSubcallAsync(order);
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, dai, zrx);
                await mintToAsync(dai, taker, otcSubcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [otcSubcall, getUniswapV2BatchSubcall([dai.address, zrx.address], order.takerAmount)],
                        order.takerAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            orderHash: order.getHash(),
                            maker,
                            expiry: order.expiry,
                        },
                    ],
                    MultiplexFeatureEvents.ExpiredOtcOrder,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: uniswap.address,
                            value: order.takerAmount,
                        },
                        {
                            token: zrx.address,
                            from: uniswap.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('expired RFQ, fallback(TransformERC20)', async () => {
                const order = getTestRfqOrder({ expiry: constants.ZERO_AMOUNT });
                const rfqSubcall = await getRfqSubcallAsync(order);
                const transformERC20Subcall = getTransformERC20Subcall(dai.address, zrx.address, order.takerAmount);
                await mintToAsync(dai, taker, order.takerAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [rfqSubcall, transformERC20Subcall],
                        order.takerAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            orderHash: order.getHash(),
                            maker,
                            expiry: order.expiry,
                        },
                    ],
                    MultiplexFeatureEvents.ExpiredRfqOrder,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: flashWalletAddress,
                            value: order.takerAmount,
                        },
                        {
                            token: dai.address,
                            from: flashWalletAddress,
                            to: constants.NULL_ADDRESS,
                        },
                        {
                            token: zrx.address,
                            from: flashWalletAddress,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            caller: zeroEx.address,
                            sender: zeroEx.address,
                            taker,
                            inputTokenBalance: order.takerAmount,
                        },
                    ],
                    TestMintTokenERC20TransformerEvents.MintTransform,
                );
            });
            it('LiquidityProvider, UniV3, Sushiswap', async () => {
                const sushiswap = await createUniswapV2PoolAsync(sushiFactory, dai, zrx);
                const uniV3 = await createUniswapV3PoolAsync(dai, zrx);
                const liquidityProviderSubcall = getLiquidityProviderBatchSubcall();
                const uniV3Subcall = getUniswapV3BatchSubcall([dai, zrx]);
                const sushiswapSubcall = getUniswapV2BatchSubcall([dai.address, zrx.address], undefined, true);
                const sellAmount = BigNumber.sum(
                    ...[liquidityProviderSubcall, uniV3Subcall, sushiswapSubcall].map(c => c.sellAmount),
                ).minus(1);
                await mintToAsync(dai, taker, sellAmount);
                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [liquidityProviderSubcall, uniV3Subcall, sushiswapSubcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: liquidityProvider.address,
                            value: liquidityProviderSubcall.sellAmount,
                        },
                        {
                            token: zrx.address,
                            from: liquidityProvider.address,
                            to: taker,
                        },
                        {
                            token: zrx.address,
                            from: uniV3.address,
                            to: taker,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV3.address,
                            value: uniV3Subcall.sellAmount,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: sushiswap.address,
                            value: sushiswapSubcall.sellAmount.minus(1),
                        },
                        {
                            token: zrx.address,
                            from: sushiswap.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('proportional fill amounts', async () => {
                const order = getTestRfqOrder();
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, dai, zrx);
                const sellAmount = toBaseUnitAmount(1);
                await mintToAsync(dai, taker, sellAmount);

                const rfqFillProportion = 0.42;
                const rfqSubcall = await getRfqSubcallAsync(order, encodeFractionalFillAmount(rfqFillProportion));
                // fractional fill amount 100% => the rest of the total sell amount is sold to Uniswap
                const uniswapV2Subcall = getUniswapV2BatchSubcall(
                    [dai.address, zrx.address],
                    encodeFractionalFillAmount(1),
                );
                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [rfqSubcall, uniswapV2Subcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: order.maker,
                            value: sellAmount.times(rfqFillProportion),
                        },
                        {
                            token: zrx.address,
                            from: order.maker,
                            to: taker,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniswap.address,
                            value: sellAmount.minus(sellAmount.times(rfqFillProportion)),
                        },
                        {
                            token: zrx.address,
                            from: uniswap.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('RFQ, MultiHop(UniV3, UniV2)', async () => {
                const order = getTestRfqOrder();
                const rfqSubcall = await getRfqSubcallAsync(order);
                const uniV3 = await createUniswapV3PoolAsync(dai, shib);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([dai, shib]);
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, shib, zrx);
                const uniV2Subcall = getUniswapV2MultiHopSubcall([shib.address, zrx.address]);
                const nestedMultiHopSubcall = getNestedMultiHopSellSubcall(
                    [dai.address, shib.address, zrx.address],
                    [uniV3Subcall, uniV2Subcall],
                );
                const sellAmount = rfqSubcall.sellAmount.plus(nestedMultiHopSubcall.sellAmount);
                await mintToAsync(dai, taker, sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForToken(
                        dai.address,
                        zrx.address,
                        [rfqSubcall, nestedMultiHopSubcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: order.maker,
                            value: order.takerAmount,
                        },
                        {
                            token: zrx.address,
                            from: order.maker,
                            to: taker,
                            value: order.makerAmount,
                        },
                        {
                            token: shib.address,
                            from: uniV3.address,
                            to: uniV2.address,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV3.address,
                            value: nestedMultiHopSubcall.sellAmount,
                        },
                        {
                            token: zrx.address,
                            from: uniV2.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
        });
        describe('multiplexBatchSellEthForToken', () => {
            it('RFQ', async () => {
                const order = getTestRfqOrder({ takerToken: weth.address });
                const rfqSubcall = await getRfqSubcallAsync(order);

                const tx = await multiplex
                    .multiplexBatchSellEthForToken(zrx.address, [rfqSubcall], constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker, value: order.takerAmount });
                verifyEventsFromLogs(
                    tx.logs,
                    [{ owner: zeroEx.address, value: order.takerAmount }],
                    TestWethEvents.Deposit,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: order.maker,
                            value: order.takerAmount,
                        },
                        {
                            token: zrx.address,
                            from: order.maker,
                            to: taker,
                            value: order.makerAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('OTC', async () => {
                const order = getTestOtcOrder({ takerToken: weth.address });
                const otcSubcall = await getOtcSubcallAsync(order);

                const tx = await multiplex
                    .multiplexBatchSellEthForToken(zrx.address, [otcSubcall], constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker, value: order.takerAmount });
                verifyEventsFromLogs(
                    tx.logs,
                    [{ owner: zeroEx.address, value: order.takerAmount }],
                    TestWethEvents.Deposit,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: order.maker,
                            value: order.takerAmount,
                        },
                        {
                            token: zrx.address,
                            from: order.maker,
                            to: taker,
                            value: order.makerAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('UniswapV2', async () => {
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, weth, zrx);
                const uniswapV2Subcall = getUniswapV2BatchSubcall([weth.address, zrx.address]);

                const tx = await multiplex
                    .multiplexBatchSellEthForToken(zrx.address, [uniswapV2Subcall], constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker, value: uniswapV2Subcall.sellAmount });
                verifyEventsFromLogs(
                    tx.logs,
                    [{ owner: zeroEx.address, value: uniswapV2Subcall.sellAmount }],
                    TestWethEvents.Deposit,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: uniswap.address,
                            value: uniswapV2Subcall.sellAmount,
                        },
                        {
                            token: zrx.address,
                            from: uniswap.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('UniswapV3', async () => {
                const uniV3 = await createUniswapV3PoolAsync(weth, zrx);
                const uniswapV3Subcall = getUniswapV3BatchSubcall([weth, zrx]);
                const tx = await multiplex
                    .multiplexBatchSellEthForToken(zrx.address, [uniswapV3Subcall], constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker, value: uniswapV3Subcall.sellAmount });
                verifyEventsFromLogs(
                    tx.logs,
                    [{ owner: zeroEx.address, value: uniswapV3Subcall.sellAmount }],
                    TestWethEvents.Deposit,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: zrx.address,
                            from: uniV3.address,
                            to: taker,
                        },
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: uniV3.address,
                            value: uniswapV3Subcall.sellAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('LiquidityProvider', async () => {
                const liquidityProviderSubcall = getLiquidityProviderBatchSubcall();
                const tx = await multiplex
                    .multiplexBatchSellEthForToken(zrx.address, [liquidityProviderSubcall], constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker, value: liquidityProviderSubcall.sellAmount });
                verifyEventsFromLogs(
                    tx.logs,
                    [{ owner: zeroEx.address, value: liquidityProviderSubcall.sellAmount }],
                    TestWethEvents.Deposit,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: liquidityProvider.address,
                            value: liquidityProviderSubcall.sellAmount,
                        },
                        {
                            token: zrx.address,
                            from: liquidityProvider.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('TransformERC20', async () => {
                const transformERC20Subcall = getTransformERC20Subcall(weth.address, zrx.address);
                const tx = await multiplex
                    .multiplexBatchSellEthForToken(zrx.address, [transformERC20Subcall], constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker, value: transformERC20Subcall.sellAmount });
                verifyEventsFromLogs(
                    tx.logs,
                    [{ owner: zeroEx.address, value: transformERC20Subcall.sellAmount }],
                    TestWethEvents.Deposit,
                );
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: flashWalletAddress,
                            value: transformERC20Subcall.sellAmount,
                        },
                        {
                            token: weth.address,
                            from: flashWalletAddress,
                            to: constants.NULL_ADDRESS,
                        },
                        {
                            token: zrx.address,
                            from: flashWalletAddress,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('RFQ, MultiHop(UniV3, UniV2)', async () => {
                const order = getTestRfqOrder({ takerToken: weth.address, makerToken: zrx.address });
                const rfqSubcall = await getRfqSubcallAsync(order);
                const uniV3 = await createUniswapV3PoolAsync(weth, shib);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([weth, shib]);
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, shib, zrx);
                const uniV2Subcall = getUniswapV2MultiHopSubcall([shib.address, zrx.address]);
                const nestedMultiHopSubcall = getNestedMultiHopSellSubcall(
                    [weth.address, shib.address, zrx.address],
                    [uniV3Subcall, uniV2Subcall],
                );
                const sellAmount = rfqSubcall.sellAmount.plus(nestedMultiHopSubcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellEthForToken(
                        zrx.address,
                        [rfqSubcall, nestedMultiHopSubcall],
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address, value: sellAmount }], TestWethEvents.Deposit);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: order.maker,
                            value: order.takerAmount,
                        },
                        {
                            token: zrx.address,
                            from: order.maker,
                            to: taker,
                            value: order.makerAmount,
                        },
                        {
                            token: shib.address,
                            from: uniV3.address,
                            to: uniV2.address,
                        },
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: uniV3.address,
                            value: nestedMultiHopSubcall.sellAmount,
                        },
                        {
                            token: zrx.address,
                            from: uniV2.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
        });
        describe('multiplexBatchSellTokenForEth', () => {
            it('RFQ', async () => {
                const order = getTestRfqOrder({ makerToken: weth.address });
                const rfqSubcall = await getRfqSubcallAsync(order);
                await mintToAsync(dai, taker, order.takerAmount);
                const tx = await multiplex
                    .multiplexBatchSellTokenForEth(dai.address, [rfqSubcall], order.takerAmount, constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: order.maker,
                            value: order.takerAmount,
                        },
                        {
                            token: weth.address,
                            from: order.maker,
                            to: zeroEx.address,
                            value: order.makerAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('OTC', async () => {
                const order = getTestOtcOrder({ makerToken: weth.address });
                const otcSubcall = await getOtcSubcallAsync(order);
                await mintToAsync(dai, taker, order.takerAmount);
                const tx = await multiplex
                    .multiplexBatchSellTokenForEth(dai.address, [otcSubcall], order.takerAmount, constants.ZERO_AMOUNT)
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: order.maker,
                            value: order.takerAmount,
                        },
                        {
                            token: weth.address,
                            from: order.maker,
                            to: zeroEx.address,
                            value: order.makerAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('UniswapV2', async () => {
                const uniswapV2Subcall = getUniswapV2BatchSubcall([dai.address, weth.address]);
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, dai, weth);
                await mintToAsync(dai, taker, uniswapV2Subcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForEth(
                        dai.address,
                        [uniswapV2Subcall],
                        uniswapV2Subcall.sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: uniswap.address,
                            value: uniswapV2Subcall.sellAmount,
                        },
                        {
                            token: weth.address,
                            from: uniswap.address,
                            to: zeroEx.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('UniswapV3', async () => {
                const uniswapV3Subcall = getUniswapV3BatchSubcall([dai, weth]);
                const uniV3 = await createUniswapV3PoolAsync(dai, weth);
                await mintToAsync(dai, taker, uniswapV3Subcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForEth(
                        dai.address,
                        [uniswapV3Subcall],
                        uniswapV3Subcall.sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: uniV3.address,
                            to: zeroEx.address,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV3.address,
                            value: uniswapV3Subcall.sellAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('LiquidityProvider', async () => {
                const liquidityProviderSubcall = getLiquidityProviderBatchSubcall();
                await mintToAsync(dai, taker, liquidityProviderSubcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForEth(
                        dai.address,
                        [liquidityProviderSubcall],
                        liquidityProviderSubcall.sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: liquidityProvider.address,
                            value: liquidityProviderSubcall.sellAmount,
                        },
                        {
                            token: weth.address,
                            from: liquidityProvider.address,
                            to: zeroEx.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('TransformERC20', async () => {
                const transformERC20Subcall = getTransformERC20Subcall(
                    dai.address,
                    weth.address,
                    undefined,
                    constants.ZERO_AMOUNT,
                );
                await mintToAsync(dai, taker, transformERC20Subcall.sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForEth(
                        dai.address,
                        [transformERC20Subcall],
                        transformERC20Subcall.sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: flashWalletAddress,
                            value: transformERC20Subcall.sellAmount,
                        },
                        {
                            token: dai.address,
                            from: flashWalletAddress,
                            to: constants.NULL_ADDRESS,
                        },
                        {
                            token: weth.address,
                            from: flashWalletAddress,
                            to: zeroEx.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('RFQ, MultiHop(UniV3, UniV2)', async () => {
                const order = getTestRfqOrder({ takerToken: dai.address, makerToken: weth.address });
                const rfqSubcall = await getRfqSubcallAsync(order);
                const uniV3 = await createUniswapV3PoolAsync(dai, shib);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([dai, shib]);
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, shib, weth);
                const uniV2Subcall = getUniswapV2MultiHopSubcall([shib.address, weth.address]);
                const nestedMultiHopSubcall = getNestedMultiHopSellSubcall(
                    [dai.address, shib.address, weth.address],
                    [uniV3Subcall, uniV2Subcall],
                );
                const sellAmount = rfqSubcall.sellAmount.plus(nestedMultiHopSubcall.sellAmount);
                await mintToAsync(dai, taker, sellAmount);

                const tx = await multiplex
                    .multiplexBatchSellTokenForEth(
                        dai.address,
                        [rfqSubcall, nestedMultiHopSubcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: order.maker,
                            value: order.takerAmount,
                        },
                        {
                            token: weth.address,
                            from: order.maker,
                            to: zeroEx.address,
                            value: order.makerAmount,
                        },
                        {
                            token: shib.address,
                            from: uniV3.address,
                            to: uniV2.address,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV3.address,
                            value: nestedMultiHopSubcall.sellAmount,
                        },
                        {
                            token: weth.address,
                            from: uniV2.address,
                            to: zeroEx.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
            });
        });
    });
    describe('multihop sells', () => {
        describe('multiplexMultiHopSellTokenForToken', () => {
            it('reverts if given an invalid subcall type', async () => {
                const invalidSubcall: MultiHopSellSubcall = {
                    id: MultiplexSubcall.Invalid,
                    data: constants.NULL_BYTES,
                };
                const tx = multiplex
                    .multiplexMultiHopSellTokenForToken(
                        [dai.address, zrx.address],
                        [invalidSubcall],
                        toBaseUnitAmount(1),
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                return expect(tx).to.revertWith('MultiplexFeature::_computeHopTarget/INVALID_SUBCALL');
            });
            it('reverts if minBuyAmount is not satisfied', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                await createUniswapV2PoolAsync(uniV2Factory, dai, zrx);
                const uniswapV2Subcall = getUniswapV2MultiHopSubcall([dai.address, zrx.address]);
                await mintToAsync(dai, taker, sellAmount);

                const tx = multiplex
                    .multiplexMultiHopSellTokenForToken(
                        [dai.address, zrx.address],
                        [uniswapV2Subcall],
                        sellAmount,
                        constants.MAX_UINT256,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                return expect(tx).to.revertWith('MultiplexFeature::_multiplexMultiHopSell/UNDERBOUGHT');
            });
            it('reverts if array lengths are mismatched', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                await createUniswapV2PoolAsync(uniV2Factory, dai, zrx);
                const uniswapV2Subcall = getUniswapV2MultiHopSubcall([dai.address, zrx.address]);
                await mintToAsync(dai, taker, sellAmount);

                const tx = multiplex
                    .multiplexMultiHopSellTokenForToken(
                        [dai.address, zrx.address],
                        [uniswapV2Subcall, uniswapV2Subcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                return expect(tx).to.revertWith('MultiplexFeature::_multiplexMultiHopSell/MISMATCHED_ARRAY_LENGTHS');
            });
            it('UniswapV2 -> LiquidityProvider', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const buyAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, dai, shib);
                const uniswapV2Subcall = getUniswapV2MultiHopSubcall([dai.address, shib.address]);
                const liquidityProviderSubcall = getLiquidityProviderMultiHopSubcall();
                await mintToAsync(dai, taker, sellAmount);
                await mintToAsync(zrx, liquidityProvider.address, buyAmount);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForToken(
                        [dai.address, shib.address, zrx.address],
                        [uniswapV2Subcall, liquidityProviderSubcall],
                        sellAmount,
                        buyAmount,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: uniswap.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: uniswap.address,
                            to: liquidityProvider.address,
                        },
                        {
                            token: zrx.address,
                            from: liquidityProvider.address,
                            to: taker,
                            value: buyAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('LiquidityProvider -> Sushiswap', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const shibAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const liquidityProviderSubcall = getLiquidityProviderMultiHopSubcall();
                const sushiswap = await createUniswapV2PoolAsync(sushiFactory, shib, zrx);
                const sushiswapSubcall = getUniswapV2MultiHopSubcall([shib.address, zrx.address], true);
                await mintToAsync(dai, taker, sellAmount);
                await mintToAsync(shib, liquidityProvider.address, shibAmount);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForToken(
                        [dai.address, shib.address, zrx.address],
                        [liquidityProviderSubcall, sushiswapSubcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: liquidityProvider.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: liquidityProvider.address,
                            to: sushiswap.address,
                            value: shibAmount,
                        },
                        {
                            token: zrx.address,
                            from: sushiswap.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('UniswapV3 -> BatchSell(RFQ, UniswapV2)', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                await mintToAsync(dai, taker, sellAmount);
                const uniV3 = await createUniswapV3PoolAsync(dai, shib);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([dai, shib]);
                const rfqOrder = getTestRfqOrder({ takerToken: shib.address, makerToken: zrx.address });
                const rfqFillProportion = 0.42;
                const rfqSubcall = await getRfqSubcallAsync(rfqOrder, encodeFractionalFillAmount(rfqFillProportion));
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, shib, zrx);
                const uniV2Subcall = getUniswapV2BatchSubcall(
                    [shib.address, zrx.address],
                    encodeFractionalFillAmount(1),
                );
                const nestedBatchSellSubcall = getNestedBatchSellSubcall([rfqSubcall, uniV2Subcall]);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForToken(
                        [dai.address, shib.address, zrx.address],
                        [uniV3Subcall, nestedBatchSellSubcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: shib.address,
                            from: uniV3.address,
                            to: zeroEx.address,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV3.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: maker,
                        },
                        {
                            token: zrx.address,
                            from: maker,
                            to: taker,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: uniV2.address,
                        },
                        {
                            token: zrx.address,
                            from: uniV2.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('BatchSell(RFQ, UniswapV2) -> UniswapV3', async () => {
                const rfqOrder = getTestRfqOrder({ takerToken: dai.address, makerToken: shib.address });
                const rfqSubcall = await getRfqSubcallAsync(rfqOrder, rfqOrder.takerAmount);
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, dai, shib);
                const uniV2Subcall = getUniswapV2BatchSubcall([dai.address, shib.address]);
                const sellAmount = rfqSubcall.sellAmount.plus(uniV2Subcall.sellAmount);
                await mintToAsync(dai, taker, sellAmount);
                const nestedBatchSellSubcall = getNestedBatchSellSubcall([rfqSubcall, uniV2Subcall]);

                const uniV3 = await createUniswapV3PoolAsync(shib, zrx);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([shib, zrx]);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForToken(
                        [dai.address, shib.address, zrx.address],
                        [nestedBatchSellSubcall, uniV3Subcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: maker,
                            value: rfqOrder.takerAmount,
                        },
                        {
                            token: shib.address,
                            from: maker,
                            to: zeroEx.address,
                            value: rfqOrder.makerAmount,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV2.address,
                            value: uniV2Subcall.sellAmount,
                        },
                        {
                            token: shib.address,
                            from: uniV2.address,
                            to: zeroEx.address,
                        },
                        {
                            token: zrx.address,
                            from: uniV3.address,
                            to: taker,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: uniV3.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
        });
        describe('multiplexMultiHopSellEthForToken', () => {
            it('reverts if first token is not WETH', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                await createUniswapV2PoolAsync(uniV2Factory, weth, zrx);
                const uniswapV2Subcall = getUniswapV2MultiHopSubcall([weth.address, zrx.address]);
                await mintToAsync(weth, taker, sellAmount);

                const tx = multiplex
                    .multiplexMultiHopSellEthForToken(
                        [dai.address, zrx.address],
                        [uniswapV2Subcall],
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
                return expect(tx).to.revertWith('MultiplexFeature::multiplexMultiHopSellEthForToken/NOT_WETH');
            });
            it('UniswapV2 -> LiquidityProvider', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const buyAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, weth, shib);
                const uniswapV2Subcall = getUniswapV2MultiHopSubcall([weth.address, shib.address]);
                const liquidityProviderSubcall = getLiquidityProviderMultiHopSubcall();
                await mintToAsync(zrx, liquidityProvider.address, buyAmount);

                const tx = await multiplex
                    .multiplexMultiHopSellEthForToken(
                        [weth.address, shib.address, zrx.address],
                        [uniswapV2Subcall, liquidityProviderSubcall],
                        buyAmount,
                    )
                    .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address, value: sellAmount }], TestWethEvents.Deposit);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: uniswap.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: uniswap.address,
                            to: liquidityProvider.address,
                        },
                        {
                            token: zrx.address,
                            from: liquidityProvider.address,
                            to: taker,
                            value: buyAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('LiquidityProvider -> Sushiswap', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const shibAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const liquidityProviderSubcall = getLiquidityProviderMultiHopSubcall();
                const sushiswap = await createUniswapV2PoolAsync(sushiFactory, shib, zrx);
                const sushiswapSubcall = getUniswapV2MultiHopSubcall([shib.address, zrx.address], true);
                await mintToAsync(shib, liquidityProvider.address, shibAmount);

                const tx = await multiplex
                    .multiplexMultiHopSellEthForToken(
                        [weth.address, shib.address, zrx.address],
                        [liquidityProviderSubcall, sushiswapSubcall],
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address, value: sellAmount }], TestWethEvents.Deposit);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: liquidityProvider.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: liquidityProvider.address,
                            to: sushiswap.address,
                            value: shibAmount,
                        },
                        {
                            token: zrx.address,
                            from: sushiswap.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('UniswapV3 -> BatchSell(RFQ, UniswapV2)', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const uniV3 = await createUniswapV3PoolAsync(weth, shib);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([weth, shib]);
                const rfqOrder = getTestRfqOrder({ takerToken: shib.address, makerToken: zrx.address });
                const rfqFillProportion = 0.42;
                const rfqSubcall = await getRfqSubcallAsync(rfqOrder, encodeFractionalFillAmount(rfqFillProportion));
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, shib, zrx);
                const uniV2Subcall = getUniswapV2BatchSubcall(
                    [shib.address, zrx.address],
                    encodeFractionalFillAmount(1),
                );
                const nestedBatchSellSubcall = getNestedBatchSellSubcall([rfqSubcall, uniV2Subcall]);

                const tx = await multiplex
                    .multiplexMultiHopSellEthForToken(
                        [weth.address, shib.address, zrx.address],
                        [uniV3Subcall, nestedBatchSellSubcall],
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address, value: sellAmount }], TestWethEvents.Deposit);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: shib.address,
                            from: uniV3.address,
                            to: zeroEx.address,
                        },
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: uniV3.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: maker,
                        },
                        {
                            token: zrx.address,
                            from: maker,
                            to: taker,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: uniV2.address,
                        },
                        {
                            token: zrx.address,
                            from: uniV2.address,
                            to: taker,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
            it('BatchSell(RFQ, UniswapV2) -> UniswapV3', async () => {
                const rfqOrder = getTestRfqOrder({ takerToken: weth.address, makerToken: shib.address });
                const rfqSubcall = await getRfqSubcallAsync(rfqOrder, rfqOrder.takerAmount);
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, weth, shib);
                const uniV2Subcall = getUniswapV2BatchSubcall([weth.address, shib.address]);
                const sellAmount = rfqSubcall.sellAmount.plus(uniV2Subcall.sellAmount);
                const nestedBatchSellSubcall = getNestedBatchSellSubcall([rfqSubcall, uniV2Subcall]);

                const uniV3 = await createUniswapV3PoolAsync(shib, zrx);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([shib, zrx]);

                const tx = await multiplex
                    .multiplexMultiHopSellEthForToken(
                        [weth.address, shib.address, zrx.address],
                        [nestedBatchSellSubcall, uniV3Subcall],
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address, value: sellAmount }], TestWethEvents.Deposit);
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: maker,
                            value: rfqOrder.takerAmount,
                        },
                        {
                            token: shib.address,
                            from: maker,
                            to: zeroEx.address,
                            value: rfqOrder.makerAmount,
                        },
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: uniV2.address,
                            value: uniV2Subcall.sellAmount,
                        },
                        {
                            token: shib.address,
                            from: uniV2.address,
                            to: zeroEx.address,
                        },
                        {
                            token: zrx.address,
                            from: uniV3.address,
                            to: taker,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: uniV3.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
            });
        });
        describe('multiplexMultiHopSellTokenForEth', () => {
            it('reverts if last token is not WETH', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                await createUniswapV2PoolAsync(uniV2Factory, zrx, weth);
                const uniswapV2Subcall = getUniswapV2MultiHopSubcall([zrx.address, weth.address]);
                await mintToAsync(zrx, taker, sellAmount);

                const tx = multiplex
                    .multiplexMultiHopSellTokenForEth(
                        [zrx.address, dai.address],
                        [uniswapV2Subcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                return expect(tx).to.revertWith('MultiplexFeature::multiplexMultiHopSellTokenForEth/NOT_WETH');
            });
            it('UniswapV2 -> LiquidityProvider', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const buyAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const uniswap = await createUniswapV2PoolAsync(uniV2Factory, dai, shib);
                const uniswapV2Subcall = getUniswapV2MultiHopSubcall([dai.address, shib.address]);
                const liquidityProviderSubcall = getLiquidityProviderMultiHopSubcall();
                await mintToAsync(dai, taker, sellAmount);
                await mintToAsync(weth, liquidityProvider.address, buyAmount);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForEth(
                        [dai.address, shib.address, weth.address],
                        [uniswapV2Subcall, liquidityProviderSubcall],
                        sellAmount,
                        buyAmount,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: uniswap.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: uniswap.address,
                            to: liquidityProvider.address,
                        },
                        {
                            token: weth.address,
                            from: liquidityProvider.address,
                            to: zeroEx.address,
                            value: buyAmount,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address, value: buyAmount }], TestWethEvents.Withdrawal);
            });
            it('LiquidityProvider -> Sushiswap', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const shibAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const liquidityProviderSubcall = getLiquidityProviderMultiHopSubcall();
                const sushiswap = await createUniswapV2PoolAsync(sushiFactory, shib, weth);
                const sushiswapSubcall = getUniswapV2MultiHopSubcall([shib.address, weth.address], true);
                await mintToAsync(dai, taker, sellAmount);
                await mintToAsync(shib, liquidityProvider.address, shibAmount);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForEth(
                        [dai.address, shib.address, weth.address],
                        [liquidityProviderSubcall, sushiswapSubcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: liquidityProvider.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: liquidityProvider.address,
                            to: sushiswap.address,
                            value: shibAmount,
                        },
                        {
                            token: weth.address,
                            from: sushiswap.address,
                            to: zeroEx.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
            });
            it('UniswapV3 -> BatchSell(RFQ, UniswapV2)', async () => {
                const sellAmount = getRandomInteger(1, toBaseUnitAmount(1));
                const uniV3 = await createUniswapV3PoolAsync(dai, shib);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([dai, shib]);
                const rfqOrder = getTestRfqOrder({ takerToken: shib.address, makerToken: weth.address });
                const rfqFillProportion = 0.42;
                const rfqSubcall = await getRfqSubcallAsync(rfqOrder, encodeFractionalFillAmount(rfqFillProportion));
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, shib, weth);
                const uniV2Subcall = getUniswapV2BatchSubcall(
                    [shib.address, weth.address],
                    encodeFractionalFillAmount(1),
                );
                const nestedBatchSellSubcall = getNestedBatchSellSubcall([rfqSubcall, uniV2Subcall]);
                await mintToAsync(dai, taker, sellAmount);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForEth(
                        [dai.address, shib.address, weth.address],
                        [uniV3Subcall, nestedBatchSellSubcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: shib.address,
                            from: uniV3.address,
                            to: zeroEx.address,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV3.address,
                            value: sellAmount,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: maker,
                        },
                        {
                            token: weth.address,
                            from: maker,
                            to: zeroEx.address,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: uniV2.address,
                        },
                        {
                            token: weth.address,
                            from: uniV2.address,
                            to: zeroEx.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
            });
            it('BatchSell(RFQ, UniswapV2) -> UniswapV3', async () => {
                const rfqOrder = getTestRfqOrder({ takerToken: dai.address, makerToken: shib.address });
                const rfqSubcall = await getRfqSubcallAsync(rfqOrder, rfqOrder.takerAmount);
                const uniV2 = await createUniswapV2PoolAsync(uniV2Factory, dai, shib);
                const uniV2Subcall = getUniswapV2BatchSubcall([dai.address, shib.address]);
                const sellAmount = rfqSubcall.sellAmount.plus(uniV2Subcall.sellAmount);
                const nestedBatchSellSubcall = getNestedBatchSellSubcall([rfqSubcall, uniV2Subcall]);
                await mintToAsync(dai, taker, sellAmount);
                const uniV3 = await createUniswapV3PoolAsync(shib, weth);
                const uniV3Subcall = getUniswapV3MultiHopSubcall([shib, weth]);

                const tx = await multiplex
                    .multiplexMultiHopSellTokenForEth(
                        [dai.address, shib.address, weth.address],
                        [nestedBatchSellSubcall, uniV3Subcall],
                        sellAmount,
                        constants.ZERO_AMOUNT,
                    )
                    .awaitTransactionSuccessAsync({ from: taker });
                verifyEventsFromLogs<TransferEvent>(
                    tx.logs,
                    [
                        {
                            token: dai.address,
                            from: taker,
                            to: maker,
                            value: rfqOrder.takerAmount,
                        },
                        {
                            token: shib.address,
                            from: maker,
                            to: zeroEx.address,
                            value: rfqOrder.makerAmount,
                        },
                        {
                            token: dai.address,
                            from: taker,
                            to: uniV2.address,
                            value: uniV2Subcall.sellAmount,
                        },
                        {
                            token: shib.address,
                            from: uniV2.address,
                            to: zeroEx.address,
                        },
                        {
                            token: weth.address,
                            from: uniV3.address,
                            to: zeroEx.address,
                        },
                        {
                            token: shib.address,
                            from: zeroEx.address,
                            to: uniV3.address,
                        },
                    ],
                    TestMintableERC20TokenEvents.Transfer,
                );
                verifyEventsFromLogs(tx.logs, [{ owner: zeroEx.address }], TestWethEvents.Withdrawal);
            });
        });
    });
});
