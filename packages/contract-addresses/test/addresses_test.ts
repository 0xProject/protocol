import * as chai from 'chai';
import 'mocha';

import { ChainId, getContractAddressesForChainOrThrow } from '../src';
import { bufferToHex, rlphash } from 'ethereumjs-util';

const expect = chai.expect;

function toDeployedAddress(deployerAddress: string, nonce: number): string {
    return bufferToHex(rlphash([deployerAddress, nonce]).slice(12));
}

function isValidDeployedAddress(deployerAddress: string, deployedAddress: string): boolean {
    for (let i = 0; i < 256; i++) {
        const address = toDeployedAddress(deployerAddress, i);
        if (address.toLowerCase() === deployedAddress.toLowerCase()) {
            return true;
        }
    }
    return false;
}

describe('addresses.json sanity test', () => {
    const allChainIds = Object.values(ChainId).filter(chainId => !isNaN(Number(chainId))) as ChainId[];
    allChainIds.forEach(chainId => {
        describe(`addresses of chain id ${chainId}`, () => {
            const contractAddresses = getContractAddressesForChainOrThrow(chainId);
            it('all addresses are lowercased', async () => {
                const addresses = [
                    contractAddresses.zrxToken,
                    contractAddresses.etherToken,
                    contractAddresses.zeroExGovernor,
                    contractAddresses.zrxVault,
                    contractAddresses.staking,
                    contractAddresses.erc20BridgeProxy,
                    contractAddresses.erc20BridgeSampler,
                    contractAddresses.exchangeProxyGovernor,
                    contractAddresses.exchangeProxy,
                    contractAddresses.exchangeProxyTransformerDeployer,
                    contractAddresses.exchangeProxyFlashWallet,
                    contractAddresses.exchangeProxyLiquidityProviderSandbox,
                    contractAddresses.zrxTreasury,
                    contractAddresses.transformers.wethTransformer,
                    contractAddresses.transformers.payTakerTransformer,
                    contractAddresses.transformers.fillQuoteTransformer,
                    contractAddresses.transformers.affiliateFeeTransformer,
                    contractAddresses.transformers.positiveSlippageFeeTransformer,
                ];
                addresses.forEach(address => {
                    expect(address).to.eq(address.toLowerCase());
                });
            });

            it('all transformer addresses are valid', async () => {
                const transformerAddresses = [
                    contractAddresses.transformers.wethTransformer,
                    contractAddresses.transformers.payTakerTransformer,
                    contractAddresses.transformers.fillQuoteTransformer,
                    contractAddresses.transformers.affiliateFeeTransformer,
                    contractAddresses.transformers.positiveSlippageFeeTransformer,
                ].filter(address => address !== '0x0000000000000000000000000000000000000000');
                transformerAddresses.forEach(transformerAddress => {
                    expect(
                        isValidDeployedAddress(contractAddresses.exchangeProxyTransformerDeployer, transformerAddress),
                    ).to.true;
                });
            });
        });
    });
});
