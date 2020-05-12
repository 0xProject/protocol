import { Orderbook, SwapQuoter, SwapQuoterOpts } from '@0x/asset-swapper';
import { ContractWrappers } from '@0x/contract-wrappers';
import { DevUtilsContract } from '@0x/contracts-dev-utils';
import { generatePseudoRandomSalt, SupportedProvider, ZeroExTransaction } from '@0x/order-utils';
import { PartialTxParams } from '@0x/subproviders';
import { SignedOrder } from '@0x/types';
import { BigNumber, RevertError } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { utils as web3WrapperUtils } from '@0x/web3-wrapper/lib/src/utils';
import { Connection, Repository } from 'typeorm';

import {
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    CHAIN_ID,
    LIQUIDITY_POOL_REGISTRY_ADDRESS,
    META_TXN_RELAY_EXPECTED_MINED_SEC,
    WHITELISTED_API_KEYS_META_TXN_SUBMIT,
} from '../config';
import {
    ONE_GWEI,
    ONE_SECOND_MS,
    PUBLIC_ADDRESS_FOR_ETH_CALLS,
    QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    SUBMITTED_TX_DB_POLLING_INTERVAL_MS,
    TEN_MINUTES_MS,
    TX_HASH_RESPONSE_WAIT_TIME_MS,
} from '../constants';
import { TransactionEntity } from '../entities';
import {
    CalculateMetaTransactionPriceResponse,
    CalculateMetaTransactionQuoteParams,
    GetMetaTransactionQuoteResponse,
    PostTransactionResponse,
    TransactionStates,
    ZeroExTransactionWithoutDomain,
} from '../types';
import { ethGasStationUtils } from '../utils/gas_station_utils';
import { serviceUtils } from '../utils/service_utils';
import { utils } from '../utils/utils';

export class MetaTransactionService {
    private readonly _provider: SupportedProvider;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _contractWrappers: ContractWrappers;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _devUtils: DevUtilsContract;
    private readonly _connection: Connection;
    private readonly _transactionEntityRepository: Repository<TransactionEntity>;

