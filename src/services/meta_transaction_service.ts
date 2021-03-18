import { ContractAddresses, QuoteReport, Signature } from '@0x/asset-swapper';
import { ContractTxFunctionObj, ContractWrappers } from '@0x/contract-wrappers';
import {
    assetDataUtils,
    decodeFillQuoteTransformerData,
    findTransformerNonce,
    generatePseudoRandomSalt,
    getExchangeProxyMetaTransactionHash,
    SupportedProvider,
} from '@0x/order-utils';
import { PartialTxParams } from '@0x/subproviders';
import { ExchangeProxyMetaTransaction, Order, SignedOrder } from '@0x/types';
import { BigNumber, RevertError } from '@0x/utils';
import * as _ from 'lodash';
import { Connection, Repository } from 'typeorm';

import {
    CHAIN_ID,
    META_TXN_RELAY_EXPECTED_MINED_SEC,
    META_TXN_SUBMIT_WHITELISTED_API_KEYS,
    PROTOCOL_FEE_MULTIPLIER,
} from '../config';
import {
    DEFAULT_VALIDATION_GAS_LIMIT,
    NULL_ADDRESS,
    ONE_GWEI,
    ONE_MINUTE_MS,
    ONE_SECOND_MS,
    PUBLIC_ADDRESS_FOR_ETH_CALLS,
    SIGNER_STATUS_DB_KEY,
    SUBMITTED_TX_DB_POLLING_INTERVAL_MS,
    TEN_MINUTES_MS,
    TX_HASH_RESPONSE_WAIT_TIME_MS,
    ZERO,
} from '../constants';
import { KeyValueEntity, TransactionEntity } from '../entities';
import { logger } from '../logger';
import {
    CalculateMetaTransactionQuoteParams,
    CalculateMetaTransactionQuoteResponse,
    ExchangeProxyMetaTransactionWithoutDomain,
    GetMetaTransactionQuoteResponse,
    GetSwapQuoteParams,
    GetSwapQuoteResponse,
    PostTransactionResponse,
    TransactionStates,
    TransactionWatcherSignerStatus,
} from '../types';
import { ethGasStationUtils } from '../utils/gas_station_utils';
import { quoteReportUtils } from '../utils/quote_report_utils';
import { serviceUtils } from '../utils/service_utils';
import { getTokenMetadataIfExists } from '../utils/token_metadata_utils';
import { utils } from '../utils/utils';

const WETHToken = getTokenMetadataIfExists('WETH', CHAIN_ID)!;

interface SwapService {
    calculateSwapQuoteAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse>;
}

interface Transformation {
    deploymentNonce: BigNumber;
    data: string;
}

interface TxHashObject {
    txHash: string;
}

export class MetaTransactionService {
    private readonly _provider: SupportedProvider;
    private readonly _contractWrappers: ContractWrappers;
    private readonly _connection: Connection;
    private readonly _transactionEntityRepository: Repository<TransactionEntity>;
    private readonly _kvRepository: Repository<KeyValueEntity>;
    private readonly _swapService: SwapService;
    private readonly _contractAddresses: ContractAddresses;
    private readonly _fillQuoteTransformerDeploymentNonce: number;

    public static isEligibleForFreeMetaTxn(apiKey: string): boolean {
        return META_TXN_SUBMIT_WHITELISTED_API_KEYS.includes(apiKey);
    }

    constructor(
        provider: SupportedProvider,
        dbConnection: Connection,
        swapService: SwapService,
        contractAddresses: ContractAddresses,
    ) {
        this._provider = provider;
        this._contractWrappers = new ContractWrappers(this._provider, { chainId: CHAIN_ID });
        this._connection = dbConnection;
        this._transactionEntityRepository = this._connection.getRepository(TransactionEntity);
        this._kvRepository = this._connection.getRepository(KeyValueEntity);
        this._swapService = swapService;
        this._contractAddresses = contractAddresses;
        this._fillQuoteTransformerDeploymentNonce = findTransformerNonce(
            this._contractAddresses.transformers.fillQuoteTransformer,
            this._contractAddresses.exchangeProxyTransformerDeployer,
        );
    }

    public async calculateMetaTransactionPriceAsync(
        params: CalculateMetaTransactionQuoteParams,
    ): Promise<CalculateMetaTransactionQuoteResponse> {
        return this._calculateMetaTransactionQuoteAsync(params, false);
    }

