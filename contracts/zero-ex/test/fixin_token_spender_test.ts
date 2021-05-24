import {
    blockchainTests,
    expect,
    getRandomInteger,
    randomAddress,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import { BigNumber, hexUtils, RawRevertError, StringRevertError } from '@0x/utils';

import { artifacts } from './artifacts';
import {
    TestFixinTokenSpenderContract,
    TestTokenSpenderERC20TokenContract,
    TestTokenSpenderERC20TokenEvents,
} from './wrappers';

blockchainTests.resets('FixinTokenSpender', env => {
    let tokenSpender: TestFixinTokenSpenderContract;
    let token: TestTokenSpenderERC20TokenContract;
    let greedyToken: TestTokenSpenderERC20TokenContract;

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

        tokenSpender = await TestFixinTokenSpenderContract.deployFrom0xArtifactAsync(
            artifacts.TestFixinTokenSpender,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    });

    describe('transferERC20TokensFrom()', () => {
        const EMPTY_RETURN_AMOUNT = 1337;
        const FALSE_RETURN_AMOUNT = 1338;
        const REVERT_RETURN_AMOUNT = 1339;
        const EXTRA_RETURN_TRUE_AMOUNT = 1341;
        const EXTRA_RETURN_FALSE_AMOUNT = 1342;

        it('transferERC20TokensFrom() successfully calls compliant ERC20 token', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(123456);
            const receipt = await tokenSpender
                .transferERC20TokensFrom(token.address, tokenFrom, tokenTo, tokenAmount)
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

        it('transferERC20TokensFrom() successfully calls non-compliant ERC20 token', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(EMPTY_RETURN_AMOUNT);
            const receipt = await tokenSpender
                .transferERC20TokensFrom(token.address, tokenFrom, tokenTo, tokenAmount)
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

        it('transferERC20TokensFrom() reverts if ERC20 token reverts', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(REVERT_RETURN_AMOUNT);
            const tx = tokenSpender
                .transferERC20TokensFrom(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            const expectedError = new StringRevertError('TestTokenSpenderERC20Token/Revert');
            return expect(tx).to.revertWith(expectedError);
        });

        it('transferERC20TokensFrom() reverts if ERC20 token returns false', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(FALSE_RETURN_AMOUNT);
            const tx = tokenSpender
                .transferERC20TokensFrom(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith(new RawRevertError(hexUtils.leftPad(0)));
        });

        it('transferERC20TokensFrom() allows extra data after true', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(EXTRA_RETURN_TRUE_AMOUNT);

            const receipt = await tokenSpender
                .transferERC20TokensFrom(token.address, tokenFrom, tokenTo, tokenAmount)
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

        it("transferERC20TokensFrom() reverts when there's extra data after false", async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(EXTRA_RETURN_FALSE_AMOUNT);

            const tx = tokenSpender
                .transferERC20TokensFrom(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith(new RawRevertError(hexUtils.leftPad(EXTRA_RETURN_FALSE_AMOUNT, 64)));
        });

        it('transferERC20TokensFrom() cannot call self', async () => {
            const tokenFrom = randomAddress();
            const tokenTo = randomAddress();
            const tokenAmount = new BigNumber(123456);

            const tx = tokenSpender
                .transferERC20TokensFrom(tokenSpender.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('FixinTokenSpender/CANNOT_INVOKE_SELF');
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
