import { blockchainTests, constants, describe, expect, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { AnyRevertError, BigNumber } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs } from 'ethereum-types';

import { LimitOrder, LimitOrderFields, OrderInfo, OrderStatus, RfqOrder, RfqOrderFields } from '../../src/orders';
import * as RevertErrors from '../../src/revert_errors';
import { IZeroExContract, IZeroExEvents } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { fullMigrateAsync } from '../utils/migration';
import { getRandomLimitOrder, getRandomRfqOrder } from '../utils/orders';
import { TestMintableERC20TokenContract } from '../wrappers';

blockchainTests.resets('LimitOrdersFeature', env => {
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
            { limitOrders: artifacts.TestLimitOrdersFeature },
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
            txOrigin: NULL_ADDRESS,
            ...fields,
        });
    }

    async function prepareBalancesForOrderAsync(order: LimitOrder | RfqOrder, _taker: string = taker): Promise<void> {
        await makerToken.mint(maker, order.makerAmount).awaitTransactionSuccessAsync();
        if ('takerTokenFeeAmount' in order) {
            await takerToken
                .mint(taker, order.takerAmount.plus(order.takerTokenFeeAmount))
                .awaitTransactionSuccessAsync();
        } else {
            await takerToken.mint(taker, order.takerAmount).awaitTransactionSuccessAsync();
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
        fillAmount: BigNumber | number = order.takerAmount,
        _taker: string = taker,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        await prepareBalancesForOrderAsync(order, _taker);
        return zeroEx
            .fillLimitOrder(order, await order.getSignatureWithProviderAsync(env.provider), new BigNumber(fillAmount))
            .awaitTransactionSuccessAsync({ from: _taker, value: SINGLE_PROTOCOL_FEE });
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
            await fillLimitOrderAsync(order, fillAmount);
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
            await fillLimitOrderAsync(order, fillAmount);
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
            .awaitTransactionSuccessAsync({ from: _taker, value: SINGLE_PROTOCOL_FEE });
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
            await zeroEx
                .fillRfqOrder(order, sig, order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE });
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
            await fillRfqOrderAsync(order);
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
    });

    describe('cancelLimitOrder()', async () => {
        it('can cancel an unfilled order', async () => {
            const order = getTestLimitOrder();
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a fully filled order', async () => {
            const order = getTestLimitOrder();
            await fillLimitOrderAsync(order);
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Filled); // Still reports filled.
        });

        it('can cancel a partially filled order', async () => {
            const order = getTestLimitOrder();
            await fillLimitOrderAsync(order, order.takerAmount.minus(1));
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled); // Still reports filled.
        });

        it('can cancel an expired order', async () => {
            const expiry = createExpiry(-60);
            const order = getTestLimitOrder({ expiry });
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a cancelled order', async () => {
            const order = getTestLimitOrder();
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const receipt = await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it("cannot cancel someone else's order", async () => {
            const order = getTestLimitOrder();
            const tx = zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.OnlyOrderMakerAllowed(order.getHash(), notMaker, order.maker),
            );
        });
    });

    describe('cancelRfqOrder()', async () => {
        it('can cancel an unfilled order', async () => {
            const order = getTestRfqOrder();
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a fully filled order', async () => {
            const order = getTestRfqOrder();
            await fillRfqOrderAsync(order);
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Filled); // Still reports filled.
        });

        it('can cancel a partially filled order', async () => {
            const order = getTestRfqOrder();
            await fillRfqOrderAsync(order, order.takerAmount.minus(1));
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled); // Still reports filled.
        });

        it('can cancel an expired order', async () => {
            const expiry = createExpiry(-60);
            const order = getTestRfqOrder({ expiry });
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it('can cancel a cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const receipt = await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(receipt.logs, [{ orderHash: order.getHash() }], IZeroExEvents.OrderCancelled);
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Cancelled);
        });

        it("cannot cancel someone else's order", async () => {
            const order = getTestRfqOrder();
            const tx = zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.OnlyOrderMakerAllowed(order.getHash(), notMaker, order.maker),
            );
        });
    });

    describe('batchCancelLimitOrders()', async () => {
        it('can cancel multiple orders', async () => {
            const orders = [...new Array(3)].map(() => getTestLimitOrder());
            const receipt = await zeroEx.batchCancelLimitOrders(orders).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                orders.map(o => ({ orderHash: o.getHash() })),
                IZeroExEvents.OrderCancelled,
            );
            const infos = await Promise.all(orders.map(o => zeroEx.getLimitOrderInfo(o).callAsync()));
            expect(infos.map(i => i.status)).to.deep.eq(infos.map(() => OrderStatus.Cancelled));
        });

        it("cannot cancel someone else's orders", async () => {
            const orders = [...new Array(3)].map(() => getTestLimitOrder());
            const tx = zeroEx.batchCancelLimitOrders(orders).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.OnlyOrderMakerAllowed(orders[0].getHash(), notMaker, orders[0].maker),
            );
        });
    });

    describe('batchCancelRfqOrders()', async () => {
        it('can cancel multiple orders', async () => {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const receipt = await zeroEx.batchCancelRfqOrders(orders).awaitTransactionSuccessAsync({ from: maker });
            verifyEventsFromLogs(
                receipt.logs,
                orders.map(o => ({ orderHash: o.getHash() })),
                IZeroExEvents.OrderCancelled,
            );
            const infos = await Promise.all(orders.map(o => zeroEx.getRfqOrderInfo(o).callAsync()));
            expect(infos.map(i => i.status)).to.deep.eq(infos.map(() => OrderStatus.Cancelled));
        });

        it("cannot cancel someone else's orders", async () => {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const tx = zeroEx.batchCancelRfqOrders(orders).awaitTransactionSuccessAsync({ from: notMaker });
            return expect(tx).to.revertWith(
                new RevertErrors.OnlyOrderMakerAllowed(orders[0].getHash(), notMaker, orders[0].maker),
            );
        });
    });

    describe('cancelPairOrdersUpTo()', async () => {
        it('can cancel multiple limit orders of the same pair with salt < minValidSalt', async () => {
            const orders = [...new Array(3)].map((_v, i) => getTestLimitOrder().clone({ salt: new BigNumber(i) }));
            // Cancel the first two orders.
            const minValidSalt = orders[2].salt;
            const receipt = await zeroEx
                .cancelPairOrdersUpTo(makerToken.address, takerToken.address, minValidSalt)
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
                IZeroExEvents.PairOrdersUpToCancelled,
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
                .cancelPairOrdersUpTo(takerToken.address, makerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            const { status } = await zeroEx.getLimitOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Fillable);
        });

        it('can cancel multiple RFQ orders of the same pair with salt < minValidSalt', async () => {
            const orders = [...new Array(3)].map((_v, i) => getTestRfqOrder().clone({ salt: new BigNumber(i) }));
            // Cancel the first two orders.
            const minValidSalt = orders[2].salt;
            const receipt = await zeroEx
                .cancelPairOrdersUpTo(makerToken.address, takerToken.address, minValidSalt)
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
                IZeroExEvents.PairOrdersUpToCancelled,
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
                .cancelPairOrdersUpTo(takerToken.address, makerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            const { status } = await zeroEx.getRfqOrderInfo(order).callAsync();
            expect(status).to.eq(OrderStatus.Fillable);
        });
    });

    describe('batchCancelPairOrdersUpTo()', async () => {
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
                .batchCancelPairOrdersUpTo(
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
                IZeroExEvents.PairOrdersUpToCancelled,
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
                .batchCancelPairOrdersUpTo(
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
                IZeroExEvents.PairOrdersUpToCancelled,
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
        const { makerTokenFilledAmount, takerTokenFilledAmount } = computeLimitOrderFilledAmounts(
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
            feeRecipient: order.feeRecipient,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            pool: order.pool,
        };
    }

    async function assertExpectedFinalBalancesFromLimitOrderFillAsync(
        order: LimitOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO_AMOUNT,
    ): Promise<void> {
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
            await assertExpectedFinalBalancesFromLimitOrderFillAsync(order);
        });

        it('can partially fill an order', async () => {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.minus(1);
            const receipt = await fillLimitOrderAsync(order, fillAmount);
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
            await assertExpectedFinalBalancesFromLimitOrderFillAsync(order, fillAmount);
        });

        it('can fully fill an order in two steps', async () => {
            const order = getTestLimitOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = await fillLimitOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount);
            receipt = await fillLimitOrderAsync(order, fillAmount);
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
            const receipt = await fillLimitOrderAsync(order, fillAmount);
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
            await assertExpectedFinalBalancesFromLimitOrderFillAsync(order, fillAmount);
        });

        it('clamps fill amount to remaining available in partial filled order', async () => {
            const order = getTestLimitOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = await fillLimitOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [createLimitOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.LimitOrderFilled,
            );
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount).plus(1);
            receipt = await fillLimitOrderAsync(order, fillAmount);
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
                new RevertErrors.OrderNotFillableError(order.getHash(), OrderStatus.Expired),
            );
        });

        it('cannot fill a cancelled order', async () => {
            const order = getTestLimitOrder();
            await zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const tx = fillLimitOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill a salt/pair cancelled order', async () => {
            const order = getTestLimitOrder();
            await zeroEx
                .cancelPairOrdersUpTo(makerToken.address, takerToken.address, order.salt.plus(1))
                .awaitTransactionSuccessAsync({ from: maker });
            const tx = fillLimitOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('non-taker cannot fill order', async () => {
            const order = getTestLimitOrder({ taker });
            const tx = fillLimitOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableByTakerError(order.getHash(), notTaker, order.taker),
            );
        });

        it('non-sender cannot fill order', async () => {
            const order = getTestLimitOrder({ sender: taker });
            const tx = fillLimitOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableBySenderError(order.getHash(), notTaker, order.sender),
            );
        });

        it('cannot fill order with bad signature', async () => {
            const order = getTestLimitOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = fillLimitOrderAsync(order.clone({ chainId: 1234 }));
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker),
            );
        });

        it('fails if no protocol fee attached (and no weth allowance)', async () => {
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
            const order = getTestRfqOrder({ txOrigin: taker });
            const tx = fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableByOriginError(order.getHash(), notTaker, taker),
            );
        });

        it('cannot fill an expired order', async () => {
            const order = getTestRfqOrder({ expiry: createExpiry(-60) });
            const tx = fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableError(order.getHash(), OrderStatus.Expired),
            );
        });

        it('cannot fill a cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const tx = fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill a salt/pair cancelled order', async () => {
            const order = getTestRfqOrder();
            await zeroEx
                .cancelPairOrdersUpTo(makerToken.address, takerToken.address, order.salt.plus(1))
                .awaitTransactionSuccessAsync({ from: maker });
            const tx = fillRfqOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotFillableError(order.getHash(), OrderStatus.Cancelled),
            );
        });

        it('cannot fill order with bad signature', async () => {
            const order = getTestRfqOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = fillRfqOrderAsync(order.clone({ chainId: 1234 }));
            return expect(tx).to.revertWith(
                new RevertErrors.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker),
            );
        });

        it('fails if no protocol fee attached (and no weth allowance)', async () => {
            const order = getTestRfqOrder();
            await prepareBalancesForOrderAsync(order);
            const tx = zeroEx
                .fillRfqOrder(
                    order,
                    await order.getSignatureWithProviderAsync(env.provider),
                    new BigNumber(order.takerAmount),
                )
                .awaitTransactionSuccessAsync({ from: taker, value: ZERO_AMOUNT });
            // The exact revert error depends on whether we are still doing a
            // token spender fallthroigh, so we won't get too specific.
            return expect(tx).to.revertWith(new AnyRevertError());
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
                new RevertErrors.FillOrKillFailedError(order.getHash(), order.takerAmount, fillAmount),
            );
        });
    });

    describe('fillOrKillRfqOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestRfqOrder();
            await prepareBalancesForOrderAsync(order);
            const receipt = await zeroEx
                .fillOrKillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE });
            verifyEventsFromLogs(receipt.logs, [createRfqOrderFilledEventArgs(order)], IZeroExEvents.RfqOrderFilled);
        });

        it('reverts if cannot fill the exact amount', async () => {
            const order = getTestRfqOrder();
            await prepareBalancesForOrderAsync(order);
            const fillAmount = order.takerAmount.plus(1);
            const tx = zeroEx
                .fillOrKillRfqOrder(order, await order.getSignatureWithProviderAsync(env.provider), fillAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE });
            return expect(tx).to.revertWith(
                new RevertErrors.FillOrKillFailedError(order.getHash(), order.takerAmount, fillAmount),
            );
        });
    });

    it.skip('RFQ gas benchmark', async () => {
        const orders = [...new Array(2)].map(() =>
            getTestRfqOrder({ pool: '0x0000000000000000000000000000000000000000000000000000000000000000' }),
        );
        // Fill one to warm up the fee pool.
        await fillRfqOrderAsync(orders[0]);
        const receipt = await fillRfqOrderAsync(orders[1]);
        // tslint:disable-next-line: no-console
        console.log(receipt.gasUsed);
    });
});
