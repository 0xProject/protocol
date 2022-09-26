// tslint:disable:max-file-line-count

import { ChainId } from '@0x/contract-addresses';
import { IZeroExOtcOrderFilledEventArgs, IZeroExRfqOrderFilledEventArgs } from '@0x/contract-wrappers';
import { IZeroExContract } from '@0x/contracts-zero-ex';
import { MetaTransaction, OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { PrivateKeyWalletSubprovider, SupportedProvider, Web3ProviderEngine } from '@0x/subproviders';
import { AbiDecoder, BigNumber, providerUtils } from '@0x/utils';
import { HDNode } from '@ethersproject/hdnode';
import { AccessList } from '@ethersproject/transactions';
import { CallData, LogEntry, LogWithDecodedArgs, TxAccessList, TxData } from 'ethereum-types';
import { BigNumber as EthersBigNumber, constants, Contract, providers, utils, Wallet } from 'ethers';
import { resolveProperties } from 'ethers/lib/utils';

import { abis } from '../abis';
import {
    EXECUTE_META_TRANSACTION_EIP_712_TYPES,
    NULL_ADDRESS,
    ONE_MINUTE_MS,
    ONE_SECOND_MS,
    PERMIT_EIP_712_TYPES,
    ZERO,
} from '../constants';
import { EIP_712_REGISTRY } from '../eip712registry';
import { logger } from '../logger';
import { Approval, ERC20Owner, ExecuteMetaTransactionApproval, GaslessApprovalTypes, PermitApproval } from '../types';

import { splitAddresses } from './address_utils';
import { BalanceChecker } from './balance_checker';
import { extractEIP712DomainType } from './Eip712Utils';
import { isWorkerReadyAndAbleAsync } from './rfqm_worker_balance_utils';
import { serviceUtils } from './service_utils';
import { SubproviderAdapter } from './subprovider_adapter';

// allow a wide range for gas price for flexibility
const MIN_GAS_PRICE = new BigNumber(0);
// 10K Gwei
const MAX_GAS_PRICE = new BigNumber(1e13);
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

function toBigNumber(ethersBigNumber: EthersBigNumber): BigNumber {
    return new BigNumber(ethersBigNumber.toString());
}

export class RfqBlockchainUtils {
    private readonly _exchangeProxy: IZeroExContract;
    private readonly _abiDecoder: AbiDecoder;
    // An ethers.js provider.
    private readonly _ethersProvider: providers.JsonRpcProvider;
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
        ethersProvider: providers.JsonRpcProvider,
        ethersWallet?: Wallet,
    ) {
        this._abiDecoder = new AbiDecoder([ZERO_EX_FILL_EVENT_ABI]);
        this._ethersProvider = ethersProvider;
        this._ethersWallet = ethersWallet;
        this._exchangeProxy = new IZeroExContract(this._exchangeProxyAddress, provider);
    }

    /**
     * Fetches min value between balance for a list of addresses against the specified tokens. The index of
     * an address in `addresses` must correspond with the index of a token in `tokens`.
     */
    public async getMinOfBalancesAndAllowancesAsync(erc20Owners: ERC20Owner | ERC20Owner[]): Promise<BigNumber[]> {
        const { owners, tokens } = splitAddresses(erc20Owners);
        return this._balanceChecker.getMinOfBalancesAndAllowancesAsync(owners, tokens, this._exchangeProxyAddress);
    }

    /**
     * Fetches the balances for a list of addresses against the specified tokens. The index of
     * an address in `addresses` must correspond with the index of a token in `tokens`.
     */
    public async getTokenBalancesAsync(erc20Owners: ERC20Owner | ERC20Owner[]): Promise<BigNumber[]> {
        const { owners, tokens } = splitAddresses(erc20Owners);
        return this._balanceChecker.getTokenBalancesAsync(owners, tokens);
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
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metaTxInput: any = this._exchangeProxy.getABIDecodedTransactionData('executeMetaTransaction', calldata);
        return this.validateMetaTransactionOrThrowAsync(metaTxInput[0], metaTxInput[1], sender, txOptions);
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
            const takerTokenFillAmount = // $eslint-fix-me github.com/rhinodavid/eslint-fix-me
                /* eslint-disable @typescript-eslint/no-explicit-any */
                (
                    this._exchangeProxy.getABIDecodedTransactionData('fillRfqOrder', metaTx.callData) as any
                ) /* eslint-enable @typescript-eslint/no-explicit-any */[2];
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
     * Simulate the transaction with calldata.
     *
     * NOTE: In ethers.js, provider.call and provider.send('eth_call', ...) might not throw exception.
     *       The behavior might be dependent on providers. Revisit this later.
     */
    public async simulateTransactionAsync(to: string, calldata: string): Promise<void> {
        try {
            await this._ethersProvider.call({
                to,
                data: calldata,
            });
        } catch (e) {
            if (e instanceof Error) {
                e.message = `simulateTransactionAsync: ${e.message}`;
            }
            throw e;
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
        affiliateAddress: string | null,
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
        affiliateAddress: string | null,
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

    /**
     * Returns the transaction receipts for the given transaction hashes.
     * If a receipt does not exist, returns `undefined`.
     */
    public async getReceiptsAsync(transactionHashes: string[]): Promise<(providers.TransactionReceipt | undefined)[]> {
        return Promise.all(
            transactionHashes.map(async (transactionHash) =>
                this._ethersProvider.getTransactionReceipt(transactionHash),
            ),
        );
    }

    public async getCurrentBlockAsync(): Promise<number> {
        return this._ethersProvider.getBlockNumber();
    }

    // Fetches a block from the block number or block hash
    public async getBlockAsync(blockHash: providers.BlockTag): Promise<providers.Block> {
        return this._ethersProvider.getBlock(blockHash);
    }

    /**
     * Passthrough to the ethers `getTransaction` function
     * https://docs.ethers.io/v5/api/providers/provider/#Provider-getTransaction:
     *
     * Returns the transaction with hash or null if the transaction is unknown.
     * If a transaction has not been mined, this method will search the transaction pool.
     * Various backends may have more restrictive transaction pool access
     * (e.g. if the gas price is too low or the transaction was only recently sent and not yet indexed)
     * in which case this method may also return null.
     */
    public async getTransactionAsync(transactionHash: string): Promise<providers.TransactionResponse | null> {
        return this._ethersProvider.getTransaction(transactionHash);
    }

    /**
     * Estimate gas (in wei) given a transaction request using `eth_estimateGas` JSON RPC method.
     * The transaction request contains information related to the transaction (from, to, data, etc.).
     *
     * @param transactionRequest Transaction request object which contains information about the transaction.
     * @returns The gas estimate for the transaction in wei.
     */
    public async estimateGasForAsync(transactionRequest: providers.TransactionRequest): Promise<number> {
        try {
            const gasEstimate = await this._ethersProvider.estimateGas(transactionRequest);
            return gasEstimate.toNumber();
        } catch (e) {
            if (e instanceof Error) {
                e.message = `estimateGasForAsync: ${e.message}`;
            }
            throw e;
        }
    }

    /**
     * Get the access list and the gas estimation given a transaction request. Uses the provider
     * to call the `eth_createAccessList` JSON RPC method.
     *
     * The transaction request contains information related to the transaction (from, to, data, etc.).
     * Note that the implementation is similar to the one in @0x/web3-wrapper. This repo is
     * migrating away from web3-wrapper in favor of ethers. The original implementation in
     * web3-wrapper:
     * https://github.com/0xProject/tools/blob/development/web3-wrapper/src/web3_wrapper.ts#L591
     *
     * @param transactionRequest Transaction request object which contains information about the transaction.
     * @returns A TxAccessListWithGas object which contains access list and gas estimation for the transaction.
     */
    public async createAccessListForAsync(
        transactionRequest: providers.TransactionRequest,
    ): Promise<{ accessList: TxAccessList; gasEstimate: number }> {
        try {
            const rawResult = await this._ethersProvider.send('eth_createAccessList', [transactionRequest]);
            const accessList: AccessList = rawResult.accessList;
            const gasUsed: string = rawResult.gasUsed;

            return {
                // The type for `accessList` is `AccessList` (Array<{ address: string, storageKeys: Array<string> }>).
                // The reduce operation is used to transform the array into type `TxAccessList` ([address: string]: string[]) whose keys
                // are addresses and values are corresponding storage keys. This is useful if we need to remove an address from the object.
                accessList: accessList.reduce((o: TxAccessList, v: { address: string; storageKeys: string[] }) => {
                    o[v.address] = o[v.address] || [];
                    o[v.address].push(...(v.storageKeys || []));
                    return o;
                }, {}),
                gasEstimate: new BigNumber(gasUsed).toNumber(),
            };
        } catch (e) {
            if (e instanceof Error) {
                e.message = `createAccessListForAsync: ${e.message}`;
            }

            throw e;
        }
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
        const response = await this._ethersProvider.sendTransaction(signedTransaction);
        return response.hash;
    }

    public async getAccountBalanceAsync(accountAddress: string): Promise<BigNumber> {
        return this._ethersProvider.getBalance(accountAddress).then((r) => toBigNumber(r));
    }

    public async isWorkerReadyAsync(workerAddress: string, balance: BigNumber, gasPrice: BigNumber): Promise<boolean> {
        return isWorkerReadyAndAbleAsync(this._ethersProvider, workerAddress, balance, gasPrice);
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

    /**
     * Calls the 0x Exchange Proxy to add an address to the list of allowed order signers for the msg's sender.
     */
    public async registerAllowedOrderSignerAsync(
        from: string,
        signerAddress: string,
        isAllowed: boolean,
    ): Promise<void> {
        // tslint:disable-next-line: await-promise
        await this._exchangeProxy
            .registerAllowedOrderSigner(signerAddress, isAllowed)
            .awaitTransactionSuccessAsync({ from });
    }

    /**
     * Returns whether the signer address is an allowed order signer of the maker.
     */
    public async isValidOrderSignerAsync(makerAddress: string, signerAddress: string): Promise<boolean> {
        return this._exchangeProxy.isValidOrderSigner(makerAddress, signerAddress).callAsync();
    }

    /**
     * Get the gasless approval object which encapsulates the EIP-712 context that would be signed by the `takerAddress`
     * for gasless approval. The two main schemes for gasless approvals are `executeMetaTransaction` and `permit`.
     *
     * @param chainId Id of the chain.
     * @param token The address of the token.
     * @param takerAddress The address of the taker.
     * @param nowMs optional - the current timestamp in milliseconds
     * @returns The corresponding gasless approval oject or null if the token does not support gasless approval (does not exist in our EIP-712 token registry).
     */
    public async getGaslessApprovalAsync(
        chainId: number,
        token: string,
        takerAddress: string,
        nowMs: number = Date.now(),
    ): Promise<Approval | null> {
        // If the token does not exist in the token registry, return null
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line no-prototype-builtins
        if (!EIP_712_REGISTRY.hasOwnProperty(chainId) || !EIP_712_REGISTRY[chainId].hasOwnProperty(token)) {
            return null;
        }

        const tokenEIP712 = EIP_712_REGISTRY[chainId][token];
        const eip712DomainType = extractEIP712DomainType(tokenEIP712.domain);
        switch (tokenEIP712.kind) {
            case GaslessApprovalTypes.ExecuteMetaTransaction: {
                const nonce = await this.getMetaTransactionNonceAsync(token, takerAddress);
                // generate calldata for approve with max number of uint256 as amount
                const erc20 = new Contract(token, abis.polygonBridgedERC20, this._ethersProvider);
                const { data: approveCalldata } = await erc20.populateTransaction.approve(
                    this._exchangeProxyAddress,
                    constants.MaxUint256,
                );

                const executeMetaTransactionApproval: ExecuteMetaTransactionApproval = {
                    kind: GaslessApprovalTypes.ExecuteMetaTransaction,
                    eip712: {
                        types: {
                            ...eip712DomainType,
                            ...EXECUTE_META_TRANSACTION_EIP_712_TYPES,
                        },
                        primaryType: 'MetaTransaction',
                        domain: tokenEIP712.domain,
                        message: {
                            nonce: nonce.toNumber(),
                            from: takerAddress,
                            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            functionSignature: approveCalldata!,
                        },
                    },
                };

                return executeMetaTransactionApproval;
            }
            case GaslessApprovalTypes.Permit: {
                const nonce = await this.getPermitNonceAsync(token, takerAddress);
                const tenMinutesAfterNowS = new BigNumber(nowMs + ONE_MINUTE_MS * 10).div(ONE_SECOND_MS).integerValue();
                const permitApproval: PermitApproval = {
                    kind: GaslessApprovalTypes.Permit,
                    eip712: {
                        types: {
                            ...eip712DomainType,
                            ...PERMIT_EIP_712_TYPES,
                        },
                        primaryType: 'Permit',
                        domain: tokenEIP712.domain,
                        message: {
                            owner: takerAddress,
                            spender: this._exchangeProxyAddress,
                            value: constants.MaxUint256.toString(),
                            nonce: nonce.toNumber(),
                            deadline: tenMinutesAfterNowS.toString(),
                        },
                    },
                };

                return permitApproval;
            }
            default:
                throw new Error(`Gasless approval kind ${tokenEIP712.kind} is not implemented yet`);
        }
    }

    /**
     * Get the amount (in base unit) of `token` `spender` will be allowed to spend on behalf on `owner` (the allowance). Note that
     * base unit means 10 ** decimals (decimals of the token).
     *
     * @param token The address of the token.
     * @param owner The address that owns certain amount of `token`.
     * @param spender The address that would like to spend token on behalf of `owner`.
     * @returns The amount (in base unit) of tokens spender is allowed to spend.
     */
    public async getAllowanceAsync(token: string, owner: string, spender: string): Promise<BigNumber> {
        const erc20 = new Contract(token, abis.polygonBridgedERC20, this._ethersProvider);
        const allowance = await erc20.allowance(owner, spender);
        return new BigNumber(allowance.toString());
    }

    /**
     * Get nonce for meta transaction. This is used by contracts that support Biconomy's `executeMetaTransaction` which includes bridged tokens on Polygon.
     *
     * @param token The address of the token.
     * @param takerAddress The address of the taker.
     * @returns Nonce.
     */
    public async getMetaTransactionNonceAsync(token: string, takerAddress: string): Promise<BigNumber> {
        const erc20 = new Contract(token, abis.polygonBridgedERC20, this._ethersProvider);
        const nonce = await erc20.getNonce(takerAddress);
        return new BigNumber(nonce.toString());
    }

    /**
     * Get permit nonce, which is used by contracts that support EIP-2612 standards.
     *
     * @param token The address of the token.
     * @param takerAddress The address of the taker.
     * @returns Nonce.
     */
    public async getPermitNonceAsync(token: string, takerAddress: string): Promise<BigNumber> {
        const erc20 = new Contract(token, abis.permitERC20, this._ethersProvider);
        const nonce = await erc20.nonces(takerAddress);
        return new BigNumber(nonce.toString());
    }

    /**
     * Generates calldata for gasless approval submission.
     *
     * @param token The address of the token.
     * @param approval The Approval object, which consists of 'kind' and eip712 object.
     * @param signature The gasless approval transaction signed by taker.
     * @returns Generated calldata.
     */
    public async generateApprovalCalldataAsync(
        token: string,
        approval: Approval,
        signature: Signature,
    ): Promise<string> {
        const { kind, eip712 } = approval;
        switch (kind) {
            case GaslessApprovalTypes.ExecuteMetaTransaction: {
                const erc20 = new Contract(token, abis.polygonBridgedERC20, this._ethersProvider);
                const { data } = await erc20.populateTransaction.executeMetaTransaction(
                    eip712.message.from,
                    eip712.message.functionSignature,
                    signature.r,
                    signature.s,
                    signature.v,
                );
                if (!data) {
                    throw new Error(`Cannot generate approval submission calldata for ${kind}`);
                }
                return data;
            }
            case GaslessApprovalTypes.Permit: {
                const erc20 = new Contract(token, abis.permitERC20, this._ethersProvider);
                const { data } = await erc20.populateTransaction.permit(
                    eip712.message.owner,
                    eip712.message.spender,
                    eip712.message.value,
                    eip712.message.deadline,
                    signature.v,
                    signature.r,
                    signature.s,
                );
                if (!data) {
                    throw new Error(`Cannot generate approval submission calldata for ${kind}`);
                }
                return data;
            }
            default:
                throw new Error(`Gasless approval kind ${kind} is not implemented yet`);
        }
    }
}
