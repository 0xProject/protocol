import {
    blockchainTests,
    constants,
    describe,
    expect,
    getRandomInteger,
    getRandomPortion,
    randomAddress,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import { ERC1155Order, NFTOrder, RevertErrors, SIGNATURE_ABI, SignatureType } from '@0x/protocol-utils';
import { AbiEncoder, BigNumber, hexUtils, NULL_BYTES, StringRevertError } from '@0x/utils';

import {
    IOwnableFeatureContract,
    IZeroExContract,
    IZeroExERC1155OrderFilledEventArgs,
    IZeroExEvents,
} from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import { getRandomERC1155Order } from '../utils/nft_orders';

import {
    ERC1155OrdersFeatureContract,
    TestFeeRecipientContract,
    TestMintableERC1155TokenContract,
    TestMintableERC20TokenContract,
    TestNFTOrderPresignerContract,
    TestPropertyValidatorContract,
    TestWethContract,
} from '../wrappers';

blockchainTests.resets('ERC1155OrdersFeature', env => {
    const { NULL_ADDRESS, MAX_UINT256, ZERO_AMOUNT: ZERO } = constants;
    const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    let owner: string;
    let maker: string;
    let taker: string;
    let otherMaker: string;
    let otherTaker: string;
    let feeRecipient: TestFeeRecipientContract;
    let zeroEx: IZeroExContract;
    let weth: TestWethContract;
    let erc20Token: TestMintableERC20TokenContract;
    let erc1155Token: TestMintableERC1155TokenContract;

    async function sendEtherAsync(to: string, amount: BigNumber): Promise<void> {
        await env.web3Wrapper.awaitTransactionSuccessAsync(
            await env.web3Wrapper.sendTransactionAsync({
                ...env.txDefaults,
                to,
                from: owner,
                value: amount,
            }),
        );
    }

    before(async () => {
        // Useful for ETH balance accounting
        const txDefaults = { ...env.txDefaults, gasPrice: 0 };
        [owner, maker, taker, otherMaker, otherTaker] = await env.getAccountAddressesAsync();

        weth = await TestWethContract.deployFrom0xArtifactAsync(
            artifacts.TestWeth,
            env.provider,
            txDefaults,
            artifacts,
        );
        erc20Token = await TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
            artifacts.TestMintableERC20Token,
            env.provider,
            txDefaults,
            artifacts,
        );
        erc1155Token = await TestMintableERC1155TokenContract.deployFrom0xArtifactAsync(
            artifacts.TestMintableERC1155Token,
            env.provider,
            txDefaults,
            artifacts,
        );

        zeroEx = await fullMigrateAsync(owner, env.provider, txDefaults, {}, { wethAddress: weth.address });
        zeroEx = new IZeroExContract(zeroEx.address, env.provider, txDefaults, abis);

        const featureImpl = await ERC1155OrdersFeatureContract.deployFrom0xArtifactAsync(
            artifacts.ERC1155OrdersFeature,
            env.provider,
            txDefaults,
            artifacts,
            zeroEx.address,
            weth.address,
        );
        await new IOwnableFeatureContract(zeroEx.address, env.provider, txDefaults, abis)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();

        await Promise.all([
            erc20Token.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: maker,
            }),
            erc20Token.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: otherMaker,
            }),
            erc20Token.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: taker,
            }),
            erc20Token.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: otherTaker,
            }),
            weth.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: maker,
            }),
            weth.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: otherMaker,
            }),
            weth.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: taker,
            }),
            weth.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({
                from: otherTaker,
            }),
            erc1155Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
                from: maker,
            }),
            erc1155Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
                from: otherMaker,
            }),
            erc1155Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
                from: taker,
            }),
            erc1155Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
                from: otherTaker,
            }),
        ]);

        feeRecipient = await TestFeeRecipientContract.deployFrom0xArtifactAsync(
            artifacts.TestFeeRecipient,
            env.provider,
            txDefaults,
            artifacts,
        );
    });

    async function mintAssetsAsync(
        order: ERC1155Order,
        tokenId: BigNumber = order.erc1155TokenId,
        amount: BigNumber = order.erc1155TokenAmount,
        _taker: string = taker,
    ): Promise<void> {
        const totalFeeAmount = order.fees.length > 0 ? BigNumber.sum(...order.fees.map(fee => fee.amount)) : ZERO;
        if (order.direction === NFTOrder.TradeDirection.SellNFT) {
            await erc1155Token.mint(order.maker, tokenId, amount).awaitTransactionSuccessAsync();
            if (order.erc20Token !== ETH_TOKEN_ADDRESS) {
                await erc20Token
                    .mint(_taker, order.erc20TokenAmount.plus(totalFeeAmount))
                    .awaitTransactionSuccessAsync();
            }
        } else {
            await erc1155Token.mint(_taker, tokenId, amount).awaitTransactionSuccessAsync();
            if (order.erc20Token === weth.address) {
                await weth.deposit().awaitTransactionSuccessAsync({
                    from: order.maker,
                    value: order.erc20TokenAmount.plus(totalFeeAmount),
                });
            } else {
                await erc20Token
                    .mint(order.maker, order.erc20TokenAmount.plus(totalFeeAmount))
                    .awaitTransactionSuccessAsync();
            }
        }
    }

    async function assertBalancesAsync(
        order: ERC1155Order,
        tokenId: BigNumber = order.erc1155TokenId,
        amount: BigNumber = order.erc1155TokenAmount,
        _taker: string = taker,
    ): Promise<void> {
        const token = order.erc20Token === weth.address ? weth : erc20Token;
        if (order.direction === NFTOrder.TradeDirection.SellNFT) {
            const erc20FillAmount = amount
                .times(order.erc20TokenAmount)
                .dividedBy(order.erc1155TokenAmount)
                .integerValue(BigNumber.ROUND_CEIL);
            const erc20Balance = await token.balanceOf(order.maker).callAsync();
            expect(erc20Balance).to.bignumber.equal(erc20FillAmount);
            const erc1155Balance = await erc1155Token.balanceOf(_taker, tokenId).callAsync();
            expect(erc1155Balance).to.bignumber.equal(amount);
        } else {
            const erc20FillAmount = amount
                .times(order.erc20TokenAmount)
                .dividedBy(order.erc1155TokenAmount)
                .integerValue(BigNumber.ROUND_FLOOR);
            const erc20Balance = await token.balanceOf(_taker).callAsync();
            expect(erc20Balance).to.bignumber.equal(erc20FillAmount);
            const erc1155Balance = await erc1155Token.balanceOf(order.maker, tokenId).callAsync();
            expect(erc1155Balance).to.bignumber.equal(amount);
        }
        if (order.fees.length > 0) {
            await Promise.all(
                order.fees.map(async fee => {
                    const feeRecipientBalance = await token.balanceOf(fee.recipient).callAsync();
                    const feeFillAmount = amount.times(fee.amount).idiv(order.erc1155TokenAmount);
                    expect(feeRecipientBalance).to.bignumber.equal(feeFillAmount);
                }),
            );
        }
    }

    function getTestERC1155Order(fields: Partial<ERC1155Order> = {}): ERC1155Order {
        return getRandomERC1155Order({
            maker,
            verifyingContract: zeroEx.address,
            chainId: 1337,
            erc20Token: erc20Token.address,
            erc1155Token: erc1155Token.address,
            taker: NULL_ADDRESS,
            ...fields,
        });
    }

    function createERC1155OrderFilledEvent(
        order: ERC1155Order,
        amount: BigNumber = order.erc1155TokenAmount,
        _taker: string = taker,
        erc1155TokenId: BigNumber = order.erc1155TokenId,
    ): IZeroExERC1155OrderFilledEventArgs {
        const erc20FillAmount = amount
            .times(order.erc20TokenAmount)
            .dividedBy(order.erc1155TokenAmount)
            .integerValue(
                order.direction === NFTOrder.TradeDirection.SellNFT ? BigNumber.ROUND_CEIL : BigNumber.ROUND_FLOOR,
            );
        return {
            direction: order.direction,
            maker: order.maker,
            taker,
            nonce: order.nonce,
            erc20Token: order.erc20Token,
            erc20FillAmount,
            erc1155Token: order.erc1155Token,
            erc1155TokenId,
            erc1155FillAmount: amount,
            matcher: NULL_ADDRESS,
        };
    }

    describe('getERC1155OrderHash()', () => {
        it('returns the correct hash for order with no fees or properties', async () => {
            const order = getTestERC1155Order();
            const hash = await zeroEx.getERC1155OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
        it('returns the correct hash for order with null property', async () => {
            const order = getTestERC1155Order({
                erc1155TokenProperties: [
                    {
                        propertyValidator: NULL_ADDRESS,
                        propertyData: NULL_BYTES,
                    },
                ],
            });
            const hash = await zeroEx.getERC1155OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
        it('returns the correct hash for order with 1 fee, 1 property', async () => {
            const order = getTestERC1155Order({
                fees: [
                    {
                        recipient: randomAddress(),
                        amount: getRandomInteger(0, MAX_UINT256),
                        feeData: hexUtils.random(),
                    },
                ],
                erc1155TokenProperties: [
                    {
                        propertyValidator: randomAddress(),
                        propertyData: hexUtils.random(),
                    },
                ],
            });
            const hash = await zeroEx.getERC1155OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
        it('returns the correct hash for order with 2 fees, 2 properties', async () => {
            const order = getTestERC1155Order({
                fees: [
                    {
                        recipient: randomAddress(),
                        amount: getRandomInteger(0, MAX_UINT256),
                        feeData: hexUtils.random(),
                    },
                    {
                        recipient: randomAddress(),
                        amount: getRandomInteger(0, MAX_UINT256),
                        feeData: hexUtils.random(),
                    },
                ],
                erc1155TokenProperties: [
                    {
                        propertyValidator: randomAddress(),
                        propertyData: hexUtils.random(),
                    },
                    {
                        propertyValidator: randomAddress(),
                        propertyData: hexUtils.random(),
                    },
                ],
            });
            const hash = await zeroEx.getERC1155OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
    });

    describe('validateERC1155OrderSignature', () => {
        it('succeeds for a valid EthSign signature', async () => {
            const order = getTestERC1155Order();
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await zeroEx.validateERC1155OrderSignature(order, signature).callAsync();
        });
        it('reverts for an invalid EthSign signature', async () => {
            const order = getTestERC1155Order();
            const signature = await order.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EthSign,
                otherMaker,
            );
            const tx = zeroEx.validateERC1155OrderSignature(order, signature).callAsync();
            expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
        it('succeeds for a valid EIP-712 signature', async () => {
            const order = getTestERC1155Order();
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712);
            await zeroEx.validateERC1155OrderSignature(order, signature).callAsync();
        });
        it('reverts for an invalid EIP-712 signature', async () => {
            const order = getTestERC1155Order();
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712, otherMaker);
            const tx = zeroEx.validateERC1155OrderSignature(order, signature).callAsync();
            expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
    });

    describe('cancelERC1155Order', () => {
        it('can cancel an order', async () => {
            const order = getTestERC1155Order();
            const tx = await zeroEx.cancelERC1155Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            verifyEventsFromLogs(tx.logs, [{ maker, nonce: order.nonce }], IZeroExEvents.ERC1155OrderCancelled);
            const orderInfo = await zeroEx.getERC1155OrderInfo(order).callAsync();
            expect(orderInfo.status).to.equal(NFTOrder.OrderStatus.Unfillable);
        });
        it('cancelling an order twice silently succeeds', async () => {
            const order = getTestERC1155Order();
            await zeroEx.cancelERC1155Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            const tx = await zeroEx.cancelERC1155Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            verifyEventsFromLogs(tx.logs, [{ maker, nonce: order.nonce }], IZeroExEvents.ERC1155OrderCancelled);
            const orderInfo = await zeroEx.getERC1155OrderInfo(order).callAsync();
            expect(orderInfo.status).to.equal(NFTOrder.OrderStatus.Unfillable);
        });
    });

    describe('sellERC1155', () => {
        it('can fully fill a ERC1155 buy order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = await zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
            verifyEventsFromLogs(tx.logs, [createERC1155OrderFilledEvent(order)], IZeroExEvents.ERC1155OrderFilled);
            const orderInfo = await zeroEx.getERC1155OrderInfo(order).callAsync();
            expect(orderInfo.status).to.equal(NFTOrder.OrderStatus.Unfillable);
        });
        it('can partially fill a ERC1155 buy order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            const erc1155FillAmount = BigNumber.max(getRandomPortion(order.erc1155TokenAmount.minus(1)), 1);
            await mintAssetsAsync(order, order.erc1155TokenId, erc1155FillAmount);
            await zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, erc1155FillAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order, order.erc1155TokenId, erc1155FillAmount);
            const orderInfo = await zeroEx.getERC1155OrderInfo(order).callAsync();
            expect(orderInfo.status).to.equal(NFTOrder.OrderStatus.Fillable);
        });
        it('cannot fill the same order twice', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('cannot fill a cancelled order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx.cancelERC1155Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('cannot fill an invalid order (erc20Token == ETH)', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: ETH_TOKEN_ADDRESS,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await erc1155Token
                .mint(taker, order.erc1155TokenId, order.erc1155TokenAmount)
                .awaitTransactionSuccessAsync();
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith('NFTOrders::_validateBuyOrder/NATIVE_TOKEN_NOT_ALLOWED');
        });
        it('cannot fill an expired order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                expiry: new BigNumber(Math.floor(Date.now() / 1000 - 1)),
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Expired),
            );
        });
        it('reverts if a sell order is provided', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith('NFTOrders::_validateBuyOrder/WRONG_TRADE_DIRECTION');
        });
        it('reverts if the taker is not the taker address specified in the order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order, order.erc1155TokenId, order.erc1155TokenAmount, otherTaker);
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: otherTaker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.OnlyTakerError(otherTaker, taker));
        });
        it('succeeds if the taker is the taker address specified in the order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
        });
        it('reverts if an invalid signature is provided', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712, otherMaker);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
        it('reverts if `unwrapNativeToken` is true and `erc20Token` is not WETH', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, true, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.ERC20TokenMismatchError(order.erc20Token, weth.address),
            );
        });
        it('sends ETH to taker if `unwrapNativeToken` is true and `erc20Token` is WETH', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: weth.address,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            await zeroEx
                .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, true, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            expect(takerEthBalanceAfter.minus(takerEthBalanceBefore)).to.bignumber.equal(order.erc20TokenAmount);
            const makerBalance = await erc1155Token.balanceOf(maker, order.erc1155TokenId).callAsync();
            expect(makerBalance).to.bignumber.equal(order.erc1155TokenAmount);
        });
        describe('fees', () => {
            it('single fee to EOA', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: new BigNumber(111),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                await zeroEx
                    .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order);
            });
            it('partial fill, single fee', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: getRandomInteger('1e18', '10e18'),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                const erc1155FillAmount = BigNumber.max(getRandomPortion(order.erc1155TokenAmount.minus(1)), 1);
                await mintAssetsAsync(order, order.erc1155TokenId, erc1155FillAmount);
                await zeroEx
                    .sellERC1155(order, signature, order.erc1155TokenId, erc1155FillAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order, order.erc1155TokenId, erc1155FillAmount);
            });
            it('single fee, successful callback', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    fees: [
                        {
                            recipient: feeRecipient.address,
                            amount: new BigNumber(111),
                            feeData: hexUtils.random(),
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                await zeroEx
                    .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order);
            });
            it('single fee, callback reverts', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    fees: [
                        {
                            recipient: feeRecipient.address,
                            amount: new BigNumber(333),
                            feeData: hexUtils.random(),
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                const tx = zeroEx
                    .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith('TestFeeRecipient::receiveZeroExFeeCallback/REVERT');
            });
            it('single fee, callback returns invalid value', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    fees: [
                        {
                            recipient: feeRecipient.address,
                            amount: new BigNumber(666),
                            feeData: hexUtils.random(),
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                const tx = zeroEx
                    .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith('NFTOrders::_payFees/CALLBACK_FAILED');
            });
            it('multiple fees to EOAs', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: new BigNumber(111),
                            feeData: constants.NULL_BYTES,
                        },
                        {
                            recipient: otherTaker,
                            amount: new BigNumber(222),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                await zeroEx
                    .sellERC1155(order, signature, order.erc1155TokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order);
            });
        });
        describe('properties', () => {
            let propertyValidator: TestPropertyValidatorContract;

            before(async () => {
                propertyValidator = await TestPropertyValidatorContract.deployFrom0xArtifactAsync(
                    artifacts.TestPropertyValidator,
                    env.provider,
                    env.txDefaults,
                    artifacts,
                );
            });
            it('Checks tokenId if no properties are provided', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order, order.erc1155TokenId.plus(1));
                const tx = zeroEx
                    .sellERC1155(
                        order,
                        signature,
                        order.erc1155TokenId.plus(1),
                        order.erc1155TokenAmount,
                        false,
                        NULL_BYTES,
                    )
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith(
                    new RevertErrors.NFTOrders.TokenIdMismatchError(order.erc1155TokenId.plus(1), order.erc1155TokenId),
                );
            });
            it('Null property', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    erc1155TokenId: ZERO,
                    erc1155TokenProperties: [
                        {
                            propertyValidator: NULL_ADDRESS,
                            propertyData: NULL_BYTES,
                        },
                    ],
                });
                const tokenId = getRandomInteger(0, MAX_UINT256);
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order, tokenId);
                await zeroEx
                    .sellERC1155(order, signature, tokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order, tokenId);
            });
            it('Reverts if property validation fails', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    erc1155TokenId: ZERO,
                    erc1155TokenProperties: [
                        {
                            propertyValidator: propertyValidator.address,
                            propertyData: NULL_BYTES,
                        },
                    ],
                });
                const tokenId = getRandomInteger(0, MAX_UINT256);
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order, tokenId);
                const tx = zeroEx
                    .sellERC1155(order, signature, tokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith(
                    new RevertErrors.NFTOrders.PropertyValidationFailedError(
                        propertyValidator.address,
                        order.erc1155Token,
                        tokenId,
                        NULL_BYTES,
                        new StringRevertError('TestPropertyValidator::validateProperty/REVERT').encode(),
                    ),
                );
            });
            it('Successful property validation', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    erc1155TokenId: ZERO,
                    erc1155TokenProperties: [
                        {
                            propertyValidator: propertyValidator.address,
                            propertyData: hexUtils.random(),
                        },
                    ],
                });
                const tokenId = getRandomInteger(0, MAX_UINT256);
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order, tokenId);
                await zeroEx
                    .sellERC1155(order, signature, tokenId, order.erc1155TokenAmount, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order, tokenId);
            });
        });
    });
    describe('onERC1155Received', () => {
        let dataEncoder: AbiEncoder.DataType;
        before(() => {
            dataEncoder = AbiEncoder.create(
                [
                    {
                        name: 'order',
                        type: 'tuple',
                        components: ERC1155Order.STRUCT_ABI,
                    },
                    {
                        name: 'signature',
                        type: 'tuple',
                        components: SIGNATURE_ABI,
                    },
                    { name: 'unwrapNativeToken', type: 'bool' },
                ],
                [
                    {
                        name: 'property',
                        type: 'tuple',
                        internalType: 'Property',
                        components: [
                            {
                                name: 'propertyValidator',
                                type: 'address',
                            },
                            { name: 'propertyData', type: 'bytes' },
                        ],
                    },
                    {
                        name: 'fee',
                        type: 'tuple',
                        internalType: 'Fee',
                        components: [
                            { name: 'recipient', type: 'address' },
                            { name: 'amount', type: 'uint256' },
                            { name: 'feeData', type: 'bytes' },
                        ],
                    },
                ],
            );
        });
        it('throws if data is not encoded correctly', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            const tx = erc1155Token
                .safeTransferFrom(
                    taker,
                    zeroEx.address,
                    order.erc1155TokenId,
                    order.erc1155TokenAmount,
                    hexUtils.random(),
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.be.rejected();
        });
        it('reverts if msg.sender != order.erc1155Token', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .onERC1155Received(
                    taker,
                    taker,
                    order.erc1155TokenId,
                    order.erc1155TokenAmount,
                    dataEncoder.encode({
                        order,
                        signature,
                        unwrapNativeToken: false,
                    }),
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.ERC1155TokenMismatchError(taker, order.erc1155Token),
            );
        });
        it('reverts if transferred tokenId does not match order.erc1155TokenId', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order, order.erc1155TokenId.plus(1));

            const tx = erc1155Token
                .safeTransferFrom(
                    taker,
                    zeroEx.address,
                    order.erc1155TokenId.plus(1),
                    order.erc1155TokenAmount,
                    dataEncoder.encode({
                        order,
                        signature,
                        unwrapNativeToken: false,
                    }),
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.TokenIdMismatchError(order.erc1155TokenId.plus(1), order.erc1155TokenId),
            );
        });
        it('can sell ERC1155 without approval', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            // revoke approval
            await erc1155Token.setApprovalForAll(zeroEx.address, false).awaitTransactionSuccessAsync({
                from: taker,
            });

            await erc1155Token
                .safeTransferFrom(
                    taker,
                    zeroEx.address,
                    order.erc1155TokenId,
                    order.erc1155TokenAmount,
                    dataEncoder.encode({
                        order,
                        signature,
                        unwrapNativeToken: false,
                    }),
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
        });
    });
    describe('buyERC1155', () => {
        it('can fill a ERC1155 sell order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = await zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
            verifyEventsFromLogs(tx.logs, [createERC1155OrderFilledEvent(order)], IZeroExEvents.ERC1155OrderFilled);
            const orderInfo = await zeroEx.getERC1155OrderInfo(order).callAsync();
            expect(orderInfo.status).to.equal(NFTOrder.OrderStatus.Unfillable);
        });
        it('can partially fill a ERC1155 sell order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            const erc1155FillAmount = BigNumber.max(getRandomPortion(order.erc1155TokenAmount.minus(1)), 1);
            await mintAssetsAsync(order, order.erc1155TokenId, erc1155FillAmount);
            await zeroEx.buyERC1155(order, signature, erc1155FillAmount, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            await assertBalancesAsync(order, order.erc1155TokenId, erc1155FillAmount);
            const orderInfo = await zeroEx.getERC1155OrderInfo(order).callAsync();
            expect(orderInfo.status).to.equal(NFTOrder.OrderStatus.Fillable);
        });
        it('cannot fill the same order twice', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            const tx = zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('cannot fill a cancelled order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx.cancelERC1155Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            const tx = zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('cannot fill an expired order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                expiry: new BigNumber(Math.floor(Date.now() / 1000 - 1)),
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Expired),
            );
        });
        it('reverts if a buy order is provided', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith('NFTOrders::_validateSellOrder/WRONG_TRADE_DIRECTION');
        });
        it('reverts if the taker is not the taker address specified in the order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order, order.erc1155TokenId, order.erc1155TokenAmount, otherTaker);
            const tx = zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: otherTaker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.OnlyTakerError(otherTaker, taker));
        });
        it('succeeds if the taker is the taker address specified in the order', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
        });
        it('reverts if an invalid signature is provided', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712, otherMaker);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
        describe('ETH', () => {
            it('can fill an order with ETH (and refunds excess ETH)', async () => {
                const order = getTestERC1155Order({
                    erc20Token: ETH_TOKEN_ADDRESS,
                    direction: NFTOrder.TradeDirection.SellNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const makerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(maker);
                const tx = await zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                        value: order.erc20TokenAmount.plus(1),
                    });
                const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const makerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(maker);
                expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(order.erc20TokenAmount);
                expect(makerEthBalanceAfter.minus(makerEthBalanceBefore)).to.bignumber.equal(order.erc20TokenAmount);
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            operator: zeroEx.address,
                            from: maker,
                            to: taker,
                            id: order.erc1155TokenId,
                            value: order.erc1155TokenAmount,
                        },
                    ],
                    'TransferSingle',
                );
            });
            it('can fill a WETH order with ETH', async () => {
                const order = getTestERC1155Order({
                    erc20Token: weth.address,
                    direction: NFTOrder.TradeDirection.SellNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await erc1155Token
                    .mint(maker, order.erc1155TokenId, order.erc1155TokenAmount)
                    .awaitTransactionSuccessAsync();
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                await zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                        value: order.erc20TokenAmount,
                    });
                const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(order.erc20TokenAmount);
                await assertBalancesAsync(order);
            });
            it('uses WETH if not enough ETH to fill WETH order', async () => {
                const order = getTestERC1155Order({
                    erc20Token: weth.address,
                    direction: NFTOrder.TradeDirection.SellNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await weth.deposit().awaitTransactionSuccessAsync({
                    from: taker,
                    value: order.erc20TokenAmount,
                });
                await erc1155Token
                    .mint(maker, order.erc1155TokenId, order.erc1155TokenAmount)
                    .awaitTransactionSuccessAsync();
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                await zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                        value: order.erc20TokenAmount.minus(1),
                    });
                const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                expect(takerEthBalanceAfter).to.bignumber.equal(takerEthBalanceBefore);
                await assertBalancesAsync(order);
            });
        });
        describe('fees', () => {
            it('single fee to EOA', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.SellNFT,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: new BigNumber(111),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                await zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order);
            });
            it('partial fill, single fee', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.SellNFT,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: getRandomInteger('1e18', '10e18'),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                const erc1155FillAmount = BigNumber.max(getRandomPortion(order.erc1155TokenAmount.minus(1)), 1);
                await mintAssetsAsync(order, order.erc1155TokenId, erc1155FillAmount);
                await zeroEx.buyERC1155(order, signature, erc1155FillAmount, NULL_BYTES).awaitTransactionSuccessAsync({
                    from: taker,
                });
                await assertBalancesAsync(order, order.erc1155TokenId, erc1155FillAmount);
            });
            it('pays fees in ETH if erc20Token == ETH', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.SellNFT,
                    erc20Token: ETH_TOKEN_ADDRESS,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: new BigNumber(111),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const makerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(maker);
                const feeRecipientEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(otherMaker);
                await zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                        value: order.erc20TokenAmount.plus(order.fees[0].amount).plus(1),
                    });
                const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const makerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(maker);
                const feeRecipientEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(otherMaker);
                expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(
                    order.erc20TokenAmount.plus(order.fees[0].amount),
                );
                expect(makerEthBalanceAfter.minus(makerEthBalanceBefore)).to.bignumber.equal(order.erc20TokenAmount);
                expect(feeRecipientEthBalanceAfter.minus(feeRecipientEthBalanceBefore)).to.bignumber.equal(
                    order.fees[0].amount,
                );
                const takerBalance = await erc1155Token.balanceOf(taker, order.erc1155TokenId).callAsync();
                expect(takerBalance).to.bignumber.equal(order.erc1155TokenAmount);
            });
            it('pays fees in ETH if erc20Token == WETH but taker uses ETH', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.SellNFT,
                    erc20Token: weth.address,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: new BigNumber(111),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const feeRecipientEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(otherMaker);
                const tx = await zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                        value: order.erc20TokenAmount.plus(order.fees[0].amount).plus(1),
                    });
                const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const feeRecipientEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(otherMaker);
                expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(
                    order.erc20TokenAmount.plus(order.fees[0].amount),
                );
                expect(feeRecipientEthBalanceAfter.minus(feeRecipientEthBalanceBefore)).to.bignumber.equal(
                    order.fees[0].amount,
                );
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: maker,
                            value: order.erc20TokenAmount,
                        },
                    ],
                    'Transfer',
                );
                verifyEventsFromLogs(
                    tx.logs,
                    [
                        {
                            operator: zeroEx.address,
                            from: maker,
                            to: taker,
                            id: order.erc1155TokenId,
                            value: order.erc1155TokenAmount,
                        },
                    ],
                    'TransferSingle',
                );
            });
            it('pays fees in WETH if taker uses WETH', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.SellNFT,
                    erc20Token: weth.address,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: new BigNumber(111),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await erc1155Token
                    .mint(maker, order.erc1155TokenId, order.erc1155TokenAmount)
                    .awaitTransactionSuccessAsync();
                await weth.deposit().awaitTransactionSuccessAsync({
                    from: taker,
                    value: order.erc20TokenAmount.plus(order.fees[0].amount),
                });
                await zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order);
            });
            it('reverts if overspent ETH', async () => {
                const order = getTestERC1155Order({
                    direction: NFTOrder.TradeDirection.SellNFT,
                    erc20Token: ETH_TOKEN_ADDRESS,
                    fees: [
                        {
                            recipient: otherMaker,
                            amount: new BigNumber(111),
                            feeData: constants.NULL_BYTES,
                        },
                    ],
                });
                await sendEtherAsync(zeroEx.address, order.fees[0].amount);
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                const tx = zeroEx
                    .buyERC1155(order, signature, order.erc1155TokenAmount, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                        value: order.erc20TokenAmount,
                    });
                return expect(tx).to.revertWith(
                    new RevertErrors.NFTOrders.OverspentEthError(
                        order.erc20TokenAmount.plus(order.fees[0].amount),
                        order.erc20TokenAmount,
                    ),
                );
            });
        });
    });
    describe('batchBuyERC1155s', () => {
        it('reverts if arrays are different lengths', async () => {
            const order = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .batchBuyERC1155s(
                    [order],
                    [signature, signature],
                    [order.erc1155TokenAmount, order.erc1155TokenAmount],
                    [NULL_BYTES, NULL_BYTES],
                    false,
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith('ERC1155OrdersFeature::batchBuyERC1155s/ARRAY_LENGTH_MISMATCH');
        });
        it('successfully fills multiple orders', async () => {
            const order1 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            const signature2 = await order2.getSignatureWithProviderAsync(env.provider);
            await erc1155Token
                .mint(maker, order2.erc1155TokenId, order2.erc1155TokenAmount)
                .awaitTransactionSuccessAsync();
            await weth.deposit().sendTransactionAsync({
                from: taker,
                value: order2.erc20TokenAmount,
            });
            await zeroEx
                .batchBuyERC1155s(
                    [order1, order2],
                    [signature1, signature2],
                    [order1.erc1155TokenAmount, order2.erc1155TokenAmount],
                    [NULL_BYTES, NULL_BYTES],
                    false,
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order1);
            await assertBalancesAsync(order2);
        });
        it('catches revert if one order fails', async () => {
            const order1 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            // invalid signature
            const signature2 = await order2.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EIP712,
                otherMaker,
            );
            await erc1155Token
                .mint(maker, order2.erc1155TokenId, order2.erc1155TokenAmount)
                .awaitTransactionSuccessAsync();
            await weth.deposit().sendTransactionAsync({
                from: taker,
                value: order2.erc20TokenAmount,
            });
            const tx = zeroEx.batchBuyERC1155s(
                [order1, order2],
                [signature1, signature2],
                [order1.erc1155TokenAmount, order2.erc1155TokenAmount],
                [NULL_BYTES, NULL_BYTES],
                false,
            );
            const successes = await tx.callAsync({
                from: taker,
            });
            expect(successes).to.deep.equal([true, false]);
            await tx.awaitTransactionSuccessAsync({
                from: taker,
            });
            await assertBalancesAsync(order1);
            const makerBalance = await erc1155Token.balanceOf(maker, order2.erc1155TokenId).callAsync();
            expect(makerBalance).to.bignumber.equal(order2.erc1155TokenAmount);
            const takerWethBalance = await weth.balanceOf(taker).callAsync();
            expect(takerWethBalance).to.bignumber.equal(order2.erc20TokenAmount);
        });
        it('bubbles up revert if one order fails and `revertIfIncomplete == true`', async () => {
            const order1 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            // invalid signature
            const signature2 = await order2.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EIP712,
                otherMaker,
            );
            await erc1155Token
                .mint(maker, order2.erc1155TokenId, order2.erc1155TokenAmount)
                .awaitTransactionSuccessAsync();
            await weth.deposit().sendTransactionAsync({
                from: taker,
                value: order2.erc20TokenAmount,
            });
            const tx = zeroEx
                .batchBuyERC1155s(
                    [order1, order2],
                    [signature1, signature2],
                    [order1.erc1155TokenAmount, order2.erc1155TokenAmount],
                    [NULL_BYTES, NULL_BYTES],
                    true,
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(order2.maker, otherMaker));
        });
        it('can fill multiple orders with ETH, refund excess ETH', async () => {
            const order1 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: ETH_TOKEN_ADDRESS,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC1155Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            const signature2 = await order2.getSignatureWithProviderAsync(env.provider);
            await erc1155Token
                .mint(maker, order2.erc1155TokenId, order2.erc1155TokenAmount)
                .awaitTransactionSuccessAsync();
            const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            await zeroEx
                .batchBuyERC1155s(
                    [order1, order2],
                    [signature1, signature2],
                    [order1.erc1155TokenAmount, order2.erc1155TokenAmount],
                    [NULL_BYTES, NULL_BYTES],
                    true,
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                    value: order1.erc20TokenAmount.plus(order2.erc20TokenAmount).plus(1),
                });
            const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(
                order1.erc20TokenAmount.plus(order2.erc20TokenAmount),
            );
            const takerBalance1 = await erc1155Token.balanceOf(taker, order1.erc1155TokenId).callAsync();
            expect(takerBalance1).to.bignumber.equal(order1.erc1155TokenAmount);
            const takerBalance2 = await erc1155Token.balanceOf(taker, order2.erc1155TokenId).callAsync();
            expect(takerBalance2).to.bignumber.equal(order2.erc1155TokenAmount);
        });
    });
    describe('preSignERC1155Order', () => {
        const PRESIGN_SIGNATURE = {
            signatureType: SignatureType.PreSigned,
            v: 0,
            r: constants.NULL_BYTES32,
            s: constants.NULL_BYTES32,
        };
        let contractMaker: TestNFTOrderPresignerContract;
        before(async () => {
            contractMaker = await TestNFTOrderPresignerContract.deployFrom0xArtifactAsync(
                artifacts.TestNFTOrderPresigner,
                env.provider,
                env.txDefaults,
                artifacts,
                zeroEx.address,
            );
            await contractMaker.approveERC20(erc20Token.address).awaitTransactionSuccessAsync();
            await contractMaker.approveERC1155(erc1155Token.address).awaitTransactionSuccessAsync();
        });
        it('can fill order that has been presigned by the maker', async () => {
            const order = getTestERC1155Order({
                maker: contractMaker.address,
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            await contractMaker.preSignERC1155Order(order).awaitTransactionSuccessAsync();
            await zeroEx
                .sellERC1155(
                    order,
                    PRESIGN_SIGNATURE,
                    order.erc1155TokenId,
                    order.erc1155TokenAmount,
                    false,
                    NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
        });
        it('cannot fill order that has not been presigned by the maker', async () => {
            const order = getTestERC1155Order({
                maker: contractMaker.address,
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC1155(
                    order,
                    PRESIGN_SIGNATURE,
                    order.erc1155TokenId,
                    order.erc1155TokenAmount,
                    false,
                    NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.InvalidSignerError(contractMaker.address, NULL_ADDRESS),
            );
        });
        it('cannot fill order that was presigned then cancelled', async () => {
            const order = getTestERC1155Order({
                maker: contractMaker.address,
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            await contractMaker.preSignERC1155Order(order).awaitTransactionSuccessAsync();
            await contractMaker.cancelERC1155Order(order.nonce).awaitTransactionSuccessAsync();
            const tx = zeroEx
                .sellERC1155(
                    order,
                    PRESIGN_SIGNATURE,
                    order.erc1155TokenId,
                    order.erc1155TokenAmount,
                    false,
                    NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(
                    contractMaker.address,
                    order.nonce,
                    NFTOrder.OrderStatus.Unfillable,
                ),
            );
        });
        it('only maker can presign order', async () => {
            const order = getTestERC1155Order({
                maker: otherMaker,
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            const tx = contractMaker.preSignERC1155Order(order).awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('ERC1155OrdersFeature::preSignERC1155Order/MAKER_MISMATCH');
        });
    });
});