    public async calculateMetaTransactionQuoteAsync(
        params: CalculateMetaTransactionQuoteParams,
    ): Promise<GetMetaTransactionQuoteResponse & { quoteReport?: QuoteReport }> {
        const quote = await this._calculateMetaTransactionQuoteAsync(params, true);
        const { sellTokenToEthRate, buyTokenToEthRate } = quote;
        const commonQuoteFields = {
            price: quote.price,
            sellTokenAddress: params.sellTokenAddress,
            buyTokenAddress: params.buyTokenAddress,
            buyAmount: quote.buyAmount!,
            sellAmount: quote.sellAmount!,
            // orders: quote.orders,
            sources: quote.sources,
            gasPrice: quote.gasPrice,
            estimatedGas: quote.estimatedGas,
            gas: quote.estimatedGas,
            protocolFee: quote.protocolFee,
            minimumProtocolFee: quote.minimumProtocolFee,
            estimatedGasTokenRefund: ZERO,
            value: quote.protocolFee,
            allowanceTarget: quote.allowanceTarget,
            sellTokenToEthRate,
            buyTokenToEthRate,
            quoteReport: quote.quoteReport,
        };

        const shouldLogQuoteReport = quote.quoteReport && params.apiKey !== undefined;

        // Go through the Exchange Proxy.
        const epmtx = this._generateExchangeProxyMetaTransaction(
            quote.callData,
            quote.taker,
            normalizeGasPrice(quote.gasPrice),
            // calculateProtocolFeeRequiredForOrders(normalizeGasPrice(quote.gasPrice), quote.orders), // todo (xianny): HACK
            calculateProtocolFeeRequiredForOrders(normalizeGasPrice(quote.gasPrice), []),
        );

        const mtxHash = getExchangeProxyMetaTransactionHash(epmtx);

        // log quote report and associate with txn hash if this is an RFQT firm quote
        if (quote.quoteReport && shouldLogQuoteReport) {
            quoteReportUtils.logQuoteReport({
                submissionBy: 'metaTxn',
                quoteReport: quote.quoteReport,
                zeroExTransactionHash: mtxHash,
                buyTokenAddress: params.buyTokenAddress,
                sellTokenAddress: params.sellTokenAddress,
                buyAmount: params.buyAmount,
                sellAmount: params.sellAmount,
            });
        }
        return {
            ...commonQuoteFields,
            mtx: epmtx,
            mtxHash,
        };
    }

    public async findTransactionByHashAsync(refHash: string): Promise<TransactionEntity | undefined> {
        return this._transactionEntityRepository.findOne({
            where: [{ refHash }, { txHash: refHash }],
        });
    }

    public async validateTransactionIsFillableAsync(
        mtx: ExchangeProxyMetaTransactionWithoutDomain,
        signature: Signature,
    ): Promise<void> {
        const { executeCall, protocolFee, gasPrice } = this._getMetaTransactionExecutionDetails(mtx, signature);

        if (mtx.maxGasPrice.lt(gasPrice) || mtx.minGasPrice.gt(gasPrice)) {
            throw new Error('mtx gas price out of range');
        }
        if (!mtx.value.eq(protocolFee)) {
            throw new Error('mtx value mismatch');
        }
        if (mtx.sender !== NULL_ADDRESS) {
            throw new Error('mtx sender mismatch');
        }

        // Must not expire in the next 60 seconds.
        const sixtySecondsFromNow = (Date.now() + ONE_MINUTE_MS) / ONE_SECOND_MS;
        if (mtx.expirationTimeSeconds.lte(sixtySecondsFromNow)) {
            throw new Error('mtx expirationTimeSeconds in less than 60 seconds from now');
        }

        // Make sure gasPrice is not 3X the current fast EthGasStation gas price
        const currentFastGasPrice = await ethGasStationUtils.getGasPriceOrThrowAsync();
        // tslint:disable-next-line:custom-no-magic-numbers
        if (currentFastGasPrice.lt(gasPrice) && gasPrice.minus(currentFastGasPrice).gte(currentFastGasPrice.times(3))) {
            throw new Error('Gas price too high');
        }

        try {
            await executeCall.callAsync({
                gasPrice,
                from: PUBLIC_ADDRESS_FOR_ETH_CALLS,
                value: protocolFee,
                gas: DEFAULT_VALIDATION_GAS_LIMIT,
            });
        } catch (err) {
            // we reach into the underlying revert and throw it instead of
            // catching it at the MetaTransactionHandler level to provide more
            // information.
            if (err.values && err.values.errorData && err.values.errorData !== '0x') {
                throw RevertError.decode(err.values.errorData, false);
            }
            throw err;
        }
    }

