import { blockchainTests, constants, expect, getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { encodePositiveSlippageFeeTransformerData } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';

import { artifacts } from '../artifacts';
import {
    PositiveSlippageFeeTransformerContract,
    TestMintableERC20TokenContract,
    TestTransformerHostContract,
} from '../wrappers';

const { ZERO_AMOUNT } = constants;

blockchainTests.resets('PositiveSlippageFeeTransformer', env => {
    const recipient = randomAddress();
    let caller: string;
    let token: TestMintableERC20TokenContract;
    let transformer: PositiveSlippageFeeTransformerContract;
    let host: TestTransformerHostContract;

    before(async () => {
        [caller] = await env.getAccountAddressesAsync();
        token = await TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
            artifacts.TestMintableERC20Token,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        transformer = await PositiveSlippageFeeTransformerContract.deployFrom0xArtifactAsync(
            artifacts.PositiveSlippageFeeTransformer,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        host = await TestTransformerHostContract.deployFrom0xArtifactAsync(
            artifacts.TestTransformerHost,
            env.provider,
            { ...env.txDefaults, from: caller },
            artifacts,
        );
    });

    interface Balances {
        ethBalance: BigNumber;
        tokenBalance: BigNumber;
    }

    async function getBalancesAsync(owner: string): Promise<Balances> {
        return {
            ethBalance: await env.web3Wrapper.getBalanceInWeiAsync(owner),
            tokenBalance: await token.balanceOf(owner).callAsync(),
        };
    }

    async function mintHostTokensAsync(amount: BigNumber): Promise<void> {
        await token.mint(host.address, amount).awaitTransactionSuccessAsync();
    }

    it('does not transfer positive slippage fees when bestCaseAmount is equal to amount', async () => {
        const amount = getRandomInteger(1, '1e18');
        const data = encodePositiveSlippageFeeTransformerData({
            token: token.address,
            bestCaseAmount: amount,
            recipient,
        });
        await mintHostTokensAsync(amount);
        const beforeBalanceHost = await getBalancesAsync(host.address);
        const beforeBalanceRecipient = await getBalancesAsync(recipient);
        await host
            .rawExecuteTransform(transformer.address, {
                data,
                sender: randomAddress(),
                taker: randomAddress(),
            })
            .awaitTransactionSuccessAsync();
        expect(await getBalancesAsync(host.address)).to.deep.eq(beforeBalanceHost);
        expect(await getBalancesAsync(recipient)).to.deep.eq(beforeBalanceRecipient);
    });

    it('does not transfer positive slippage fees when bestCaseAmount is higher than amount', async () => {
        const amount = getRandomInteger(1, '1e18');
        const bestCaseAmount = amount.times(1.1).decimalPlaces(0, BigNumber.ROUND_FLOOR);
        const data = encodePositiveSlippageFeeTransformerData({
            token: token.address,
            bestCaseAmount,
            recipient,
        });
        await mintHostTokensAsync(amount);
        const beforeBalanceHost = await getBalancesAsync(host.address);
        const beforeBalanceRecipient = await getBalancesAsync(recipient);
        await host
            .rawExecuteTransform(transformer.address, {
                data,
                sender: randomAddress(),
                taker: randomAddress(),
            })
            .awaitTransactionSuccessAsync();
        expect(await getBalancesAsync(host.address)).to.deep.eq(beforeBalanceHost);
        expect(await getBalancesAsync(recipient)).to.deep.eq(beforeBalanceRecipient);
    });

    it('send positive slippage fee to recipient when bestCaseAmount is lower than amount', async () => {
        const amount = getRandomInteger(1, '1e18');
        const bestCaseAmount = amount.times(0.95).decimalPlaces(0, BigNumber.ROUND_FLOOR);
        const data = encodePositiveSlippageFeeTransformerData({
            token: token.address,
            bestCaseAmount,
            recipient,
        });
        await mintHostTokensAsync(amount);
        await host
            .rawExecuteTransform(transformer.address, {
                data,
                sender: randomAddress(),
                taker: randomAddress(),
            })
            .awaitTransactionSuccessAsync();
        expect(await getBalancesAsync(host.address)).to.deep.eq({
            tokenBalance: bestCaseAmount,
            ethBalance: ZERO_AMOUNT,
        });
        expect(await getBalancesAsync(recipient)).to.deep.eq({
            tokenBalance: amount.minus(bestCaseAmount), // positive slippage
            ethBalance: ZERO_AMOUNT,
        });
    });
});
