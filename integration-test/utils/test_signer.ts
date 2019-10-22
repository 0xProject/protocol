// tslint:disable:no-console
// tslint:disable:no-unbound-method

import { signatureUtils, SignedZeroExTransaction, ZeroExTransaction } from '@0x/order-utils';
import { PrivateKeyWalletSubprovider, SupportedProvider, Web3ProviderEngine } from '@0x/subproviders';
import { NULL_ADDRESS, providerUtils } from '@0x/utils';

export class TestMetaTxnUser {
    private readonly _takerAddress: string;
    private readonly _takerPrivateKey: string;
    private readonly _provider: SupportedProvider;

    constructor() {
        const TAKER_ADDRESS = process.env.TAKER_ADDRESS;
        const TAKER_PRIVATE_KEY = process.env.TAKER_PRIVATE_KEY;
        const TAKER_RPC_ADDR = process.env.TAKER_RPC_ADDR;
        if (TAKER_ADDRESS === NULL_ADDRESS || TAKER_ADDRESS === undefined) {
            throw new Error(`TAKER_ADDRESS must be specified`);
        }
        if (TAKER_PRIVATE_KEY === '' || TAKER_PRIVATE_KEY === undefined) {
            throw new Error(`TAKER_PRIVATE_KEY must be specified`);
        }
        if (TAKER_RPC_ADDR === undefined) {
            throw new Error(`TAKER_RPC_ADDR must be specified`);
        }
        this._takerAddress = TAKER_ADDRESS;
        this._takerPrivateKey = TAKER_PRIVATE_KEY;
        this._provider = this._createWeb3Provider();
    }
    // tslint:disable-next-line
    public getQuoteString(buyToken: string, sellToken: string, buyAmount: string): string {
        return `?buyToken=${buyToken}&sellToken=${sellToken}&buyAmount=${buyAmount}&takerAddress=${this._takerAddress}`;
    }
    public async signAsync(zeroExTransactionHash: string): Promise<string> {
        return signatureUtils.ecSignHashAsync(this._provider, zeroExTransactionHash, this._takerAddress);
    }
    public async signTransactionAsync(zeroExTransaction: ZeroExTransaction): Promise<SignedZeroExTransaction> {
        return signatureUtils.ecSignTransactionAsync(this._provider, zeroExTransaction, this._takerAddress);
    }
    private _createWeb3Provider(): SupportedProvider {
        const provider = new Web3ProviderEngine();
        provider.addProvider(new PrivateKeyWalletSubprovider(this._takerPrivateKey));
        providerUtils.startProviderEngine(provider);

        return provider;
    }
}
