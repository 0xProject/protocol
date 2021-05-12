import {
    blockchainTests,
    constants,
    describe,
    expect,
    getRandomPortion,
    randomAddress,
} from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import { LogWithDecodedArgs } from 'ethereum-types';

import { artifacts } from '../artifacts';
import {
    TestMintableERC20TokenContract,
    TestNoEthRecipientContract,
    TestUniswapV3FactoryContract,
    TestUniswapV3FactoryPoolCreatedEventArgs,
    TestUniswapV3PoolContract,
    TestWethContract,
    UniswapV3FeatureContract,
} from '../wrappers';

blockchainTests.resets('UniswapV3Feature', env => {
    const { MAX_UINT256, NULL_ADDRESS, ZERO_AMOUNT } = constants;
    const POOL_FEE = 1234;
    const MAX_SUPPLY = new BigNumber('10e18');
    let uniFactory: TestUniswapV3FactoryContract;
    let feature: UniswapV3FeatureContract;
    let weth: TestWethContract;
    let tokens: TestMintableERC20TokenContract[];
    const sellAmount = getRandomPortion(MAX_SUPPLY);
    const buyAmount = getRandomPortion(MAX_SUPPLY);
    let taker: string;
    const recipient = randomAddress();
    let noEthRecipient: TestNoEthRecipientContract;

    before(async () => {
        [, taker] = await env.getAccountAddressesAsync();
        weth = await TestWethContract.deployFrom0xArtifactAsync(
            artifacts.TestWeth,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        tokens = await Promise.all(
            [...new Array(3)].map(async () =>
                TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
                    artifacts.TestMintableERC20Token,
                    env.provider,
                    env.txDefaults,
                    artifacts,
                ),
            ),
        );
        noEthRecipient = await TestNoEthRecipientContract.deployFrom0xArtifactAsync(
            artifacts.TestNoEthRecipient,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        uniFactory = await TestUniswapV3FactoryContract.deployFrom0xArtifactAsync(
            artifacts.TestUniswapV3Factory,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        feature = await UniswapV3FeatureContract.deployFrom0xArtifactAsync(
            artifacts.TestUniswapV3Feature,
            env.provider,
            env.txDefaults,
            artifacts,
            weth.address,
            uniFactory.address,
            await uniFactory.POOL_INIT_CODE_HASH().callAsync(),
        );
        await Promise.all(
            [...tokens, weth].map(t =>
                t.approve(feature.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: taker }),
            ),
        );
    });

    function isWethContract(t: TestMintableERC20TokenContract | TestWethContract): t is TestWethContract {
        return !!(t as any).deposit;
    }

    async function mintToAsync(
        token: TestMintableERC20TokenContract | TestWethContract,
        owner: string,
        amount: BigNumber,
    ): Promise<void> {
        if (isWethContract(token)) {
            await token.depositTo(owner).awaitTransactionSuccessAsync({ value: amount });
        } else {
            await token.mint(owner, amount).awaitTransactionSuccessAsync();
        }
    }

    async function createPoolAsync(
        token0: TestMintableERC20TokenContract | TestWethContract,
        token1: TestMintableERC20TokenContract | TestWethContract,
        balance0: BigNumber,
        balance1: BigNumber,
    ): Promise<TestUniswapV3PoolContract> {
        const r = await uniFactory
            .createPool(token0.address, token1.address, new BigNumber(POOL_FEE))
            .awaitTransactionSuccessAsync();
        const pool = new TestUniswapV3PoolContract(
            (r.logs[0] as LogWithDecodedArgs<TestUniswapV3FactoryPoolCreatedEventArgs>).args.pool,
            env.provider,
            env.txDefaults,
        );
        await mintToAsync(token0, pool.address, balance0);
        await mintToAsync(token1, pool.address, balance1);
        return pool;
    }

    function encodePath(tokens_: Array<TestMintableERC20TokenContract | TestWethContract>): string {
        const elems: string[] = [];
        tokens_.forEach((t, i) => {
            if (i) {
                elems.push(hexUtils.leftPad(POOL_FEE, 3));
            }
            elems.push(hexUtils.leftPad(t.address, 20));
        });
        return hexUtils.concat(...elems);
    }

    describe('sellTokenForTokenToUniswapV3()', () => {
        it('1-hop swap', async () => {
            const [sellToken, buyToken] = tokens;
            const pool = await createPoolAsync(sellToken, buyToken, ZERO_AMOUNT, buyAmount);
            await mintToAsync(sellToken, taker, sellAmount);
            await feature
                .sellTokenForTokenToUniswapV3(encodePath([sellToken, buyToken]), sellAmount, buyAmount, recipient)
                .awaitTransactionSuccessAsync({ from: taker });
            // Test pools always ask for full sell amount and pay entire balance.
            expect(await sellToken.balanceOf(taker).callAsync()).to.bignumber.eq(0);
            expect(await buyToken.balanceOf(recipient).callAsync()).to.bignumber.eq(buyAmount);
            expect(await sellToken.balanceOf(pool.address).callAsync()).to.bignumber.eq(sellAmount);
        });

        it('2-hop swap', async () => {
            const pools = [
                await createPoolAsync(tokens[0], tokens[1], ZERO_AMOUNT, buyAmount),
                await createPoolAsync(tokens[1], tokens[2], ZERO_AMOUNT, buyAmount),
            ];
            await mintToAsync(tokens[0], taker, sellAmount);
            await feature
                .sellTokenForTokenToUniswapV3(encodePath(tokens), sellAmount, buyAmount, recipient)
                .awaitTransactionSuccessAsync({ from: taker });
            // Test pools always ask for full sell amount and pay entire balance.
            expect(await tokens[0].balanceOf(taker).callAsync()).to.bignumber.eq(0);
            expect(await tokens[2].balanceOf(recipient).callAsync()).to.bignumber.eq(buyAmount);
            expect(await tokens[0].balanceOf(pools[0].address).callAsync()).to.bignumber.eq(sellAmount);
            expect(await tokens[1].balanceOf(pools[1].address).callAsync()).to.bignumber.eq(buyAmount);
        });

        it('1-hop underbuy fails', async () => {
            const [sellToken, buyToken] = tokens;
            await createPoolAsync(sellToken, buyToken, ZERO_AMOUNT, buyAmount.minus(1));
            await mintToAsync(sellToken, taker, sellAmount);
            const tx = feature
                .sellTokenForTokenToUniswapV3(encodePath([sellToken, buyToken]), sellAmount, buyAmount, recipient)
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith('UniswapV3Feature/UNDERBOUGHT');
        });

        it('2-hop underbuy fails', async () => {
            await createPoolAsync(tokens[0], tokens[1], ZERO_AMOUNT, buyAmount);
            await createPoolAsync(tokens[1], tokens[2], ZERO_AMOUNT, buyAmount.minus(1));
            await mintToAsync(tokens[0], taker, sellAmount);
            const tx = feature
                .sellTokenForTokenToUniswapV3(encodePath(tokens), sellAmount, buyAmount, recipient)
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith('UniswapV3Feature/UNDERBOUGHT');
        });

        it('null recipient is sender', async () => {
            const [sellToken, buyToken] = tokens;
            await createPoolAsync(sellToken, buyToken, ZERO_AMOUNT, buyAmount);
            await mintToAsync(sellToken, taker, sellAmount);
            await feature
                .sellTokenForTokenToUniswapV3(encodePath([sellToken, buyToken]), sellAmount, buyAmount, NULL_ADDRESS)
                .awaitTransactionSuccessAsync({ from: taker });
            // Test pools always ask for full sell amount and pay entire balance.
            expect(await buyToken.balanceOf(taker).callAsync()).to.bignumber.eq(buyAmount);
        });
    });

    describe('sellEthForTokenToUniswapV3()', () => {
        it('1-hop swap', async () => {
            const [buyToken] = tokens;
            const pool = await createPoolAsync(weth, buyToken, ZERO_AMOUNT, buyAmount);
            await feature
                .sellEthForTokenToUniswapV3(encodePath([weth, buyToken]), buyAmount, recipient)
                .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
            // Test pools always ask for full sell amount and pay entire balance.
            expect(await buyToken.balanceOf(recipient).callAsync()).to.bignumber.eq(buyAmount);
            expect(await weth.balanceOf(pool.address).callAsync()).to.bignumber.eq(sellAmount);
        });

        it('null recipient is sender', async () => {
            const [buyToken] = tokens;
            const pool = await createPoolAsync(weth, buyToken, ZERO_AMOUNT, buyAmount);
            await feature
                .sellEthForTokenToUniswapV3(encodePath([weth, buyToken]), buyAmount, NULL_ADDRESS)
                .awaitTransactionSuccessAsync({ from: taker, value: sellAmount });
            // Test pools always ask for full sell amount and pay entire balance.
            expect(await buyToken.balanceOf(taker).callAsync()).to.bignumber.eq(buyAmount);
            expect(await weth.balanceOf(pool.address).callAsync()).to.bignumber.eq(sellAmount);
        });
    });

    describe('sellTokenForEthToUniswapV3()', () => {
        it('1-hop swap', async () => {
            const [sellToken] = tokens;
            const pool = await createPoolAsync(sellToken, weth, ZERO_AMOUNT, buyAmount);
            await mintToAsync(sellToken, taker, sellAmount);
            await feature
                .sellTokenForEthToUniswapV3(encodePath([sellToken, weth]), sellAmount, buyAmount, recipient)
                .awaitTransactionSuccessAsync({ from: taker });
            // Test pools always ask for full sell amount and pay entire balance.
            expect(await sellToken.balanceOf(taker).callAsync()).to.bignumber.eq(0);
            expect(await env.web3Wrapper.getBalanceInWeiAsync(recipient)).to.bignumber.eq(buyAmount);
            expect(await sellToken.balanceOf(pool.address).callAsync()).to.bignumber.eq(sellAmount);
        });

        it('null recipient is sender', async () => {
            const [sellToken] = tokens;
            const pool = await createPoolAsync(sellToken, weth, ZERO_AMOUNT, buyAmount);
            await mintToAsync(sellToken, taker, sellAmount);
            const takerBalanceBefore = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            await feature
                .sellTokenForEthToUniswapV3(encodePath([sellToken, weth]), sellAmount, buyAmount, NULL_ADDRESS)
                .awaitTransactionSuccessAsync({ from: taker, gasPrice: ZERO_AMOUNT });
            // Test pools always ask for full sell amount and pay entire balance.
            expect((await env.web3Wrapper.getBalanceInWeiAsync(taker)).minus(takerBalanceBefore)).to.bignumber.eq(
                buyAmount,
            );
            expect(await sellToken.balanceOf(pool.address).callAsync()).to.bignumber.eq(sellAmount);
        });

        it('fails if receipient cannot receive ETH', async () => {
            const [sellToken] = tokens;
            await mintToAsync(sellToken, taker, sellAmount);
            const tx = feature
                .sellTokenForEthToUniswapV3(
                    encodePath([sellToken, weth]),
                    sellAmount,
                    buyAmount,
                    noEthRecipient.address,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.be.rejectedWith('revert');
        });
    });
});
