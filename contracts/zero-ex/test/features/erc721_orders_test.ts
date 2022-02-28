import {
    blockchainTests,
    constants,
    describe,
    expect,
    getRandomInteger,
    randomAddress,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import { ERC721Order, NFTOrder, RevertErrors, SIGNATURE_ABI, SignatureType } from '@0x/protocol-utils';
import { AbiEncoder, BigNumber, hexUtils, NULL_BYTES, StringRevertError } from '@0x/utils';

import {
    IOwnableFeatureContract,
    IZeroExContract,
    IZeroExERC721OrderFilledEventArgs,
    IZeroExEvents,
} from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import { getRandomERC721Order } from '../utils/nft_orders';

import {
    ERC721OrdersFeatureContract,
    TestFeeRecipientContract,
    TestMintableERC20TokenContract,
    TestMintableERC721TokenContract,
    TestNFTOrderPresignerContract,
    TestPropertyValidatorContract,
    TestWethContract,
} from '../wrappers';

blockchainTests.resets('ERC721OrdersFeature', env => {
    const { NULL_ADDRESS, MAX_UINT256, ZERO_AMOUNT: ZERO } = constants;
    const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    let owner: string;
    let maker: string;
    let taker: string;
    let otherMaker: string;
    let otherTaker: string;
    let matcher: string;
    let feeRecipient: TestFeeRecipientContract;
    let zeroEx: IZeroExContract;
    let weth: TestWethContract;
    let erc20Token: TestMintableERC20TokenContract;
    let erc721Token: TestMintableERC721TokenContract;

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
        [owner, maker, taker, otherMaker, otherTaker, matcher] = await env.getAccountAddressesAsync();

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
        erc721Token = await TestMintableERC721TokenContract.deployFrom0xArtifactAsync(
            artifacts.TestMintableERC721Token,
            env.provider,
            txDefaults,
            artifacts,
        );

        zeroEx = await fullMigrateAsync(owner, env.provider, txDefaults, {}, { wethAddress: weth.address });
        zeroEx = new IZeroExContract(zeroEx.address, env.provider, txDefaults, abis);

        const featureImpl = await ERC721OrdersFeatureContract.deployFrom0xArtifactAsync(
            artifacts.ERC721OrdersFeature,
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
            erc721Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
                from: maker,
            }),
            erc721Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
                from: otherMaker,
            }),
            erc721Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
                from: taker,
            }),
            erc721Token.setApprovalForAll(zeroEx.address, true).awaitTransactionSuccessAsync({
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
        order: ERC721Order,
        tokenId: BigNumber = order.erc721TokenId,
        _taker: string = taker,
    ): Promise<void> {
        const totalFeeAmount = order.fees.length > 0 ? BigNumber.sum(...order.fees.map(fee => fee.amount)) : ZERO;
        if (order.direction === NFTOrder.TradeDirection.SellNFT) {
            await erc721Token.mint(order.maker, tokenId).awaitTransactionSuccessAsync();
            if (order.erc20Token !== ETH_TOKEN_ADDRESS) {
                await erc20Token
                    .mint(_taker, order.erc20TokenAmount.plus(totalFeeAmount))
                    .awaitTransactionSuccessAsync();
            }
        } else {
            await erc721Token.mint(_taker, tokenId).awaitTransactionSuccessAsync();
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
        order: ERC721Order,
        tokenId: BigNumber = order.erc721TokenId,
        _taker: string = taker,
    ): Promise<void> {
        const token = order.erc20Token === weth.address ? weth : erc20Token;
        if (order.direction === NFTOrder.TradeDirection.SellNFT) {
            const makerBalance = await token.balanceOf(order.maker).callAsync();
            expect(makerBalance).to.bignumber.equal(order.erc20TokenAmount);
            const erc721Owner = await erc721Token.ownerOf(tokenId).callAsync();
            expect(erc721Owner).to.equal(_taker);
        } else {
            const erc20Balance = await token.balanceOf(_taker).callAsync();
            expect(erc20Balance).to.bignumber.equal(order.erc20TokenAmount);
            const erc721Owner = await erc721Token.ownerOf(tokenId).callAsync();
            expect(erc721Owner).to.equal(order.maker);
        }
        if (order.fees.length > 0) {
            await Promise.all(
                order.fees.map(async fee => {
                    const feeRecipientBalance = await token.balanceOf(fee.recipient).callAsync();
                    expect(feeRecipientBalance).to.bignumber.equal(fee.amount);
                }),
            );
        }
    }

    function getTestERC721Order(fields: Partial<ERC721Order> = {}): ERC721Order {
        return getRandomERC721Order({
            maker,
            verifyingContract: zeroEx.address,
            chainId: 1337,
            erc20Token: erc20Token.address,
            erc721Token: erc721Token.address,
            taker: NULL_ADDRESS,
            ...fields,
        });
    }

    function createERC721OrderFilledEvent(
        order: ERC721Order,
        _taker: string = taker,
        erc721TokenId: BigNumber = order.erc721TokenId,
    ): IZeroExERC721OrderFilledEventArgs {
        return {
            direction: order.direction,
            maker: order.maker,
            taker,
            nonce: order.nonce,
            erc20Token: order.erc20Token,
            erc20TokenAmount: order.erc20TokenAmount,
            erc721Token: order.erc721Token,
            erc721TokenId,
            matcher: NULL_ADDRESS,
        };
    }

    describe('getERC721OrderHash()', () => {
        it('returns the correct hash for order with no fees or properties', async () => {
            const order = getTestERC721Order();
            const hash = await zeroEx.getERC721OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
        it('returns the correct hash for order with null property', async () => {
            const order = getTestERC721Order({
                erc721TokenProperties: [
                    {
                        propertyValidator: NULL_ADDRESS,
                        propertyData: NULL_BYTES,
                    },
                ],
            });
            const hash = await zeroEx.getERC721OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
        it('returns the correct hash for order with 1 fee, 1 property', async () => {
            const order = getTestERC721Order({
                fees: [
                    {
                        recipient: randomAddress(),
                        amount: getRandomInteger(0, MAX_UINT256),
                        feeData: hexUtils.random(),
                    },
                ],
                erc721TokenProperties: [
                    {
                        propertyValidator: randomAddress(),
                        propertyData: hexUtils.random(),
                    },
                ],
            });
            const hash = await zeroEx.getERC721OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
        it('returns the correct hash for order with 2 fees, 2 properties', async () => {
            const order = getTestERC721Order({
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
                erc721TokenProperties: [
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
            const hash = await zeroEx.getERC721OrderHash(order).callAsync();
            expect(hash).to.eq(order.getHash());
        });
    });

    describe('validateERC721OrderSignature', () => {
        it('succeeds for a valid EthSign signature', async () => {
            const order = getTestERC721Order();
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await zeroEx.validateERC721OrderSignature(order, signature).callAsync();
        });
        it('reverts for an invalid EthSign signature', async () => {
            const order = getTestERC721Order();
            const signature = await order.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EthSign,
                otherMaker,
            );
            const tx = zeroEx.validateERC721OrderSignature(order, signature).callAsync();
            expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
        it('succeeds for a valid EIP-712 signature', async () => {
            const order = getTestERC721Order();
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712);
            await zeroEx.validateERC721OrderSignature(order, signature).callAsync();
        });
        it('reverts for an invalid EIP-712 signature', async () => {
            const order = getTestERC721Order();
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712, otherMaker);
            const tx = zeroEx.validateERC721OrderSignature(order, signature).callAsync();
            expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
    });

    describe('cancelERC721Order', () => {
        it('can cancel an order', async () => {
            const order = getTestERC721Order();
            const tx = await zeroEx.cancelERC721Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            verifyEventsFromLogs(tx.logs, [{ maker, nonce: order.nonce }], IZeroExEvents.ERC721OrderCancelled);
            const orderStatus = await zeroEx.getERC721OrderStatus(order).callAsync();
            expect(orderStatus).to.equal(NFTOrder.OrderStatus.Unfillable);
            const bitVector = await zeroEx
                .getERC721OrderStatusBitVector(maker, order.nonce.dividedToIntegerBy(256))
                .callAsync();
            const flag = new BigNumber(2).exponentiatedBy(order.nonce.mod(256));
            expect(bitVector).to.bignumber.equal(flag);
        });
        it('cancelling an order twice silently succeeds', async () => {
            const order = getTestERC721Order();
            await zeroEx.cancelERC721Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            const tx = await zeroEx.cancelERC721Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            verifyEventsFromLogs(tx.logs, [{ maker, nonce: order.nonce }], IZeroExEvents.ERC721OrderCancelled);
            const orderStatus = await zeroEx.getERC721OrderStatus(order).callAsync();
            expect(orderStatus).to.equal(NFTOrder.OrderStatus.Unfillable);
            const bitVector = await zeroEx
                .getERC721OrderStatusBitVector(maker, order.nonce.dividedToIntegerBy(256))
                .callAsync();
            const flag = new BigNumber(2).exponentiatedBy(order.nonce.mod(256));
            expect(bitVector).to.bignumber.equal(flag);
        });
    });

    describe('sellERC721', () => {
        it('can fill a ERC721 buy order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = await zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
            verifyEventsFromLogs(tx.logs, [createERC721OrderFilledEvent(order)], IZeroExEvents.ERC721OrderFilled);
            const bitVector = await zeroEx
                .getERC721OrderStatusBitVector(maker, order.nonce.dividedToIntegerBy(256))
                .callAsync();
            const flag = new BigNumber(2).exponentiatedBy(order.nonce.mod(256));
            expect(bitVector).to.bignumber.equal(flag);
        });
        it('cannot fill the same order twice', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('can fill two orders from the same maker with different nonces', async () => {
            const order1 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                nonce: ZERO,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            await zeroEx
                .sellERC721(order1, signature1, order1.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            const order2 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                nonce: new BigNumber(1),
            });
            const signature2 = await order2.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order2);
            await zeroEx
                .sellERC721(order2, signature2, order2.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            const bitVector = await zeroEx.getERC721OrderStatusBitVector(maker, ZERO).callAsync();
            expect(bitVector).to.bignumber.equal(3); // 0...00011
        });
        it('cannot fill a cancelled order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx.cancelERC721Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('cannot fill an invalid order (erc20Token == ETH)', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: ETH_TOKEN_ADDRESS,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await erc721Token.mint(taker, order.erc721TokenId).awaitTransactionSuccessAsync();
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith('NFTOrders::_validateBuyOrder/NATIVE_TOKEN_NOT_ALLOWED');
        });
        it('cannot fill an expired order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                expiry: new BigNumber(Math.floor(Date.now() / 1000 - 1)),
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Expired),
            );
        });
        it('reverts if a sell order is provided', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith('NFTOrders::_validateBuyOrder/WRONG_TRADE_DIRECTION');
        });
        it('reverts if the taker is not the taker address specified in the order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order, order.erc721TokenId, otherTaker);
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: otherTaker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.OnlyTakerError(otherTaker, taker));
        });
        it('succeeds if the taker is the taker address specified in the order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
        });
        it('reverts if an invalid signature is provided', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712, otherMaker);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
        it('reverts if `unwrapNativeToken` is true and `erc20Token` is not WETH', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC721(order, signature, order.erc721TokenId, true, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.ERC20TokenMismatchError(order.erc20Token, weth.address),
            );
        });
        it('sends ETH to taker if `unwrapNativeToken` is true and `erc20Token` is WETH', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: weth.address,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            await zeroEx
                .sellERC721(order, signature, order.erc721TokenId, true, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            expect(takerEthBalanceAfter.minus(takerEthBalanceBefore)).to.bignumber.equal(order.erc20TokenAmount);
            const erc721Owner = await erc721Token.ownerOf(order.erc721TokenId).callAsync();
            expect(erc721Owner).to.equal(maker);
        });
        describe('fees', () => {
            it('single fee to EOA', async () => {
                const order = getTestERC721Order({
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
                    .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order);
            });
            it('single fee, successful callback', async () => {
                const order = getTestERC721Order({
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
                    .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                await assertBalancesAsync(order);
            });
            it('single fee, callback reverts', async () => {
                const order = getTestERC721Order({
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
                    .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith('TestFeeRecipient::receiveZeroExFeeCallback/REVERT');
            });
            it('single fee, callback returns invalid value', async () => {
                const order = getTestERC721Order({
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
                    .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith('NFTOrders::_payFees/CALLBACK_FAILED');
            });
            it('multiple fees to EOAs', async () => {
                const order = getTestERC721Order({
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
                    .sellERC721(order, signature, order.erc721TokenId, false, NULL_BYTES)
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
                const order = getTestERC721Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order, order.erc721TokenId.plus(1));
                const tx = zeroEx
                    .sellERC721(order, signature, order.erc721TokenId.plus(1), false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith(
                    new RevertErrors.NFTOrders.TokenIdMismatchError(order.erc721TokenId.plus(1), order.erc721TokenId),
                );
            });
            it('Null property', async () => {
                const order = getTestERC721Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    erc721TokenId: ZERO,
                    erc721TokenProperties: [
                        {
                            propertyValidator: NULL_ADDRESS,
                            propertyData: NULL_BYTES,
                        },
                    ],
                });
                const tokenId = getRandomInteger(0, MAX_UINT256);
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order, tokenId);
                await zeroEx.sellERC721(order, signature, tokenId, false, NULL_BYTES).awaitTransactionSuccessAsync({
                    from: taker,
                });
                await assertBalancesAsync(order, tokenId);
            });
            it('Reverts if property validation fails', async () => {
                const order = getTestERC721Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    erc721TokenId: ZERO,
                    erc721TokenProperties: [
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
                    .sellERC721(order, signature, tokenId, false, NULL_BYTES)
                    .awaitTransactionSuccessAsync({
                        from: taker,
                    });
                return expect(tx).to.revertWith(
                    new RevertErrors.NFTOrders.PropertyValidationFailedError(
                        propertyValidator.address,
                        order.erc721Token,
                        tokenId,
                        NULL_BYTES,
                        new StringRevertError('TestPropertyValidator::validateProperty/REVERT').encode(),
                    ),
                );
            });
            it('Successful property validation', async () => {
                const order = getTestERC721Order({
                    direction: NFTOrder.TradeDirection.BuyNFT,
                    erc721TokenId: ZERO,
                    erc721TokenProperties: [
                        {
                            propertyValidator: propertyValidator.address,
                            propertyData: hexUtils.random(),
                        },
                    ],
                });
                const tokenId = getRandomInteger(0, MAX_UINT256);
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order, tokenId);
                await zeroEx.sellERC721(order, signature, tokenId, false, NULL_BYTES).awaitTransactionSuccessAsync({
                    from: taker,
                });
                await assertBalancesAsync(order, tokenId);
            });
        });
    });
    describe('onERC721Received', () => {
        let dataEncoder: AbiEncoder.DataType;
        before(() => {
            dataEncoder = AbiEncoder.create(
                [
                    {
                        name: 'order',
                        type: 'tuple',
                        components: ERC721Order.STRUCT_ABI,
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
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            const tx = erc721Token
                .safeTransferFrom2(taker, zeroEx.address, order.erc721TokenId, hexUtils.random())
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.be.rejected();
        });
        it('reverts if msg.sender != order.erc721Token', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx
                .onERC721Received(
                    taker,
                    taker,
                    order.erc721TokenId,
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
                new RevertErrors.NFTOrders.ERC721TokenMismatchError(taker, order.erc721Token),
            );
        });
        it('reverts if transferred tokenId does not match order.erc721TokenId', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order, order.erc721TokenId.plus(1));

            const tx = erc721Token
                .safeTransferFrom2(
                    taker,
                    zeroEx.address,
                    order.erc721TokenId.plus(1),
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
                new RevertErrors.NFTOrders.TokenIdMismatchError(order.erc721TokenId.plus(1), order.erc721TokenId),
            );
        });
        it('can sell ERC721 without approval', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            // revoke approval
            await erc721Token.setApprovalForAll(zeroEx.address, false).awaitTransactionSuccessAsync({
                from: taker,
            });

            await erc721Token
                .safeTransferFrom2(
                    taker,
                    zeroEx.address,
                    order.erc721TokenId,
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
    describe('buyERC721', () => {
        it('can fill a ERC721 sell order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            await assertBalancesAsync(order);
            verifyEventsFromLogs(tx.logs, [createERC721OrderFilledEvent(order)], IZeroExEvents.ERC721OrderFilled);
            const bitVector = await zeroEx
                .getERC721OrderStatusBitVector(maker, order.nonce.dividedToIntegerBy(256))
                .callAsync();
            const flag = new BigNumber(2).exponentiatedBy(order.nonce.mod(256));
            expect(bitVector).to.bignumber.equal(flag);
        });
        it('cannot fill the same order twice', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            const tx = zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('cannot fill a cancelled order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx.cancelERC721Order(order.nonce).awaitTransactionSuccessAsync({
                from: maker,
            });
            const tx = zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Unfillable),
            );
        });
        it('cannot fill an expired order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                expiry: new BigNumber(Math.floor(Date.now() / 1000 - 1)),
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.OrderNotFillableError(maker, order.nonce, NFTOrder.OrderStatus.Expired),
            );
        });
        it('reverts if a buy order is provided', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            return expect(tx).to.revertWith('NFTOrders::_validateSellOrder/WRONG_TRADE_DIRECTION');
        });
        it('reverts if the taker is not the taker address specified in the order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order, order.erc721TokenId, otherTaker);
            const tx = zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: otherTaker,
            });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.OnlyTakerError(otherTaker, taker));
        });
        it('succeeds if the taker is the taker address specified in the order', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                taker,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            await assertBalancesAsync(order);
        });
        it('reverts if an invalid signature is provided', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider, SignatureType.EIP712, otherMaker);
            await mintAssetsAsync(order);
            const tx = zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                from: taker,
            });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(maker, otherMaker));
        });
        describe('ETH', () => {
            it('can fill an order with ETH (and refunds excess ETH)', async () => {
                const order = getTestERC721Order({
                    erc20Token: ETH_TOKEN_ADDRESS,
                    direction: NFTOrder.TradeDirection.SellNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await mintAssetsAsync(order);
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                const makerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(maker);
                const tx = await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
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
                            _from: maker,
                            _to: taker,
                            _tokenId: order.erc721TokenId,
                        },
                    ],
                    'Transfer',
                );
            });
            it('can fill a WETH order with ETH', async () => {
                const order = getTestERC721Order({
                    erc20Token: weth.address,
                    direction: NFTOrder.TradeDirection.SellNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await erc721Token.mint(maker, order.erc721TokenId).awaitTransactionSuccessAsync();
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                    from: taker,
                    value: order.erc20TokenAmount,
                });
                const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(order.erc20TokenAmount);
                await assertBalancesAsync(order);
            });
            it('uses WETH if not enough ETH to fill WETH order', async () => {
                const order = getTestERC721Order({
                    erc20Token: weth.address,
                    direction: NFTOrder.TradeDirection.SellNFT,
                });
                const signature = await order.getSignatureWithProviderAsync(env.provider);
                await weth.deposit().awaitTransactionSuccessAsync({
                    from: taker,
                    value: order.erc20TokenAmount,
                });
                await erc721Token.mint(maker, order.erc721TokenId).awaitTransactionSuccessAsync();
                const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
                await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
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
                const order = getTestERC721Order({
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
                await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                    from: taker,
                });
                await assertBalancesAsync(order);
            });
            it('pays fees in ETH if erc20Token == ETH', async () => {
                const order = getTestERC721Order({
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
                await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
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
                const erc721Owner = await erc721Token.ownerOf(order.erc721TokenId).callAsync();
                expect(erc721Owner).to.equal(taker);
            });
            it('pays fees in ETH if erc20Token == WETH but taker uses ETH', async () => {
                const order = getTestERC721Order({
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
                const tx = await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
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
                            _from: maker,
                            _to: taker,
                            _tokenId: order.erc721TokenId,
                        },
                        {
                            token: weth.address,
                            from: zeroEx.address,
                            to: maker,
                            value: order.erc20TokenAmount,
                        },
                    ],
                    'Transfer',
                );
            });
            it('pays fees in WETH if taker uses WETH', async () => {
                const order = getTestERC721Order({
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
                await erc721Token.mint(maker, order.erc721TokenId).awaitTransactionSuccessAsync();
                await weth.deposit().awaitTransactionSuccessAsync({
                    from: taker,
                    value: order.erc20TokenAmount.plus(order.fees[0].amount),
                });
                await zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
                    from: taker,
                });
                await assertBalancesAsync(order);
            });
            it('reverts if overspent ETH', async () => {
                const order = getTestERC721Order({
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
                const tx = zeroEx.buyERC721(order, signature, NULL_BYTES).awaitTransactionSuccessAsync({
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
    describe('batchBuyERC721s', () => {
        it('reverts if arrays are different lengths', async () => {
            const order = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature = await order.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order);
            const tx = zeroEx.batchBuyERC721s([order], [signature, signature], [], false).awaitTransactionSuccessAsync({
                from: taker,
            });
            return expect(tx).to.revertWith('ERC721OrdersFeature::batchBuyERC721s/ARRAY_LENGTH_MISMATCH');
        });
        it('successfully fills multiple orders', async () => {
            const order1 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            const signature2 = await order2.getSignatureWithProviderAsync(env.provider);
            await erc721Token.mint(maker, order2.erc721TokenId).awaitTransactionSuccessAsync();
            await weth.deposit().sendTransactionAsync({
                from: taker,
                value: order2.erc20TokenAmount,
            });
            await zeroEx
                .batchBuyERC721s([order1, order2], [signature1, signature2], [NULL_BYTES, NULL_BYTES], false)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order1);
            await assertBalancesAsync(order2);
        });
        it('catches revert if one order fails', async () => {
            const order1 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            // invalid signature
            const signature2 = await order2.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EIP712,
                otherMaker,
            );
            await erc721Token.mint(maker, order2.erc721TokenId).awaitTransactionSuccessAsync();
            await weth.deposit().sendTransactionAsync({
                from: taker,
                value: order2.erc20TokenAmount,
            });
            const tx = zeroEx.batchBuyERC721s(
                [order1, order2],
                [signature1, signature2],
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
            const erc721Owner = await erc721Token.ownerOf(order2.erc721TokenId).callAsync();
            expect(erc721Owner).to.equal(maker);
            const takerWethBalance = await weth.balanceOf(taker).callAsync();
            expect(takerWethBalance).to.bignumber.equal(order2.erc20TokenAmount);
        });
        it('bubbles up revert if one order fails and `revertIfIncomplete == true`', async () => {
            const order1 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            // invalid signature
            const signature2 = await order2.getSignatureWithProviderAsync(
                env.provider,
                SignatureType.EIP712,
                otherMaker,
            );
            await erc721Token.mint(maker, order2.erc721TokenId).awaitTransactionSuccessAsync();
            await weth.deposit().sendTransactionAsync({
                from: taker,
                value: order2.erc20TokenAmount,
            });
            const tx = zeroEx
                .batchBuyERC721s([order1, order2], [signature1, signature2], [NULL_BYTES, NULL_BYTES], true)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(new RevertErrors.NFTOrders.InvalidSignerError(order2.maker, otherMaker));
        });
        it('can fill multiple orders with ETH, refund excess ETH', async () => {
            const order1 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: ETH_TOKEN_ADDRESS,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(order1);
            const order2 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: weth.address,
            });
            const signature2 = await order2.getSignatureWithProviderAsync(env.provider);
            await erc721Token.mint(maker, order2.erc721TokenId).awaitTransactionSuccessAsync();
            const takerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            await zeroEx
                .batchBuyERC721s([order1, order2], [signature1, signature2], [NULL_BYTES, NULL_BYTES], true)
                .awaitTransactionSuccessAsync({
                    from: taker,
                    value: order1.erc20TokenAmount.plus(order2.erc20TokenAmount).plus(1),
                });
            const takerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            expect(takerEthBalanceBefore.minus(takerEthBalanceAfter)).to.bignumber.equal(
                order1.erc20TokenAmount.plus(order2.erc20TokenAmount),
            );
            const erc721Owner1 = await erc721Token.ownerOf(order1.erc721TokenId).callAsync();
            expect(erc721Owner1).to.bignumber.equal(taker);
            const erc721Owner2 = await erc721Token.ownerOf(order2.erc721TokenId).callAsync();
            expect(erc721Owner2).to.bignumber.equal(taker);
        });
    });
    describe('preSignERC721Order', () => {
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
            await contractMaker.approveERC721(erc721Token.address).awaitTransactionSuccessAsync();
        });
        it('can fill order that has been presigned by the maker', async () => {
            const order = getTestERC721Order({
                maker: contractMaker.address,
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            await contractMaker.preSignERC721Order(order).awaitTransactionSuccessAsync();
            await zeroEx
                .sellERC721(order, PRESIGN_SIGNATURE, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            await assertBalancesAsync(order);
        });
        it('cannot fill order that has not been presigned by the maker', async () => {
            const order = getTestERC721Order({
                maker: contractMaker.address,
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            const tx = zeroEx
                .sellERC721(order, PRESIGN_SIGNATURE, order.erc721TokenId, false, NULL_BYTES)
                .awaitTransactionSuccessAsync({
                    from: taker,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.InvalidSignerError(contractMaker.address, NULL_ADDRESS),
            );
        });
        it('cannot fill order that was presigned then cancelled', async () => {
            const order = getTestERC721Order({
                maker: contractMaker.address,
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            await mintAssetsAsync(order);
            await contractMaker.preSignERC721Order(order).awaitTransactionSuccessAsync();
            await contractMaker.cancelERC721Order(order.nonce).awaitTransactionSuccessAsync();
            const tx = zeroEx
                .sellERC721(order, PRESIGN_SIGNATURE, order.erc721TokenId, false, NULL_BYTES)
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
    });
    describe('matchERC721Orders', () => {
        it('cannot match two sell orders', async () => {
            const order1 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            const order2 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const signature2 = await order2.getSignatureWithProviderAsync(env.provider);
            const tx = zeroEx.matchERC721Orders(order1, order2, signature1, signature2).awaitTransactionSuccessAsync({
                from: matcher,
            });
            return expect(tx).to.revertWith('NFTOrders::_validateBuyOrder/WRONG_TRADE_DIRECTION');
        });
        it('cannot match two buy orders', async () => {
            const order1 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature1 = await order1.getSignatureWithProviderAsync(env.provider);
            const order2 = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const signature2 = await order2.getSignatureWithProviderAsync(env.provider);
            const tx = zeroEx.matchERC721Orders(order1, order2, signature1, signature2).awaitTransactionSuccessAsync({
                from: matcher,
            });
            return expect(tx).to.revertWith('NFTOrders::_validateSellOrder/WRONG_TRADE_DIRECTION');
        });
        it('erc721TokenId must match', async () => {
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            const tx = zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.TokenIdMismatchError(sellOrder.erc721TokenId, buyOrder.erc721TokenId),
            );
        });
        it('erc721Token must match', async () => {
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc721Token: erc20Token.address,
                erc721TokenId: sellOrder.erc721TokenId,
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            const tx = zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.ERC721TokenMismatchError(sellOrder.erc721Token, buyOrder.erc721Token),
            );
        });
        it('erc20Token must match', async () => {
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: weth.address,
                erc20TokenAmount: sellOrder.erc20TokenAmount,
                erc721TokenId: sellOrder.erc721TokenId,
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(buyOrder, sellOrder.erc721TokenId, sellOrder.maker);
            const tx = zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.ERC20TokenMismatchError(sellOrder.erc20Token, buyOrder.erc20Token),
            );
        });
        it('reverts if spread is negative', async () => {
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc721TokenId: sellOrder.erc721TokenId,
                erc20TokenAmount: sellOrder.erc20TokenAmount.minus(1),
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            const tx = zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.NegativeSpreadError(sellOrder.erc20TokenAmount, buyOrder.erc20TokenAmount),
            );
        });
        it('matches two orders and sends profit to matcher', async () => {
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const spread = getRandomInteger(1, '1e18');
            const buyOrder = getTestERC721Order({
                maker: otherMaker,
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc721TokenId: sellOrder.erc721TokenId,
                erc20TokenAmount: sellOrder.erc20TokenAmount.plus(spread),
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(buyOrder, sellOrder.erc721TokenId, sellOrder.maker);
            await zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            await assertBalancesAsync(sellOrder, sellOrder.erc721TokenId, otherMaker);
            const matcherBalance = await erc20Token.balanceOf(matcher).callAsync();
            expect(matcherBalance).to.bignumber.equal(spread);
        });
        it('matches two ETH/WETH orders and sends profit to matcher', async () => {
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: ETH_TOKEN_ADDRESS,
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const spread = getRandomInteger(1, '1e18');
            const buyOrder = getTestERC721Order({
                maker: otherMaker,
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: weth.address,
                erc721TokenId: sellOrder.erc721TokenId,
                erc20TokenAmount: sellOrder.erc20TokenAmount.plus(spread),
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(buyOrder, sellOrder.erc721TokenId, sellOrder.maker);
            const sellerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(sellOrder.maker);
            const matcherEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(matcher);
            await zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            const erc721Owner = await erc721Token.ownerOf(sellOrder.erc721TokenId).callAsync();
            expect(erc721Owner).to.equal(buyOrder.maker);
            const sellerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(sellOrder.maker);
            const matcherEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(matcher);
            expect(sellerEthBalanceAfter.minus(sellerEthBalanceBefore)).to.bignumber.equal(sellOrder.erc20TokenAmount);
            expect(matcherEthBalanceAfter.minus(matcherEthBalanceBefore)).to.bignumber.equal(spread);
        });
        it('matches two orders (with fees) and sends profit to matcher', async () => {
            const spread = getRandomInteger(1, '1e18');
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                fees: [
                    {
                        recipient: otherTaker,
                        amount: getRandomInteger(1, spread),
                        feeData: NULL_BYTES,
                    },
                ],
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                maker: otherMaker,
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc721TokenId: sellOrder.erc721TokenId,
                erc20TokenAmount: sellOrder.erc20TokenAmount.plus(spread),
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(buyOrder, sellOrder.erc721TokenId, sellOrder.maker);
            await erc20Token.mint(buyOrder.maker, sellOrder.fees[0].amount).awaitTransactionSuccessAsync();
            await zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            await assertBalancesAsync(sellOrder, sellOrder.erc721TokenId, otherMaker);
            const matcherBalance = await erc20Token.balanceOf(matcher).callAsync();
            expect(matcherBalance).to.bignumber.equal(spread.minus(sellOrder.fees[0].amount));
        });
        it('matches two ETH/WETH (with fees) orders and sends profit to matcher', async () => {
            const spread = getRandomInteger(1, '1e18');
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: ETH_TOKEN_ADDRESS,
                fees: [
                    {
                        recipient: otherTaker,
                        amount: getRandomInteger(1, spread),
                        feeData: NULL_BYTES,
                    },
                ],
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                maker: otherMaker,
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: weth.address,
                erc721TokenId: sellOrder.erc721TokenId,
                erc20TokenAmount: sellOrder.erc20TokenAmount.plus(spread),
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(buyOrder, sellOrder.erc721TokenId, sellOrder.maker);
            await weth
                .deposit()
                .awaitTransactionSuccessAsync({ from: buyOrder.maker, value: sellOrder.fees[0].amount });
            const sellerEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(sellOrder.maker);
            const matcherEthBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(matcher);
            await zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            const erc721Owner = await erc721Token.ownerOf(sellOrder.erc721TokenId).callAsync();
            expect(erc721Owner).to.equal(buyOrder.maker);
            const sellerEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(sellOrder.maker);
            const matcherEthBalanceAfter = await env.web3Wrapper.getBalanceInWeiAsync(matcher);
            expect(sellerEthBalanceAfter.minus(sellerEthBalanceBefore)).to.bignumber.equal(sellOrder.erc20TokenAmount);
            expect(matcherEthBalanceAfter.minus(matcherEthBalanceBefore)).to.bignumber.equal(
                spread.minus(sellOrder.fees[0].amount),
            );
        });
        it('reverts if sell order fees exceed spread', async () => {
            const spread = getRandomInteger(1, '1e18');
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                fees: [
                    {
                        recipient: otherTaker,
                        amount: spread.plus(1),
                        feeData: NULL_BYTES,
                    },
                ],
            });
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                maker: otherMaker,
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc721TokenId: sellOrder.erc721TokenId,
                erc20TokenAmount: sellOrder.erc20TokenAmount.plus(spread),
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(buyOrder, sellOrder.erc721TokenId, sellOrder.maker);
            await erc20Token.mint(buyOrder.maker, sellOrder.fees[0].amount).awaitTransactionSuccessAsync();
            const tx = zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.SellOrderFeesExceedSpreadError(sellOrder.fees[0].amount, spread),
            );
        });
        it('reverts if sell order fees exceed spread (ETH/WETH)', async () => {
            const spread = getRandomInteger(1, '1e18');
            const sellOrder = getTestERC721Order({
                direction: NFTOrder.TradeDirection.SellNFT,
                erc20Token: ETH_TOKEN_ADDRESS,
                fees: [
                    {
                        recipient: otherTaker,
                        amount: spread.plus(1),
                        feeData: NULL_BYTES,
                    },
                ],
            });
            await sendEtherAsync(zeroEx.address, sellOrder.fees[0].amount);
            const sellSignature = await sellOrder.getSignatureWithProviderAsync(env.provider);
            const buyOrder = getTestERC721Order({
                maker: otherMaker,
                direction: NFTOrder.TradeDirection.BuyNFT,
                erc20Token: weth.address,
                erc721TokenId: sellOrder.erc721TokenId,
                erc20TokenAmount: sellOrder.erc20TokenAmount.plus(spread),
            });
            const buySignature = await buyOrder.getSignatureWithProviderAsync(env.provider);
            await mintAssetsAsync(buyOrder, sellOrder.erc721TokenId, sellOrder.maker);
            await weth
                .deposit()
                .awaitTransactionSuccessAsync({ from: buyOrder.maker, value: sellOrder.fees[0].amount });
            const tx = zeroEx
                .matchERC721Orders(sellOrder, buyOrder, sellSignature, buySignature)
                .awaitTransactionSuccessAsync({
                    from: matcher,
                });
            return expect(tx).to.revertWith(
                new RevertErrors.NFTOrders.SellOrderFeesExceedSpreadError(sellOrder.fees[0].amount, spread),
            );
        });
    });
});
