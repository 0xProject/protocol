import { BalanceCheckerContract } from '@0x/asset-swapper';
import { artifacts } from '@0x/asset-swapper/lib/src/artifacts';
import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { expect } from '@0x/contracts-test-utils';
import { Web3ProviderEngine } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import 'mocha';
import { Connection, Repository } from 'typeorm';

import { RFQ_ALLOWANCE_TARGET } from '../src/constants';
import { MakerBalanceChainCacheEntity } from '../src/entities';
import { cacheRfqBalancesAsync } from '../src/runners/rfq_maker_balance_cache_runner';

import { getProvider } from './constants';
import { initDBConnectionAsync } from './utils/db_connection';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';

const SUITE_NAME = 'RFQ Maker Balance Cache Tests';

describe(SUITE_NAME, () => {
    let provider: Web3ProviderEngine;
    let balanceCheckerContract: BalanceCheckerContract;
    let dbConnection: Connection;
    let zrx: DummyERC20TokenContract;
    let balanceRepo: Repository<MakerBalanceChainCacheEntity>;
    let web3Wrapper: Web3Wrapper;
    let makerAddress1: string;
    let makerAddress2: string;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        provider = getProvider();
        web3Wrapper = new Web3Wrapper(provider);

        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        const deployer = accounts[0];
        makerAddress1 = accounts[1];
        makerAddress2 = accounts[2];

        zrx = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            provider,
            { from: deployer, gas: 10000000 },
            {},
            '0x Protocol Token',
            'ZRX',
            new BigNumber(18),
            new BigNumber(1000000),
        );

        await zrx.mint(new BigNumber(100)).awaitTransactionSuccessAsync({ from: makerAddress1 });
        await zrx
            .approve(RFQ_ALLOWANCE_TARGET, new BigNumber(100))
            .awaitTransactionSuccessAsync({ from: makerAddress1 });
        await zrx.mint(new BigNumber(150)).awaitTransactionSuccessAsync({ from: makerAddress2 });
        await zrx
            .approve(RFQ_ALLOWANCE_TARGET, new BigNumber(125))
            .awaitTransactionSuccessAsync({ from: makerAddress2 });

        balanceCheckerContract = await BalanceCheckerContract.deployFrom0xArtifactAsync(
            artifacts.BalanceChecker,
            provider,
            { from: deployer, gas: 10000000 },
            {},
        );

        dbConnection = await initDBConnectionAsync();

        // save some balance cache entities
        const maker1 = new MakerBalanceChainCacheEntity();

        maker1.makerAddress = makerAddress1;
        maker1.tokenAddress = zrx.address;
        maker1.timeFirstSeen = new Date();

        const maker2 = new MakerBalanceChainCacheEntity();

        maker2.makerAddress = makerAddress2;
        maker2.tokenAddress = zrx.address;
        maker2.timeFirstSeen = new Date();

        balanceRepo = dbConnection.getRepository(MakerBalanceChainCacheEntity);

        await balanceRepo.save([maker1, maker2]);
    });

    after(async () => {
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('runRfqBalanceCheckerAsync', () => {
        it('correctly updates maker addresses', async () => {
            await cacheRfqBalancesAsync(dbConnection, balanceCheckerContract, false, '');

            const maker1 = await dbConnection
                .getRepository(MakerBalanceChainCacheEntity)
                .createQueryBuilder('maker_balance_chain_cache')
                .where(
                    'maker_balance_chain_cache.makerAddress = :address AND maker_balance_chain_cache.tokenAddress = :token',
                    { address: makerAddress1, token: zrx.address },
                )
                .getOne();

            const maker2 = await dbConnection
                .getRepository(MakerBalanceChainCacheEntity)
                .createQueryBuilder('maker_balance_chain_cache')
                .where(
                    'maker_balance_chain_cache.makerAddress = :address AND maker_balance_chain_cache.tokenAddress = :token',
                    { address: makerAddress2, token: zrx.address },
                )
                .getOne();

            expect(maker1!.balance).to.be.deep.equal(new BigNumber(100));
            expect(maker2!.balance).to.be.deep.equal(new BigNumber(125));
        });
    });
});
