import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { providers } from 'ethers';

import { getContractAddressesForNetworkOrThrowAsync } from '../../src/utils/rfqm_service_builder';

describe('rfqm_service_builder', () => {
    describe('getContractAddressesForNetworkOrThrowAsync', () => {
        describe('when an override for exchange proxy contract address is defined', () => {
            it('returns an object with the value of `exchangeProxy` set to the override address', async () => {
                const ethersProvider = new providers.JsonRpcProvider();

                // tslint:disable-next-line:custom-no-magic-numbers
                const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(ethersProvider, {
                    chainId: 80001,
                    exchangeProxyContractAddressOverride: '0x_override_address',
                });
                expect(contractAddresses.exchangeProxy).toBe('0x_override_address');
            });
        });

        describe('when an override for exchange proxy contract address is NOT defined', () => {
            it('returns an object with the value of `exchangeProxy` set value got from upstream module', async () => {
                const ethersProvider = new providers.JsonRpcProvider();

                // tslint:disable-next-line:custom-no-magic-numbers
                const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(ethersProvider, {
                    chainId: 80001,
                });
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const contractAddressesFromUpstreamModule = getContractAddressesForChainOrThrow('80001' as any);
                expect(contractAddresses.exchangeProxy).toBe(contractAddressesFromUpstreamModule.exchangeProxy);
            });
        });
    });
});
