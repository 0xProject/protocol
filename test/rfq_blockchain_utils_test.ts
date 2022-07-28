// tslint:disable custom-no-magic-numbers
// tslint:disable await-promise
// tslint:disable max-file-line-count
import { artifacts as assetSwapperArtifacts, BalanceCheckerContract } from '@0x/asset-swapper';
import { ChainId } from '@0x/contract-addresses';
import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { artifacts as zeroExArtifacts, fullMigrateAsync, IZeroExContract } from '@0x/contracts-zero-ex';
import { Web3ProviderEngine } from '@0x/dev-utils';
import { ethSignHashWithProviderAsync, OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import { expect } from 'chai';
import { providers, Wallet } from 'ethers';

import { ONE_MINUTE_MS, ZERO } from '../src/constants';
import { BalanceChecker } from '../src/utils/balance_checker';
import { RfqBlockchainUtils } from '../src/utils/rfq_blockchain_utils';

import {
    getProvider,
    MATCHA_AFFILIATE_ADDRESS,
    MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
    MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
    MOCK_PERMIT_APPROVAL,
    MOCK_PERMIT_CALLDATA,
    TEST_RFQ_ORDER_FILLED_EVENT_LOG,
    TEST_RFQ_ORDER_FILLED_EVENT_TAKER_AMOUNT,
    WORKER_TEST_PRIVATE_KEY,
} from './constants';
import { setupDependenciesAsync, TeardownDependenciesFunctionHandle } from './test_utils/deployment';

const GAS_PRICE = 1e9;
const VALID_EXPIRY = new BigNumber(9000000000);
const CHAIN_ID = ChainId.Ganache;

jest.setTimeout(ONE_MINUTE_MS * 2);
let teardownDependencies: TeardownDependenciesFunctionHandle;

describe('RFQ Blockchain Utils', () => {
    let provider: Web3ProviderEngine;
    let makerToken: DummyERC20TokenContract;
    let takerToken: DummyERC20TokenContract;
    let makerAmount: BigNumber;
    let takerAmount: BigNumber;
    let invalidTakerAmount: BigNumber;
    let makerBalance: BigNumber;
    let takerBalance: BigNumber;
    let web3Wrapper: Web3Wrapper;
    let owner: string;
    let maker: string;
    let taker: string;
    let signer: string;
    let txOrigin: string;
    let zeroEx: IZeroExContract;
    let rfqOrder: RfqOrder;
    let otcOrder: OtcOrder;
    let unfillableRfqOrder: RfqOrder;
    let rfqBlockchainUtils: RfqBlockchainUtils;
    let orderSig: Signature;
    let sigForUnfillableOrder: Signature;
    let makerOtcOrderSig: Signature;
    let takerOtcOrderSig: Signature;

    beforeAll(async () => {
        teardownDependencies = await setupDependenciesAsync(['ganache']);
        provider = getProvider();
        web3Wrapper = new Web3Wrapper(provider);

        [owner, maker, taker, txOrigin, signer] = await web3Wrapper.getAvailableAddressesAsync();

        // Deploy dummy tokens
        makerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            provider,
            { from: maker, gas: 10000000 },
            {},
            'The token that originally belongs to the maker',
            'makerToken',
            new BigNumber(18),
            new BigNumber(0),
        );

        takerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            provider,
            { from: taker, gas: 10000000 },
            {},
            'The token that originally belongs to the maker',
            'takerToken',
            new BigNumber(18),
            new BigNumber(0),
        );

        // Deploy Balance Checker (only necessary for Ganache because ganache doesn't have overrides)
        const balanceCheckerContract = await BalanceCheckerContract.deployFrom0xArtifactAsync(
            assetSwapperArtifacts.BalanceChecker,
            provider,
            { from: owner, gas: 10000000 },
            {},
        );
        const balanceChecker = new BalanceChecker(provider, balanceCheckerContract);

        makerAmount = new BigNumber(100);
        takerAmount = new BigNumber(50);
        invalidTakerAmount = new BigNumber(10000000);

        // Deploy ZeroEx to Ganache
        zeroEx = await fullMigrateAsync(
            owner,
            provider,
            { from: owner, gasPrice: GAS_PRICE },
            {},
            { protocolFeeMultiplier: Number(0) },
            {
                nativeOrders: zeroExArtifacts.NativeOrdersFeature,
                metaTransactions: zeroExArtifacts.MetaTransactionsFeature,
            },
        );

        // Prepare an RfqOrder
        rfqOrder = new RfqOrder({
            makerToken: makerToken.address,
            takerToken: takerToken.address,
            makerAmount,
            takerAmount,
            maker,
            taker,
            txOrigin,
            expiry: VALID_EXPIRY,
            salt: new BigNumber(1),
            verifyingContract: zeroEx.address,
            chainId: CHAIN_ID,
        });
        orderSig = await rfqOrder.getSignatureWithProviderAsync(provider);

        // Prepare an Unfillable RfqOrder
        unfillableRfqOrder = new RfqOrder({
            makerToken: makerToken.address,
            takerToken: takerToken.address,
            makerAmount,
            takerAmount: invalidTakerAmount,
            maker,
            taker,
            txOrigin,
            expiry: VALID_EXPIRY,
            salt: new BigNumber(1),
            verifyingContract: zeroEx.address,
            chainId: CHAIN_ID,
        });
        sigForUnfillableOrder = await unfillableRfqOrder.getSignatureWithProviderAsync(provider);

        // Prepare an OtcOrder and valid signatures
        otcOrder = new OtcOrder({
            maker,
            taker,
            makerAmount,
            takerAmount,
            makerToken: makerToken.address,
            takerToken: takerToken.address,
            txOrigin,
            expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                new BigNumber(VALID_EXPIRY),
                ZERO,
                new BigNumber(VALID_EXPIRY),
            ),
            chainId: CHAIN_ID,
            verifyingContract: zeroEx.address,
        });
        const orderHash = otcOrder.getHash();
        makerOtcOrderSig = await ethSignHashWithProviderAsync(orderHash, maker, provider);
        takerOtcOrderSig = await ethSignHashWithProviderAsync(orderHash, taker, provider);

        // Mint enough tokens for a few trades
        const numTrades = 2;
        makerBalance = makerAmount.times(numTrades);
        takerBalance = takerAmount.times(numTrades);

        await makerToken.mint(makerBalance).awaitTransactionSuccessAsync({ from: maker });
        await makerToken.approve(zeroEx.address, makerBalance.times(2)).awaitTransactionSuccessAsync({ from: maker });
        await takerToken.mint(takerBalance).awaitTransactionSuccessAsync({ from: taker });
        await takerToken.approve(zeroEx.address, takerBalance.times(2)).awaitTransactionSuccessAsync({ from: taker });

        const ethersProvider = new providers.JsonRpcProvider();
        const ethersWallet = new Wallet(WORKER_TEST_PRIVATE_KEY, ethersProvider);

        rfqBlockchainUtils = new RfqBlockchainUtils(
            provider,
            zeroEx.address,
            balanceChecker,
            ethersProvider,
            ethersWallet,
        );
    });

    afterAll(async () => {
        if (!teardownDependencies()) {
            throw new Error('Failed to tear down dependencies');
        }
    });

    describe('getMinOfBalancesAndAllowancesAsync', () => {
        it('should fetch min of token balances and allowances', async () => {
            const addresses = [maker, maker, taker, taker];
            const tokens = [makerToken.address, takerToken.address, makerToken.address, takerToken.address];
            const res = await rfqBlockchainUtils.getMinOfBalancesAndAllowancesAsync(addresses, tokens);
            expect(res).to.deep.eq([makerBalance, ZERO, ZERO, takerBalance]);
        });

        it('should fail if length of addresses and tokens are different', async () => {
            const addresses: string[] = [];
            const tokens = [makerToken.address];

            try {
                await rfqBlockchainUtils.getMinOfBalancesAndAllowancesAsync(addresses, tokens);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('expected length of addresses and tokens must be the same');
            }
        });
    });

    describe('getTokenBalancesAsync', () => {
        it('should fetch token balances', async () => {
            const addresses = [maker, maker, taker, taker];
            const tokens = [makerToken.address, takerToken.address, makerToken.address, takerToken.address];
            const res = await rfqBlockchainUtils.getTokenBalancesAsync(addresses, tokens);
            expect(res).to.deep.eq([makerBalance, ZERO, ZERO, takerBalance]);
        });

        it('should fail if length of addresses and tokens are different', async () => {
            const addresses: string[] = [];
            const tokens = [makerToken.address];

            try {
                await rfqBlockchainUtils.getTokenBalancesAsync(addresses, tokens);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('expected length of addresses and tokens must be the same');
            }
        });
    });

    describe('OtcOrder', () => {
        describe('estimateGasForFillTakerSignedOtcOrderAsync', () => {
            it('does not throw an error on valid order', async () => {
                try {
                    const gasEstimate = await rfqBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                        otcOrder,
                        makerOtcOrderSig,
                        takerOtcOrderSig,
                        txOrigin,
                        false,
                    );
                    expect(gasEstimate).to.be.greaterThan(0);
                } catch (err) {
                    expect.fail('should not throw');
                }
            });

            it('throws an error if order is invalid', async () => {
                const invalidOtcOrder = new OtcOrder({
                    maker,
                    taker,
                    makerAmount,
                    takerAmount,
                    makerToken: makerToken.address,
                    takerToken: takerToken.address,
                    txOrigin,
                    expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                        ZERO, // expired
                        ZERO,
                        VALID_EXPIRY,
                    ),
                    chainId: CHAIN_ID,
                    verifyingContract: zeroEx.address,
                });
                const orderHash = invalidOtcOrder.getHash();

                const makerSig = await ethSignHashWithProviderAsync(orderHash, maker, provider);
                const takerSig = await ethSignHashWithProviderAsync(orderHash, taker, provider);

                expect(
                    rfqBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                        invalidOtcOrder, // invalid order, should be expired
                        makerSig,
                        takerSig,
                        txOrigin,
                        false,
                    ),
                ).to.eventually.be.rejectedWith(/revert/);
            });

            it('throws an error if signatures invalid', async () => {
                expect(
                    rfqBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                        otcOrder,
                        makerOtcOrderSig,
                        makerOtcOrderSig, // wrong signature
                        txOrigin,
                        false,
                    ),
                ).to.eventually.be.rejectedWith('revert');
            });
        });
    });

    describe('validateMetaTransaction', () => {
        it('returns successful filled amounts for a valid metatransaction', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);
            const res = await rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx, metaTxSig, txOrigin);

            expect(res[0]).to.deep.equal(takerAmount);
            expect(res[1]).to.deep.equal(makerAmount);
        });

        it('throws for a metatransaction with an invalid signature', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const invalidMetaTxSig = orderSig;

            expect(
                rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx, invalidMetaTxSig, txOrigin),
            ).to.eventually.be.rejectedWith('SignatureValidationError');
        });

        it('throws for a metatransaction with an unfillable order', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(
                unfillableRfqOrder,
                sigForUnfillableOrder,
                taker,
                invalidTakerAmount,
                CHAIN_ID,
            );
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            expect(
                rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx, metaTxSig, txOrigin),
            ).to.eventually.be.rejectedWith('MetaTransactionCallFailedError');
        });

        it('returns successful filled amounts for a valid metatransaction when validating calldata', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                metaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );
            const res = await rfqBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(callData, txOrigin);

            expect(res[0]).to.deep.equal(takerAmount);
            expect(res[1]).to.deep.equal(makerAmount);
        });
        it('throws for a metatransaction with an invalid signature when validating calldata', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const invalidMetaTxSig = orderSig;

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                invalidMetaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );

            expect(
                rfqBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(callData, txOrigin),
            ).to.eventually.be.rejectedWith('SignatureValidationError');
        });

        it('throws for a metatransaction with an unfillable order when validating calldata', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(
                unfillableRfqOrder,
                sigForUnfillableOrder,
                taker,
                invalidTakerAmount,
                CHAIN_ID,
            );
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                metaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );

            expect(
                rfqBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(callData, txOrigin),
            ).to.eventually.be.rejectedWith('MetaTransactionCallFailedError');
        });

        it('should throw for a partially filled order', async () => {
            const metaTx1 = rfqBlockchainUtils.generateMetaTransaction(
                rfqOrder,
                orderSig,
                taker,
                takerAmount.div(2),
                CHAIN_ID,
            );
            const metaTxSig1 = await metaTx1.getSignatureWithProviderAsync(provider);

            await zeroEx.executeMetaTransaction(metaTx1, metaTxSig1).awaitTransactionSuccessAsync({ from: txOrigin });

            const metaTx2 = rfqBlockchainUtils.generateMetaTransaction(
                rfqOrder,
                orderSig,
                taker,
                takerAmount,
                CHAIN_ID,
            );
            const metaTxSig2 = await metaTx2.getSignatureWithProviderAsync(provider);

            expect(
                rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx2, metaTxSig2, txOrigin),
            ).to.eventually.be.rejectedWith('filled amount is less than requested fill amount');
        });
    });

    describe('transformTxDataToTransactionRequest', () => {
        it('creates a TransactionRequest', () => {
            const txOptions: TxData = {
                from: '0xfromaddress',
                gas: new BigNumber(210000000),
                maxFeePerGas: new BigNumber(200000),
                maxPriorityFeePerGas: new BigNumber(100000),
                nonce: 21,
                to: '0xtoaddress',
                value: 0,
            };

            const result = rfqBlockchainUtils.transformTxDataToTransactionRequest(
                txOptions,
                /* chainId = */ 1337,
                /* callData */ '0x01234',
            );

            expect(result.from).to.equal('0xfromaddress');
            expect(result.gasLimit).to.equal(BigInt(210000000));
            expect(result.maxFeePerGas).to.equal(BigInt(200000));
            expect(result.maxPriorityFeePerGas).to.equal(BigInt(100000));
            expect(result.nonce).to.equal(21);
            expect(result.to).to.equal('0xtoaddress');
            expect(result.value).to.equal(0);
        });

        it("uses the proxy address if no 'to' address is provided", () => {
            const txOptions: TxData = { from: '0xfromaddress' };

            const result = rfqBlockchainUtils.transformTxDataToTransactionRequest(txOptions);

            expect(result.to).to.equal(zeroEx.address);
        });
    });

    describe('getDecodedRfqOrderFillEventLogFromLogs', () => {
        it('correctly parses an RfqOrderFillEvent from logs', async () => {
            const rfqOrderFilledEvent = rfqBlockchainUtils.getDecodedRfqOrderFillEventLogFromLogs([
                TEST_RFQ_ORDER_FILLED_EVENT_LOG,
            ]);

            expect(rfqOrderFilledEvent.args.takerTokenFilledAmount).to.deep.eq(
                TEST_RFQ_ORDER_FILLED_EVENT_TAKER_AMOUNT,
            );
            expect(rfqOrderFilledEvent.blockNumber).to.deep.eq(TEST_RFQ_ORDER_FILLED_EVENT_LOG.blockNumber);
        });
    });

    describe('getTokenDecimalsAsync', () => {
        it('gets the token decimals', async () => {
            const decimals = await rfqBlockchainUtils.getTokenDecimalsAsync(makerToken.address);

            expect(decimals).to.equal(18);
        });

        it('throws if the contract does not exist', () => {
            // tslint:disable-next-line: no-unused-expression no-unbound-method
            expect(rfqBlockchainUtils.getTokenDecimalsAsync('0x29D7d1dd5B6f9C864d9db560D72a247c178aE86B')).to.be
                .rejected;
        });
    });

    describe('isValidOrderSigner', () => {
        it('returns false if signer is not valid', async () => {
            const isValidOrderSigner = await rfqBlockchainUtils.isValidOrderSignerAsync(maker, signer);
            expect(isValidOrderSigner).to.equal(false);
        });

        it('returns true when valid signer address is passed', async () => {
            await rfqBlockchainUtils.registerAllowedOrderSignerAsync(maker, signer, true);

            const isValidOrderSigner = await rfqBlockchainUtils.isValidOrderSignerAsync(maker, signer);
            expect(isValidOrderSigner).to.equal(true);
        });
    });

    describe('generateApprovalCalldataAsync', () => {
        it('generates executeMetaTransaction calldata', async () => {
            const token = makerToken.address;
            const approval = MOCK_EXECUTE_META_TRANSACTION_APPROVAL;
            const signature: Signature = {
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
                v: 28,
                signatureType: 2,
            };
            const calldata = await rfqBlockchainUtils.generateApprovalCalldataAsync(token, approval, signature);
            expect(calldata).to.eq(MOCK_EXECUTE_META_TRANSACTION_CALLDATA);
        });

        it('generates permit calldata', async () => {
            const token = makerToken.address;
            const approval = MOCK_PERMIT_APPROVAL;
            const signature: Signature = {
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
                v: 28,
                signatureType: 2,
            };
            const calldata = await rfqBlockchainUtils.generateApprovalCalldataAsync(token, approval, signature);
            expect(calldata).to.eq(MOCK_PERMIT_CALLDATA);
        });
    });
});
