import { provider } from '@0x/contracts-test-utils';
import { IZeroExContract } from '@0x/contracts-zero-ex';
import { CallData, SupportedProvider, Web3ProviderEngine, Web3Wrapper } from '@0x/dev-utils';
import { MetaTransaction, RfqOrder, Signature } from '@0x/protocol-utils';
import { PrivateKeyWalletSubprovider } from '@0x/subproviders';
import { BigNumber, providerUtils } from '@0x/utils';
import { HDNode } from '@ethersproject/hdnode';
import { TxData } from 'ethereum-types';

import { NULL_ADDRESS, ZERO } from '../constants';
import { ChainId } from '../types';

import { SubproviderAdapter } from './subprovider_adapter';

// allow a wide range for gas price for flexibility
const MIN_GAS_PRICE = new BigNumber(0);
// 10K Gwei
const MAX_GAS_PRICE = new BigNumber(1e13);

export class RfqBlockchainUtils {
    private readonly _exchangeProxy: IZeroExContract;
    private readonly _web3Wrapper: Web3Wrapper;

    public static getPrivateKeyFromIndexAndPhrase(mnemonic: string, index: number): string {
        const hdNode = HDNode.fromMnemonic(mnemonic).derivePath(this._getPathByIndex(index));

        // take '0x' off
        return hdNode.privateKey.substring(2);
    }

    public static getAddressFromIndexAndPhrase(mnemonic: string, index: number): string {
        const hdNode = HDNode.fromMnemonic(mnemonic).derivePath(this._getPathByIndex(index));

        return hdNode.address;
    }

    public static createPrivateKeyProvider(
        rpcProvider: SupportedProvider,
        privateWalletSubprovider: PrivateKeyWalletSubprovider,
    ): SupportedProvider {
        const providerEngine = new Web3ProviderEngine();
        providerEngine.addProvider(privateWalletSubprovider);
        providerEngine.addProvider(new SubproviderAdapter(rpcProvider));
        providerUtils.startProviderEngine(providerEngine);
        return providerEngine;
    }

    // tslint:disable-next-line:prefer-function-over-method
    private static _getPathByIndex(index: number): string {
        // ensure index is a 0+ integer
        if (index < 0 || index !== Math.floor(index)) {
            throw new Error(`invalid index`);
        }
        return `m/44'/60'/0'/0/`.concat(String(index));
    }

    constructor(private readonly _provider: SupportedProvider, private readonly _exchangeProxyAddress: string) {
        this._exchangeProxy = new IZeroExContract(this._exchangeProxyAddress, this._provider);
        this._web3Wrapper = new Web3Wrapper(provider);
    }

    // for use when 0x API operator submits an order on-chain on behalf of taker
    public generateMetaTransaction(
        rfqOrder: RfqOrder,
        signature: Signature,
        taker: string,
        takerAmount: BigNumber,
        chainId: ChainId,
    ): MetaTransaction {
        // generate call data for fillRfqOrder
        const callData = this._exchangeProxy
            .fillRfqOrder(rfqOrder, signature, takerAmount)
            .getABIEncodedTransactionData();

        return new MetaTransaction({
            signer: taker,
            sender: NULL_ADDRESS,
            minGasPrice: MIN_GAS_PRICE,
            maxGasPrice: MAX_GAS_PRICE,
            expirationTimeSeconds: rfqOrder.expiry,
            salt: new BigNumber(Date.now()),
            callData,
            value: ZERO,
            feeToken: NULL_ADDRESS,
            feeAmount: ZERO,
            chainId,
            verifyingContract: this._exchangeProxy.address,
        });
    }

    public async decodeMetaTransactionCallDataAndValidateAsync(
        calldata: string,
        sender: string,
        txOptions?: Partial<CallData>,
    ): Promise<[BigNumber, BigNumber]> {
        const metaTxInput: any = this._exchangeProxy.getABIDecodedTransactionData('executeMetaTransaction', calldata);
        return this.validateMetaTransactionOrThrowAsync(metaTxInput[0], metaTxInput[1], sender, txOptions);
    }

    public async validateMetaTransactionOrThrowAsync(
        metaTx: MetaTransaction,
        metaTxSig: Signature,
        sender: string,
        txOptions?: Partial<CallData>,
    ): Promise<[BigNumber, BigNumber]> {
        try {
            const results = await this._exchangeProxy
                .executeMetaTransaction(metaTx, metaTxSig)
                .callAsync({ from: sender, ...txOptions });
            const takerTokenFillAmount = (this._exchangeProxy.getABIDecodedTransactionData(
                'fillRfqOrder',
                metaTx.callData,
            ) as any).takerTokenFillAmount;
            const decodedResults: [BigNumber, BigNumber] = this._exchangeProxy.getABIDecodedReturnData(
                'fillRfqOrder',
                results,
            );
            if (decodedResults[0].isLessThan(takerTokenFillAmount)) {
                throw new Error(`filled amount is less than requested fill amount`);
            }
            // returns [takerTokenFilledAmount, makerTokenFilledAmount]
            return decodedResults;
        } catch (err) {
            throw new Error(err);
        }
    }

    public generateMetaTransactionCallData(metaTx: MetaTransaction, metaTxSig: Signature): string {
        return this._exchangeProxy.executeMetaTransaction(metaTx, metaTxSig).getABIEncodedTransactionData();
    }

    public async submitCallDataToExchangeProxyAsync(
        callData: string,
        workerAddress: string,
        txOptions?: Partial<TxData>,
    ): Promise<string> {
        const txData: TxData = {
            to: this._exchangeProxy.address,
            data: callData,
            from: workerAddress,
            ...txOptions,
        };

        return this._web3Wrapper.sendTransactionAsync(txData);
    }
}
