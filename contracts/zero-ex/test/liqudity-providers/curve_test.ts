import { blockchainTests, constants, expect, getRandomInteger, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { artifacts } from '../artifacts';
import { CurveLiquidityProviderContract, TestCurveContract, TestMintableERC20TokenContract } from '../wrappers';

blockchainTests.resets('CurveLiquidityProvider feature', env => {
    let lp: CurveLiquidityProviderContract;
    let sellToken: TestMintableERC20TokenContract;
    let buyToken: TestMintableERC20TokenContract;
    let testCurve: TestCurveContract;
    let taker: string;
    const RECIPIENT = hexUtils.random(20);
    const SELL_AMOUNT = getRandomInteger('1e6', '1e18');
    const BUY_AMOUNT = getRandomInteger('1e6', '10e18');
    const REVERTING_SELECTOR = '0xdeaddead';
    const SWAP_SELECTOR = '0x12340000';
    const SWAP_WITH_RETURN_SELECTOR = '0x12340001';
    const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const SELL_TOKEN_COIN_IDX = 0;
    const BUY_TOKEN_COIN_IDX = 1;
    const ETH_COIN_IDX = 2;
    const { ZERO_AMOUNT } = constants;

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
        testCurve = await TestCurveContract.deployFrom0xArtifactAsync(
            artifacts.TestCurve,
            env.provider,
            { ...env.txDefaults, value: BUY_AMOUNT },
            artifacts,
            sellToken.address,
            buyToken.address,
            BUY_AMOUNT,
        );
        lp = await CurveLiquidityProviderContract.deployFrom0xArtifactAsync(
            artifacts.CurveLiquidityProvider,
            env.provider,
            { ...env.txDefaults, from: taker },
            artifacts,
        );
    });

    interface CurveDataFields {
        curveAddress: string;
        exchangeFunctionSelector: string;
        fromCoinIdx: number;
        toCoinIdx: number;
    }

    async function fundProviderContractAsync(fromCoinIdx: number, amount: BigNumber = SELL_AMOUNT): Promise<void> {
        if (fromCoinIdx === SELL_TOKEN_COIN_IDX) {
            await sellToken.mint(lp.address, SELL_AMOUNT).awaitTransactionSuccessAsync();
        } else {
            await env.web3Wrapper.awaitTransactionSuccessAsync(
                await env.web3Wrapper.sendTransactionAsync({
                    from: taker,
                    to: lp.address,
                    value: SELL_AMOUNT,
                }),
            );
        }
    }

    function encodeCurveData(fields: Partial<CurveDataFields> = {}): string {
        const _fields = {
            curveAddress: testCurve.address,
            exchangeFunctionSelector: SWAP_SELECTOR,
            fromCoinIdx: SELL_TOKEN_COIN_IDX,
            toCoinIdx: BUY_TOKEN_COIN_IDX,
            ...fields,
        };
        return hexUtils.concat(
            hexUtils.leftPad(_fields.curveAddress),
            hexUtils.rightPad(_fields.exchangeFunctionSelector),
            hexUtils.leftPad(_fields.fromCoinIdx),
            hexUtils.leftPad(_fields.toCoinIdx),
        );
    }

    it('can swap ERC20->ERC20', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(
            sellToken.address,
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData(),
        );
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: ZERO_AMOUNT,
                    selector: SWAP_SELECTOR,
                    fromCoinIdx: new BigNumber(SELL_TOKEN_COIN_IDX),
                    toCoinIdx: new BigNumber(BUY_TOKEN_COIN_IDX),
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                },
            ],
            'CurveCalled',
        );
    });

    it('can swap ERC20->ETH', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForEth(
            sellToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData({ toCoinIdx: ETH_COIN_IDX }),
        );
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await env.web3Wrapper.getBalanceInWeiAsync(RECIPIENT)).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: ZERO_AMOUNT,
                    selector: SWAP_SELECTOR,
                    fromCoinIdx: new BigNumber(SELL_TOKEN_COIN_IDX),
                    toCoinIdx: new BigNumber(ETH_COIN_IDX),
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                },
            ],
            'CurveCalled',
        );
    });

    it('can swap ETH->ERC20', async () => {
        await fundProviderContractAsync(ETH_COIN_IDX);
        const call = lp.sellEthForToken(
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData({ fromCoinIdx: ETH_COIN_IDX }),
        );
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: SELL_AMOUNT,
                    selector: SWAP_SELECTOR,
                    fromCoinIdx: new BigNumber(ETH_COIN_IDX),
                    toCoinIdx: new BigNumber(BUY_TOKEN_COIN_IDX),
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                },
            ],
            'CurveCalled',
        );
    });

    it('can swap ETH->ERC20 with attached ETH', async () => {
        const call = lp.sellEthForToken(
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData({ fromCoinIdx: ETH_COIN_IDX }),
        );
        const boughtAmount = await call.callAsync({ value: SELL_AMOUNT });
        const { logs } = await call.awaitTransactionSuccessAsync({ value: SELL_AMOUNT });
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: SELL_AMOUNT,
                    selector: SWAP_SELECTOR,
                    fromCoinIdx: new BigNumber(ETH_COIN_IDX),
                    toCoinIdx: new BigNumber(BUY_TOKEN_COIN_IDX),
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                },
            ],
            'CurveCalled',
        );
    });

    it('can swap with a pool that returns bought amount', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(
            sellToken.address,
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData({ exchangeFunctionSelector: SWAP_WITH_RETURN_SELECTOR }),
        );
        const boughtAmount = await call.callAsync();
        const { logs } = await call.awaitTransactionSuccessAsync();
        expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        expect(await buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        verifyEventsFromLogs(
            logs,
            [
                {
                    value: ZERO_AMOUNT,
                    selector: SWAP_WITH_RETURN_SELECTOR,
                    fromCoinIdx: new BigNumber(SELL_TOKEN_COIN_IDX),
                    toCoinIdx: new BigNumber(BUY_TOKEN_COIN_IDX),
                    sellAmount: SELL_AMOUNT,
                    minBuyAmount: BUY_AMOUNT,
                },
            ],
            'CurveCalled',
        );
    });

    it('reverts if pool reverts', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(
            sellToken.address,
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData({ exchangeFunctionSelector: REVERTING_SELECTOR }),
        );
        return expect(call.callAsync()).to.revertWith('TestCurve/REVERT');
    });

    it('reverts if underbought', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(
            sellToken.address,
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT.plus(1),
            encodeCurveData(),
        );
        return expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/UNDERBOUGHT');
    });

    it('reverts if ERC20->ERC20 receives an ETH input token', async () => {
        await fundProviderContractAsync(ETH_COIN_IDX);
        const call = lp.sellTokenForToken(
            ETH_TOKEN_ADDRESS,
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData(),
        );
        return expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    });

    it('reverts if ERC20->ERC20 receives an ETH output token', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(
            sellToken.address,
            ETH_TOKEN_ADDRESS,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData(),
        );
        return expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    });

    it('reverts if ERC20->ETH receives an ETH input token', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForEth(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        return expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    });

    it('reverts if ETH->ERC20 receives an ETH output token', async () => {
        await fundProviderContractAsync(ETH_COIN_IDX);
        const call = lp.sellEthForToken(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        return expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    });

    it('emits a LiquidityProviderFill event', async () => {
        await fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(
            sellToken.address,
            buyToken.address,
            RECIPIENT,
            BUY_AMOUNT,
            encodeCurveData(),
        );
        const { logs } = await call.awaitTransactionSuccessAsync();
        verifyEventsFromLogs(
            logs,
            [
                {
                    inputToken: sellToken.address,
                    outputToken: buyToken.address,
                    inputTokenAmount: SELL_AMOUNT,
                    outputTokenAmount: BUY_AMOUNT,
                    sourceId: hexUtils.rightPad(hexUtils.toHex(Buffer.from('Curve'))),
                    sourceAddress: testCurve.address,
                    sender: taker,
                    recipient: RECIPIENT,
                },
            ],
            'LiquidityProviderFill',
        );
    });
});