    public static isEligibleForFreeMetaTxn(apiKey: string): boolean {
        return WHITELISTED_API_KEYS_META_TXN_SUBMIT.includes(apiKey);
    }
    private static _calculateProtocolFee(numOrders: number, gasPrice: BigNumber): BigNumber {
        return new BigNumber(150000).times(gasPrice).times(numOrders);
    }
    constructor(orderbook: Orderbook, provider: SupportedProvider, dbConnection: Connection) {
        this._provider = provider;
        const swapQuoterOpts: Partial<SwapQuoterOpts> = {
            chainId: CHAIN_ID,
            expiryBufferMs: QUOTE_ORDER_EXPIRATION_BUFFER_MS,
            liquidityProviderRegistryAddress: LIQUIDITY_POOL_REGISTRY_ADDRESS,
        };
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._contractWrappers = new ContractWrappers(this._provider, { chainId: CHAIN_ID });
        this._web3Wrapper = new Web3Wrapper(this._provider);
        this._devUtils = new DevUtilsContract(this._contractWrappers.contractAddresses.devUtils, this._provider);
        this._connection = dbConnection;
        this._transactionEntityRepository = this._connection.getRepository(TransactionEntity);
    }
    public async calculateMetaTransactionPriceAsync(
        params: CalculateMetaTransactionQuoteParams,
        endpoint: 'price' | 'quote',
    ): Promise<CalculateMetaTransactionPriceResponse> {
        const {
            takerAddress,
            sellAmount,
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            slippagePercentage,
            excludedSources,
            apiKey,
        } = params;

        let _rfqt;
        if (apiKey !== undefined) {
            _rfqt = {
                intentOnFilling: endpoint === 'quote',
                isIndicative: endpoint === 'price',
                apiKey,
                takerAddress,
            };
        }
        const assetSwapperOpts = {
            ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
            slippagePercentage,
            bridgeSlippage: slippagePercentage,
            excludedSources, // TODO(dave4506): overrides the excluded sources selected by chainId
            rfqt: _rfqt,
        };

        let swapQuote;
        if (sellAmount !== undefined) {
            swapQuote = await this._swapQuoter.getMarketSellSwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                sellAmount,
                assetSwapperOpts,
            );
        } else if (buyAmount !== undefined) {
            swapQuote = await this._swapQuoter.getMarketBuySwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                assetSwapperOpts,
            );
        } else {
            throw new Error('sellAmount or buyAmount required');
        }

        const makerAssetAmount = swapQuote.bestCaseQuoteInfo.makerAssetAmount;
        const totalTakerAssetAmount = swapQuote.bestCaseQuoteInfo.totalTakerAssetAmount;

        const buyTokenDecimals = await serviceUtils.fetchTokenDecimalsIfRequiredAsync(
            buyTokenAddress,
            this._web3Wrapper,
        );
        const sellTokenDecimals = await serviceUtils.fetchTokenDecimalsIfRequiredAsync(
            sellTokenAddress,
            this._web3Wrapper,
        );
        const unitMakerAssetAmount = Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
        const unitTakerAssetAMount = Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
        const price =
            buyAmount === undefined
                ? unitMakerAssetAmount.dividedBy(unitTakerAssetAMount).decimalPlaces(sellTokenDecimals)
                : unitTakerAssetAMount.dividedBy(unitMakerAssetAmount).decimalPlaces(buyTokenDecimals);

        const response: CalculateMetaTransactionPriceResponse = {
            takerAddress,
            sellAmount,
            buyAmount,
            price,
            swapQuote,
            sources: serviceUtils.convertSourceBreakdownToArray(swapQuote.sourceBreakdown),
        };
        return response;
    }
    public async calculateMetaTransactionQuoteAsync(
        params: CalculateMetaTransactionQuoteParams,
    ): Promise<GetMetaTransactionQuoteResponse> {
        const { takerAddress, sellAmount, buyAmount, swapQuote, price } = await this.calculateMetaTransactionPriceAsync(
            params,
            'quote',
        );

        const floatGasPrice = swapQuote.gasPrice;
        const gasPrice = floatGasPrice
            .div(ONE_GWEI)
            .integerValue(BigNumber.ROUND_UP)
            .times(ONE_GWEI);
        const attributedSwapQuote = serviceUtils.attributeSwapQuoteOrders(swapQuote);
        const { orders, sourceBreakdown } = attributedSwapQuote;
        const signatures = orders.map(order => order.signature);

        const zeroExTransaction = this._generateZeroExTransaction(
            orders,
            sellAmount,
            buyAmount,
            signatures,
            takerAddress,
            gasPrice,
        );

        // use the DevUtils contract to generate the transaction hash
        const zeroExTransactionHash = await this._devUtils
            .getTransactionHash(
                zeroExTransaction,
                new BigNumber(CHAIN_ID),
                this._contractWrappers.contractAddresses.exchange,
            )
            .callAsync();

        const makerAssetAmount = swapQuote.bestCaseQuoteInfo.makerAssetAmount;
        const totalTakerAssetAmount = swapQuote.bestCaseQuoteInfo.totalTakerAssetAmount;
        const apiMetaTransactionQuote: GetMetaTransactionQuoteResponse = {
            price,
            zeroExTransactionHash,
            zeroExTransaction,
            buyAmount: makerAssetAmount,
            sellAmount: totalTakerAssetAmount,
            orders: serviceUtils.cleanSignedOrderFields(orders),
            sources: serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
        };
        return apiMetaTransactionQuote;
    }
    public async findTransactionByHashAsync(refHash: string): Promise<TransactionEntity | undefined> {
        return this._transactionEntityRepository.findOne({
            where: [{ refHash }, { txHash: refHash }],
        });
    }
    public async validateZeroExTransactionFillAsync(
        zeroExTransaction: ZeroExTransactionWithoutDomain,
        signature: string,
    ): Promise<BigNumber> {
        // Verify 0x txn won't expire in next 60 seconds
        // tslint:disable-next-line:custom-no-magic-numbers
        const sixtySecondsFromNow = new BigNumber(Math.floor(new Date().getTime() / ONE_SECOND_MS) + 60);
        if (zeroExTransaction.expirationTimeSeconds.lte(sixtySecondsFromNow)) {
            throw new Error('zeroExTransaction expirationTimeSeconds in less than 60 seconds from now');
        }

        const [, orders] = await this._devUtils.decodeZeroExTransactionData(zeroExTransaction.data).callAsync();

        const gasPrice = zeroExTransaction.gasPrice;
        const currentFastGasPrice = await ethGasStationUtils.getGasPriceOrThrowAsync();
        // Make sure gasPrice is not 3X the current fast EthGasStation gas price
        // tslint:disable-next-line:custom-no-magic-numbers
        if (currentFastGasPrice.lt(gasPrice) && gasPrice.minus(currentFastGasPrice).gt(currentFastGasPrice.times(3))) {
            throw new Error('Gas price too high');
        }

        const protocolFee = MetaTransactionService._calculateProtocolFee(orders.length, gasPrice);

        try {
            await this._contractWrappers.exchange.executeTransaction(zeroExTransaction, signature).callAsync({
                from: PUBLIC_ADDRESS_FOR_ETH_CALLS,
                gasPrice,
                value: protocolFee,
            });
        } catch (err) {
            // we reach into the underlying revert and throw it instead of
            // catching it at the MetaTransactionHandler level to provide more
            // information.
            if (err.values && err.values.errorData && err.values.errorData !== '0x') {
                const decodedCallData = RevertError.decode(err.values.errorData, false);
                throw decodedCallData;
            }
            throw err;
        }

        return protocolFee;
    }
    public async getZeroExTransactionHashFromZeroExTransactionAsync(
        zeroExTransaction: ZeroExTransactionWithoutDomain,
    ): Promise<string> {
        return this._devUtils
            .getTransactionHash(
                zeroExTransaction,
                new BigNumber(CHAIN_ID),
                this._contractWrappers.contractAddresses.exchange,
            )
            .callAsync();
    }
    public async generatePartialExecuteTransactionEthereumTransactionAsync(
        zeroExTransaction: ZeroExTransactionWithoutDomain,
        signature: string,
        protocolFee: BigNumber,
    ): Promise<PartialTxParams> {
        const gasPrice = zeroExTransaction.gasPrice;
        // TODO(dekz): our pattern is to eth_call and estimateGas in parallel and return the result of eth_call validations
        const gas = await this._contractWrappers.exchange
            .executeTransaction(zeroExTransaction, signature)
            .estimateGasAsync({
                from: PUBLIC_ADDRESS_FOR_ETH_CALLS,
                gasPrice,
                value: protocolFee,
            });

        const executeTxnCalldata = this._contractWrappers.exchange
            .executeTransaction(zeroExTransaction, signature)
            .getABIEncodedTransactionData();

        const ethereumTxnParams: PartialTxParams = {
            data: executeTxnCalldata,
            gas: web3WrapperUtils.encodeAmountAsHexString(gas),
            gasPrice: web3WrapperUtils.encodeAmountAsHexString(gasPrice),
            value: web3WrapperUtils.encodeAmountAsHexString(protocolFee),
            to: this._contractWrappers.exchange.address,
            chainId: CHAIN_ID,
            // NOTE we arent returning nonce and from fields back to the user
            nonce: '',
            from: '',
        };

        return ethereumTxnParams;
    }
    public async submitZeroExTransactionAsync(
        zeroExTransactionHash: string,
        zeroExTransaction: ZeroExTransactionWithoutDomain,
        signature: string,
        protocolFee: BigNumber,
    ): Promise<PostTransactionResponse> {
        const transactionEntity = TransactionEntity.make({
            refHash: zeroExTransactionHash,
            status: TransactionStates.Unsubmitted,
            takerAddress: zeroExTransaction.signerAddress,
            zeroExTransaction,
            zeroExTransactionSignature: signature,
            protocolFee,
            gasPrice: zeroExTransaction.gasPrice,
            expectedMinedInSec: META_TXN_RELAY_EXPECTED_MINED_SEC,
        });
        await this._transactionEntityRepository.save(transactionEntity);
        const { ethereumTransactionHash, signedEthereumTransaction } = await this._waitUntilTxHashAsync(
            transactionEntity,
        );
        return {
            ethereumTransactionHash,
            signedEthereumTransaction,
        };
    }
    private async _waitUntilTxHashAsync(
        txEntity: TransactionEntity,
    ): Promise<{ ethereumTransactionHash: string; signedEthereumTransaction: string }> {
        return utils.runWithTimeout(async () => {
            while (true) {
                const tx = await this._transactionEntityRepository.findOne(txEntity.refHash);
                if (
                    tx !== undefined &&
                    tx.status === TransactionStates.Submitted &&
                    tx.txHash !== undefined &&
                    tx.signedTx !== undefined
                ) {
                    return { ethereumTransactionHash: tx.txHash, signedEthereumTransaction: tx.signedTx };
                }

                await utils.delayAsync(SUBMITTED_TX_DB_POLLING_INTERVAL_MS);
            }
        }, TX_HASH_RESPONSE_WAIT_TIME_MS);
    }
    private _generateZeroExTransaction(
        orders: SignedOrder[],
        sellAmount: BigNumber | undefined,
        buyAmount: BigNumber | undefined,
        signatures: string[],
        takerAddress: string,
        gasPrice: BigNumber,
    ): ZeroExTransaction {
        // generate txData for marketSellOrdersFillOrKill or marketBuyOrdersFillOrKill
        let txData;
        if (sellAmount !== undefined) {
            txData = this._contractWrappers.exchange
                .marketSellOrdersFillOrKill(orders, sellAmount, signatures)
                .getABIEncodedTransactionData();
        } else if (buyAmount !== undefined) {
            txData = this._contractWrappers.exchange
                .marketBuyOrdersFillOrKill(orders, buyAmount, signatures)
                .getABIEncodedTransactionData();
        } else {
            throw new Error('sellAmount or buyAmount required');
        }

        // generate the zeroExTransaction object
        const expirationTimeSeconds = new BigNumber(Date.now() + TEN_MINUTES_MS)
            .div(ONE_SECOND_MS)
            .integerValue(BigNumber.ROUND_CEIL);
        const zeroExTransaction: ZeroExTransaction = {
            data: txData,
            salt: generatePseudoRandomSalt(),
            signerAddress: takerAddress,
            gasPrice,
            expirationTimeSeconds,
            domain: {
                chainId: CHAIN_ID,
                verifyingContract: this._contractWrappers.contractAddresses.exchange,
            },
        };
        return zeroExTransaction;
    }
}