    public getTransactionHash(mtx: ExchangeProxyMetaTransactionWithoutDomain): string {
        return getExchangeProxyMetaTransactionHash({
            ...mtx,
            domain: {
                chainId: CHAIN_ID,
                verifyingContract: this._contractWrappers.exchangeProxy.address,
            },
        });
    }

    public async generatePartialExecuteTransactionEthereumTransactionAsync(
        mtx: ExchangeProxyMetaTransactionWithoutDomain,
        signature: Signature,
    ): Promise<PartialTxParams> {
        const { callTarget, gasPrice, protocolFee, executeCall } = this._getMetaTransactionExecutionDetails(
            mtx,
            signature,
        );
        const gas = await executeCall.estimateGasAsync({
            from: PUBLIC_ADDRESS_FOR_ETH_CALLS,
            gasPrice,
            value: protocolFee,
        });
        const executeTxnCalldata = executeCall.getABIEncodedTransactionData();

        const ethereumTxnParams: PartialTxParams = {
            data: executeTxnCalldata,
            gas: gas.toString(),
            gasPrice: gasPrice.toString(),
            value: protocolFee.toString(),
            to: callTarget,
            chainId: CHAIN_ID,
            // NOTE we arent returning nonce and from fields back to the user
            nonce: '',
            from: '',
        };

        return ethereumTxnParams;
    }

    public async submitTransactionAsync(
        mtxHash: string,
        mtx: ExchangeProxyMetaTransactionWithoutDomain,
        signature: Signature,
        apiKey: string,
        affiliateAddress?: string,
    ): Promise<PostTransactionResponse> {
        const { callTarget, gasPrice, protocolFee, executeCall, signer } = this._getMetaTransactionExecutionDetails(
            mtx,
            signature,
        );

        const txCalldata = serviceUtils.attributeCallData(executeCall.getABIEncodedTransactionData(), affiliateAddress);
        const transactionEntity = TransactionEntity.make({
            apiKey,
            gasPrice,
            data: txCalldata.affiliatedData,
            refHash: mtxHash,
            status: TransactionStates.Unsubmitted,
            takerAddress: signer,
            to: callTarget,
            value: protocolFee,
            expectedMinedInSec: META_TXN_RELAY_EXPECTED_MINED_SEC,
        });
        await this._transactionEntityRepository.save(transactionEntity);
        const { txHash } = await this._waitUntilTxHashAsync(transactionEntity);
        return { txHash, mtxHash };
    }

    public async isSignerLiveAsync(): Promise<boolean> {
        const statusKV = await this._kvRepository.findOne(SIGNER_STATUS_DB_KEY);
        if (utils.isNil(statusKV) || utils.isNil(statusKV!.value)) {
            logger.error({
                message: `signer status entry is not present in the database`,
            });
            return false;
        }
        const signerStatus: TransactionWatcherSignerStatus = JSON.parse(statusKV!.value!);
        const hasUpdatedRecently =
            !utils.isNil(statusKV!.updatedAt) && statusKV!.updatedAt!.getTime() > Date.now() - TEN_MINUTES_MS;
        // tslint:disable-next-line:no-boolean-literal-compare
        return signerStatus.live === true && hasUpdatedRecently;
    }

    private async _waitUntilTxHashAsync(txEntity: TransactionEntity): Promise<TxHashObject> {
        return utils.runWithTimeout<TxHashObject>(async () => {
            while (true) {
                const tx = await this._transactionEntityRepository.findOne(txEntity.refHash);
                if (!utils.isNil(tx) && !utils.isNil(tx!.txHash) && !utils.isNil(tx!.data)) {
                    return { txHash: tx!.txHash! };
                }

                await utils.delayAsync(SUBMITTED_TX_DB_POLLING_INTERVAL_MS);
            }
        }, TX_HASH_RESPONSE_WAIT_TIME_MS);
    }

    private _generateExchangeProxyMetaTransaction(
        callData: string,
        takerAddress: string,
        gasPrice: BigNumber,
        protocolFee: BigNumber,
    ): ExchangeProxyMetaTransaction {
        return {
            callData,
            minGasPrice: gasPrice,
            maxGasPrice: gasPrice,
            expirationTimeSeconds: createExpirationTime(),
            salt: generatePseudoRandomSalt(),
            signer: takerAddress,
            sender: NULL_ADDRESS,
            feeAmount: ZERO,
            feeToken: NULL_ADDRESS,
            value: protocolFee,
            domain: {
                chainId: CHAIN_ID,
                verifyingContract: this._contractWrappers.exchangeProxy.address,
            },
        };
    }

