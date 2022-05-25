import { ChainId, ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { artifacts as assetProxyArtifacts, ERC20ProxyContract } from '@0x/contracts-asset-proxy';
import { artifacts as erc20Artifacts, DummyERC20TokenContract, WETH9Contract } from '@0x/contracts-erc20';
import {
    artifacts as stakingArtifacts,
    StakingProxyContract,
    TestStakingContract,
    ZrxVaultContract,
} from '@0x/contracts-staking';
import {
    AffiliateFeeTransformerContract,
    artifacts as exchangeProxyArtifacts,
    EthereumBridgeAdapterContract,
    FillQuoteTransformerContract,
    fullMigrateAsync as fullMigrateExchangeProxyAsync,
    PayTakerTransformerContract,
    PositiveSlippageFeeTransformerContract,
    WethTransformerContract,
} from '@0x/contracts-zero-ex';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { SupportedProvider, TxData } from 'ethereum-types';
import { bufferToHex, rlphash } from 'ethereumjs-util';

import { constants } from './utils/constants';
import { erc20TokenInfo } from './utils/token_info';

const allArtifacts = {
    ...assetProxyArtifacts,
    ...stakingArtifacts,
    ...exchangeProxyArtifacts,
    ...assetProxyArtifacts,
};

const { NULL_ADDRESS } = constants;

// tslint:disable:custom-no-magic-numbers

function getDeploymentNonce(deployer: string, address: string): number {
    for (let i = 0; i < 10000; i++) {
        const candidate = bufferToHex(rlphash([deployer, i]).slice(12));
        if (candidate.toLowerCase() === address.toLowerCase()) {
            return i;
        }
    }
    throw new Error(`Exhausted all attempts to find ${address} deployed by ${deployer}`);
}

async function deployAtAddressAsync<T>(
    cb: () => Promise<T>,
    provider: SupportedProvider,
    txDefaults: TxData,
    wantedAddress: string,
): Promise<T> {
    await untilWantedAddressAsync(wantedAddress, provider, txDefaults);
    return cb();
}

/**
 * Increases addresses nonce until the deployment of a contract would occur at the wanted address.
 */
async function untilWantedAddressAsync(
    wantedAddress: string,
    provider: SupportedProvider,
    txDefaults: TxData,
    offset: number = 0,
): Promise<void> {
    const web3Wrapper = new Web3Wrapper(provider);
    const from = txDefaults.from;
    const currentNonce = await web3Wrapper.getAccountNonceAsync(from);
    const wantedNonce = getDeploymentNonce(from, wantedAddress);

    if (currentNonce > wantedNonce) {
        throw new Error(`Current nonce is ${currentNonce} but wanted nonce is ${wantedNonce}`);
    }
    for (let i = 0; i < wantedNonce - currentNonce + offset; i++) {
        await web3Wrapper.sendTransactionAsync({ from, to: from, value: new BigNumber(0) });
    }
}
/**
 * Creates and deploys all the contracts that are required for the latest
 * version of the 0x protocol.
 * @param supportedProvider  Web3 provider instance. Your provider instance should connect to the testnet you want to deploy to.
 * @param txDefaults Default transaction values to use when deploying contracts (e.g., specify the desired contract creator with the `from` parameter).
 * @returns The addresses of the contracts that were deployed.
 */
export async function runMigrationsAsync(
    supportedProvider: SupportedProvider,
    txDefaults: TxData,
): Promise<ContractAddresses> {
    const provider = providerUtils.standardizeOrThrow(supportedProvider);
    const expectedAddresses = getContractAddressesForChainOrThrow(ChainId.Ganache);

    const erc20Proxy = await deployAtAddressAsync(
        () =>
            ERC20ProxyContract.deployFrom0xArtifactAsync(
                assetProxyArtifacts.ERC20Proxy,
                provider,
                txDefaults,
                allArtifacts,
            ),
        provider,
        txDefaults,
        expectedAddresses.erc20Proxy,
    );

    // ZRX
    const zrxToken = await deployAtAddressAsync(
        () =>
            DummyERC20TokenContract.deployFrom0xArtifactAsync(
                erc20Artifacts.DummyERC20Token,
                provider,
                txDefaults,
                allArtifacts,
                '0x Protocol Token',
                'ZRX',
                new BigNumber(18),
                new BigNumber(1000000000000000000000000000),
            ),
        provider,
        txDefaults,
        expectedAddresses.zrxToken,
    );

    // Ether token
    const etherToken = await deployAtAddressAsync(
        () => WETH9Contract.deployFrom0xArtifactAsync(erc20Artifacts.WETH9, provider, txDefaults, allArtifacts),
        provider,
        txDefaults,
        expectedAddresses.etherToken,
    );

    // Dummy ERC20 tokens
    for (const token of erc20TokenInfo) {
        const totalSupply = new BigNumber(1000000000000000000000000000);
        // tslint:disable-next-line:no-unused-variable
        const dummyErc20Token = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            provider,
            txDefaults,
            allArtifacts,
            token.name,
            token.symbol,
            token.decimals,
            totalSupply,
        );
    }

    const zrxProxy = erc20Proxy.address;
    const zrxVault = await deployAtAddressAsync(
        () =>
            ZrxVaultContract.deployFrom0xArtifactAsync(
                stakingArtifacts.ZrxVault,
                provider,
                txDefaults,
                allArtifacts,
                zrxProxy,
                zrxToken.address,
            ),
        provider,
        txDefaults,
        expectedAddresses.zrxVault,
    );

    // Note we use TestStakingContract as the deployed bytecode of a StakingContract
    // has the tokens hardcoded
    const stakingLogic = await deployAtAddressAsync(
        () =>
            TestStakingContract.deployFrom0xArtifactAsync(
                stakingArtifacts.TestStaking,
                provider,
                txDefaults,
                allArtifacts,
                etherToken.address,
                zrxVault.address,
            ),
        provider,
        txDefaults,
        expectedAddresses.staking,
    );

    const stakingProxy = await deployAtAddressAsync(
        () =>
            StakingProxyContract.deployFrom0xArtifactAsync(
                stakingArtifacts.StakingProxy,
                provider,
                txDefaults,
                allArtifacts,
                stakingLogic.address,
            ),
        provider,
        txDefaults,
        expectedAddresses.stakingProxy,
    );

    await erc20Proxy.addAuthorizedAddress(zrxVault.address).awaitTransactionSuccessAsync(txDefaults);

    // Reference the Proxy as the StakingContract for setup
    await new TestStakingContract(stakingProxy.address, provider, txDefaults);
    await stakingProxy.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync(txDefaults);

    await zrxVault.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync(txDefaults);
    await zrxVault.setStakingProxy(stakingProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await stakingLogic.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync(txDefaults);

    // Exchange Proxy //////////////////////////////////////////////////////////

    const bridgeAdapter = await EthereumBridgeAdapterContract.deployFrom0xArtifactAsync(
        exchangeProxyArtifacts.EthereumBridgeAdapter,
        provider,
        txDefaults,
        allArtifacts,
        etherToken.address,
    );

    // HACK: Full migration first deploys a Migrator
    await untilWantedAddressAsync(expectedAddresses.exchangeProxy, provider, txDefaults, -1);

    const exchangeProxy = await fullMigrateExchangeProxyAsync(txDefaults.from, provider, txDefaults);
    const exchangeProxyFlashWalletAddress = await exchangeProxy.getTransformWallet().callAsync();

    // Deploy transformers.
    const wethTransformer = await deployAtAddressAsync(
        () =>
            WethTransformerContract.deployFrom0xArtifactAsync(
                exchangeProxyArtifacts.WethTransformer,
                provider,
                txDefaults,
                allArtifacts,
                etherToken.address,
            ),
        provider,
        txDefaults,
        expectedAddresses.transformers.wethTransformer,
    );
    const payTakerTransformer = await deployAtAddressAsync(
        () =>
            PayTakerTransformerContract.deployFrom0xArtifactAsync(
                exchangeProxyArtifacts.PayTakerTransformer,
                provider,
                txDefaults,
                allArtifacts,
            ),
        provider,
        txDefaults,
        expectedAddresses.transformers.payTakerTransformer,
    );
    const affiliateFeeTransformer = await deployAtAddressAsync(
        () =>
            AffiliateFeeTransformerContract.deployFrom0xArtifactAsync(
                exchangeProxyArtifacts.AffiliateFeeTransformer,
                provider,
                txDefaults,
                allArtifacts,
            ),
        provider,
        txDefaults,
        expectedAddresses.transformers.affiliateFeeTransformer,
    );
    const fillQuoteTransformer = await deployAtAddressAsync(
        () =>
            FillQuoteTransformerContract.deployFrom0xArtifactAsync(
                exchangeProxyArtifacts.FillQuoteTransformer,
                provider,
                txDefaults,
                allArtifacts,
                bridgeAdapter.address,
                exchangeProxy.address,
            ),
        provider,
        txDefaults,
        expectedAddresses.transformers.fillQuoteTransformer,
    );
    const positiveSlippageFeeTransformer = await deployAtAddressAsync(
        () =>
            PositiveSlippageFeeTransformerContract.deployFrom0xArtifactAsync(
                exchangeProxyArtifacts.PositiveSlippageFeeTransformer,
                provider,
                txDefaults,
                allArtifacts,
            ),
        provider,
        txDefaults,
        expectedAddresses.transformers.positiveSlippageFeeTransformer,
    );
    const contractAddresses = {
        erc20Proxy: erc20Proxy.address,
        erc721Proxy: NULL_ADDRESS,
        erc1155Proxy: NULL_ADDRESS,
        zrxToken: zrxToken.address,
        etherToken: etherToken.address,
        exchange: NULL_ADDRESS,
        assetProxyOwner: NULL_ADDRESS,
        erc20BridgeProxy: NULL_ADDRESS,
        zeroExGovernor: NULL_ADDRESS,
        forwarder: NULL_ADDRESS,
        coordinatorRegistry: NULL_ADDRESS,
        coordinator: NULL_ADDRESS,
        multiAssetProxy: NULL_ADDRESS,
        staticCallProxy: NULL_ADDRESS,
        devUtils: NULL_ADDRESS,
        exchangeV2: NULL_ADDRESS,
        zrxVault: zrxVault.address,
        staking: stakingLogic.address,
        stakingProxy: stakingProxy.address,
        erc20BridgeSampler: NULL_ADDRESS,
        chaiBridge: NULL_ADDRESS,
        dydxBridge: NULL_ADDRESS,
        godsUnchainedValidator: NULL_ADDRESS,
        broker: NULL_ADDRESS,
        chainlinkStopLimit: NULL_ADDRESS,
        maximumGasPrice: NULL_ADDRESS,
        dexForwarderBridge: NULL_ADDRESS,
        exchangeProxyGovernor: NULL_ADDRESS,
        exchangeProxy: exchangeProxy.address,
        exchangeProxyTransformerDeployer: txDefaults.from,
        exchangeProxyFlashWallet: exchangeProxyFlashWalletAddress,
        exchangeProxyLiquidityProviderSandbox: NULL_ADDRESS,
        zrxTreasury: NULL_ADDRESS,
        transformers: {
            wethTransformer: wethTransformer.address,
            payTakerTransformer: payTakerTransformer.address,
            fillQuoteTransformer: fillQuoteTransformer.address,
            affiliateFeeTransformer: affiliateFeeTransformer.address,
            positiveSlippageFeeTransformer: positiveSlippageFeeTransformer.address,
        },
    };
    return contractAddresses;
}

let _cachedContractAddresses: ContractAddresses;

/**
 * Exactly like runMigrationsAsync but will only run the migrations the first
 * time it is called. Any subsequent calls will return the cached contract
 * addresses.
 * @param provider  Web3 provider instance. Your provider instance should connect to the testnet you want to deploy to.
 * @param txDefaults Default transaction values to use when deploying contracts (e.g., specify the desired contract creator with the `from` parameter).
 * @returns The addresses of the contracts that were deployed.
 */
export async function runMigrationsOnceAsync(
    provider: Web3ProviderEngine,
    txDefaults: TxData,
): Promise<ContractAddresses> {
    if (_cachedContractAddresses !== undefined) {
        return _cachedContractAddresses;
    }
    _cachedContractAddresses = await runMigrationsAsync(provider, txDefaults);
    return _cachedContractAddresses;
}
