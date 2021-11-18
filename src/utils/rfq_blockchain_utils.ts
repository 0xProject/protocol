import { ChainId } from '@0x/contract-addresses';
import { IZeroExOtcOrderFilledEventArgs, IZeroExRfqOrderFilledEventArgs } from '@0x/contract-wrappers';
import { IZeroExContract } from '@0x/contracts-zero-ex';
import { MetaTransaction, OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { PrivateKeyWalletSubprovider, SupportedProvider, Web3ProviderEngine } from '@0x/subproviders';
import { AbiDecoder, BigNumber, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { HDNode } from '@ethersproject/hdnode';
import { CallData, LogEntry, LogWithDecodedArgs, TransactionReceipt, TxData } from 'ethereum-types';
import { Contract, providers, utils, Wallet } from 'ethers';
import { resolveProperties } from 'ethers/lib/utils';

import { NULL_ADDRESS, ZERO } from '../constants';
import { logger } from '../logger';

import { BalanceChecker } from './balance_checker';
import { isWorkerReadyAndAbleAsync } from './rfqm_worker_balance_utils';
import { serviceUtils } from './service_utils';
import { SubproviderAdapter } from './subprovider_adapter';

// allow a wide range for gas price for flexibility
const MIN_GAS_PRICE = new BigNumber(0);
// 10K Gwei
const MAX_GAS_PRICE = new BigNumber(1e13);
const GAS_ESTIMATE_BUFFER = 0.5;
const RFQ_ORDER_FILLED_EVENT_TOPIC0 = '0x829fa99d94dc4636925b38632e625736a614c154d55006b7ab6bea979c210c32';
const OTC_ORDER_FILLED_EVENT_TOPIC0 = '0xac75f773e3a92f1a02b12134d65e1f47f8a14eabe4eaf1e24624918e6a8b269f';
const ZERO_EX_FILL_EVENT_ABI = [
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: 'bytes32', name: 'orderHash', type: 'bytes32' },
            { indexed: false, internalType: 'address', name: 'maker', type: 'address' },
            { indexed: false, internalType: 'address', name: 'taker', type: 'address' },
            { indexed: false, internalType: 'address', name: 'makerToken', type: 'address' },
            { indexed: false, internalType: 'address', name: 'takerToken', type: 'address' },
            { indexed: false, internalType: 'uint128', name: 'takerTokenFilledAmount', type: 'uint128' },
            { indexed: false, internalType: 'uint128', name: 'makerTokenFilledAmount', type: 'uint128' },
            { indexed: false, internalType: 'bytes32', name: 'pool', type: 'bytes32' },
        ],
        name: 'RfqOrderFilled',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: 'bytes32', name: 'orderHash', type: 'bytes32' },
            { indexed: false, internalType: 'address', name: 'maker', type: 'address' },
            { indexed: false, internalType: 'address', name: 'taker', type: 'address' },
            { indexed: false, internalType: 'address', name: 'makerToken', type: 'address' },
            { indexed: false, internalType: 'address', name: 'takerToken', type: 'address' },
            { indexed: false, internalType: 'uint128', name: 'makerTokenFilledAmount', type: 'uint128' },
            { indexed: false, internalType: 'uint128', name: 'takerTokenFilledAmount', type: 'uint128' },
        ],
        name: 'OtcOrderFilled',
        type: 'event',
    },
];

export class RfqBlockchainUtils {
    private readonly _exchangeProxy: IZeroExContract;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _abiDecoder: AbiDecoder;
    // An ethers.js provider.
    private readonly _ethersProvider: providers.Provider;
    // An ethers.js Wallet. Must be populated for RfqBlockchainUtils instances used by RFQM Workers.
    private readonly _ethersWallet: Wallet | undefined;

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

    constructor(
        provider: SupportedProvider,
        private readonly _exchangeProxyAddress: string,
        private readonly _balanceChecker: BalanceChecker,
        ethersProvider: providers.Provider,
        ethersWallet?: Wallet,
    ) {
        this._abiDecoder = new AbiDecoder([ZERO_EX_FILL_EVENT_ABI]);
        this._ethersProvider = ethersProvider;
        this._ethersWallet = ethersWallet;
        this._exchangeProxy = new IZeroExContract(this._exchangeProxyAddress, provider);
        this._web3Wrapper = new Web3Wrapper(provider);
    }

