import { expect } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, web3Factory, Web3ProviderEngine, Web3Wrapper } from '@0x/dev-utils';
import { runMigrationsOnceAsync } from '@0x/migrations';
import { BigNumber } from '@0x/utils';
import { utils as web3WrapperUtils } from '@0x/web3-wrapper/lib/src/utils';
import * as crypto from 'crypto';
// tslint:disable-next-line:no-implicit-dependencies
import * as ethers from 'ethers'; // HACK to make ethers quiet
import { Connection, ConnectionOptions, createConnection, Repository } from 'typeorm';

import { TEN_MINUTES_MS, ZERO } from '../src/constants';
import { KeyValueEntity, TransactionEntity } from '../src/entities';
import { TransactionWatcherSignerService } from '../src/services/transaction_watcher_signer_service';
import { TransactionStates, TransactionWatcherSignerServiceConfig } from '../src/types';

// HACK to make ethers quiet
ethers.errors.setLogLevel('error');

// tslint:disable:custom-no-magic-numbers

const SUITE_NAME = 'transaction watcher signer tests';
describe(SUITE_NAME, () => {
    describe('.getSortedSignersByAvailability', () => {
        it('sorts signers in order of highest balance andd lowest tx count', () => {
            const testSigners = [
                { balance: 0.25, count: 0, from: '1' },
                { balance: 0.59, count: 1, from: '2' },
                { balance: 0.27, count: 1, from: '3' },
                { balance: 1.67, count: 0, from: '4' },
                { balance: 1.68, count: 0, from: '5' },
                { balance: 51.68, count: 2, from: '6' },
            ];
            const testCase = new Map<string, { count: number; balance: number }>();
            testSigners.forEach(signer => {
                const { from, count, balance } = signer;
                testCase.set(from, { count, balance });
            });
            const expected = ['5', '4', '1', '2', '3', '6'];
            const calculated = TransactionWatcherSignerService.getSortedSignersByAvailability(testCase);
            expect(calculated).to.be.deep.equal(expected);
        });
    });
    describe.skip('tx lifecycle', () => {
        let txWatcher: TransactionWatcherSignerService;
        let blockchainLifecycle: BlockchainLifecycle;
        let provider: Web3ProviderEngine;
        let web3Wrapper: Web3Wrapper;
        let connection: Connection;
        let address: string;
        let transactionEntityRepository: Repository<TransactionEntity>;
        const privateKeys = ['F2F48EE19680706196E2E339E5DA3491186E0C4C5030670656B0E0164837257D'];
        const randomTxHash = () => `0x${crypto.randomBytes(32).toString('hex')}`;
        let refHash = randomTxHash();

        const createTxWatcher = (config: Partial<TransactionWatcherSignerServiceConfig>) => {
            const txWatcherConfig: TransactionWatcherSignerServiceConfig = {
                provider,
                chainId: 1337,
                signerPrivateKeys: privateKeys,
                expectedMinedInSec: 2,
                isSigningEnabled: true,
                maxGasPriceGwei: new BigNumber(100),
                minSignerEthBalance: 0.1,
                transactionPollingIntervalMs: 100,
                heartbeatIntervalMs: 1000,
                unstickGasMultiplier: 1.1,
                numBlocksUntilConfirmed: 0,
                ...config,
            };
            const watcher = new TransactionWatcherSignerService(connection, txWatcherConfig);
            watcher.stop();
            return watcher;
        };
        const getCurrentNonceAsync = async (addr: string): Promise<number> => {
            return web3WrapperUtils.convertHexToNumber(
                await web3Wrapper.sendRawPayloadAsync<string>({
                    method: 'eth_getTransactionCount',
                    params: [addr, 'pending'],
                }),
            );
        };

        before(async () => {
            const ganacheConfigs = {
                shouldUseInProcessGanache: true,
                shouldAllowUnlimitedContractSize: true,
                // Don't automine unless 10s pass
                blockTime: 60,
            };
            provider = web3Factory.getRpcProvider(ganacheConfigs);
            web3Wrapper = new Web3Wrapper(provider);
            [address] = await web3Wrapper.getAvailableAddressesAsync();
            let isDeployed = false;
            void (async () => {
                while (!isDeployed) {
                    // Keep mining until the contracts are deployed
                    await web3Wrapper.mineBlockAsync();
                }
            })();
            await runMigrationsOnceAsync(provider, { from: address });
            isDeployed = true;
            blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);
            await blockchainLifecycle.startAsync();
            const dbConfig: ConnectionOptions = {
                type: 'postgres',
                url: 'postgres://api:api@localhost/api',
                entities: [TransactionEntity, KeyValueEntity],
                synchronize: true,
            };
            connection = await createConnection(dbConfig);
            transactionEntityRepository = connection.getRepository(TransactionEntity);
            txWatcher = createTxWatcher({});
        });

        beforeEach(async () => {
            await blockchainLifecycle.startAsync();
            refHash = randomTxHash();
        });

        afterEach(async () => {
            // await blockchainLifecycle.revertAsync();
            await transactionEntityRepository.delete({ from: address });
            await transactionEntityRepository.delete({ refHash });
        });

        it('submits a transaction', async () => {
            const transactionEntity = TransactionEntity.make({
                refHash,
                status: TransactionStates.Unsubmitted,
                takerAddress: address,
                to: address,
                data: '0x',
                value: ZERO,
                gasPrice: new BigNumber(1),
                expectedMinedInSec: 180,
            });
            await transactionEntityRepository.save(transactionEntity);

            await txWatcher.syncTransactionStatusAsync();
            let tx = await transactionEntityRepository.findOne({ refHash });
            // Without any mining it is in the mempool
            expect(tx.status).to.be.eq(TransactionStates.Mempool);
            await web3Wrapper.mineBlockAsync();
            await txWatcher.syncTransactionStatusAsync();

            tx = await transactionEntityRepository.findOne({ refHash });
            expect(tx.status).to.be.oneOf([TransactionStates.Included, TransactionStates.Confirmed]);
        });

        it('marks a transaction as dropped if it has been seen then disappears', async () => {
            const transactionEntity = TransactionEntity.make({
                refHash,
                txHash: '0xaaaaa',
                status: TransactionStates.Mempool,
                takerAddress: address,
                to: address,
                data: '0x',
                value: ZERO,
                gasPrice: new BigNumber(1),
                expectedMinedInSec: 180,
                blockNumber: 1,
                from: address,
                nonce: await getCurrentNonceAsync(address),
            });
            transactionEntity.expectedAt = new Date(Date.now() - TEN_MINUTES_MS);
            await transactionEntityRepository.save(transactionEntity);

            await txWatcher.syncTransactionStatusAsync();
            const tx = await transactionEntityRepository.findOne({ refHash });
            expect(tx.status).to.be.eq(TransactionStates.Dropped);
        });

        // Ganache does not allow for overriding with same nonce
        // https://github.com/trufflesuite/ganache-core/issues/484
        it.skip('unsticks a stuck transaction', async () => {
            await web3Wrapper.mineBlockAsync();
            const transactionEntity = TransactionEntity.make({
                refHash,
                status: TransactionStates.Unsubmitted,
                takerAddress: address,
                to: address,
                data: '0x',
                value: ZERO,
                gasPrice: new BigNumber(1),
                expectedMinedInSec: 1,
            });
            await transactionEntityRepository.save(transactionEntity);

            // Tx is now submitted
            await txWatcher.syncTransactionStatusAsync();
            // Force the expected at to be in the past
            let tx = await transactionEntityRepository.findOne({ refHash });
            tx.expectedAt = new Date(Date.now() - TEN_MINUTES_MS);
            await transactionEntityRepository.save(tx);
            await txWatcher.syncTransactionStatusAsync();
            // Tx should now be stuck
            tx = await transactionEntityRepository.findOne({ refHash });
            expect(tx.status).to.be.eq(TransactionStates.Stuck);
            await txWatcher.syncTransactionStatusAsync();
        });

        after(async () => {
            txWatcher.stop();
            await blockchainLifecycle.revertAsync();
            await transactionEntityRepository.delete({ from: address });
        });
    });
});
