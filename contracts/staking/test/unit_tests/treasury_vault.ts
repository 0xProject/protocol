import { ERC20Wrapper } from '@0x/contracts-asset-proxy';
import { blockchainTests, constants, expect } from '@0x/contracts-test-utils';
import { assetDataUtils } from '@0x/order-utils';
import { AuthorizableRevertErrors, BigNumber } from '@0x/utils';

import { artifacts } from '../artifacts';
import { TreasuryVaultContract } from '../wrappers';

blockchainTests.resets('ZrxVault unit tests', env => {
    let accounts: string[];
    let owner: string;
    let nonOwnerAddresses: string[];
    let erc20Wrapper: ERC20Wrapper;
    let zrxTreasuryVault: TreasuryVaultContract;
    let zrxAssetData: string;

    before(async () => {
        // create accounts
        accounts = await env.getAccountAddressesAsync();
        [owner, ...nonOwnerAddresses] = accounts;

        // set up ERC20Wrapper
        erc20Wrapper = new ERC20Wrapper(env.provider, accounts, owner);
        // deploy erc20 proxy
        await erc20Wrapper.deployProxyAsync();
        // deploy zrx token
        const [zrxTokenContract] = await erc20Wrapper.deployDummyTokensAsync(1, constants.DUMMY_TOKEN_DECIMALS);
        zrxAssetData = assetDataUtils.encodeERC20AssetData(zrxTokenContract.address);

        zrxTreasuryVault = await TreasuryVaultContract.deployFrom0xArtifactAsync(
            artifacts.TreasuryVault,
            env.provider,
            env.txDefaults,
            artifacts,
            nonOwnerAddresses[1],
            zrxTokenContract.address,
        );

        await erc20Wrapper.setBalanceAsync(zrxTreasuryVault.address, zrxAssetData, new BigNumber(1000));
    });

    describe('ZRX Treasury Vault', async () => {
        it('Should allow the governor to pay someone', async () => {
            const paymentAmount = new BigNumber(10);
            await zrxTreasuryVault
                .sendZRX(nonOwnerAddresses[0], paymentAmount)
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            const newBalance = await erc20Wrapper.getBalanceAsync(nonOwnerAddresses[0], zrxAssetData);
            expect(newBalance.toNumber()).to.be.eq(10);
        });

        it('Should block a non-governor from paying someone', async () => {
            const tx = zrxTreasuryVault
                .sendZRX(nonOwnerAddresses[0], new BigNumber(10))
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[2] });
            expect(tx).to.revertWith('Sender not authorized');
        });

        it('Should allow the governor to pay someone optimistically', async () => {
            const paymentAmount = new BigNumber(10);
            const paymentTime = new BigNumber(1608653547);
            await zrxTreasuryVault
                .optimisticallySendZRX(nonOwnerAddresses[0], paymentAmount, paymentTime)
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            const pendingPayment = await zrxTreasuryVault.pendingPayments(nonOwnerAddresses[0]).callAsync();
            expect(pendingPayment[0].toNumber()).to.be.eq(1608653547);
            expect(pendingPayment[1].toNumber()).to.be.eq(10);
        });

        it("Should allow the governor to cancel someone's payment", async () => {
            const paymentAmount = new BigNumber(10);
            const paymentTime = new BigNumber(1608653547);
            await zrxTreasuryVault
                .optimisticallySendZRX(nonOwnerAddresses[0], paymentAmount, paymentTime)
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            let pendingPayment = await zrxTreasuryVault.pendingPayments(nonOwnerAddresses[0]).callAsync();
            expect(pendingPayment[0].toNumber()).to.be.eq(1608653547);
            expect(pendingPayment[1].toNumber()).to.be.eq(10);
            await zrxTreasuryVault
                .cancelPayment(nonOwnerAddresses[0])
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            pendingPayment = await zrxTreasuryVault.pendingPayments(nonOwnerAddresses[0]).callAsync();
            expect(pendingPayment[0].toNumber()).to.be.eq(0);
            expect(pendingPayment[1].toNumber()).to.be.eq(0);
        });

        it('Should allow someone to claim a payment after time has expired', async () => {
            const paymentAmount = new BigNumber(10);
            const paymentTime = new BigNumber(1);
            await zrxTreasuryVault
                .optimisticallySendZRX(nonOwnerAddresses[0], paymentAmount, paymentTime)
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            await zrxTreasuryVault.claimPayment().awaitTransactionSuccessAsync({ from: nonOwnerAddresses[0] });
            const pendingPayment = await zrxTreasuryVault.pendingPayments(nonOwnerAddresses[0]).callAsync();
            expect(pendingPayment[0].toNumber()).to.be.eq(0);
            expect(pendingPayment[1].toNumber()).to.be.eq(0);
            const newBalance = await erc20Wrapper.getBalanceAsync(nonOwnerAddresses[0], zrxAssetData);
            expect(newBalance.toNumber()).to.be.eq(10);
        });

        it('Someone should not be able to claim before time expired', async () => {
            const paymentAmount = new BigNumber(10);
            // 2200 AD in unix seconds
            const paymentTime = new BigNumber(7258118400);
            await zrxTreasuryVault
                .optimisticallySendZRX(nonOwnerAddresses[0], paymentAmount, paymentTime)
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            const tx = zrxTreasuryVault.claimPayment().awaitTransactionSuccessAsync({ from: nonOwnerAddresses[0] });
            expect(tx).to.revertWith('Not claimable yet');
        });

        it('Should block a non governor from paying someone optimistically', async () => {
            const paymentAmount = new BigNumber(10);
            const paymentTime = new BigNumber(1608653547);
            const tx = zrxTreasuryVault
                .optimisticallySendZRX(nonOwnerAddresses[0], paymentAmount, paymentTime)
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[2] });
            expect(tx).to.revertWith('Sender not authorized');
        });

        it('Should allow the governor to change the governor', async () => {
            // Note the owner is the governor
            await zrxTreasuryVault
                .changeGovernor(nonOwnerAddresses[0])
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            const gov = await zrxTreasuryVault.governor().callAsync();
            expect(gov).to.be.eq(nonOwnerAddresses[0]);
        });

        it('Should allow the owner to change the governor', async () => {
            // Note the implicit msg.sender is the 'owner'
            await zrxTreasuryVault.changeGovernor(nonOwnerAddresses[0]).awaitTransactionSuccessAsync({ from: owner });
            const gov = await zrxTreasuryVault.governor().callAsync();
            expect(gov).to.be.eq(nonOwnerAddresses[0]);
        });

        it('Should block a non-authorized address from changing the governor', async () => {
            // Note the implicit msg.sender is the 'owner'
            const tx = zrxTreasuryVault
                .changeGovernor(nonOwnerAddresses[1])
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[2] });
            expect(tx).to.revertWith('Sender not authorized');
        });

        it('Should allow the owner to reclaim the funds', async () => {
            // The owner is the default sender
            await zrxTreasuryVault.reclaimZRX(nonOwnerAddresses[0]).awaitTransactionSuccessAsync({ from: owner });
            const newBalance = await erc20Wrapper.getBalanceAsync(nonOwnerAddresses[0], zrxAssetData);
            expect(newBalance.toNumber()).to.be.eq(1000);
        });

        it('Should block an non owner from reclaiming funds', async () => {
            // The owner is the default sender
            const tx = zrxTreasuryVault
                .reclaimZRX(nonOwnerAddresses[0])
                .awaitTransactionSuccessAsync({ from: nonOwnerAddresses[1] });
            expect(tx).to.revertWith(new AuthorizableRevertErrors.SenderNotAuthorizedError(nonOwnerAddresses[1]));
        });
    });
});
