import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { artifacts as zeroExArtifacts, fullMigrateAsync, IZeroExContract } from '@0x/contracts-zero-ex';
import { Web3ProviderEngine } from '@0x/dev-utils';
import { Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import { expect } from 'chai';
import { Contract, providers, Wallet } from 'ethersv5';

import { ONE_MINUTE_MS, ZERO } from '../src/core/constants';
import { artifacts } from '../src/generated-artifacts/artifacts';
import { BalanceCheckerContract } from '../src/generated-wrappers/balance_checker';
import { BalanceChecker } from '../src/utils/balance_checker';
import { RfqBlockchainUtils } from '../src/utils/rfq_blockchain_utils';

import {
    getProvider,
    MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
    MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
    MOCK_EXECUTE_META_TRANSACTION_HASH,
    MOCK_PERMIT_APPROVAL,
    MOCK_PERMIT_CALLDATA,
    MOCK_PERMIT_HASH,
    RPC_URL,
    WORKER_TEST_PRIVATE_KEY,
} from './constants';
import { setupDependenciesAsync, TeardownDependenciesFunctionHandle } from './test_utils/deployment';

const GAS_PRICE = 1e9;

jest.setTimeout(ONE_MINUTE_MS * 2);
let teardownDependencies: TeardownDependenciesFunctionHandle;

describe('RFQ Blockchain Utils', () => {
    let provider: Web3ProviderEngine;
    let makerToken: DummyERC20TokenContract;
    let takerToken: DummyERC20TokenContract;
    let makerAmount: BigNumber;
    let takerAmount: BigNumber;
    let makerBalance: BigNumber;
    let takerBalance: BigNumber;
    let web3Wrapper: Web3Wrapper;
    let owner: string;
    let maker: string;
    let taker: string;
    let zeroEx: IZeroExContract;
    let rfqBlockchainUtils: RfqBlockchainUtils;

    beforeAll(async () => {
        teardownDependencies = await setupDependenciesAsync(['ganache']);
        provider = getProvider();
        web3Wrapper = new Web3Wrapper(provider);

        [owner, maker, taker] = await web3Wrapper.getAvailableAddressesAsync();

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
            artifacts.BalanceChecker,
            provider,
            { from: owner, gas: 10000000 },
            {},
        );
        const balanceChecker = new BalanceChecker(provider, balanceCheckerContract);

        makerAmount = new BigNumber(100);
        takerAmount = new BigNumber(50);

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

        // Mint enough tokens for a few trades
        const numTrades = 2;
        makerBalance = makerAmount.times(numTrades);
        takerBalance = takerAmount.times(numTrades);

        await makerToken.mint(makerBalance).awaitTransactionSuccessAsync({ from: maker });
        await makerToken.approve(zeroEx.address, makerBalance.times(2)).awaitTransactionSuccessAsync({ from: maker });
        await takerToken.mint(takerBalance).awaitTransactionSuccessAsync({ from: taker });
        await takerToken.approve(zeroEx.address, takerBalance.times(2)).awaitTransactionSuccessAsync({ from: taker });

        const ethersProvider = new providers.JsonRpcProvider(RPC_URL);
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
            const addresses = [
                { owner: maker, token: makerToken.address },
                { owner: maker, token: takerToken.address },
                { owner: taker, token: makerToken.address },
                { owner: taker, token: takerToken.address },
            ];
            const res = await rfqBlockchainUtils.getMinOfBalancesAndAllowancesAsync(addresses);
            expect(res).to.deep.eq([makerBalance, ZERO, ZERO, takerBalance]);
        });
    });

    describe('getTokenBalancesAsync', () => {
        it('should fetch token balances', async () => {
            const addresses = [
                { owner: maker, token: makerToken.address },
                { owner: maker, token: takerToken.address },
                { owner: taker, token: makerToken.address },
                { owner: taker, token: takerToken.address },
            ];
            const res = await rfqBlockchainUtils.getTokenBalancesAsync(addresses);
            expect(res).to.deep.eq([makerBalance, ZERO, ZERO, takerBalance]);
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

    describe('getTokenDecimalsAsync', () => {
        it('gets the token decimals', async () => {
            const decimals = await rfqBlockchainUtils.getTokenDecimalsAsync(makerToken.address);

            expect(decimals).to.equal(18);
        });

        it('throws if the contract does not exist', () => {
            expect(rfqBlockchainUtils.getTokenDecimalsAsync('0x29D7d1dd5B6f9C864d9db560D72a247c178aE86B')).to.be
                .rejected;
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

    describe('computeEip712Hash', () => {
        const eip712Objects = [MOCK_EXECUTE_META_TRANSACTION_APPROVAL, MOCK_PERMIT_APPROVAL];
        const eip712Hashes = [MOCK_EXECUTE_META_TRANSACTION_HASH, MOCK_PERMIT_HASH];
        eip712Objects
            .map((eip712Object) => eip712Object.eip712)
            .map((context) => {
                it(`computes EIP-712 hashes for ${JSON.stringify(context.primaryType)}`, () => {
                    const hash = rfqBlockchainUtils.computeEip712Hash(context);
                    expect(eip712Hashes).includes(hash);
                });
            });
    });

    describe('estimateGasForAsync', () => {
        it('throws exception on invalid calldata', async () => {
            const erc20AbiDecimals = `[{
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [
                    {
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }]`;
            const erc20 = new Contract(takerToken.address, erc20AbiDecimals);
            const { data: calldata } = await erc20.populateTransaction.decimals();
            if (!calldata) {
                throw new Error('calldata for decimals should not be undefined or empty');
            }
            const invalidCalldata = `${calldata.substring(0, calldata.length - 1)}0`;

            try {
                await rfqBlockchainUtils.estimateGasForAsync({ to: takerToken.address, data: invalidCalldata });
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('estimateGasForAsync');
            }
        });

        it('successfully estimates gas', async () => {
            const erc20AbiDecimals = `[{
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [
                    {
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }]`;
            const erc20 = new Contract(takerToken.address, erc20AbiDecimals);
            const { data: calldata } = await erc20.populateTransaction.decimals();
            if (!calldata) {
                throw new Error('calldata for decimals should not be undefined or empty');
            }

            await rfqBlockchainUtils.estimateGasForAsync({ to: takerToken.address, data: calldata });
        });
    });
});
