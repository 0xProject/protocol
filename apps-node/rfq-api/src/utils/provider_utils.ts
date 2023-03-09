import { RPCSubprovider, SupportedProvider, Web3ProviderEngine } from '@0x/subproviders';
import { providerUtils as ZeroExProviderUtils } from '@0x/utils';

export const providerUtils = {
    createWeb3Provider: (rpcHost: string): SupportedProvider => {
        const providerEngine = new Web3ProviderEngine();
        providerEngine.addProvider(new RPCSubprovider(rpcHost));
        ZeroExProviderUtils.startProviderEngine(providerEngine);
        return providerEngine;
    },
};
