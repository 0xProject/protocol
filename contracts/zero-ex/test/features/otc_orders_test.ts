import {
    blockchainTests,
    constants,
    describe,
    expect,
    getRandomPortion,
    randomAddress,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import {
    LimitOrder,
    LimitOrderFields,
    OrderStatus,
    RevertErrors,
    RfqOrder,
    RfqOrderFields,
    SignatureType,
} from '@0x/protocol-utils';
import { AnyRevertError, BigNumber } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs } from 'ethereum-types';

import { IZeroExContract, IZeroExEvents } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { fullMigrateAsync } from '../utils/migration';
import {
    assertOrderInfoEquals,
    computeLimitOrderFilledAmounts,
    computeRfqOrderFilledAmounts,
    createExpiry,
    getActualFillableTakerTokenAmount,
    getFillableMakerTokenAmount,
    getRandomLimitOrder,
    getRandomRfqOrder,
    NativeOrdersTestEnvironment,
} from '../utils/orders';
import {
    TestMintableERC20TokenContract,
    TestOrderSignerRegistryWithContractWalletContract,
    TestRfqOriginRegistrationContract,
} from '../wrappers';

blockchainTests.resets('NativeOrdersFeature', env => {
    const { NULL_ADDRESS, MAX_UINT256, NULL_BYTES32, ZERO_AMOUNT } = constants;
    const GAS_PRICE = new BigNumber('123e9');
    const PROTOCOL_FEE_MULTIPLIER = 1337e3;
    const SINGLE_PROTOCOL_FEE = GAS_PRICE.times(PROTOCOL_FEE_MULTIPLIER);
    let maker: string;
    let taker: string;
    let notMaker: string;
    let notTaker: string;
    let contractWalletOwner: string;
    let contractWalletSigner: string;
    let zeroEx: IZeroExContract;
    let verifyingContract: string;
    let makerToken: TestMintableERC20TokenContract;
    let takerToken: TestMintableERC20TokenContract;
    let wethToken: TestMintableERC20TokenContract;
    let testRfqOriginRegistration: TestRfqOriginRegistrationContract;
    let contractWallet: TestOrderSignerRegistryWithContractWalletContract;
    let testUtils: NativeOrdersTestEnvironment;

    before(async () => {
        let owner;
        [
            owner,
            maker,
            taker,
            notMaker,
            notTaker,
            contractWalletOwner,
            contractWalletSigner,
        ] = await env.getAccountAddressesAsync();
        [makerToken, takerToken, wethToken] = await Promise.all(
            [...new Array(3)].map(async () =>
                TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
                    artifacts.TestMintableERC20Token,
                    env.provider,
                    env.txDefaults,
                    artifacts,
                ),
            ),
        );
        zeroEx = await fullMigrateAsync(
            owner,
            env.provider,
            { ...env.txDefaults, gasPrice: GAS_PRICE },
            {},
            { wethAddress: wethToken.address, protocolFeeMultiplier: PROTOCOL_FEE_MULTIPLIER },
            { nativeOrders: artifacts.TestNativeOrdersFeature },
        );
        verifyingContract = zeroEx.address;
        await Promise.all(
            [maker, notMaker].map(a =>
                makerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: a }),
            ),
        );
        await Promise.all(
            [taker, notTaker].map(a =>
                takerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: a }),
            ),
        );
        testRfqOriginRegistration = await TestRfqOriginRegistrationContract.deployFrom0xArtifactAsync(
            artifacts.TestRfqOriginRegistration,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        // contract wallet for signer delegation
        contractWallet = await TestOrderSignerRegistryWithContractWalletContract.deployFrom0xArtifactAsync(
            artifacts.TestOrderSignerRegistryWithContractWallet,
            env.provider,
            {
                from: contractWalletOwner,
            },
            artifacts,
            zeroEx.address,
        );

        await contractWallet
            .approveERC20(makerToken.address, zeroEx.address, MAX_UINT256)
            .awaitTransactionSuccessAsync({ from: contractWalletOwner });

        testUtils = new NativeOrdersTestEnvironment(
            maker,
            taker,
            makerToken,
            takerToken,
            zeroEx,
            GAS_PRICE,
            SINGLE_PROTOCOL_FEE,
            env,
        );
    });

    function getTestLimitOrder(fields: Partial<LimitOrderFields> = {}): LimitOrder {
        return getRandomLimitOrder({
            maker,
            verifyingContract,
            chainId: 1337,
            takerToken: takerToken.address,
            makerToken: makerToken.address,
            taker: NULL_ADDRESS,
            sender: NULL_ADDRESS,
            ...fields,
        });
    }

    function getTestRfqOrder(fields: Partial<RfqOrderFields> = {}): RfqOrder {
        return getRandomRfqOrder({
            maker,
            verifyingContract,
            chainId: 1337,
            takerToken: takerToken.address,
            makerToken: makerToken.address,
            txOrigin: taker,
            ...fields,
        });
    }

    describe('getRfqOrderHash()', () => {
        it('returns the correct hash', async () => {
            const order = getTestRfqOrder();
            const hash = await zeroEx.getRfqOrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
    });

    describe('getRfqOrderInfo()', () => {
        it('unfilled order', async () => {
            const order = getTestRfqOrder();
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        });

        it('unfilled cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        });

        it('unfilled expired order', async () => {
            const expiry = createExpiry(-60);
            const order = getTestRfqOrder({ expiry });
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Expired,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        });

        it('filled then expired order', async () => {
            const expiry = createExpiry(60);
            const order = getTestRfqOrder({ expiry });
            await testUtils.prepareBalancesForOrdersAsync([order]);
            const sig = await order.getSignatureWithProviderAsync(env.provider);
            // Fill the order first.
            await zeroEx.fillRfqOrder(order, sig, order.takerAmount).awaitTransactionSuccessAsync({ from: taker });
            // Advance time to expire the order.
            await env.web3Wrapper.increaseTimeAsync(61);
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Filled, // Still reports filled.
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('filled order', async () => {
            const order = getTestRfqOrder();
            // Fill the order first.
            await testUtils.fillRfqOrderAsync(order, order.takerAmount, taker);
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('partially filled order', async () => {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            await testUtils.fillRfqOrderAsync(order, fillAmount);
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        });

        it('filled then cancelled order', async () => {
            const order = getTestRfqOrder();
            // Fill the order first.
            await testUtils.fillRfqOrderAsync(order);
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Filled, // Still reports filled.
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('partially filled then cancelled order', async () => {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            await testUtils.fillRfqOrderAsync(order, fillAmount);
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        });

        it('invalid origin', async () => {
            const order = getTestRfqOrder({ txOrigin: NULL_ADDRESS });
            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Invalid,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        });
    });

    async function assertExpectedFinalBalancesFromRfqOrderFillAsync(
        order: RfqOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO_AMOUNT,
    ): Promise<void> {
        const { makerTokenFilledAmount, takerTokenFilledAmount } = computeRfqOrderFilledAmounts(
            order,
            takerTokenFillAmount,
            takerTokenAlreadyFilledAmount,
        );
        const makerBalance = await takerToken.balanceOf(maker).callAsync();
        const takerBalance = await makerToken.balanceOf(taker).callAsync();
        expect(makerBalance).to.bignumber.eq(takerTokenFilledAmount);
        expect(takerBalance).to.bignumber.eq(makerTokenFilledAmount);
    }

    describe('fillRfqOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestRfqOrder();
            const receipt = await testUtils.fillRfqOrderAsync(order);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createRfqOrderFilledEventArgs(order)],
                IZeroExEvents.RfqOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            await assertExpectedFinalBalancesFromRfqOrderFillAsync(order);
        });

        it('can partially fill an order', async () => {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.minus(1);
            const receipt = await testUtils.fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Fillable,
                takerTokenFilledAmount: fillAmount,
            });
            await assertExpectedFinalBalancesFromRfqOrderFillAsync(order, fillAmount);
        });

        it('can fully fill an order in two steps', async () => {
            const order = getTestRfqOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = await testUtils.fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount);
            receipt = await testUtils.fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createRfqOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('clamps fill amount to remaining available', async () => {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.plus(1);
            const receipt = await testUtils.fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            await assertExpectedFinalBalancesFromRfqOrderFillAsync(order, fillAmount);
        });

        it('clamps fill amount to remaining available in partial filled order', async () => {
            const order = getTestRfqOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = await testUtils.fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount).plus(1);
            receipt = await testUtils.fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createRfqOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('cannot fill an order with wrong tx.origin', async () => {
            const order = getTestRfqOrder();
            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTaker, taker),
            );
        });

        it('can fill an order from a different tx.origin if registered', async () => {
            const order = getTestRfqOrder();

            const receipt = await zeroEx
                .registerAllowedRfqOrigins([notTaker], true)
                .awaitTransactionSuccessAsync({ from: taker });
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        origin: taker,
                        addrs: [notTaker],
                        allowed: true,
                    },
                ],
                IZeroExEvents.RfqOrderOriginsAllowed,
            );
            return testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
        });

        it('cannot fill an order with registered then unregistered tx.origin', async () => {
            const order = getTestRfqOrder();

            await zeroEx.registerAllowedRfqOrigins([notTaker], true).awaitTransactionSuccessAsync({ from: taker });
            const receipt = await zeroEx
                .registerAllowedRfqOrigins([notTaker], false)
                .awaitTransactionSuccessAsync({ from: taker });
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        origin: taker,
                        addrs: [notTaker],
                        allowed: false,
                    },
                ],
                IZeroExEvents.RfqOrderOriginsAllowed,
            );

            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTaker, taker),
            );
        });

        it('cannot fill an order with a zero tx.origin', async () => {
            const order = getTestRfqOrder({ txOrigin: NULL_ADDRESS });
            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Invalid),
            );
        });

        it('non-taker cannot fill order', async () => {
            const order = getTestRfqOrder({ taker, txOrigin: notTaker });
            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByTakerError(order.getHash(), notTaker, order.taker),
            );
        });

        it('cannot fill an expired order', async () => {
            const order = getTestRfqOrder({ expiry: createExpiry(-60) });
            const tx = testUtils.fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Expired),
            );
        });

        it('cannot fill a cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const tx = testUtils.fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill a salt/pair cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx
                .cancelPairRfqOrders(makerToken.address, takerToken.address, order.salt.plus(1))
                .awaitTransactionSuccessAsync({ from: maker });
            const tx = testUtils.fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill order with bad signature', async () => {
            const order = getTestRfqOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = testUtils.fillRfqOrderAsync(order.clone({ chainId: 1234 }));
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker),
            );
        });

        it('fails if ETH is attached', async () => {
            const order = getTestRfqOrder();
            await testUtils.prepareBalancesForOrdersAsync([order], taker);
            const tx = zeroEx
                .fillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: 1 });
            // This will revert at the language level because the fill function is not payable.
            return expect(tx).to.be.rejectedWith('revert');
        });
    });

    async function fundOrderMakerAsync(
        order: LimitOrder | RfqOrder,
        balance: BigNumber = order.makerAmount,
        allowance: BigNumber = order.makerAmount,
    ): Promise<void> {
        await makerToken.burn(maker, await makerToken.balanceOf(maker).callAsync()).awaitTransactionSuccessAsync();
        await makerToken.mint(maker, balance).awaitTransactionSuccessAsync();
        await makerToken.approve(zeroEx.address, allowance).awaitTransactionSuccessAsync({ from: maker });
    }

    describe('getRfqOrderRelevantState()', () => {
        it('works with an empty order', async () => {
            const order = getTestRfqOrder({
                takerAmount: ZERO_AMOUNT,
            });
            await fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getRfqOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            expect(fillableTakerAmount).to.bignumber.eq(0);
            expect(isSignatureValid).to.eq(true);
        });

        it('works with cancelled order', async () => {
            const order = getTestRfqOrder();
            await fundOrderMakerAsync(order);
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getRfqOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: OrderStatus.Cancelled,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            expect(fillableTakerAmount).to.bignumber.eq(0);
            expect(isSignatureValid).to.eq(true);
        });

        it('works with a bad signature', async () => {
            const order = getTestRfqOrder();
            await fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getRfqOrderRelevantState(
                    order,
                    await order.clone({ maker: notMaker }).getSignatureWithProviderAsync(env.provider),
                )
                .callAsync();
            expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: OrderStatus.Fillable,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            expect(fillableTakerAmount).to.bignumber.eq(order.takerAmount);
            expect(isSignatureValid).to.eq(false);
        });

        it('works with an unfilled order', async () => {
            const order = getTestRfqOrder();
            await fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getRfqOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: OrderStatus.Fillable,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            expect(fillableTakerAmount).to.bignumber.eq(order.takerAmount);
            expect(isSignatureValid).to.eq(true);
        });

        it('works with a fully filled order', async () => {
            const order = getTestRfqOrder();
            // Fully Fund maker and taker.
            await fundOrderMakerAsync(order);
            await takerToken.mint(taker, order.takerAmount);
            await testUtils.fillRfqOrderAsync(order);
            // Partially fill the order.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getRfqOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            expect(fillableTakerAmount).to.bignumber.eq(0);
            expect(isSignatureValid).to.eq(true);
        });

        it('works with an under-funded, partially-filled order', async () => {
            const order = getTestRfqOrder();
            // Fully Fund maker and taker.
            await fundOrderMakerAsync(order);
            await takerToken.mint(taker, order.takerAmount).awaitTransactionSuccessAsync();
            // Partially fill the order.
            const fillAmount = getRandomPortion(order.takerAmount);
            await testUtils.fillRfqOrderAsync(order, fillAmount);
            // Reduce maker funds to be < remaining.
            const remainingMakerAmount = getFillableMakerTokenAmount(order, fillAmount);
            const balance = getRandomPortion(remainingMakerAmount);
            const allowance = getRandomPortion(remainingMakerAmount);
            await fundOrderMakerAsync(order, balance, allowance);
            // Get order state.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getRfqOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: OrderStatus.Fillable,
                takerTokenFilledAmount: fillAmount,
            });
            expect(fillableTakerAmount).to.bignumber.eq(
                getActualFillableTakerTokenAmount(order, balance, allowance, fillAmount),
            );
            expect(isSignatureValid).to.eq(true);
        });
    });

    async function batchFundOrderMakerAsync(orders: Array<LimitOrder | RfqOrder>): Promise<void> {
        await makerToken.burn(maker, await makerToken.balanceOf(maker).callAsync()).awaitTransactionSuccessAsync();
        const balance = BigNumber.sum(...orders.map(o => o.makerAmount));
        await makerToken.mint(maker, balance).awaitTransactionSuccessAsync();
        await makerToken.approve(zeroEx.address, balance).awaitTransactionSuccessAsync({ from: maker });
    }

    describe('batchGetLimitOrderRelevantStates()', () => {
        it('works with multiple orders', async () => {
            const orders = new Array(3).fill(0).map(() => getTestLimitOrder());
            await batchFundOrderMakerAsync(orders);
            const [orderInfos, fillableTakerAmounts, isSignatureValids] = await zeroEx
                .batchGetLimitOrderRelevantStates(
                    orders,
                    await Promise.all(orders.map(async o => o.getSignatureWithProviderAsync(env.provider))),
                )
                .callAsync();
            expect(orderInfos).to.be.length(orders.length);
            expect(fillableTakerAmounts).to.be.length(orders.length);
            expect(isSignatureValids).to.be.length(orders.length);
            for (let i = 0; i < orders.length; ++i) {
                expect(orderInfos[i]).to.deep.eq({
                    orderHash: orders[i].getHash(),
                    status: OrderStatus.Fillable,
                    takerTokenFilledAmount: ZERO_AMOUNT,
                });
                expect(fillableTakerAmounts[i]).to.bignumber.eq(orders[i].takerAmount);
                expect(isSignatureValids[i]).to.eq(true);
            }
        });
        it('swallows reverts', async () => {
            const orders = new Array(3).fill(0).map(() => getTestLimitOrder());
            // The second order will revert because its maker token is not valid.
            orders[1].makerToken = randomAddress();
            await batchFundOrderMakerAsync(orders);
            const [orderInfos, fillableTakerAmounts, isSignatureValids] = await zeroEx
                .batchGetLimitOrderRelevantStates(
                    orders,
                    await Promise.all(orders.map(async o => o.getSignatureWithProviderAsync(env.provider))),
                )
                .callAsync();
            expect(orderInfos).to.be.length(orders.length);
            expect(fillableTakerAmounts).to.be.length(orders.length);
            expect(isSignatureValids).to.be.length(orders.length);
            for (let i = 0; i < orders.length; ++i) {
                expect(orderInfos[i]).to.deep.eq({
                    orderHash: i === 1 ? NULL_BYTES32 : orders[i].getHash(),
                    status: i === 1 ? OrderStatus.Invalid : OrderStatus.Fillable,
                    takerTokenFilledAmount: ZERO_AMOUNT,
                });
                expect(fillableTakerAmounts[i]).to.bignumber.eq(i === 1 ? ZERO_AMOUNT : orders[i].takerAmount);
                expect(isSignatureValids[i]).to.eq(i !== 1);
            }
        });
    });

    describe('registerAllowedSigner()', () => {
        it('allows for fills on orders signed by a approved signer', async () => {
            const order = getTestRfqOrder({ maker: contractWallet.address });
            const sig = await order.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EthSign,
                contractWalletSigner,
            );

            // covers taker
            await testUtils.prepareBalancesForOrdersAsync([order]);
            // need to provide contract wallet with a balance
            await makerToken.mint(contractWallet.address, order.makerAmount).awaitTransactionSuccessAsync();

            await contractWallet
                .registerAllowedOrderSigner(contractWalletSigner, true)
                .awaitTransactionSuccessAsync({ from: contractWalletOwner });

            await zeroEx.fillRfqOrder(order, sig, order.takerAmount).awaitTransactionSuccessAsync({ from: taker });

            const info = await zeroEx.getRfqOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('disallows fills if the signer is revoked', async () => {
            const order = getTestRfqOrder({ maker: contractWallet.address });
            const sig = await order.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EthSign,
                contractWalletSigner,
            );

            // covers taker
            await testUtils.prepareBalancesForOrdersAsync([order]);
            // need to provide contract wallet with a balance
            await makerToken.mint(contractWallet.address, order.makerAmount).awaitTransactionSuccessAsync();

            // first allow signer
            await contractWallet
                .registerAllowedOrderSigner(contractWalletSigner, true)
                .awaitTransactionSuccessAsync({ from: contractWalletOwner });

            // then disallow signer
            await contractWallet
                .registerAllowedOrderSigner(contractWalletSigner, false)
                .awaitTransactionSuccessAsync({ from: contractWalletOwner });

            const tx = zeroEx.fillRfqOrder(order, sig, order.takerAmount).awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(
                    order.getHash(),
                    contractWalletSigner,
                    order.maker,
                ),
            );
        });

        it(`doesn't allow fills with an unapproved signer`, async () => {
            const order = getTestRfqOrder({ maker: contractWallet.address });
            const sig = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EthSign, maker);

            // covers taker
            await testUtils.prepareBalancesForOrdersAsync([order]);
            // need to provide contract wallet with a balance
            await makerToken.mint(contractWallet.address, order.makerAmount).awaitTransactionSuccessAsync();

            const tx = zeroEx.fillRfqOrder(order, sig, order.takerAmount).awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), maker, order.maker),
            );
        });
    });
});
