import {
    blockchainTests,
    constants,
    describe,
    expect,
    getRandomPortion,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import { LimitOrder, LimitOrderFields, OrderStatus, RevertErrors, RfqOrder, RfqOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs } from 'ethereum-types';
import * as _ from 'lodash';

import { BatchFillNativeOrdersFeatureContract, IZeroExContract, IZeroExEvents } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import {
    assertOrderInfoEquals,
    computeLimitOrderFilledAmounts,
    computeRfqOrderFilledAmounts,
    createExpiry,
    getRandomLimitOrder,
    getRandomRfqOrder,
    NativeOrdersTestEnvironment,
} from '../utils/orders';
import { TestMintableERC20TokenContract } from '../wrappers';

blockchainTests.resets('BatchFillNativeOrdersFeature', env => {
    const { NULL_ADDRESS, ZERO_AMOUNT } = constants;
    let maker: string;
    let taker: string;
    let zeroEx: IZeroExContract;
    let feature: BatchFillNativeOrdersFeatureContract;
    let verifyingContract: string;
    let makerToken: TestMintableERC20TokenContract;
    let takerToken: TestMintableERC20TokenContract;
    let testUtils: NativeOrdersTestEnvironment;

    before(async () => {
        testUtils = await NativeOrdersTestEnvironment.createAsync(env);
        maker = testUtils.maker;
        taker = testUtils.taker;
        zeroEx = testUtils.zeroEx;
        makerToken = testUtils.makerToken;
        takerToken = testUtils.takerToken;

        verifyingContract = zeroEx.address;
        const featureImpl = await BatchFillNativeOrdersFeatureContract.deployFrom0xArtifactAsync(
            artifacts.BatchFillNativeOrdersFeature,
            env.provider,
            env.txDefaults,
            artifacts,
            zeroEx.address,
        );
        const [owner] = await env.getAccountAddressesAsync();
        await zeroEx
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
        feature = new BatchFillNativeOrdersFeatureContract(
            zeroEx.address,
            env.provider,
            { ...env.txDefaults, gasPrice: testUtils.gasPrice },
            abis,
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

    describe('batchFillLimitOrders', () => {
        async function assertExpectedFinalBalancesAsync(
            orders: LimitOrder[],
            takerTokenFillAmounts: BigNumber[] = orders.map(order => order.takerAmount),
            takerTokenAlreadyFilledAmounts: BigNumber[] = orders.map(() => ZERO_AMOUNT),
            receipt?: TransactionReceiptWithDecodedLogs,
        ): Promise<void> {
            const expectedFeeRecipientBalances: { [feeRecipient: string]: BigNumber } = {};
            const { makerTokenFilledAmount, takerTokenFilledAmount } = orders
                .map((order, i) =>
                    computeLimitOrderFilledAmounts(order, takerTokenFillAmounts[i], takerTokenAlreadyFilledAmounts[i]),
                )
                .reduce(
                    (previous, current, i) => {
                        _.update(expectedFeeRecipientBalances, orders[i].feeRecipient, balance =>
                            (balance || ZERO_AMOUNT).plus(current.takerTokenFeeFilledAmount),
                        );
                        return {
                            makerTokenFilledAmount: previous.makerTokenFilledAmount.plus(
                                current.makerTokenFilledAmount,
                            ),
                            takerTokenFilledAmount: previous.takerTokenFilledAmount.plus(
                                current.takerTokenFilledAmount,
                            ),
                        };
                    },
                    { makerTokenFilledAmount: ZERO_AMOUNT, takerTokenFilledAmount: ZERO_AMOUNT },
                );
            const makerBalance = await takerToken.balanceOf(maker).callAsync();
            const takerBalance = await makerToken.balanceOf(taker).callAsync();
            expect(makerBalance, 'maker token balance').to.bignumber.eq(takerTokenFilledAmount);
            expect(takerBalance, 'taker token balance').to.bignumber.eq(makerTokenFilledAmount);
            for (const [feeRecipient, expectedFeeRecipientBalance] of Object.entries(expectedFeeRecipientBalances)) {
                const feeRecipientBalance = await takerToken.balanceOf(feeRecipient).callAsync();
                expect(feeRecipientBalance, `fee recipient balance`).to.bignumber.eq(expectedFeeRecipientBalance);
            }
            if (receipt) {
                const balanceOfTakerNow = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const balanceOfTakerBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker, receipt.blockNumber - 1);
                const protocolFees = testUtils.protocolFee.times(orders.length);
                const totalCost = testUtils.gasPrice.times(receipt.gasUsed).plus(protocolFees);
                expect(balanceOfTakerBefore.minus(totalCost), 'taker ETH balance').to.bignumber.eq(balanceOfTakerNow);
            }
        }

        it('Fully fills multiple orders', async () => {
            const orders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = await feature
                .batchFillLimitOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = await zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Filled,
                    orderHash: orders[i].getHash(),
                    takerTokenFilledAmount: orders[i].takerAmount,
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                orders.map(order => testUtils.createLimitOrderFilledEventArgs(order)),
                IZeroExEvents.LimitOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(orders);
        });
        it('Partially fills multiple orders', async () => {
            const orders = [...new Array(3)].map(getTestLimitOrder);
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const fillAmounts = orders.map(order => getRandomPortion(order.takerAmount));
            const tx = await feature
                .batchFillLimitOrders(orders, signatures, fillAmounts, false)
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = await zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Fillable,
                    orderHash: orders[i].getHash(),
                    takerTokenFilledAmount: fillAmounts[i],
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                orders.map((order, i) => testUtils.createLimitOrderFilledEventArgs(order, fillAmounts[i])),
                IZeroExEvents.LimitOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(orders, fillAmounts);
        });
        it('Fills multiple orders and refunds excess ETH', async () => {
            const orders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length).plus(420);
            const tx = await feature
                .batchFillLimitOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = await zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Filled,
                    orderHash: orders[i].getHash(),
                    takerTokenFilledAmount: orders[i].takerAmount,
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                orders.map(order => testUtils.createLimitOrderFilledEventArgs(order)),
                IZeroExEvents.LimitOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(orders);
        });
        it('Skips over unfillable orders and refunds excess ETH', async () => {
            const fillableOrders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const expiredOrder = getTestLimitOrder({ expiry: createExpiry(-1), takerTokenFeeAmount: ZERO_AMOUNT });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = await feature
                .batchFillLimitOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = await zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            const [expiredOrderInfo, ...filledOrderInfos] = orderInfos;
            assertOrderInfoEquals(expiredOrderInfo, {
                status: OrderStatus.Expired,
                orderHash: expiredOrder.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            filledOrderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Filled,
                    orderHash: fillableOrders[i].getHash(),
                    takerTokenFilledAmount: fillableOrders[i].takerAmount,
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                fillableOrders.map(order => testUtils.createLimitOrderFilledEventArgs(order)),
                IZeroExEvents.LimitOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(fillableOrders);
        });
        it('Fills multiple orders with revertIfIncomplete=true', async () => {
            const orders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = await feature
                .batchFillLimitOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    true,
                )
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = await zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Filled,
                    orderHash: orders[i].getHash(),
                    takerTokenFilledAmount: orders[i].takerAmount,
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                orders.map(order => testUtils.createLimitOrderFilledEventArgs(order)),
                IZeroExEvents.LimitOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(orders);
        });
        it('If revertIfIncomplete==true, reverts on an unfillable order', async () => {
            const fillableOrders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const expiredOrder = getTestLimitOrder({ expiry: createExpiry(-1), takerTokenFeeAmount: ZERO_AMOUNT });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = feature
                .batchFillLimitOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    true,
                )
                .awaitTransactionSuccessAsync({ from: taker, value });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.BatchFillIncompleteError(
                    expiredOrder.getHash(),
                    ZERO_AMOUNT,
                    expiredOrder.takerAmount,
                ),
            );
        });
        it('If revertIfIncomplete==true, reverts on an incomplete fill ', async () => {
            const fillableOrders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const partiallyFilledOrder = getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT });
            const partialFillAmount = getRandomPortion(partiallyFilledOrder.takerAmount);
            await testUtils.fillLimitOrderAsync(partiallyFilledOrder, { fillAmount: partialFillAmount });
            const orders = [partiallyFilledOrder, ...fillableOrders];
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = feature
                .batchFillLimitOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    true,
                )
                .awaitTransactionSuccessAsync({ from: taker, value });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.BatchFillIncompleteError(
                    partiallyFilledOrder.getHash(),
                    partiallyFilledOrder.takerAmount.minus(partialFillAmount),
                    partiallyFilledOrder.takerAmount,
                ),
            );
        });
    });
    describe('batchFillRfqOrders', () => {
        async function assertExpectedFinalBalancesAsync(
            orders: RfqOrder[],
            takerTokenFillAmounts: BigNumber[] = orders.map(order => order.takerAmount),
            takerTokenAlreadyFilledAmounts: BigNumber[] = orders.map(() => ZERO_AMOUNT),
        ): Promise<void> {
            const { makerTokenFilledAmount, takerTokenFilledAmount } = orders
                .map((order, i) =>
                    computeRfqOrderFilledAmounts(order, takerTokenFillAmounts[i], takerTokenAlreadyFilledAmounts[i]),
                )
                .reduce((previous, current) => ({
                    makerTokenFilledAmount: previous.makerTokenFilledAmount.plus(current.makerTokenFilledAmount),
                    takerTokenFilledAmount: previous.takerTokenFilledAmount.plus(current.takerTokenFilledAmount),
                }));
            const makerBalance = await takerToken.balanceOf(maker).callAsync();
            const takerBalance = await makerToken.balanceOf(taker).callAsync();
            expect(makerBalance).to.bignumber.eq(takerTokenFilledAmount);
            expect(takerBalance).to.bignumber.eq(makerTokenFilledAmount);
        }

        it('Fully fills multiple orders', async () => {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = await feature
                .batchFillRfqOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = await zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Filled,
                    orderHash: orders[i].getHash(),
                    takerTokenFilledAmount: orders[i].takerAmount,
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                orders.map(order => testUtils.createRfqOrderFilledEventArgs(order)),
                IZeroExEvents.RfqOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(orders);
        });
        it('Partially fills multiple orders', async () => {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            const fillAmounts = orders.map(order => getRandomPortion(order.takerAmount));
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = await feature
                .batchFillRfqOrders(orders, signatures, fillAmounts, false)
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = await zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Fillable,
                    orderHash: orders[i].getHash(),
                    takerTokenFilledAmount: fillAmounts[i],
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                orders.map((order, i) => testUtils.createRfqOrderFilledEventArgs(order, fillAmounts[i])),
                IZeroExEvents.RfqOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(orders, fillAmounts);
        });
        it('Skips over unfillable orders', async () => {
            const fillableOrders = [...new Array(3)].map(() => getTestRfqOrder());
            const expiredOrder = getTestRfqOrder({ expiry: createExpiry(-1) });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = await feature
                .batchFillRfqOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = await zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            const [expiredOrderInfo, ...filledOrderInfos] = orderInfos;
            assertOrderInfoEquals(expiredOrderInfo, {
                status: OrderStatus.Expired,
                orderHash: expiredOrder.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            filledOrderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Filled,
                    orderHash: fillableOrders[i].getHash(),
                    takerTokenFilledAmount: fillableOrders[i].takerAmount,
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                fillableOrders.map(order => testUtils.createRfqOrderFilledEventArgs(order)),
                IZeroExEvents.RfqOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(fillableOrders);
        });
        it('Fills multiple orders with revertIfIncomplete=true', async () => {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = await feature
                .batchFillRfqOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    true,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = await zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) =>
                assertOrderInfoEquals(orderInfo, {
                    status: OrderStatus.Filled,
                    orderHash: orders[i].getHash(),
                    takerTokenFilledAmount: orders[i].takerAmount,
                }),
            );
            verifyEventsFromLogs(
                tx.logs,
                orders.map(order => testUtils.createRfqOrderFilledEventArgs(order)),
                IZeroExEvents.RfqOrderFilled,
            );
            return assertExpectedFinalBalancesAsync(orders);
        });
        it('If revertIfIncomplete==true, reverts on an unfillable order', async () => {
            const fillableOrders = [...new Array(3)].map(() => getTestRfqOrder());
            const expiredOrder = getTestRfqOrder({ expiry: createExpiry(-1) });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = feature
                .batchFillRfqOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    true,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.BatchFillIncompleteError(
                    expiredOrder.getHash(),
                    ZERO_AMOUNT,
                    expiredOrder.takerAmount,
                ),
            );
        });
        it('If revertIfIncomplete==true, reverts on an incomplete fill ', async () => {
            const fillableOrders = [...new Array(3)].map(() => getTestRfqOrder());
            const partiallyFilledOrder = getTestRfqOrder();
            const partialFillAmount = getRandomPortion(partiallyFilledOrder.takerAmount);
            await testUtils.fillRfqOrderAsync(partiallyFilledOrder, partialFillAmount);
            const orders = [partiallyFilledOrder, ...fillableOrders];
            const signatures = await Promise.all(
                orders.map(order => order.getSignatureWithProviderAsync(env.provider)),
            );
            await testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = feature
                .batchFillRfqOrders(
                    orders,
                    signatures,
                    orders.map(order => order.takerAmount),
                    true,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.BatchFillIncompleteError(
                    partiallyFilledOrder.getHash(),
                    partiallyFilledOrder.takerAmount.minus(partialFillAmount),
                    partiallyFilledOrder.takerAmount,
                ),
            );
        });
    });
});
