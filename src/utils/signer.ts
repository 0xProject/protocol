import { TxData } from '@0x/contract-wrappers';
import { SupportedProvider, Web3Wrapper } from '@0x/dev-utils';
import { PrivateKeyWalletSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber, providerUtils } from '@0x/utils';
import { utils as web3WrapperUtils } from '@0x/web3-wrapper/lib/src/utils';

import { ETH_TRANSFER_GAS_LIMIT, GAS_LIMIT_BUFFER_MULTIPLIER } from '../constants';
import { logger } from '../logger';

import { SubproviderAdapter } from './subprovider_adapter';

export class Signer {
    public readonly publicAddress: string;
    private readonly _provider: SupportedProvider;
    private readonly _privateWalletSubprovider: PrivateKeyWalletSubprovider;
    private readonly _web3Wrapper: Web3Wrapper;

    private static _createWeb3Provider(
        provider: SupportedProvider,
        privateWalletSubprovider: PrivateKeyWalletSubprovider,
    ): SupportedProvider {
        const providerEngine = new Web3ProviderEngine();
        providerEngine.addProvider(privateWalletSubprovider);
        providerEngine.addProvider(new SubproviderAdapter(provider));
        providerUtils.startProviderEngine(providerEngine);
        return providerEngine;
    }

    constructor(privateKeyHex: string, provider: SupportedProvider) {
        this._privateWalletSubprovider = new PrivateKeyWalletSubprovider(privateKeyHex);
        this._provider = Signer._createWeb3Provider(provider, this._privateWalletSubprovider);
        this._web3Wrapper = new Web3Wrapper(this._provider);
        this.publicAddress = (this._privateWalletSubprovider as any)._address;
    }

    public async signAndBroadcastMetaTxAsync(
        to: string,
        data: string,
        value: BigNumber,
        gasPrice: BigNumber,
    ): Promise<{
        ethereumTxnParams: { nonce: number; from: string; gas: number };
        ethereumTransactionHash: string;
    }> {
        const nonceHex = await this._getNonceAsync(this.publicAddress);
        const nonce = web3WrapperUtils.convertHexToNumber(nonceHex);
        const from = this.publicAddress;
        const estimatedGas = await this._web3Wrapper.estimateGasAsync({
            to,
            from,
            gasPrice,
            data,
            value,
        });
        // Boost the gas by a small percentage to buffer transactions
        // where the behaviour isn't always deterministic
        const gas = new BigNumber(estimatedGas).times(GAS_LIMIT_BUFFER_MULTIPLIER).integerValue().toNumber();
        logger.info({
            message: `attempting to sign and broadcast a meta transaction`,
            nonce,
            from,
            gas,
            gasPrice,
        });
        const txHash = await this._web3Wrapper.sendTransactionAsync({
            to,
            from,
            data,
            gas,
            gasPrice,
            value,
            nonce,
        });
        logger.info({
            message: 'signed and broadcasted a meta transaction',
            txHash,
            from,
        });
        return {
            ethereumTxnParams: {
                from,
                nonce,
                gas,
            },
            ethereumTransactionHash: txHash,
        };
    }

    public async sendTransactionToItselfWithNonceAsync(nonce: number, gasPrice: BigNumber): Promise<string> {
        const ethereumTxnParams: TxData = {
            from: this.publicAddress,
            to: this.publicAddress,
            value: 0,
            nonce,
            gasPrice,
            gas: ETH_TRANSFER_GAS_LIMIT,
        };

        return this._web3Wrapper.sendTransactionAsync(ethereumTxnParams);
    }

    private async _getNonceAsync(senderAddress: string): Promise<string> {
        const nonce = await this._getTransactionCountAsync(senderAddress);
        return nonce;
    }
    private async _getTransactionCountAsync(address: string): Promise<string> {
        const nonceHex = await this._web3Wrapper.sendRawPayloadAsync<string>({
            method: 'eth_getTransactionCount',
            params: [address, 'pending'],
        });
        logger.info({
            message: 'received nonce from eth_getTransactionCount',
            nonceNumber: web3WrapperUtils.convertHexToNumber(nonceHex),
        });
        return nonceHex;
    }
}
