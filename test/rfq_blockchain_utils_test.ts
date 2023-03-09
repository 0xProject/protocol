// tslint:disable custom-no-magic-numbers
// tslint:disable await-promise
import { ChainId } from '@0x/contract-addresses';
import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { expect } from '@0x/contracts-test-utils';
import { artifacts as zeroExArtifacts, fullMigrateAsync, IZeroExContract } from '@0x/contracts-zero-ex';
import { Web3ProviderEngine } from '@0x/dev-utils';
import { RfqOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import { providers, Wallet } from 'ethers';
import 'mocha';

import { PROTOCOL_FEE_MULTIPLIER } from '../src/config';
import { RfqBlockchainUtils } from '../src/utils/rfq_blockchain_utils';

import {
    ETHEREUM_RPC_URL,
    getProvider,
    MATCHA_AFFILIATE_ADDRESS,
    TEST_RFQ_ORDER_FILLED_EVENT_LOG,
    TEST_RFQ_ORDER_FILLED_EVENT_TAKER_AMOUNT,
    WORKER_TEST_ADDRESS,
    WORKER_TEST_PRIVATE_KEY,
} from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';

const SUITE_NAME = 'RFQ Blockchain Utils Test';

const GAS_PRICE = 1e9;
const VALID_EXPIRY = new BigNumber(9000000000);
const CHAIN_ID = ChainId.Ganache;

describe(SUITE_NAME, () => {
    let provider: Web3ProviderEngine;
    let makerToken: DummyERC20TokenContract;
    let takerToken: DummyERC20TokenContract;
    let takerAmount: BigNumber;
    let invalidTakerAmount: BigNumber;
    let makerAmount: BigNumber;
    let web3Wrapper: Web3Wrapper;
    let owner: string;
    let maker: string;
    let taker: string;
    let txOrigin: string;
    let zeroEx: IZeroExContract;
    let rfqOrder: RfqOrder;
    let unfillableRfqOrder: RfqOrder;
    let rfqBlockchainUtils: RfqBlockchainUtils;
    let orderSig: Signature;
    let sigForUnfillableOrder: Signature;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME, true);
        provider = getProvider();
        web3Wrapper = new Web3Wrapper(provider);

        [owner, maker, taker, txOrigin] = await web3Wrapper.getAvailableAddressesAsync();

        makerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            provider,
            { from: maker, gas: 10000000 },
            {},
            'The token that originally belongs to the maker',
            'makerToken',
            new BigNumber(18),
            new BigNumber(1000000),
        );

        takerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            provider,
            { from: taker, gas: 10000000 },
            {},
            'The token that originally belongs to the maker',
            'takerToken',
            new BigNumber(18),
            new BigNumber(1000000),
        );

        makerAmount = new BigNumber(100);
        takerAmount = new BigNumber(50);
        invalidTakerAmount = new BigNumber(100);

        zeroEx = await fullMigrateAsync(
            owner,
            provider,
            { from: owner, gasPrice: GAS_PRICE },
            {},
            { protocolFeeMultiplier: Number(PROTOCOL_FEE_MULTIPLIER) },
            {
                nativeOrders: zeroExArtifacts.NativeOrdersFeature,
                metaTransactions: zeroExArtifacts.MetaTransactionsFeature,
            },
        );

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

        await makerToken.mint(makerAmount).awaitTransactionSuccessAsync({ from: maker });
        await makerToken.approve(zeroEx.address, makerAmount).awaitTransactionSuccessAsync({ from: maker });
        await takerToken.mint(takerAmount).awaitTransactionSuccessAsync({ from: taker });
        await takerToken.approve(zeroEx.address, takerAmount).awaitTransactionSuccessAsync({ from: taker });

        const ethersProvider = new providers.JsonRpcProvider(ETHEREUM_RPC_URL);
        const ethersWallet = new Wallet(WORKER_TEST_PRIVATE_KEY, ethersProvider);

        rfqBlockchainUtils = new RfqBlockchainUtils(provider, zeroEx.address, ethersWallet);
    });

    after(async () => {
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('validateMetaTransaction', () => {
        it('returns successful filled amounts for a valid metatransaction', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            expect(
                await rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx, metaTxSig, txOrigin),
            ).to.deep.eq([takerAmount, makerAmount]);
        });
        it('throws for a metatransaction with an invalid signature', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const invalidMetaTxSig = orderSig;

            try {
                await rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx, invalidMetaTxSig, txOrigin);
                expect.fail(`validateMetaTransactionOrThrowAsync should throw an error when the signature is invalid`);
            } catch (err) {
                expect(String(err)).to.contain('SignatureValidationError');
            }
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

            try {
                await rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx, metaTxSig, txOrigin);
                expect.fail(`validateMetaTransactionOrThrowAsync should throw an error when the order is unfillable`);
            } catch (err) {
                expect(String(err)).to.contain('MetaTransactionCallFailedError');
            }
        });
        it('returns successful filled amounts for a valid metatransaction when validating calldata', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                metaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );
            expect(
                await rfqBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(callData, txOrigin),
            ).to.deep.eq([takerAmount, makerAmount]);
        });
        it('throws for a metatransaction with an invalid signature when validating calldata', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const invalidMetaTxSig = orderSig;

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                invalidMetaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );

            try {
                await rfqBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(callData, txOrigin);
                expect.fail(`validateMetaTransactionOrThrowAsync should throw an error when the signature is invalid`);
            } catch (err) {
                expect(String(err)).to.contain('SignatureValidationError');
            }
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

            try {
                await rfqBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(callData, txOrigin);
                expect.fail(`validateMetaTransactionOrThrowAsync should throw an error when the order is unfillable`);
            } catch (err) {
                expect(String(err)).to.contain('MetaTransactionCallFailedError');
            }
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

            try {
                await rfqBlockchainUtils.validateMetaTransactionOrThrowAsync(metaTx2, metaTxSig2, txOrigin);
                expect.fail(
                    `validateMetaTransactionOrThrowAsync should throw an error when not filling the entire amount`,
                );
            } catch (err) {
                expect(String(err)).to.contain(`filled amount is less than requested fill amount`);
            }
        });
    });
    describe('submitCallDataToExchangeProxyAsync', () => {
        it('passes submit validation and returns a transaction hash for a valid meta tx', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                metaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );

            const txHash = await rfqBlockchainUtils.submitCallDataToExchangeProxyAsync(callData, txOrigin, {
                gasPrice: 1e9,
                gas: 200000,
                value: 0,
            });

            expect(txHash).to.match(/^0x[0-9a-fA-F]+/);
        });
    });
    describe('transformTxDataToTransactionRequest', () => {
        it('creates a TransactionRequest', () => {
            const txOptions: TxData = {
                from: '0xfromaddress',
                gas: new BigNumber(210000000),
                gasPrice: new BigNumber(400000),
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
            expect(result.gasPrice).to.equal(BigInt(400000));
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
    describe('signTransactionRequestAsync', () => {
        it('matches the transaction hash from web3wrapper', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                metaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );

            const nonce = await rfqBlockchainUtils.getNonceAsync(WORKER_TEST_ADDRESS);

            const transactionRequest = rfqBlockchainUtils.transformTxDataToTransactionRequest(
                {
                    gasPrice: new BigNumber(1e9),
                    gas: new BigNumber(200000),
                    value: 0,
                    nonce,
                },
                CHAIN_ID,
                callData,
            );

            const { signedTransaction, transactionHash: preSubmitHash } = await rfqBlockchainUtils.signTransactionAsync(
                transactionRequest,
            );
            const web3SubmitHash = await rfqBlockchainUtils.submitSignedTransactionAsync(signedTransaction);

            expect(preSubmitHash).to.equal(web3SubmitHash);
        });
    });
    describe('getTakerTokenFillAmountFromMetaTxCallData', () => {
        it('returns the correct taker token fill amount from calldata', async () => {
            const metaTx = rfqBlockchainUtils.generateMetaTransaction(rfqOrder, orderSig, taker, takerAmount, CHAIN_ID);
            const metaTxSig = await metaTx.getSignatureWithProviderAsync(provider);

            const callData = rfqBlockchainUtils.generateMetaTransactionCallData(
                metaTx,
                metaTxSig,
                MATCHA_AFFILIATE_ADDRESS,
            );

            const expectedTakerTokenFillAmount = rfqBlockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(callData);
            expect(expectedTakerTokenFillAmount).to.deep.eq(takerAmount);
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
});
