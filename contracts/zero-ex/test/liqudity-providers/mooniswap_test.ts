import { blockchainTests, constants, expect, getRandomInteger, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { artifacts } from '../artifacts';
import {
    MooniswapLiquidityProviderContract,
    TestMintableERC20TokenContract,
    TestMooniswapContract,
    TestWethContract,
} from '../wrappers';

blockchainTests.resets('MooniswapLiquidityProvider feature', env => {
    let lp: MooniswapLiquidityProviderContract;
    let sellToken: TestMintableERC20TokenContract;
    let buyToken: TestMintableERC20TokenContract;
    let weth: TestWethContract;
    let testMooniswap: TestMooniswapContract;
    let taker: string;
    let mooniswapData: string;
    const RECIPIENT = hexUtils.random(20);
    const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const { NULL_ADDRESS, ZERO_AMOUNT } = constants;
    const SELL_AMOUNT = getRandomInteger('1e18', '10e18');
    const BUY_AMOUNT = getRandomInteger('1e18', '10e18');

    before(async () => {
        [, taker] = await env.getAccountAddressesAsync();
        [sellToken, buyToken] = await Promise.all(
            new Array(2)
                .fill(0)
                .map(async () =>
                    TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
                        artifacts.TestMintableERC20Token,
                        env.provider,
                        env.txDefaults,
                        artifacts,
                    ),
                ),
        );
        weth = await TestWethContract.deployFrom0xArtifactAsync(
            artifacts.TestWeth,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        testMooniswap = await TestMooniswapContract.deployFrom0xArtifactAsync(
            artifacts.TestMooniswap,
            env.provider,
            { ...env.txDefaults },
            artifacts,
        );
        lp = await MooniswapLiquidityProviderContract.deployFrom0xArtifactAsync(
            artifacts.MooniswapLiquidityProvider,
            env.provider,
            { ...env.txDefaults, from: taker },
            artifacts,
            weth.address,
        );
        mooniswapData = hexUtils.leftPad(testMooniswap.address);
    });

    async function prepareNextSwapFundsAsync(
        sellTokenAddress: string,
        sellAmount: BigNumber,
        buyTokenAddress: string,
        buyAmount: BigNumber,
    ): Promise<void> {
        if (sellTokenAddress.toLowerCase() === weth.address.toLowerCase()) {
            await weth.deposit().awaitTransactionSuccessAsync({
                from: taker,
                value: sellAmount,
            });
            await weth.transfer(lp.address, sellAmount).awaitTransactionSuccessAsync({ from: taker });
        } else if (sellTokenAddress.toLowerCase() === sellToken.address.toLowerCase()) {
            await sellToken.mint(lp.address, sellAmount).awaitTransactionSuccessAsync();
        } else {
            await await env.web3Wrapper.awaitTransactionSuccessAsync(
                await env.web3Wrapper.sendTransactionAsync({
                    to: lp.address,
                    from: taker,
                    value: sellAmount,
                }),
            );
        }
        await testMooniswap.setNextBoughtAmount(buyAmount).awaitTransactionSuccessAsync({
            value: buyTokenAddress.toLowerCase() === ETH_TOKEN_ADDRESS.toLowerCase() ? buyAmount : ZERO_AMOUNT,
        });
    }

    it('can swap ERC20->ERC20', async () => {
        await prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: ZERO_AMOUNT,
                    sellToken: sellToken.address,
                    buyToken: buyToken.address,
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                    referral: NULL_ADDRESS,
                },
            ],
            'MooniswapCalled',
        );
    });

    it('can swap ERC20->ETH', async () => {
        await prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, ETH_TOKEN_ADDRESS, BUY_AMOUNT);
        const call = lp.sellTokenForEth(sellToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await env.web3Wrapper.getBalanceInWeiAsync(RECIPIENT)).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: ZERO_AMOUNT,
                    sellToken: sellToken.address,
                    buyToken: NULL_ADDRESS,
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                    referral: NULL_ADDRESS,
                },
            ],
            'MooniswapCalled',
        );
    });

    it('can swap ETH->ERC20', async () => {
        await prepareNextSwapFundsAsync(ETH_TOKEN_ADDRESS, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellEthForToken(buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: SELL_AMOUNT,
                    sellToken: NULL_ADDRESS,
                    buyToken: buyToken.address,
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                    referral: NULL_ADDRESS,
                },
            ],
            'MooniswapCalled',
        );
    });

    it('can swap ETH->ERC20 with attached ETH', async () => {
        await testMooniswap.setNextBoughtAmount(BUY_AMOUNT).awaitTransactionSuccessAsync();
        const call = lp.sellEthForToken(buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = await call.callAsync({ value: SELL_AMOUNT });
        const { logs } = await call.awaitTransactionSuccessAsync({ value: SELL_AMOUNT });
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: SELL_AMOUNT,
                    sellToken: NULL_ADDRESS,
                    buyToken: buyToken.address,
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                    referral: NULL_ADDRESS,
                },
            ],
            'MooniswapCalled',
        );
    });

    it('can swap ERC20->WETH', async () => {
        await prepareNextSwapFundsAsync(
            sellToken.address,
            SELL_AMOUNT,
            ETH_TOKEN_ADDRESS, // Mooni contract holds ETH.
            BUY_AMOUNT,
        );
        const call = lp.sellTokenForToken(sellToken.address, weth.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await sellToken.balanceOf(testMooniswap.address).callAsync()).to.bignumber.eq(SELL_AMOUNT);
        expect(await weth.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: ZERO_AMOUNT,
                    sellToken: sellToken.address,
                    buyToken: NULL_ADDRESS,
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                    referral: NULL_ADDRESS,
                },
            ],
            'MooniswapCalled',
        );
    });

    it('can swap WETH->ERC20', async () => {
        await prepareNextSwapFundsAsync(weth.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellTokenForToken(weth.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await env.web3Wrapper.getBalanceInWeiAsync(testMooniswap.address)).to.bignumber.eq(SELL_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: SELL_AMOUNT,
                    sellToken: NULL_ADDRESS,
                    buyToken: buyToken.address,
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                    referral: NULL_ADDRESS,
                },
            ],
            'MooniswapCalled',
        );
    });

    it('reverts if pool reverts', async () => {
        await prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        await testMooniswap.setNextBoughtAmount(BUY_AMOUNT.minus(1)).awaitTransactionSuccessAsync();
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return expect(call.callAsync()).to.revertWith('UNDERBOUGHT');
    });

    it('reverts if ERC20->ERC20 is the same token', async () => {
        const call = lp.sellTokenForToken(sellToken.address, sellToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    });

    it('reverts if ERC20->ERC20 receives an ETH input token', async () => {
        const call = lp.sellTokenForToken(ETH_TOKEN_ADDRESS, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    });

    it('reverts if ERC20->ERC20 receives an ETH output token', async () => {
        const call = lp.sellTokenForToken(sellToken.address, ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    });

    it('reverts if ERC20->ETH receives an ETH input token', async () => {
        const call = lp.sellTokenForEth(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    });

    it('reverts if ETH->ERC20 receives an ETH output token', async () => {
        const call = lp.sellEthForToken(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    });

    it('emits a LiquidityProviderFill event', async () => {
        await prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const { logs } = await call.awaitTransactionSuccessAsync();
        verifyEventsFromLogs(
            logs,
            [
                {
                    inputToken: sellToken.address,
                    outputToken: buyToken.address,
                    inputTokenAmount: SELL_AMOUNT,
                    outputTokenAmount: BUY_AMOUNT,
                    sourceId: hexUtils.rightPad(hexUtils.toHex(Buffer.from('Mooniswap'))),
                    sourceAddress: testMooniswap.address,
                    sender: taker,
                    recipient: RECIPIENT,
                },
            ],
            'LiquidityProviderFill',
        );
    });
});
