import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import {
    artifacts as multisigArtifacts,
    ZeroExGovernorContract,
    ZeroExGovernorSubmissionEventArgs,
} from '@0x/contracts-multisig';
import {
    artifacts as stakingArtifacts,
    StakingContract,
    StakingProxyContract,
    ZrxVaultContract,
} from '@0x/contracts-staking';
import { IAuthorizableContract, IOwnableContract } from '@0x/contracts-utils';
import { AbiEncoder, BigNumber, logUtils, providerUtils } from '@0x/utils';
import { LogWithDecodedArgs, SupportedProvider, TxData } from 'ethereum-types';

import { getConfigsByChainId } from './utils/configs_by_chain';
import { constants } from './utils/constants';
import { providerFactory } from './utils/provider_factory';
import { getTimelockRegistrationsByChainId } from './utils/timelocks';

async function submitAndExecuteTransactionAsync(
    governor: ZeroExGovernorContract,
    destination: string,
    data: string,
): Promise<void> {
    const { logs } = await governor
        .submitTransaction(destination, constants.ZERO_AMOUNT, data)
        .awaitTransactionSuccessAsync();
    // tslint:disable-next-line:no-unnecessary-type-assertion
    const txId = (logs[0] as LogWithDecodedArgs<ZeroExGovernorSubmissionEventArgs>).args.transactionId;
    logUtils.log(`${txId} submitted`);
    await governor.executeTransaction(txId).awaitTransactionSuccessAsync();
    logUtils.log(`${txId} executed`);
}

/**
 * Deploys all 3.0 contracts and reconfigures existing 2.0 contracts.
 * @param supportedProvider  Web3 provider instance. Your provider instance should connect to the testnet you want to deploy to.
 * @param txDefaults Default transaction values to use when deploying contracts (e.g., specify the desired contract creator with the `from` parameter).
 */
export async function runMigrationsAsync(supportedProvider: SupportedProvider, txDefaults: TxData): Promise<void> {
    const provider = providerUtils.standardizeOrThrow(supportedProvider);
    const chainId = new BigNumber(await providerUtils.getChainIdAsync(provider));
    const deployedAddresses = getContractAddressesForChainOrThrow(chainId.toNumber());
    const configs = getConfigsByChainId(chainId.toNumber());

    // NOTE: This must be deployed before running these migrations, since its address is hard coded in the
    // staking logic contract.
    const zrxVault = new ZrxVaultContract(deployedAddresses.zrxVault, provider, txDefaults);

    const stakingLogic = await StakingContract.deployFrom0xArtifactAsync(
        stakingArtifacts.Staking,
        provider,
        txDefaults,
        stakingArtifacts,
    );

    const stakingProxy = await StakingProxyContract.deployFrom0xArtifactAsync(
        stakingArtifacts.StakingProxy,
        provider,
        txDefaults,
        stakingArtifacts,
        stakingLogic.address,
    );

    const authorizableInterface = new IAuthorizableContract(constants.NULL_ADDRESS, provider, txDefaults);
    const ownableInterface = new IOwnableContract(constants.NULL_ADDRESS, provider, txDefaults);

    const customTimeLocks = getTimelockRegistrationsByChainId(chainId.toNumber());

    const governor = await ZeroExGovernorContract.deployFrom0xArtifactAsync(
        multisigArtifacts.ZeroExGovernor,
        provider,
        txDefaults,
        multisigArtifacts,
        customTimeLocks.map(timeLockInfo => timeLockInfo.functionSelector),
        customTimeLocks.map(timeLockInfo => timeLockInfo.destination),
        customTimeLocks.map(timeLockInfo => timeLockInfo.secondsTimeLocked),
        configs.zeroExGovernor.owners,
        configs.zeroExGovernor.required,
        configs.zeroExGovernor.secondsTimeLocked,
    );

    logUtils.log('Configuring ZrxVault...');
    await zrxVault.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync();
    await zrxVault.setStakingProxy(stakingProxy.address).awaitTransactionSuccessAsync();
    await zrxVault.removeAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync();
    await zrxVault.addAuthorizedAddress(governor.address).awaitTransactionSuccessAsync();
    await zrxVault.transferOwnership(governor.address).awaitTransactionSuccessAsync();
    logUtils.log('ZrxVault configured!');

    logUtils.log('Configuring StakingProxy...');
    await stakingProxy.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync();
    await stakingProxy.removeAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync();
    await stakingProxy.addAuthorizedAddress(governor.address).awaitTransactionSuccessAsync();
    await stakingProxy.transferOwnership(governor.address).awaitTransactionSuccessAsync();
    logUtils.log('StakingProxy configured!');

    logUtils.log('Transfering ownership of 2.0 contracts...');
    const oldAssetProxyOwner = new ZeroExGovernorContract(deployedAddresses.assetProxyOwner, provider, txDefaults);
    await submitAndExecuteTransactionAsync(
        oldAssetProxyOwner,
        deployedAddresses.exchangeV2, // Exchange 2.1 address
        ownableInterface.transferOwnership(governor.address).getABIEncodedTransactionData(),
    );
    await submitAndExecuteTransactionAsync(
        oldAssetProxyOwner,
        deployedAddresses.erc20Proxy,
        ownableInterface.transferOwnership(governor.address).getABIEncodedTransactionData(),
    );
    await submitAndExecuteTransactionAsync(
        oldAssetProxyOwner,
        deployedAddresses.erc721Proxy,
        ownableInterface.transferOwnership(governor.address).getABIEncodedTransactionData(),
    );
    await submitAndExecuteTransactionAsync(
        oldAssetProxyOwner,
        deployedAddresses.erc1155Proxy,
        ownableInterface.transferOwnership(governor.address).getABIEncodedTransactionData(),
    );
    await submitAndExecuteTransactionAsync(
        oldAssetProxyOwner,
        deployedAddresses.multiAssetProxy,
        ownableInterface.transferOwnership(governor.address).getABIEncodedTransactionData(),
    );
    logUtils.log('Ownership transferred!');

    const functionCalls = [
        // AssetProxy configs
        {
            destination: deployedAddresses.erc20Proxy,
            data: authorizableInterface.addAuthorizedAddress(zrxVault.address).getABIEncodedTransactionData(),
        },
    ];

    const batchTransactionEncoder = AbiEncoder.create('(bytes[],address[],uint256[])');
    const batchTransactionData = batchTransactionEncoder.encode([
        functionCalls.map(item => item.data),
        functionCalls.map(item => item.destination),
        functionCalls.map(() => constants.ZERO_AMOUNT),
    ]);
    await submitAndExecuteTransactionAsync(governor, governor.address, batchTransactionData);
}

(async () => {
    const networkId = 1;
    const rpcUrl = 'https://mainnet.infura.io/v3/';
    const provider = await providerFactory.getLedgerProviderAsync(networkId, rpcUrl);
    await runMigrationsAsync(provider, { from: '0x3b39078f2a3e1512eecc8d6792fdc7f33e1cd2cf', gasPrice: 10000000001 });
})().catch(err => {
    logUtils.log(err);
    process.exit(1);
});