    private async _calculateMetaTransactionQuoteAsync(
        params: CalculateMetaTransactionQuoteParams,
        isQuote: boolean = true,
    ): Promise<CalculateMetaTransactionQuoteResponse> {
        const quoteParams = {
            skipValidation: true,
            rfqt: {
                apiKey: params.apiKey,
                takerAddress: params.takerAddress,
                intentOnFilling: isQuote,
                isIndicative: !isQuote,
            },
            isMetaTransaction: true,
            ...params,
            // NOTE: Internally all ETH trades are for WETH, we just wrap/unwrap automatically
            buyToken: params.isETHBuy ? WETHToken.tokenAddress : params.buyTokenAddress,
            sellToken: params.sellTokenAddress,
            shouldSellEntireBalance: false,
            isWrap: false,
            isUnwrap: false,
        };

        const quote = await this._swapService.calculateSwapQuoteAsync(quoteParams);
        return {
            price: quote.price,
            gasPrice: quote.gasPrice,
            protocolFee: quote.protocolFee,
            sources: quote.sources,
            buyAmount: quote.buyAmount,
            sellAmount: quote.sellAmount,
            estimatedGas: quote.estimatedGas,
            allowanceTarget: quote.allowanceTarget,
            sellTokenToEthRate: quote.sellTokenToEthRate,
            buyTokenToEthRate: quote.buyTokenToEthRate,
            quoteReport: quote.quoteReport,
            callData: quote.data,
            minimumProtocolFee: quote.protocolFee,
            buyTokenAddress: params.buyTokenAddress,
            sellTokenAddress: params.sellTokenAddress,
            taker: params.takerAddress,
        };
    }

    private _calculateProtocolFeeRequiredForMetaTransaction(mtx: ExchangeProxyMetaTransactionWithoutDomain): BigNumber {
        const decoded = this._contractWrappers.getAbiDecoder().decodeCalldataOrThrow(mtx.callData, 'IZeroEx');
        const supportedFunctions = ['transformERC20'];
        if (!supportedFunctions.includes(decoded.functionName)) {
            throw new Error('unsupported meta-transaction function');
        }

        const transformations: Transformation[] = decoded.functionArguments.transformations;

        const fillQuoteTransformations = transformations.filter(
            t => t.deploymentNonce.toString() === this._fillQuoteTransformerDeploymentNonce.toString(),
        );

        if (fillQuoteTransformations.length === 0) {
            throw new Error('Could not find fill quote transformation in decoded calldata');
        }

        const totalProtocolFeeRequiredForOrders = fillQuoteTransformations.reduce((memo, transformation) => {
            const decodedFillQuoteTransformerData = decodeFillQuoteTransformerData(transformation.data);
            const protocolFee = calculateProtocolFeeRequiredForOrders(
                mtx.maxGasPrice,
                decodedFillQuoteTransformerData.orders,
            );

            return memo.plus(protocolFee);
        }, new BigNumber(0));

        return totalProtocolFeeRequiredForOrders;
    }

    private _getMetaTransactionExecutionDetails(
        mtx: ExchangeProxyMetaTransactionWithoutDomain,
        signature: Signature,
    ): {
        callTarget: string;
        executeCall: ContractTxFunctionObj<string>;
        protocolFee: BigNumber;
        gasPrice: BigNumber;
        signer: string;
    } {
        return {
            callTarget: this._contractWrappers.exchangeProxy.address,
            executeCall: this._contractWrappers.exchangeProxy.executeMetaTransaction(mtx, signature),
            protocolFee: this._calculateProtocolFeeRequiredForMetaTransaction(mtx),
            gasPrice: mtx.minGasPrice,
            signer: mtx.signer,
        };
    }
}

function normalizeGasPrice(gasPrice: BigNumber): BigNumber {
    return gasPrice
        .div(ONE_GWEI)
        .integerValue(BigNumber.ROUND_UP)
        .times(ONE_GWEI);
}

function createExpirationTime(): BigNumber {
    return new BigNumber(Date.now() + TEN_MINUTES_MS).div(ONE_SECOND_MS).integerValue(BigNumber.ROUND_CEIL);
}

function calculateProtocolFeeRequiredForOrders(gasPrice: BigNumber, orders: (SignedOrder | Order)[]): BigNumber {
    const nativeOrderCount = orders.filter(
        o => !assetDataUtils.isERC20BridgeAssetData(assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData)),
    ).length;
    return gasPrice.times(nativeOrderCount).times(PROTOCOL_FEE_MULTIPLIER);
}
// tslint:disable-next-line: max-file-line-count
