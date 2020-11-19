import {
    blockchainTests,
    expect,
    getRandomInteger,
    randomAddress,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import { BigNumber, hexUtils, StringRevertError, ZeroExRevertErrors } from '@0x/utils';

import { artifacts } from './artifacts';
import {
    TestFixinTokenSpenderContract,
    TestFixinTokenSpenderEvents,
    TestTokenSpenderERC20TokenContract,
    TestTokenSpenderERC20TokenEvents,
} from './wrappers';

blockchainTests.resets('FixinTokenSpender', env => {
    let tokenSpender: TestFixinTokenSpenderContract;
    let token: TestTokenSpenderERC20TokenContract;
    let greedyToken: TestTokenSpenderERC20TokenContract;
    let greedyTokensBloomFilter: string;

    before(async () => {
        token = await TestTokenSpenderERC20TokenContract.deployFrom0xArtifactAsync(
            artifacts.TestTokenSpenderERC20Token,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        greedyToken = await TestTokenSpenderERC20TokenContract.deployFrom0xArtifactAsync(
            artifacts.TestTokenSpenderERC20Token,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        await greedyToken.setGreedyRevert(true).awaitTransactionSuccessAsync();

        greedyTokensBloomFilter = hexUtils.hash(hexUtils.leftPad(greedyToken.address));

        tokenSpender = await TestFixinTokenSpenderContract.deployFrom0xArtifactAsync(
            artifacts.TestFixinTokenSpender,
            env.provider,
            env.txDefaults,
            artifacts,
            greedyTokensBloomFilter,
        );
    });

    describe('transferERC20Tokens()', () => {
        const EMPTY_RETURN_AMOUNT = 1337;
        const FALSE_RETURN_AMOUNT = 1338;
        const REVERT_RETURN_AMOUNT = 1339;
        const TRIGGER_FALLBACK_SUCCESS_AMOUNT = 1340;
        const EXTRA_RETURN_TRUE_AMOUNT = 1341;
        const EXTRA_RETURN_FALSE_AMOUNT = 1342;

        it('transferERC20Tokens() successfully calls compliant ERC20 token', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(123456);
            const receipt = await tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        sender: tokenSpender.address,
                        from: tokenFrom,
                        to: tokenTo,
                        amount: tokenAmount,
                    },
                ],
                TestTokenSpenderERC20TokenEvents.TransferFromCalled,
            );
        });

        it('transferERC20Tokens() successfully calls non-compliant ERC20 token', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(EMPTY_RETURN_AMOUNT);
            const receipt = await tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        sender: tokenSpender.address,
                        from: tokenFrom,
                        to: tokenTo,
                        amount: tokenAmount,
                    },
                ],
                TestTokenSpenderERC20TokenEvents.TransferFromCalled,
            );
        });

        it('transferERC20Tokens() reverts if ERC20 token reverts', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(REVERT_RETURN_AMOUNT);
            const tx = tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            const expectedError = new ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(
                token.address,
                tokenFrom,
                tokenTo,
                tokenAmount,
                new StringRevertError('TestTokenSpenderERC20Token/Revert').encode(),
            );
            return expect(tx).to.revertWith(expectedError);
        });

        it('transferERC20Tokens() reverts if ERC20 token returns false', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(FALSE_RETURN_AMOUNT);
            const tx = tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith(
                new ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(
                    token.address,
                    tokenFrom,
                    tokenTo,
                    tokenAmount,
                    hexUtils.leftPad(0),
                ),
            );
        });

        it('transferERC20Tokens() falls back successfully to TokenSpender._spendERC20Tokens()', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(TRIGGER_FALLBACK_SUCCESS_AMOUNT);
            const receipt = await tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        token: token.address,
                        owner: tokenFrom,
                        to: tokenTo,
                        amount: tokenAmount,
                    },
                ],
                TestFixinTokenSpenderEvents.FallbackCalled,
            );
        });

        it('transferERC20Tokens() allows extra data after true', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(EXTRA_RETURN_TRUE_AMOUNT);

            const receipt = await tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        sender: tokenSpender.address,
                        from: tokenFrom,
                        to: tokenTo,
                        amount: tokenAmount,
                    },
                ],
                TestTokenSpenderERC20TokenEvents.TransferFromCalled,
            );
        });

        it("transferERC20Tokens() reverts when there's extra data after false", async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(EXTRA_RETURN_FALSE_AMOUNT);

            const tx = tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith(
                new ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(
                    token.address,
                    tokenFrom,
                    tokenTo,
                    tokenAmount,
                    hexUtils.leftPad(EXTRA_RETURN_FALSE_AMOUNT, 64),
                ),
            );
        });

        it('transferERC20Tokens() cannot call self', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(123456);

            const tx = tokenSpender
                .transferERC20Tokens(tokenSpender.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('FixinTokenSpender/CANNOT_INVOKE_SELF');
        });

        it('calls transferFrom() directly for a greedy token with allowance', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(123456);
            await greedyToken.approveAs(tokenFrom, tokenSpender.address, tokenAmount).awaitTransactionSuccessAsync();

            const receipt = await tokenSpender
                .transferERC20Tokens(greedyToken.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            // Because there is an allowance set, we will call transferFrom()
            // directly, which succeds and emits an event.
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        sender: tokenSpender.address,
                        from: tokenFrom,
                        to: tokenTo,
                        amount: tokenAmount,
                    },
                ], // No events.
                TestTokenSpenderERC20TokenEvents.TransferFromCalled,
            );
        });

        it('calls only the fallback for a greedy token with no allowance', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(TRIGGER_FALLBACK_SUCCESS_AMOUNT);

            const receipt = await tokenSpender
                .transferERC20Tokens(greedyToken.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            // Because this is a greedy token and there is no allowance set, transferFrom()
            // will not be called before hitting the fallback, which only emits an event
            // in the test contract.
            verifyEventsFromLogs(
                receipt.logs,
                [], // No events.
                TestTokenSpenderERC20TokenEvents.TransferFromCalled,
            );
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        token: greedyToken.address,
                        owner: tokenFrom,
                        to: tokenTo,
                        amount: tokenAmount,
                    },
                ],
                TestFixinTokenSpenderEvents.FallbackCalled,
            );
        });
    });

    describe('isTokenPossiblyGreedy()', () => {
        it('returns true for greedy token', async () => {
            const isGreedy = await tokenSpender.isTokenPossiblyGreedy(greedyToken.address).callAsync();
            expect(isGreedy).to.eq(true);
        });

        it('returns false for non-greedy token', async () => {
            const isGreedy = await tokenSpender.isTokenPossiblyGreedy(token.address).callAsync();
            expect(isGreedy).to.eq(false);
        });
    });

    describe('getSpendableERC20BalanceOf()', () => {
        it("returns the minimum of the owner's balance and allowance", async () => {
            const balance = getRandomInteger(1, '1e18');
            const allowance = getRandomInteger(1, '1e18');
            const tokenOwner = randomAddress();
            await token
                .setBalanceAndAllowanceOf(tokenOwner, balance, tokenSpender.address, allowance)
                .awaitTransactionSuccessAsync();
            const spendableBalance = await tokenSpender
                .getSpendableERC20BalanceOf(token.address, tokenOwner)
                .callAsync();
            expect(spendableBalance).to.bignumber.eq(BigNumber.min(balance, allowance));
        });
    });
});
