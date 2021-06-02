import { blockchainTests, constants, describe, expect, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { OrderStatus, OtcOrder, RevertErrors, SignatureType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { IOwnableFeatureContract, IZeroExContract, IZeroExEvents } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import {
    computeOtcOrderFilledAmounts,
    createExpiry,
    getRandomOtcOrder,
    NativeOrdersTestEnvironment,
} from '../utils/orders';
import {
    OtcOrdersFeatureContract,
    TestMintableERC20TokenContract,
    TestOrderSignerRegistryWithContractWalletContract,
    TestWethContract,
} from '../wrappers';

blockchainTests.resets('OtcOrdersFeature', env => {
    const { NULL_ADDRESS, MAX_UINT256, ZERO_AMOUNT: ZERO } = constants;
    let maker: string;
    let taker: string;
    let notMaker: string;
    let notTaker: string;
    let contractWalletOwner: string;
    let contractWalletSigner: string;
    let txOrigin: string;
    let notTxOrigin: string;
    let zeroEx: IZeroExContract;
    let verifyingContract: string;
    let makerToken: TestMintableERC20TokenContract;
    let takerToken: TestMintableERC20TokenContract;
    let wethToken: TestWethContract;
    let contractWallet: TestOrderSignerRegistryWithContractWalletContract;
    let testUtils: NativeOrdersTestEnvironment;

    before(async () => {
        // Useful for ETH balance accounting
        const txDefaults = { ...env.txDefaults, gasPrice: 0 };
        let owner;
        [
            owner,
            maker,
            taker,
            notMaker,
            notTaker,
            contractWalletOwner,
            contractWalletSigner,
            txOrigin,
            notTxOrigin,
        ] = await env.getAccountAddressesAsync();
        [makerToken, takerToken] = await Promise.all(
            [...new Array(2)].map(async () =>
                TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
                    artifacts.TestMintableERC20Token,
                    env.provider,
                    txDefaults,
                    artifacts,
                ),
            ),
        );
        wethToken = await TestWethContract.deployFrom0xArtifactAsync(
            artifacts.TestWeth,
            env.provider,
            txDefaults,
            artifacts,
        );
        zeroEx = await fullMigrateAsync(owner, env.provider, txDefaults, {}, { wethAddress: wethToken.address });
        const otcFeatureImpl = await OtcOrdersFeatureContract.deployFrom0xArtifactAsync(
            artifacts.OtcOrdersFeature,
            env.provider,
            txDefaults,
            artifacts,
            zeroEx.address,
            wethToken.address,
        );
        await new IOwnableFeatureContract(zeroEx.address, env.provider, txDefaults, abis)
            .migrate(otcFeatureImpl.address, otcFeatureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
        verifyingContract = zeroEx.address;

        await Promise.all([
            makerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: maker }),
            makerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: notMaker }),
            takerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: taker }),
            takerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: notTaker }),
            wethToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: maker }),
            wethToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: notMaker }),
            wethToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: taker }),
            wethToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: notTaker }),
        ]);

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
        await contractWallet
            .approveERC20(takerToken.address, zeroEx.address, MAX_UINT256)
            .awaitTransactionSuccessAsync({ from: contractWalletOwner });

        testUtils = new NativeOrdersTestEnvironment(maker, taker, makerToken, takerToken, zeroEx, ZERO, ZERO, env);
    });

    function getTestOtcOrder(fields: Partial<OtcOrder> = {}): OtcOrder {
        return getRandomOtcOrder({
            maker,
            verifyingContract,
            chainId: 1337,
            takerToken: takerToken.address,
            makerToken: makerToken.address,
            taker: NULL_ADDRESS,
            txOrigin: taker,
            ...fields,
        });
    }

    describe('getOtcOrderHash()', () => {
        it('returns the correct hash', async () => {
            const order = getTestOtcOrder();
            const hash = await zeroEx.getOtcOrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
    });

    describe('lastOtcTxOriginNonce()', () => {
        it('returns 0 if bucket is unused', async () => {
            const nonce = await zeroEx.lastOtcTxOriginNonce(taker, ZERO).callAsync();
            expect(nonce).to.bignumber.eq(0);
        });
        it('returns the last nonce used in a bucket', async () => {
            const order = getTestOtcOrder();
            await testUtils.fillOtcOrderAsync(order);
            const nonce = await zeroEx.lastOtcTxOriginNonce(taker, order.nonceBucket).callAsync();
            expect(nonce).to.bignumber.eq(order.nonce);
        });
    });

    describe('getOtcOrderInfo()', () => {
        it('unfilled order', async () => {
            const order = getTestOtcOrder();
            const info = await zeroEx.getOtcOrderInfo(order).callAsync();
            expect(info).to.deep.equal({
                status: OrderStatus.Fillable,
                orderHash: order.getHash(),
            });
        });

        it('unfilled expired order', async () => {
            const expiry = createExpiry(-60);
            const order = getTestOtcOrder({ expiry });
            const info = await zeroEx.getOtcOrderInfo(order).callAsync();
            expect(info).to.deep.equal({
                status: OrderStatus.Expired,
                orderHash: order.getHash(),
            });
        });

        it('filled then expired order', async () => {
            const expiry = createExpiry(60);
            const order = getTestOtcOrder({ expiry });
            await testUtils.fillOtcOrderAsync(order);
            // Advance time to expire the order.
            await env.web3Wrapper.increaseTimeAsync(61);
            const info = await zeroEx.getOtcOrderInfo(order).callAsync();
            expect(info).to.deep.equal({
                status: OrderStatus.Invalid,
                orderHash: order.getHash(),
            });
        });

        it('filled order', async () => {
            const order = getTestOtcOrder();
            // Fill the order first.
            await testUtils.fillOtcOrderAsync(order);
            const info = await zeroEx.getOtcOrderInfo(order).callAsync();
            expect(info).to.deep.equal({
                status: OrderStatus.Invalid,
                orderHash: order.getHash(),
            });
        });
    });

    async function assertExpectedFinalBalancesFromOtcOrderFillAsync(
        order: OtcOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
    ): Promise<void> {
        const { makerTokenFilledAmount, takerTokenFilledAmount } = computeOtcOrderFilledAmounts(
            order,
            takerTokenFillAmount,
        );
        const makerBalance = await new TestMintableERC20TokenContract(order.takerToken, env.provider)
            .balanceOf(order.maker)
            .callAsync();
        const takerBalance = await new TestMintableERC20TokenContract(order.makerToken, env.provider)
            .balanceOf(order.taker !== NULL_ADDRESS ? order.taker : taker)
            .callAsync();
        expect(makerBalance, 'maker balance').to.bignumber.eq(takerTokenFilledAmount);
        expect(takerBalance, 'taker balance').to.bignumber.eq(makerTokenFilledAmount);
    }

    describe('fillOtcOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestOtcOrder();
            const receipt = await testUtils.fillOtcOrderAsync(order);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order);
        });

        it('can partially fill an order', async () => {
            const order = getTestOtcOrder();
            const fillAmount = order.takerAmount.minus(1);
            const receipt = await testUtils.fillOtcOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order, fillAmount);
        });

        it('clamps fill amount to remaining available', async () => {
            const order = getTestOtcOrder();
            const fillAmount = order.takerAmount.plus(1);
            const receipt = await testUtils.fillOtcOrderAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order, fillAmount);
        });

        it('cannot fill an order with wrong tx.origin', async () => {
            const order = getTestOtcOrder();
            const tx = testUtils.fillOtcOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTaker, taker),
            );
        });

        it('cannot fill an order with wrong taker', async () => {
            const order = getTestOtcOrder({ taker: notTaker });
            const tx = testUtils.fillOtcOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByTakerError(order.getHash(), taker, notTaker),
            );
        });

        it('can fill an order from a different tx.origin if registered', async () => {
            const order = getTestOtcOrder();
            await zeroEx.registerAllowedRfqOrigins([notTaker], true).awaitTransactionSuccessAsync({ from: taker });
            return testUtils.fillOtcOrderAsync(order, order.takerAmount, notTaker);
        });

        it('cannot fill an order with registered then unregistered tx.origin', async () => {
            const order = getTestOtcOrder();
            await zeroEx.registerAllowedRfqOrigins([notTaker], true).awaitTransactionSuccessAsync({ from: taker });
            await zeroEx.registerAllowedRfqOrigins([notTaker], false).awaitTransactionSuccessAsync({ from: taker });
            const tx = testUtils.fillOtcOrderAsync(order, order.takerAmount, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTaker, taker),
            );
        });

        it('cannot fill an order with a zero tx.origin', async () => {
            const order = getTestOtcOrder({ txOrigin: NULL_ADDRESS });
            const tx = testUtils.fillOtcOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), taker, NULL_ADDRESS),
            );
        });

        it('cannot fill an expired order', async () => {
            const order = getTestOtcOrder({ expiry: createExpiry(-60) });
            const tx = testUtils.fillOtcOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Expired),
            );
        });

        it('cannot fill order with bad signature', async () => {
            const order = getTestOtcOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = testUtils.fillOtcOrderAsync(order.clone({ chainId: 1234 }));
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker),
            );
        });

        it('fails if ETH is attached', async () => {
            const order = getTestOtcOrder();
            await testUtils.prepareBalancesForOrdersAsync([order], taker);
            const tx = zeroEx
                .fillOtcOrder(order, await order.getSignatureWithProviderAsync(env.provider), order.takerAmount, false)
                .awaitTransactionSuccessAsync({ from: taker, value: 1 });
            // This will revert at the language level because the fill function is not payable.
            return expect(tx).to.be.rejectedWith('revert');
        });

        it('cannot fill the same order twice', async () => {
            const order = getTestOtcOrder();
            await testUtils.fillOtcOrderAsync(order);
            const tx = testUtils.fillOtcOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Invalid),
            );
        });

        it('cannot fill two orders with the same nonceBucket and nonce', async () => {
            const order1 = getTestOtcOrder();
            await testUtils.fillOtcOrderAsync(order1);
            const order2 = getTestOtcOrder({ nonceBucket: order1.nonceBucket, nonce: order1.nonce });
            const tx = testUtils.fillOtcOrderAsync(order2);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order2.getHash(), OrderStatus.Invalid),
            );
        });

        it('cannot fill an order whose nonce is less than the nonce last used in that bucket', async () => {
            const order1 = getTestOtcOrder();
            await testUtils.fillOtcOrderAsync(order1);
            const order2 = getTestOtcOrder({ nonceBucket: order1.nonceBucket, nonce: order1.nonce.minus(1) });
            const tx = testUtils.fillOtcOrderAsync(order2);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order2.getHash(), OrderStatus.Invalid),
            );
        });

        it('can fill two orders that use the same nonce bucket and increasing nonces', async () => {
            const order1 = getTestOtcOrder();
            const tx1 = await testUtils.fillOtcOrderAsync(order1);
            verifyEventsFromLogs(
                tx1.logs,
                [testUtils.createOtcOrderFilledEventArgs(order1)],
                IZeroExEvents.OtcOrderFilled,
            );
            const order2 = getTestOtcOrder({ nonceBucket: order1.nonceBucket, nonce: order1.nonce.plus(1) });
            const tx2 = await testUtils.fillOtcOrderAsync(order2);
            verifyEventsFromLogs(
                tx2.logs,
                [testUtils.createOtcOrderFilledEventArgs(order2)],
                IZeroExEvents.OtcOrderFilled,
            );
        });

        it('can fill two orders that use the same nonce but different nonce buckets', async () => {
            const order1 = getTestOtcOrder();
            const tx1 = await testUtils.fillOtcOrderAsync(order1);
            verifyEventsFromLogs(
                tx1.logs,
                [testUtils.createOtcOrderFilledEventArgs(order1)],
                IZeroExEvents.OtcOrderFilled,
            );
            const order2 = getTestOtcOrder({ nonce: order1.nonce });
            const tx2 = await testUtils.fillOtcOrderAsync(order2);
            verifyEventsFromLogs(
                tx2.logs,
                [testUtils.createOtcOrderFilledEventArgs(order2)],
                IZeroExEvents.OtcOrderFilled,
            );
        });

        it('can fill a WETH buy order and receive ETH', async () => {
            const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            const order = getTestOtcOrder({ makerToken: wethToken.address, makerAmount: new BigNumber('1e18') });
            await wethToken.deposit().awaitTransactionSuccessAsync({ from: maker, value: order.makerAmount });
            const receipt = await testUtils.fillOtcOrderAsync(order, order.takerAmount, taker, true);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            expect(takerEthBalanceAfter.minus(takerEthBalanceBefore)).to.bignumber.equal(order.makerAmount);
        });

        it('reverts if `unwrapWeth` is true but maker token is not WETH', async () => {
            const order = getTestOtcOrder();
            const tx = testUtils.fillOtcOrderAsync(order, order.takerAmount, taker, true);
            return expect(tx).to.revertWith('OtcOrdersFeature/INVALID_UNWRAP_WETH');
        });

        it('allows for fills on orders signed by a approved signer', async () => {
            const order = getTestOtcOrder({ maker: contractWallet.address });
            const sig = await order.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EthSign,
                contractWalletSigner,
            );
            // covers taker
            await testUtils.prepareBalancesForOrdersAsync([order]);
            // need to provide contract wallet with a balance
            await makerToken.mint(contractWallet.address, order.makerAmount).awaitTransactionSuccessAsync();
            // allow signer
            await contractWallet
                .registerAllowedOrderSigner(contractWalletSigner, true)
                .awaitTransactionSuccessAsync({ from: contractWalletOwner });
            // fill should succeed
            const receipt = await zeroEx
                .fillOtcOrder(order, sig, order.takerAmount, false)
                .awaitTransactionSuccessAsync({ from: taker });
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order);
        });

        it('disallows fills if the signer is revoked', async () => {
            const order = getTestOtcOrder({ maker: contractWallet.address });
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
            // fill should revert
            const tx = zeroEx
                .fillOtcOrder(order, sig, order.takerAmount, false)
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(
                    order.getHash(),
                    contractWalletSigner,
                    order.maker,
                ),
            );
        });

        it(`doesn't allow fills with an unapproved signer`, async () => {
            const order = getTestOtcOrder({ maker: contractWallet.address });
            const sig = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EthSign, maker);
            // covers taker
            await testUtils.prepareBalancesForOrdersAsync([order]);
            // need to provide contract wallet with a balance
            await makerToken.mint(contractWallet.address, order.makerAmount).awaitTransactionSuccessAsync();
            // fill should revert
            const tx = zeroEx
                .fillOtcOrder(order, sig, order.takerAmount, false)
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), maker, order.maker),
            );
        });
    });
    describe('fillOtcOrderWithEth()', () => {
        it('Can fill an order with ETH', async () => {
            const order = getTestOtcOrder({ takerToken: wethToken.address });
            const receipt = await testUtils.fillOtcOrderWithEthAsync(order);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order);
        });
        it('Can partially fill an order with ETH', async () => {
            const order = getTestOtcOrder({ takerToken: wethToken.address });
            const fillAmount = order.takerAmount.minus(1);
            const receipt = await testUtils.fillOtcOrderWithEthAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order, fillAmount)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order, fillAmount);
        });
        it('Can refund excess ETH is msg.value > order.takerAmount', async () => {
            const order = getTestOtcOrder({ takerToken: wethToken.address });
            const fillAmount = order.takerAmount.plus(420);
            const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            const receipt = await testUtils.fillOtcOrderWithEthAsync(order, fillAmount);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(order.takerAmount);
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order);
        });
        it('Cannot fill an order if taker token is not WETH', async () => {
            const order = getTestOtcOrder();
            const tx = testUtils.fillOtcOrderWithEthAsync(order);
            return expect(tx).to.revertWith('OtcOrdersFeature/INVALID_WRAP_ETH');
        });
    });

    describe('fillTakerSignedOtcOrder()', () => {
        it('can fully fill an order', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            const receipt = await testUtils.fillTakerSignedOtcOrderAsync(order);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order);
        });

        it('cannot fill an order with wrong tx.origin', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order, notTxOrigin);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTxOrigin, txOrigin),
            );
        });

        it('can fill an order from a different tx.origin if registered', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            await zeroEx
                .registerAllowedRfqOrigins([notTxOrigin], true)
                .awaitTransactionSuccessAsync({ from: txOrigin });
            return testUtils.fillTakerSignedOtcOrderAsync(order, notTxOrigin);
        });

        it('cannot fill an order with registered then unregistered tx.origin', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            await zeroEx
                .registerAllowedRfqOrigins([notTxOrigin], true)
                .awaitTransactionSuccessAsync({ from: txOrigin });
            await zeroEx
                .registerAllowedRfqOrigins([notTxOrigin], false)
                .awaitTransactionSuccessAsync({ from: txOrigin });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order, notTxOrigin);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTxOrigin, txOrigin),
            );
        });

        it('cannot fill an order with a zero tx.origin', async () => {
            const order = getTestOtcOrder({ taker, txOrigin: NULL_ADDRESS });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order, txOrigin);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), txOrigin, NULL_ADDRESS),
            );
        });

        it('cannot fill an expired order', async () => {
            const order = getTestOtcOrder({ taker, txOrigin, expiry: createExpiry(-60) });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Expired),
            );
        });

        it('cannot fill an order with bad taker signature', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order, txOrigin, notTaker);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByTakerError(order.getHash(), notTaker, taker),
            );
        });

        it('cannot fill order with bad maker signature', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order.clone({ chainId: 1234 }));
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker),
            );
        });

        it('fails if ETH is attached', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            await testUtils.prepareBalancesForOrdersAsync([order], taker);
            const tx = zeroEx
                .fillTakerSignedOtcOrder(
                    order,
                    await order.getSignatureWithProviderAsync(env.provider),
                    await order.getSignatureWithProviderAsync(env.provider, SignatureType.EthSign, taker),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: txOrigin, value: 1 });
            // This will revert at the language level because the fill function is not payable.
            return expect(tx).to.be.rejectedWith('revert');
        });

        it('cannot fill the same order twice', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            await testUtils.fillTakerSignedOtcOrderAsync(order);
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), OrderStatus.Invalid),
            );
        });

        it('cannot fill two orders with the same nonceBucket and nonce', async () => {
            const order1 = getTestOtcOrder({ taker, txOrigin });
            await testUtils.fillTakerSignedOtcOrderAsync(order1);
            const order2 = getTestOtcOrder({ taker, txOrigin, nonceBucket: order1.nonceBucket, nonce: order1.nonce });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order2);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order2.getHash(), OrderStatus.Invalid),
            );
        });

        it('cannot fill an order whose nonce is less than the nonce last used in that bucket', async () => {
            const order1 = getTestOtcOrder({ taker, txOrigin });
            await testUtils.fillTakerSignedOtcOrderAsync(order1);
            const order2 = getTestOtcOrder({
                taker,
                txOrigin,
                nonceBucket: order1.nonceBucket,
                nonce: order1.nonce.minus(1),
            });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order2);
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotFillableError(order2.getHash(), OrderStatus.Invalid),
            );
        });

        it('can fill two orders that use the same nonce bucket and increasing nonces', async () => {
            const order1 = getTestOtcOrder({ taker, txOrigin });
            const tx1 = await testUtils.fillTakerSignedOtcOrderAsync(order1);
            verifyEventsFromLogs(
                tx1.logs,
                [testUtils.createOtcOrderFilledEventArgs(order1)],
                IZeroExEvents.OtcOrderFilled,
            );
            const order2 = getTestOtcOrder({
                taker,
                txOrigin,
                nonceBucket: order1.nonceBucket,
                nonce: order1.nonce.plus(1),
            });
            const tx2 = await testUtils.fillTakerSignedOtcOrderAsync(order2);
            verifyEventsFromLogs(
                tx2.logs,
                [testUtils.createOtcOrderFilledEventArgs(order2)],
                IZeroExEvents.OtcOrderFilled,
            );
        });

        it('can fill two orders that use the same nonce but different nonce buckets', async () => {
            const order1 = getTestOtcOrder({ taker, txOrigin });
            const tx1 = await testUtils.fillTakerSignedOtcOrderAsync(order1);
            verifyEventsFromLogs(
                tx1.logs,
                [testUtils.createOtcOrderFilledEventArgs(order1)],
                IZeroExEvents.OtcOrderFilled,
            );
            const order2 = getTestOtcOrder({ taker, txOrigin, nonce: order1.nonce });
            const tx2 = await testUtils.fillTakerSignedOtcOrderAsync(order2);
            verifyEventsFromLogs(
                tx2.logs,
                [testUtils.createOtcOrderFilledEventArgs(order2)],
                IZeroExEvents.OtcOrderFilled,
            );
        });

        it('can fill a WETH buy order and receive ETH', async () => {
            const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            const order = getTestOtcOrder({
                taker,
                txOrigin,
                makerToken: wethToken.address,
                makerAmount: new BigNumber('1e18'),
            });
            await wethToken.deposit().awaitTransactionSuccessAsync({ from: maker, value: order.makerAmount });
            const receipt = await testUtils.fillTakerSignedOtcOrderAsync(order, txOrigin, taker, true);
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            expect(takerEthBalanceAfter.minus(takerEthBalanceBefore)).to.bignumber.equal(order.makerAmount);
        });

        it('reverts if `unwrapWeth` is true but maker token is not WETH', async () => {
            const order = getTestOtcOrder({ taker, txOrigin });
            const tx = testUtils.fillTakerSignedOtcOrderAsync(order, txOrigin, taker, true);
            return expect(tx).to.revertWith('OtcOrdersFeature/INVALID_UNWRAP_WETH');
        });

        it('allows for fills on orders signed by a approved signer (taker)', async () => {
            const order = getTestOtcOrder({ txOrigin, taker: contractWallet.address });
            await testUtils.prepareBalancesForOrdersAsync([order], contractWallet.address);
            // allow signer
            await contractWallet
                .registerAllowedOrderSigner(contractWalletSigner, true)
                .awaitTransactionSuccessAsync({ from: contractWalletOwner });
            // fill should succeed
            const receipt = await zeroEx
                .fillTakerSignedOtcOrder(
                    order,
                    await order.getSignatureWithProviderAsync(env.provider),
                    await order.getSignatureWithProviderAsync(
                        env.provider,
                        SignatureType.EthSign,
                        contractWalletSigner,
                    ),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: txOrigin });
            verifyEventsFromLogs(
                receipt.logs,
                [testUtils.createOtcOrderFilledEventArgs(order)],
                IZeroExEvents.OtcOrderFilled,
            );
            await assertExpectedFinalBalancesFromOtcOrderFillAsync(order);
        });

        it(`doesn't allow fills with an unapproved signer (taker)`, async () => {
            const order = getTestOtcOrder({ txOrigin, taker: contractWallet.address });
            await testUtils.prepareBalancesForOrdersAsync([order], contractWallet.address);
            // fill should succeed
            const tx = zeroEx
                .fillTakerSignedOtcOrder(
                    order,
                    await order.getSignatureWithProviderAsync(env.provider),
                    await order.getSignatureWithProviderAsync(env.provider, SignatureType.EthSign, notTaker),
                    false,
                )
                .awaitTransactionSuccessAsync({ from: txOrigin });
            return expect(tx).to.revertWith(
                new RevertErrors.NativeOrders.OrderNotSignedByTakerError(order.getHash(), notTaker, order.taker),
            );
        });
    });
});
