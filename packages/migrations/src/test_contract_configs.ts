#!/usr/bin/env node
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ERC20ProxyContract } from '@0x/contracts-asset-proxy';
import { ZeroExGovernorContract } from '@0x/contracts-multisig';
import { StakingContract, StakingProxyContract, ZrxVaultContract } from '@0x/contracts-staking';
import { EmptyWalletSubprovider, RPCSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { logUtils, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { SupportedProvider } from 'ethereum-types';

import { getConfigsByChainId } from './utils/configs_by_chain';
import { getTimelockRegistrationsByChainId } from './utils/timelocks';

// NOTE: add your own Infura Project ID to RPC urls before running
const INFURA_PROJECT_ID = '';

const networkIdToRpcUrl = {
    1: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
    3: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
    4: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
    42: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
};

// tslint:disable:custom-no-magic-numbers
async function testContractConfigsAsync(provider: SupportedProvider): Promise<void> {
    const web3Wrapper = new Web3Wrapper(provider);
    const chainId = await web3Wrapper.getChainIdAsync();
    const addresses = getContractAddressesForChainOrThrow(chainId);
    const configs = getConfigsByChainId(chainId);

    function warnIfMismatch(actual: any, expected: any, message: string): void {
        if (actual !== expected) {
            logUtils.warn(`${message}: actual: ${actual}, expected: ${expected}, chainId: ${chainId}`);
        }
    }

    const erc20Proxy = new ERC20ProxyContract(addresses.erc20Proxy, provider);
    const erc20BridgeProxy = new ERC20ProxyContract(addresses.erc20BridgeProxy, provider);
    const governor = new ZeroExGovernorContract(addresses.zeroExGovernor, provider);
    const stakingProxy = new StakingProxyContract(addresses.stakingProxy, provider);
    const stakingContract = new StakingContract(addresses.stakingProxy, provider);
    const zrxVault = new ZrxVaultContract(addresses.zrxVault, provider);

    async function verifyAssetProxyConfigsAsync(): Promise<void> {
        // Verify ERC20Proxy configs
        const erc20ProxyOwner = await erc20Proxy.owner().callAsync();
        warnIfMismatch(erc20ProxyOwner, governor.address, 'Unexpected ERC20Proxy owner');

        const erc20AuthorizedAddresses = await erc20Proxy.getAuthorizedAddresses().callAsync();
        warnIfMismatch(erc20AuthorizedAddresses.length, 4, 'Unexpected number of authorized addresses in ERC20Proxy');

        const isZrxVaultAuthorizedInER20Proxy = await erc20Proxy.authorized(zrxVault.address).callAsync();
        warnIfMismatch(isZrxVaultAuthorizedInER20Proxy, true, 'ZrxVault not authorized in ERC20Proxy');

        // Verify ERC20BridgeProxy configs
        const erc20BridgeProxyOwner = await erc20BridgeProxy.owner().callAsync();
        warnIfMismatch(erc20BridgeProxyOwner, governor.address, 'Unexpected ERC20BridgeProxy owner');

        const erc20BridgeAuthorizedAddresses = await erc20BridgeProxy.getAuthorizedAddresses().callAsync();
        warnIfMismatch(
            erc20BridgeAuthorizedAddresses.length,
            2,
            'Unexpected number of authorized addresses in ERC20BridgeProxy',
        );
    }

    async function verifyStakingConfigsAsync(): Promise<void> {
        const stakingLogicAddress = await stakingProxy.stakingContract().callAsync();
        warnIfMismatch(stakingLogicAddress, addresses.staking, 'Unexpected Staking contract attached to StakingProxy');

        const isExchangeRegistered = await stakingContract.validExchanges(addresses.exchange).callAsync();
        warnIfMismatch(isExchangeRegistered, true, 'Exchange not registered in StakingProxy');

        const zrxVaultAddress = await stakingContract.getZrxVault().callAsync();
        warnIfMismatch(zrxVaultAddress, addresses.zrxVault, 'Unexpected ZrxVault set in StakingProxy');

        const wethAddress = await stakingContract.getWethContract().callAsync();
        warnIfMismatch(wethAddress, addresses.etherToken, 'Unexpected WETH contract set in StakingProxy');

        const stakingProxyOwner = await stakingProxy.owner().callAsync();
        warnIfMismatch(stakingProxyOwner, addresses.zeroExGovernor, 'Unexpected StakingProxy owner');

        const stakingProxyAuthorizedAddresses = await stakingProxy.getAuthorizedAddresses().callAsync();
        warnIfMismatch(
            stakingProxyAuthorizedAddresses.length,
            1,
            'Unexpected number of authorized addresses in StakingProxy',
        );
        const isGovernorAuthorizedInStakingProxy = await stakingProxy.authorized(addresses.zeroExGovernor).callAsync();
        warnIfMismatch(isGovernorAuthorizedInStakingProxy, true, 'ZeroExGovernor not authorized in StakingProxy');

        const zrxVaultOwner = await zrxVault.owner().callAsync();
        warnIfMismatch(zrxVaultOwner, addresses.zeroExGovernor, 'Unexpected ZrxVault owner');

        const zrxVaultAuthorizedAddresses = await zrxVault.getAuthorizedAddresses().callAsync();
        warnIfMismatch(zrxVaultAuthorizedAddresses.length, 1, 'Unexpected number of authorized addresses in ZrxVault');

        const isGovernorAuthorizedInZrxVault = await zrxVault.authorized(addresses.zeroExGovernor).callAsync();
        warnIfMismatch(isGovernorAuthorizedInZrxVault, true, 'ZeroExGovernor not authorized in ZrxVault');

        const zrxAssetProxy = await zrxVault.zrxAssetProxy().callAsync();
        warnIfMismatch(zrxAssetProxy, addresses.erc20Proxy, 'Unexpected ERC20Proxy set in ZrxVault');

        const zrxVaultStakingProxy = await zrxVault.stakingProxyAddress().callAsync();
        warnIfMismatch(zrxVaultStakingProxy, addresses.stakingProxy, 'Unexpected StakingProxy set in ZrxVault');

        const params = await stakingContract.getParams().callAsync();
        warnIfMismatch(
            params[0].toNumber(),
            configs.staking.epochDurationInSeconds.toNumber(),
            'Unexpected epoch duration in StakingProxy',
        );
        warnIfMismatch(
            params[1].toString(),
            configs.staking.rewardDelegatedStakeWeight.toString(),
            'Unexpected delegated stake weight in StakingProxy',
        );
        warnIfMismatch(
            params[2].toNumber(),
            configs.staking.minimumPoolStake.toNumber(),
            'Unexpected minimum pool stake in StakingProxy',
        );
        warnIfMismatch(
            params[3].toString(),
            configs.staking.cobbDouglasAlphaNumerator.toString(),
            'Unexpected alpha numerator in StakingProxy',
        );
        warnIfMismatch(
            params[4].toString(),
            configs.staking.cobbDouglasAlphaDenominator.toString(),
            'Unexpected alpha denominator in StakingProxy',
        );
    }

    async function verifyZeroExGovernorConfigsAsync(): Promise<void> {
        const timelockRegistrations = getTimelockRegistrationsByChainId(chainId);
        for (const timelockRegistration of timelockRegistrations) {
            const actualRegistration = await governor
                .functionCallTimeLocks(timelockRegistration.functionSelector, timelockRegistration.destination)
                .callAsync();
            warnIfMismatch(
                actualRegistration[0],
                true,
                `Function ${timelockRegistration.functionSelector} at address ${timelockRegistration.destination} not registered in ZeroExGovernor`,
            );
            warnIfMismatch(
                actualRegistration[1].toNumber(),
                timelockRegistration.secondsTimeLocked.toNumber(),
                `Timelock for function ${timelockRegistration.functionSelector} at address ${timelockRegistration.destination} in ZeroExGovernor`,
            );
        }

        const owners = await governor.getOwners().callAsync();
        warnIfMismatch(
            owners.length,
            configs.zeroExGovernor.owners.length,
            'Unexpected number of owners in ZeroExGovernor',
        );
        owners.forEach((owner, i) => {
            warnIfMismatch(
                owners[i],
                configs.zeroExGovernor.owners[i],
                `Unexpected owner in ZeroExGovernor at index ${i}`,
            );
        });

        const secondsTimeLocked = await governor.secondsTimeLocked().callAsync();
        warnIfMismatch(
            secondsTimeLocked.toNumber(),
            configs.zeroExGovernor.secondsTimeLocked.toNumber(),
            'Unexpected secondsTimeLocked in ZeroExGovernor',
        );

        const confirmationsRequired = await governor.required().callAsync();
        warnIfMismatch(
            confirmationsRequired.toNumber(),
            configs.zeroExGovernor.required.toNumber(),
            'Unexpected number of confirmations required in ZeroExGovernor',
        );
    }

    await verifyStakingConfigsAsync();
    await verifyAssetProxyConfigsAsync();
    await verifyZeroExGovernorConfigsAsync();
}

(async () => {
    for (const rpcUrl of Object.values(networkIdToRpcUrl)) {
        const provider = new Web3ProviderEngine();
        provider.addProvider(new EmptyWalletSubprovider());
        provider.addProvider(new RPCSubprovider(rpcUrl));
        providerUtils.startProviderEngine(provider);
        await testContractConfigsAsync(provider);
    }
})().catch(err => {
    logUtils.log(err);
    process.exit(1);
});
