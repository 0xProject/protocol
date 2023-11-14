import addresses from '../addresses.json';

export interface ContractAddresses {
    erc20BridgeProxy: string;
    erc20BridgeSampler: string;
    etherToken: string;
    exchangeProxy: string;
    exchangeProxyFlashWallet: string;
    exchangeProxyGovernor: string;
    exchangeProxyLiquidityProviderSandbox: string;
    exchangeProxyTransformerDeployer: string;
    staking: string;
    stakingProxy: string;
    transformers: {
        wethTransformer: string;
        payTakerTransformer: string;
        fillQuoteTransformer: string;
        affiliateFeeTransformer: string;
        positiveSlippageFeeTransformer: string;
    };
    zeroExGovernor: string;
    zrxToken: string;
    zrxTreasury: string;
    zrxVault: string;
}

export enum ChainId {
    Mainnet = 1,
    Goerli = 5,
    Optimism = 10,
    BSC = 56,
    Polygon = 137,
    Fantom = 250,
    Ganache = 1337,
    Base = 8453,
    Arbitrum = 42161,
    Avalanche = 43114,
    Celo = 42220,
    PolygonMumbai = 80001,
    Sepolia = 11155111
}

/**
 * Narrow a JavaScript number to a Chain ID.
 */
export function isChainId(chainId: number): chainId is ChainId {
    return Object.values(ChainId).includes(chainId);
}

/**
 * Used to get addresses of contracts that have been deployed to either the
 * Ethereum mainnet or a supported testnet. Throws if there are no known
 * contracts deployed on the corresponding chain.
 * @param chainId The desired chainId.
 * @returns The set of addresses for contracts which have been deployed on the
 * given chainId.
 */
export function getContractAddressesForChainOrThrow(chainId: ChainId): ContractAddresses {
    const chainToAddresses: { [chainId: number]: ContractAddresses } = addresses;

    if (chainToAddresses[chainId] === undefined) {
        throw new Error(`Unknown chain id (${chainId}). No known 0x contracts have been deployed on this chain.`);
    }
    return chainToAddresses[chainId];
}
