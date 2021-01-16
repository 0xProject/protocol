import { blockchainTests, constants, describe, expect, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import {
    LimitOrder,
    LimitOrderFields,
    OrderInfo,
    OrderStatus,
    RevertErrors,
    RfqOrder,
    RfqOrderFields,
} from '@0x/protocol-utils';
import { AnyRevertError, BigNumber } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs } from 'ethereum-types';

import { IZeroExContract, IZeroExEvents } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { fullMigrateAsync } from '../utils/migration';
import { getRandomLimitOrder, getRandomRfqOrder } from '../utils/orders';
import { TestMintableERC20TokenContract, TestRfqOriginRegistrationContract } from '../wrappers';

blockchainTests.resets('NativeOrdersFeature', env => {
    const { NULL_ADDRESS, MAX_UINT256, ZERO_AMOUNT } = constants;
    const GAS_PRICE = new BigNumber('123e9');
    const PROTOCOL_FEE_MULTIPLIER = 1337e3;
    const SINGLE_PROTOCOL_FEE = GAS_PRICE.times(PROTOCOL_FEE_MULTIPLIER);
    let maker: string;
    let taker: string;
    let notMaker: string;
    let notTaker: string;
    let zeroEx: IZeroExContract;
    let verifyingContract: string;
    let makerToken: TestMintableERC20TokenContract;
    let takerToken: TestMintableERC20TokenContract;
    let wethToken: TestMintableERC20TokenContract;
    let testRfqOriginRegistration: TestRfqOriginRegistrationContract;

    before(async () => {
        let owner;
        [owner, maker, taker, notMaker, notTaker] = await env.getAccountAddressesAsync();
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
    });

    function getTestLimitOrder(fields: Partial<LimitOrderFields> = {}): LimitOrder {
        return getRandomLimitOrder({
            maker,
            verifyingContract,
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
            takerToken: takerToken.address,
            makerToken: makerToken.address,
            txOrigin: taker,
            ...fields,
        });
    }

    async function prepareBalancesForOrderAsync(order: LimitOrder | RfqOrder, _taker: string = taker): Promise<void> {
        await makerToken.mint(maker, order.makerAmount).awaitTransactionSuccessAsync();
        if ('takerTokenFeeAmount' in order) {
            await takerToken
                .mint(_taker, order.takerAmount.plus(order.takerTokenFeeAmount))
                .awaitTransactionSuccessAsync();
        } else {
            await takerToken.mint(_taker, order.takerAmount).awaitTransactionSuccessAsync();
        }
    }

    function assertOrderInfoEquals(actual: OrderInfo, expected: OrderInfo): void {
        expect(actual.status).to.eq(expected.status);
        expect(actual.orderHash).to.eq(expected.orderHash);
        expect(actual.takerTokenFilledAmount).to.bignumber.eq(expected.takerTokenFilledAmount);
    }

    function createExpiry(deltaSeconds: number = 60): BigNumber {
        return new BigNumber(Math.floor(Date.now() / 1000) + deltaSeconds);
    }

    describe('getProtocolFeeMultiplier()', () => {
        it('returns the protocol fee multiplier', async () => {
            const r = await zeroEx.getProtocolFeeMultiplier().callAsync();
            expect(r).to.bignumber.eq(PROTOCOL_FEE_MULTIPLIER);
        });
    });

    describe('getLimitOrderHash()', () => {
        it('returns the correct hash', async () => {
            const order = getTestLimitOrder();
            const hash = await zeroEx.getLimitOrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
    });

    describe('getRfqOrderHash()', () => {
        it('returns the correct hash', async () => {
            const order = getTestRfqOrder();
            const hash = await zeroEx.getRfqOrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
    });

    async function fillLimitOrderAsync(
        order: LimitOrder,
        opts: Partial<{
            fillAmount: BigNumber | number;
            taker: string;
            protocolFee?: BigNumber | number;
        }> = {},
    ): Promise<TransactionReceiptWithDecodedLogs> {
        const { fillAmount, taker: _taker, protocolFee } = {
            taker,
            fillAmount: order.takerAmount,
            ...opts,
        };
        await prepareBalancesForOrderAsync(order, _taker);
        const _protocolFee = protocolFee === undefined ? SINGLE_PROTOCOL_FEE : protocolFee;
        return zeroEx
            .fillLimitOrder(order, await order.getSignatureWithProviderAsync(env.provider), new BigNumber(fillAmount))
            .awaitTransactionSuccessAsync({ from: _taker, value: _protocolFee });
    }

    describe('getLimitOrderInfo()', () => {
        it('unfilled order', async () => {
            const order = getTestLimitOrder();
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        });

        it('unfilled cancelled order', async () => {
            const order = getTestLimitOrder();
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        });

        it('unfilled expired order', async () => {
            const order = getTestLimitOrder({ expiry: createExpiry(-60) });
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Expired,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        });

        it('filled then expired order', async () => {
            const expiry = createExpiry(60);
            const order = getTestLimitOrder({ expiry });
            // Fill the order first.
            await fillLimitOrderAsync(order);
            // Advance time to expire the order.
            await env.web3Wrapper.increaseTimeAsync(61);
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Filled, // Still reports filled.
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('filled order', async () => {
            const order = getTestLimitOrder();
            // Fill the order first.
            await fillLimitOrderAsync(order);
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('partially filled order', async () => {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            await fillLimitOrderAsync(order, { fillAmount });
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        });

        it('filled then cancelled order', async () => {
            const order = getTestLimitOrder();
            // Fill the order first.
            await fillLimitOrderAsync(order);
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Filled, // Still reports filled.
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('partially filled then cancelled order', async () => {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            await fillLimitOrderAsync(order, { fillAmount });
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = await zeroEx.getLimitOrderInfo(order).callAsync();
            assertOrderInfoEquals(info, {
                status: OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        });
    });

    async function fillRfqOrderAsync(
        order: RfqOrder,
        fillAmount: BigNumber | number = order.takerAmount,
        _taker: string = taker,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        await prepareBalancesForOrderAsync(order, _taker);
        return zeroEx
            .fillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), new BigNumber(fillAmount))
            .awaitTransactionSuccessAsync({ from: _taker });
    }

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
            await prepareBalancesForOrderAsync(order);
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
            await fillRfqOrderAsync(order, order.takerAmount, taker);
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
            await fillRfqOrderAsync(order, fillAmount);
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
            await fillRfqOrderAsync(order);
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
            await fillRfqOrderAsync(order, fillAmount);
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

    describe('cancelLimitOrder()', async () => {
        it('can cancel an unfilled order', async () => {
            const order = getTestLimitOrder();
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a fully filled order', async () => {
            const order = getTestLimitOrder();
            await fillLimitOrderAsync(order);
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Filled); // Still reports filled.
        });

        it('can cancel a partially filled order', async () => {
            const order = getTestLimitOrder();
            await fillLimitOrderAsync(order, { fillAmount: order.takerAmount.minus(1) });
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel an expired order', async () => {
            const expiry = createExpiry(-60);
            const order = getTestLimitOrder({ expiry });
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a cancelled order', async () => {
            const order = getTestLimitOrder();
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it("cannot cancel someone else's order", async () => {
            const order = getTestLimitOrder();
            const tx = zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OnlyOrderMakerAllowed(order.getHash(), notMaker, order.maker),
            );
        });
    });

    describe('cancelRfqOrder()', async () => {
        it('can cancel an unfilled order', async () => {
            const order = getTestRfqOrder();
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a fully filled order', async () => {
            const order = getTestRfqOrder();
            await fillRfqOrderAsync(order);
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Filled); // Still reports filled.
        });

        it('can cancel a partially filled order', async () => {
            const order = getTestRfqOrder();
            await fillRfqOrderAsync(order, order.takerAmount.minus(1));
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled); // Still reports filled.
        });

        it('can cancel an expired order', async () => {
            const expiry = createExpiry(-60);
            const order = getTestRfqOrder({ expiry });
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [{ maker: order.maker, orderHash: order.getHash() }],
                IZeroExEvents.OrderCancelled,
            );
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it("cannot cancel someone else's order", async () => {
            const order = getTestRfqOrder();
            const tx = zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OnlyOrderMakerAllowed(order.getHash(), notMaker, order.maker),
            );
        });
    });

    describe('batchCancelLimitOrders()', async () => {
        it('can cancel multiple orders', async () => {
            const orders = [...new Array(3)].map(() => getTestLimitOrder());
            const receipt = await zeroEx.batchCancelLimitOrders(orders).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                orders.map(o => ({ maker: o.maker, orderHash: o.getHash() })),
                IZeroExEvents.OrderCancelled,
            );
            const infos = await Promise.all(orders.map(o => zeroEx.getLimitOrderInfo(o).callAsync()));
            expect(infos.map(i => i.status)).to.deep.eq(infos.map(() => OrderStatus.Cancelled));
        });

        it("cannot cancel someone else's orders", async () => {
            const orders = [...new Array(3)].map(() => getTestLimitOrder());
            const tx = zeroEx.batchCancelLimitOrders(orders).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OnlyOrderMakerAllowed(orders[0].getHash(), notMaker, orders[0].maker),
            );
        });
    });

    describe('batchCancelRfqOrders()', async () => {
        it('can cancel multiple orders', async () => {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const receipt = await zeroEx.batchCancelRfqOrders(orders).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                orders.map(o => ({ maker: o.maker, orderHash: o.getHash() })),
                IZeroExEvents.OrderCancelled,
            );
            const infos = await Promise.all(orders.map(o => zeroEx.getRfqOrderInfo(o).callAsync()));
            expect(infos.map(i => i.status)).to.deep.eq(infos.map(() => OrderStatus.Cancelled));
        });

        it("cannot cancel someone else's orders", async () => {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const tx = zeroEx.batchCancelRfqOrders(orders).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OnlyOrderMakerAllowed(orders[0].getHash(), notMaker, orders[0].maker),
            );
        });
    });

    describe('cancelPairOrders()', async () => {
        it('can cancel multiple limit orders of the same pair with salt < minValidSalt', async () => {
            const orders = [...new Array(3)].map((_v, i) => getTestLimitOrder().clone({ salt: new BigNumber(i) }));
            // Cancel the first two orders.
            const minValidSalt = orders[2].salt;
            const receipt = await zeroEx
                .cancelPairLimitOrders(makerToken.address, takerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        maker,
                        makerToken: makerToken.address,
                        takerToken: takerToken.address,
                        minValidSalt,
                    },
                ],
                IZeroExEvents.PairCancelledLimitOrders,
            );
            const statuses = (await Promise.all(orders.map(o => zeroEx.getLimitOrderInfo(o).callAsync()))).map(
                oi => oi.status,
            );
            expect(statuses).to.deep.eq([OrderStatus.Cancelled, OrderStatus.Cancelled, OrderStatus.Fillable]);
        });

        it('does not cancel limit orders of a different pair', async () => {
            const order = getRandomLimitOrder({ salt: new BigNumber(1) });
            // Cancel salts <= the order's, but flip the tokens to be a different
            // pair.
            const minValidSalt = order.salt.plus(1);
            await zeroEx
                .cancelPairLimitOrders(takerToken.address, makerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Fillable);
        });

        it('can cancel multiple RFQ orders of the same pair with salt < minValidSalt', async () => {
            const orders = [...new Array(3)].map((_v, i) => getTestRfqOrder().clone({ salt: new BigNumber(i) }));
            // Cancel the first two orders.
            const minValidSalt = orders[2].salt;
            const receipt = await zeroEx
                .cancelPairRfqOrders(makerToken.address, takerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        maker,
                        makerToken: makerToken.address,
                        takerToken: takerToken.address,
                        minValidSalt,
                    },
                ],
                IZeroExEvents.PairCancelledRfqOrders,
            );
            const statuses = (await Promise.all(orders.map(o => zeroEx.getRfqOrderInfo(o).callAsync()))).map(
                oi => oi.status,
            );
            expect(statuses).to.deep.eq([OrderStatus.Cancelled, OrderStatus.Cancelled, OrderStatus.Fillable]);
        });

        it('does not cancel RFQ orders of a different pair', async () => {
            const order = getRandomRfqOrder({ salt: new BigNumber(1) });
            // Cancel salts <= the order's, but flip the tokens to be a different
            // pair.
            const minValidSalt = order.salt.plus(1);
            await zeroEx
                .cancelPairRfqOrders(takerToken.address, makerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Fillable);
        });
    });

    describe('batchCancelPairOrders()', async () => {
        it('can cancel multiple limit order pairs', async () => {
            const orders = [
                getTestLimitOrder({ salt: new BigNumber(1) }),
                // Flip the tokens for the other order.
                getTestLimitOrder({
                    makerToken: takerToken.address,
                    takerToken: makerToken.address,
                    salt: new BigNumber(1),
                }),
            ];
            const minValidSalt = new BigNumber(2);
            const receipt = await zeroEx
                .batchCancelPairLimitOrders(
                    [makerToken.address, takerToken.address],
                    [takerToken.address, makerToken.address],
                    [minValidSalt, minValidSalt],
                )
                .awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        maker,
                        makerToken: makerToken.address,
                        takerToken: takerToken.address,
                        minValidSalt,
                    },
                    {
                        maker,
                        makerToken: takerToken.address,
                        takerToken: makerToken.address,
                        minValidSalt,
                    },
                ],
                IZeroExEvents.PairCancelledLimitOrders,
            );
            const statuses = (await Promise.all(orders.map(o => zeroEx.getLimitOrderInfo(o).callAsync()))).map(
                oi => oi.status,
            );
            expect(statuses).to.deep.eq([OrderStatus.Cancelled, OrderStatus.Cancelled]);
        });

        it('can cancel multiple RFQ order pairs', async () => {
            const orders = [
                getTestRfqOrder({ salt: new BigNumber(1) }),
                // Flip the tokens for the other order.
                getTestRfqOrder({
                    makerToken: takerToken.address,
                    takerToken: makerToken.address,
                    salt: new BigNumber(1),
                }),
            ];
            const minValidSalt = new BigNumber(2);
            const receipt = await zeroEx
                .batchCancelPairRfqOrders(
                    [makerToken.address, takerToken.address],
                    [takerToken.address, makerToken.address],
                    [minValidSalt, minValidSalt],
                )
                .awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        maker,
                        makerToken: makerToken.address,
                        takerToken: takerToken.address,
                        minValidSalt,
                    },
                    {
                        maker,
                        makerToken: takerToken.address,
                        takerToken: makerToken.address,
                        minValidSalt,
                    },
                ],
                IZeroExEvents.PairCancelledRfqOrders,
            );
            const statuses = (await Promise.all(orders.map(o => zeroEx.getRfqOrderInfo(o).callAsync()))).map(
                oi => oi.status,
            );
            expect(statuses).to.deep.eq([OrderStatus.Cancelled, OrderStatus.Cancelled]);
        });
    });

    interface LimitOrderFilledAmounts {
        makerTokenFilledAmount: BigNumber;
        takerTokenFilledAmount: BigNumber;
        takerTokenFeeFilledAmount: BigNumber;
    }

    function computeLimitOrderFilledAmounts(
        order: LimitOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO_AMOUNT,
    ): LimitOrderFilledAmounts {
        const fillAmount = BigNumber.min(
            order.takerAmount,
            takerTokenFillAmount,
            order.takerAmount.minus(takerTokenAlreadyFilledAmount),
        );
        const makerTokenFilledAmount = fillAmount
            .times(order.makerAmount)
            .div(order.takerAmount)
            .integerValue(BigNumber.ROUND_DOWN);
        const takerTokenFeeFilledAmount = fillAmount
            .times(order.takerTokenFeeAmount)
            .div(order.takerAmount)
            .integerValue(BigNumber.ROUND_DOWN);
        return {
            makerTokenFilledAmount,
            takerTokenFilledAmount: fillAmount,
            takerTokenFeeFilledAmount,
        };
    }

    function createLimitOrderFilledEventArgs(
        order: LimitOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO_AMOUNT,
    ): object {
        const {
            makerTokenFilledAmount,
            takerTokenFilledAmount,
            takerTokenFeeFilledAmount,
        } = computeLimitOrderFilledAmounts(order, takerTokenFillAmount, takerTokenAlreadyFilledAmount);
        const protocolFee = order.taker !== NULL_ADDRESS ? ZERO_AMOUNT : SINGLE_PROTOCOL_FEE;
        return {
            taker,
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            takerTokenFeeFilledAmount,
            orderHash: order.getHash(),
            maker: order.maker,
            feeRecipient: order.feeRecipient,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            protocolFeePaid: protocolFee,
            pool: order.pool,
        };
    }

    async function assertExpectedFinalBalancesFromLimitOrderFillAsync(
        order: LimitOrder,
        opts: Partial<{
            takerTokenFillAmount: BigNumber;
            takerTokenAlreadyFilledAmount: BigNumber;
            receipt: TransactionReceiptWithDecodedLogs;
        }> = {},
    ): Promise<void> {
        const { takerTokenFillAmount, takerTokenAlreadyFilledAmount, receipt } = {
            takerTokenFillAmount: order.takerAmount,
            takerTokenAlreadyFilledAmount: ZERO_AMOUNT,
            receipt: undefined,
            ...opts,
        };
        const {
            makerTokenFilledAmount,
            takerTokenFilledAmount,
            takerTokenFeeFilledAmount,
        } = computeLimitOrderFilledAmounts(order, takerTokenFillAmount, takerTokenAlreadyFilledAmount);
        const makerBalance = await takerToken.balanceOf(maker).callAsync();
        const takerBalance = await makerToken.balanceOf(taker).callAsync();
        const feeRecipientBalance = await takerToken.balanceOf(order.feeRecipient).callAsync();
        expect(makerBalance).to.bignumber.eq(takerTokenFilledAmount);
        expect(takerBalance).to.bignumber.eq(makerTokenFilledAmount);
        expect(feeRecipientBalance).to.bignumber.eq(takerTokenFeeFilledAmount);
        if (receipt) {
            const balanceOfTakerNow = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            const balanceOfTakerBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker, receipt.blockNumber - 1);
            const protocolFee = order.taker === NULL_ADDRESS ? SINGLE_PROTOCOL_FEE : 0;
            const totalCost = GAS_PRICE.times(receipt.gasUsed).plus(protocolFee);
            expect(balanceOfTakerBefore.minus(totalCost)).to.bignumber.eq(balanceOfTakerNow);
        }
    }

    describe('fillLimitOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestLimitOrder();
            const receipt = await fillLimitOrderAsync(order);
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order)],
                IZeroExEvents.LimitOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            await assertExpectedFinalBalancesFromLimitOrderFillAsync(order, { receipt });
        });

        it('can partially fill an order', async () => {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.minus(1);
            const receipt = await fillLimitOrderAsync(order, { fillAmount });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Fillable,
                takerTokenFilledAmount: fillAmount,
            });
            await assertExpectedFinalBalancesFromLimitOrderFillAsync(order, { takerTokenFillAmount: fillAmount });
        });

        it('can fully fill an order in two steps', async () => {
            const order = getTestLimitOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = await fillLimitOrderAsync(order, { fillAmount });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount);
            receipt = await fillLimitOrderAsync(order, { fillAmount });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('clamps fill amount to remaining available', async () => {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.plus(1);
            const receipt = await fillLimitOrderAsync(order, { fillAmount });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            await assertExpectedFinalBalancesFromLimitOrderFillAsync(order, { takerTokenFillAmount: fillAmount });
        });

        it('clamps fill amount to remaining available in partial filled order', async () => {
            const order = getTestLimitOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = await fillLimitOrderAsync(order, { fillAmount });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount).plus(1);
            receipt = await fillLimitOrderAsync(order, { fillAmount });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            assertOrderInfoEquals(await zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        });

        it('cannot fill an expired order', async () => {
            const order = getTestLimitOrder({ expiry: createExpiry(-60) });
            const tx = fillLimitOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Expired),
            );
        });

        it('cannot fill a cancelled order', async () => {
            const order = getTestLimitOrder();
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const tx = fillLimitOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill a salt/pair cancelled order', async () => {
            const order = getTestLimitOrder();
            await zeroEx
                .cancelPairLimitOrders(makerToken.address, takerToken.address, order.salt.plus(1))
                .awaitTransactionSuccessAsync({ from: maker });
            const tx = fillLimitOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('non-taker cannot fill order', async () => {
            const order = getTestLimitOrder({ taker });
            const tx = fillLimitOrderAsync(order, { fillAmount: order.takerAmount, taker: notTaker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByTakerError(order.getHash(), notTaker, order.taker),
            );
        });

        it('non-sender cannot fill order', async () => {
            const order = getTestLimitOrder({ sender: taker });
            const tx = fillLimitOrderAsync(order, { fillAmount: order.takerAmount, taker: notTaker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableBySenderError(order.getHash(), notTaker, order.sender),
            );
        });

        it('cannot fill order with bad signature', async () => {
            const order = getTestLimitOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = fillLimitOrderAsync(order.clone({ chainId: 1234 }));
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker),
            );
        });

        it('fails if no protocol fee attached', async () => {
            const order = getTestLimitOrder();
            await prepareBalancesForOrderAsync(order);
            const tx = zeroEx
                .fillLimitOrder(
                    order,
                    await order.getSignatureWithProviderAsync(env.provider),
                    new BigNumber(order.takerAmount),
                )
                .awaitTransactionSuccessAsync({ from: taker, value: ZERO_AMOUNT });
            // The exact revert error depends on whether we are still doing a
            // token spender fallthroigh, so we won't get too specific.
            return expect(tx).to.revertWith(new AnyRevertError());
        });

        it('refunds excess protocol fee', async () => {
            const order = getTestLimitOrder();
            const receipt = await fillLimitOrderAsync(order, { protocolFee: SINGLE_PROTOCOL_FEE.plus(1) });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order)],
                IZeroExEvents.LimitOrderFilled,
            );
            await assertExpectedFinalBalancesFromLimitOrderFillAsync(order, { receipt });
        });
    });

    interface RfqOrderFilledAmounts {
        makerTokenFilledAmount: BigNumber;
        takerTokenFilledAmount: BigNumber;
    }

    function computeRfqOrderFilledAmounts(
        order: RfqOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO_AMOUNT,
    ): RfqOrderFilledAmounts {
        const fillAmount = BigNumber.min(
            order.takerAmount,
            takerTokenFillAmount,
            order.takerAmount.minus(takerTokenAlreadyFilledAmount),
        );
        const makerTokenFilledAmount = fillAmount
            .times(order.makerAmount)
            .div(order.takerAmount)
            .integerValue(BigNumber.ROUND_DOWN);
        return {
            makerTokenFilledAmount,
            takerTokenFilledAmount: fillAmount,
        };
    }

    function createRfqOrderFilledEventArgs(
        order: RfqOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO_AMOUNT,
    ): object {
        const { makerTokenFilledAmount, takerTokenFilledAmount } = computeRfqOrderFilledAmounts(
            order,
            takerTokenFillAmount,
            takerTokenAlreadyFilledAmount,
        );
        return {
            taker,
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            orderHash: order.getHash(),
            maker: order.maker,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            pool: order.pool,
        };
    }

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

    describe('registerAllowedRfqOrigins()', () => {
        it('cannot register through a contract', async () => {
            const tx = testRfqOriginRegistration
                .registerAllowedRfqOrigins(zeroEx.address, [], true)
                .awaitTransactionSuccessAsync();
            expect(tx).to.revertWith('NativeOrdersFeature/NO_CONTRACT_ORIGINS');
        });
    });

    describe('fillRfqOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestRfqOrder();
            const receipt = await fillRfqOrderAsync(order);
            verifyEventsFromLogs(receipt.logs, [createRfqOrderFilledEventArgs(order)], IZeroExEvents.RfqOrderFilled);
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
            const receipt = await fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createRfqOrderFilledEventArgs(order, fillAmount)],
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
            let receipt = await fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createRfqOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount);
            receipt = await fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createRfqOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)],
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
            const receipt = await fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createRfqOrderFilledEventArgs(order, fillAmount)],
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
            let receipt = await fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createRfqOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.RfqOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount).plus(1);
            receipt = await fillRfqOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createRfqOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)],
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
            const tx = fillRfqOrderAsync(order, order.takerAmount, notTaker);
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
            return fillRfqOrderAsync(order, order.takerAmount, notTaker);
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

            const tx = fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTaker, taker),
            );
        });

        it('cannot fill an order with a zero tx.origin', async () => {
            const order = getTestRfqOrder({ txOrigin: NULL_ADDRESS });
            const tx = fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Invalid),
            );
        });

        it('non-taker cannot fill order', async () => {
            const order = getTestRfqOrder({ taker, txOrigin: notTaker });
            const tx = fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByTakerError(order.getHash(), notTaker, order.taker),
            );
        });

        it('cannot fill an expired order', async () => {
            const order = getTestRfqOrder({ expiry: createExpiry(-60) });
            const tx = fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Expired),
            );
        });

        it('cannot fill a cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const tx = fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill a salt/pair cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx
                .cancelPairRfqOrders(makerToken.address, takerToken.address, order.salt.plus(1))
                .awaitTransactionSuccessAsync({ from: maker });
            const tx = fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill order with bad signature', async () => {
            const order = getTestRfqOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = fillRfqOrderAsync(order.clone({ chainId: 1234 }));
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker),
            );
        });

        it('fails if ETH is attached', async () => {
            const order = getTestRfqOrder();
            await prepareBalancesForOrderAsync(order, taker);
            const tx = zeroEx
                .fillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: 1 });
            // This will revert at the language level because the fill function is not payable.
            return expect(tx).to.be.rejectedWith('revert');
        });
    });

    describe('fillOrKillLimitOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestLimitOrder();
            await prepareBalancesForOrderAsync(order);
            const receipt = await zeroEx
                .fillOrKillLimitOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE });
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order)],
                IZeroExEvents.LimitOrderFilled,
            );
        });

        it('reverts if cannot fill the exact amount', async () => {
            const order = getTestLimitOrder();
            await prepareBalancesForOrderAsync(order);
            const fillAmount = order.takerAmount.plus(1);
            const tx = zeroEx
                .fillOrKillLimitOrder(order, await order.getSignatureWithProviderAsync(env.provider), fillAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.FillOrKillFailedError(order.getHash(), order.takerAmount, fillAmount),
            );
        });

        it('refunds excess protocol fee', async () => {
            const order = getTestLimitOrder();
            await prepareBalancesForOrderAsync(order);
            const takerBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            const receipt = await zeroEx
                .fillOrKillLimitOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE.plus(1) });
            const takerBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            const totalCost = GAS_PRICE.times(receipt.gasUsed).plus(SINGLE_PROTOCOL_FEE);
            expect(takerBalanceBefore.minus(totalCost)).to.bignumber.eq(takerBalanceAfter);
        });
    });

    describe('fillOrKillRfqOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestRfqOrder();
            await prepareBalancesForOrderAsync(order);
            const receipt = await zeroEx
                .fillOrKillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker });
            verifyEventsFromLogs(receipt.logs, [createRfqOrderFilledEventArgs(order)], IZeroExEvents.RfqOrderFilled);
        });

        it('reverts if cannot fill the exact amount', async () => {
            const order = getTestRfqOrder();
            await prepareBalancesForOrderAsync(order);
            const fillAmount = order.takerAmount.plus(1);
            const tx = zeroEx
                .fillOrKillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), fillAmount)
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.FillOrKillFailedError(order.getHash(), order.takerAmount, fillAmount),
            );
        });

        it('fails if ETH is attached', async () => {
            const order = getTestRfqOrder();
            await prepareBalancesForOrderAsync(order);
            const tx = zeroEx
                .fillOrKillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
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

    function getFillableMakerTokenAmount(
        order: LimitOrder | RfqOrder,
        takerTokenFilledAmount: BigNumber = ZERO_AMOUNT,
    ): BigNumber {
        return order.takerAmount
            .minus(takerTokenFilledAmount)
            .times(order.makerAmount)
            .div(order.takerAmount)
            .integerValue(BigNumber.ROUND_DOWN);
    }

    function getActualFillableTakerTokenAmount(
        order: LimitOrder | RfqOrder,
        makerBalance: BigNumber = order.makerAmount,
        makerAllowance: BigNumber = order.makerAmount,
        takerTokenFilledAmount: BigNumber = ZERO_AMOUNT,
    ): BigNumber {
        const fillableMakerTokenAmount = getFillableMakerTokenAmount(order, takerTokenFilledAmount);
        return BigNumber.min(fillableMakerTokenAmount, makerBalance, makerAllowance)
            .times(order.takerAmount)
            .div(order.makerAmount)
            .integerValue(BigNumber.ROUND_UP);
    }

    function getRandomFraction(precision: number = 2): string {
        return Math.random().toPrecision(precision);
    }

    describe('getLimitOrderRelevantState()', () => {

        it('does not revert with this one particular order', async () => {
            const order = new LimitOrder({
                makerToken: '0x349e8d89e8b37214d9ce3949fc5754152c525bc3',
                takerToken: '0x83c62b2e67dea0df2a27be0def7a22bd7102642c',
                makerAmount: new BigNumber(1234),
                takerAmount: new BigNumber(5678),
                takerTokenFeeAmount: new BigNumber(9101112),
                maker: '0x6ecbe1db9ef729cbe972c83fb886247691fb6beb',
                taker: '0x615312fb74c31303eab07dea520019bb23f4c6c2',
                sender: '0x70f2d6c7acd257a6700d745b76c602ceefeb8e20',
                feeRecipient: '0xcc3c7ea403427154ec908203ba6c418bd699f7ce',
                pool: '0x0bbff69b85a87da39511aefc3211cb9aff00e1a1779dc35b8f3635d8b5ea2680',
                expiry: new BigNumber(9223372036854775807),
                salt: new BigNumber(2001),
            });
            await fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getLimitOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            // <SPOILER>It does revert!</SPOILER> So I never got to check these ↓ values. I expect the order to be invalid though (values are taken from `protocol/packages/protocol-utils/test/orders_test.ts`
            expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: OrderStatus.Invalid,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            expect(fillableTakerAmount).to.bignumber.eq(0);
            expect(isSignatureValid).to.eq(true);
        });

        it('works with an empty order', async () => {
            const order = getTestLimitOrder({
                takerAmount: ZERO_AMOUNT,
            });
            await fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getLimitOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
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
            const order = getTestLimitOrder();
            await fundOrderMakerAsync(order);
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getLimitOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
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
            const order = getTestLimitOrder();
            await fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getLimitOrderRelevantState(
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
            const order = getTestLimitOrder();
            await fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getLimitOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
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
            const order = getTestLimitOrder();
            // Fully Fund maker and taker.
            await fundOrderMakerAsync(order);
            await takerToken
                .mint(taker, order.takerAmount.plus(order.takerTokenFeeAmount))
                .awaitTransactionSuccessAsync();
            await fillLimitOrderAsync(order);
            // Partially fill the order.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getLimitOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
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
            const order = getTestLimitOrder();
            // Fully Fund maker and taker.
            await fundOrderMakerAsync(order);
            await takerToken
                .mint(taker, order.takerAmount.plus(order.takerTokenFeeAmount))
                .awaitTransactionSuccessAsync();
            // Partially fill the order.
            const fillAmount = order.takerAmount.times(getRandomFraction()).integerValue();
            await fillLimitOrderAsync(order, { fillAmount });
            // Reduce maker funds to be < remaining.
            const remainingMakerAmount = getFillableMakerTokenAmount(order, fillAmount);
            const balance = remainingMakerAmount.times(getRandomFraction()).integerValue();
            const allowance = remainingMakerAmount.times(getRandomFraction()).integerValue();
            await fundOrderMakerAsync(order, balance, allowance);
            // Get order state.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = await zeroEx
                .getLimitOrderRelevantState(order, await order.getSignatureWithProviderAsync(env.provider))
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
            await fillRfqOrderAsync(order);
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
            const fillAmount = order.takerAmount.times(getRandomFraction()).integerValue();
            await fillRfqOrderAsync(order, fillAmount);
            // Reduce maker funds to be < remaining.
            const remainingMakerAmount = getFillableMakerTokenAmount(order, fillAmount);
            const balance = remainingMakerAmount.times(getRandomFraction()).integerValue();
            const allowance = remainingMakerAmount.times(getRandomFraction()).integerValue();
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
    });

    describe('batchGetRfqOrderRelevantStates()', () => {
        it('works with multiple orders', async () => {
            const orders = new Array(3).fill(0).map(() => getTestRfqOrder());
            await batchFundOrderMakerAsync(orders);
            const [orderInfos, fillableTakerAmounts, isSignatureValids] = await zeroEx
                .batchGetRfqOrderRelevantStates(
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
    });
});