    /**
     * Fetches the token balances for a given list of addresses and tokens
     */
    public async getTokenBalancesAsync(addresses: string[], tokens: string[]): Promise<BigNumber[]> {
        return this._balanceChecker.getTokenBalancesAsync(addresses, tokens, this._exchangeProxyAddress);
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

    public getTakerTokenFillAmountFromMetaTxCallData(calldata: string): BigNumber {
        const metaTxInput: any = this._exchangeProxy.getABIDecodedTransactionData('executeMetaTransaction', calldata);
        return (this._exchangeProxy.getABIDecodedTransactionData('fillRfqOrder', metaTxInput[0].callData) as any)[2];
    }

    /**
     * Validates a metatransaction and its signature for a given sender
     *
     * @returns a Promise of [takerTokenFilledAmount, makerTokenFilledAmount]
     * @throws an error if the metatransaction is not valid
     */
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
            const takerTokenFillAmount = (
                this._exchangeProxy.getABIDecodedTransactionData('fillRfqOrder', metaTx.callData) as any
            )[2];
            const decodedResults: [BigNumber, BigNumber] = this._exchangeProxy.getABIDecodedReturnData(
                'fillRfqOrder',
                results,
            );
            if (decodedResults[0].isLessThan(takerTokenFillAmount)) {
                logger.error('validation failed because filled amount is less than requested fill amount');
                throw new Error(`filled amount is less than requested fill amount`);
            }
            return decodedResults;
        } catch (err) {
            logger.error({ errorMessage: err?.message }, 'eth_call validation failed for executeMetaTransaction');
            throw new Error(err);
        }
    }

    /**
     * Estimate the gas for fillTakerSignedOtcOrder and fillTakerSignedOtcOrderForEth
     * NOTE: can also be used for validation
     *
     * @returns a Promise of the gas estimate
     * @throws an error if transaction will revert
     */
    public async estimateGasForFillTakerSignedOtcOrderAsync(
        order: OtcOrder,
        makerSignature: Signature,
        takerSignature: Signature,
        sender: string,
        isUnwrap: boolean,
    ): Promise<number> {
        try {
            if (isUnwrap) {
                return await this._exchangeProxy
                    .fillTakerSignedOtcOrderForEth(order, makerSignature, takerSignature)
                    .estimateGasAsync({ from: sender });
            } else {
                return await this._exchangeProxy
                    .fillTakerSignedOtcOrder(order, makerSignature, takerSignature)
                    .estimateGasAsync({ from: sender });
            }
        } catch (err) {
            logger.error(
                {
                    orderHash: order.getHash(),
                    maker: order.maker,
                    taker: order.taker,
                    isUnwrap,
                    errorMessage: err?.message,
                },
                'validation failed for taker signed OtcOrder',
            );
            throw err;
        }
    }

    /**
     * Generates calldata for Taker Signed OtcOrder settlement
     */
    public generateTakerSignedOtcOrderCallData(
        order: OtcOrder,
        makerSignature: Signature,
        takerSignature: Signature,
        isUnwrap: boolean,
        affiliateAddress?: string,
    ): string {
        const callData = isUnwrap
            ? this._exchangeProxy
                  .fillTakerSignedOtcOrderForEth(order, makerSignature, takerSignature)
                  .getABIEncodedTransactionData()
            : this._exchangeProxy
                  .fillTakerSignedOtcOrder(order, makerSignature, takerSignature)
                  .getABIEncodedTransactionData();
        return serviceUtils.attributeCallData(callData, affiliateAddress).affiliatedData;
    }

    public generateMetaTransactionCallData(
        metaTx: MetaTransaction,
        metaTxSig: Signature,
        affiliateAddress?: string,
    ): string {
        const callData = this._exchangeProxy.executeMetaTransaction(metaTx, metaTxSig).getABIEncodedTransactionData();
        return serviceUtils.attributeCallData(callData, affiliateAddress).affiliatedData;
    }

    public async getNonceAsync(workerAddress: string): Promise<number> {
        return this._ethersProvider.getTransactionCount(workerAddress);
    }

    public getExchangeProxyAddress(): string {
        return this._exchangeProxyAddress;
    }

    public async getTransactionReceiptIfExistsAsync(transactionHash: string): Promise<TransactionReceipt | undefined> {
        // TODO(phil/david) - remove the try catch and let the caller handle the logging of the error
        try {
            return await this._web3Wrapper.getTransactionReceiptIfExistsAsync(transactionHash);
        } catch (err) {
            logger.warn({ transactionHash, errorMessage: err?.message }, `failed to get transaction receipt`);
            return undefined;
        }
    }

    public async getCurrentBlockAsync(): Promise<number> {
        return this._web3Wrapper.getBlockNumberAsync();
    }

    public async estimateGasForExchangeProxyCallAsync(callData: string, workerAddress: string): Promise<number> {
        const txData: Partial<TxData> = {
            to: this._exchangeProxy.address,
            data: callData,
            from: workerAddress,
        };

        const gasEstimate = await this._web3Wrapper.estimateGasAsync(txData);

        // add a buffer
        return Math.ceil((GAS_ESTIMATE_BUFFER + 1) * gasEstimate);
    }

    public getDecodedRfqOrderFillEventLogFromLogs(
        logs: LogEntry[],
    ): LogWithDecodedArgs<IZeroExRfqOrderFilledEventArgs> {
        for (const log of logs) {
            if (log.topics[0] === RFQ_ORDER_FILLED_EVENT_TOPIC0) {
                return this._abiDecoder.tryToDecodeLogOrNoop(log) as LogWithDecodedArgs<IZeroExRfqOrderFilledEventArgs>;
            }
        }
        throw new Error(
            `no RfqOrderFilledEvent logs among the logs passed into getDecodedRfqOrderFillEventLogFromLogs`,
        );
    }

    /**
     * Decode the OtcOrder Filled Event
     */
    public getDecodedOtcOrderFillEventLogFromLogs(
        logs: LogEntry[],
    ): LogWithDecodedArgs<IZeroExOtcOrderFilledEventArgs> {
        for (const log of logs) {
            if (log.topics[0] === OTC_ORDER_FILLED_EVENT_TOPIC0) {
                return this._abiDecoder.tryToDecodeLogOrNoop(log) as LogWithDecodedArgs<IZeroExRfqOrderFilledEventArgs>;
            }
        }
        throw new Error(
            `no OtcOrderFilledEvent logs among the logs passed into getDecodedOtcOrderFillEventLogFromLogs`,
        );
    }

    /**
     * Broadcasts a raw transaction via the `eth_sendRawTransaction` JSON RPC method.
     * The transaction must be signed by this point, otherwise submission will fail.
     *
     * @returns The transaction hash returned by the RPC provider.
     */
    public async submitSignedTransactionAsync(signedTransaction: string): Promise<string> {
        return this._web3Wrapper.sendRawPayloadAsync<string>({
            method: 'eth_sendRawTransaction',
            params: [signedTransaction],
        });
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

    public async getAccountBalanceAsync(accountAddress: string): Promise<BigNumber> {
        return this._web3Wrapper.getBalanceInWeiAsync(accountAddress);
    }

    public async isWorkerReadyAsync(workerAddress: string, balance: BigNumber, gasPrice: BigNumber): Promise<boolean> {
        return isWorkerReadyAndAbleAsync(this._web3Wrapper, workerAddress, balance, gasPrice);
    }

    /**
     * Converts a @0x/web3-wrapper `TxData` object into an Ethers `TransactionRequest`.
     *
     * If the `from` address is not present in the `TxData`, the function uses the address
     * of the Ethers Wallet passed to `rfqBlockchainUtils`
     *
     * If the `to` address is not present, the function uses the exchange proxy address.
     */
    public transformTxDataToTransactionRequest(
        txOptions: Partial<TxData>,
        chainId?: ChainId,
        callData?: utils.BytesLike,
    ): providers.TransactionRequest {
        const baseRequest = {
            chainId,
            data: callData,
            from: txOptions.from,
            // web3wrappers "gas" field -> ethers "gasLimit" field
            gasLimit: txOptions.gas instanceof BigNumber ? BigInt(txOptions.gas.toString()) : txOptions.gas,
            nonce: txOptions.nonce,
            to: txOptions.to || this._exchangeProxy.address,
            value: txOptions.value instanceof BigNumber ? txOptions.value.toString() : txOptions.value,
        };

        // Handle Type 0 (Legacy) Tx
        if (txOptions.gasPrice) {
            return {
                ...baseRequest,
                type: 0,
                gasPrice: txOptions.gasPrice instanceof BigNumber ? txOptions.gasPrice.toString() : txOptions.gasPrice,
            };
        }

        // Handle Type 2 (EIP-1559) Tx
        return {
            ...baseRequest,
            type: 2,
            maxFeePerGas:
                txOptions.maxFeePerGas instanceof BigNumber
                    ? BigInt(txOptions.maxFeePerGas.toString())
                    : txOptions.maxFeePerGas,
            maxPriorityFeePerGas:
                txOptions.maxPriorityFeePerGas instanceof BigNumber
                    ? BigInt(txOptions.maxPriorityFeePerGas.toString())
                    : txOptions.maxPriorityFeePerGas,
        };
    }

    /**
     * Uses the Ethers Wallet to sign a transaction. Returns both the signed transaction and its hash.
     *
     * If the containing class has been initialized without a wallet, the function throws.
     */
    public async signTransactionAsync(
        transaction: providers.TransactionRequest,
    ): Promise<{ signedTransaction: string; transactionHash: string }> {
        if (!this._ethersWallet) {
            throw new Error(
                'RFQ Blockchain Utils must be initialized with an Ethers Wallet in order to get transaction hashes before submitting',
            );
        }

        const checkedRequest = await resolveProperties(this._ethersWallet.checkTransaction(transaction));
        const signedTransaction = await this._ethersWallet.signTransaction(checkedRequest);
        const hash = utils.keccak256(signedTransaction);
        return { signedTransaction, transactionHash: hash };
    }

    public async getTokenDecimalsAsync(tokenAddress: string): Promise<number> {
        const erc20AbiDecimals = `[{
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }]`;
        const tokenContract = new Contract(tokenAddress, erc20AbiDecimals, this._ethersProvider);
        const decimals = await tokenContract.decimals();
        if (typeof decimals !== 'number') {
            throw new Error('Decimals was not a number');
        }
        return decimals;
    }
}
