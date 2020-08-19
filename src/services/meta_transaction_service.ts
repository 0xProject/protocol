import {
    MarketBuySwapQuote,
    MarketSellSwapQuote,
    Orderbook,
    SwapQuoter,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
} from '@0x/asset-swapper';
import { ContractAddresses } from '@0x/contract-addresses';
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
    ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS,
    CHAIN_ID,
    META_TXN_RELAY_EXPECTED_MINED_SEC,
    META_TXN_SUBMIT_WHITELISTED_API_KEYS,
    SWAP_QUOTER_OPTS,
} from '../config';
import {
    DEFAULT_VALIDATION_GAS_LIMIT,
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
    CalculateMetaTransactionPriceResponse,
    CalculateMetaTransactionQuoteParams,
    GetMetaTransactionQuoteResponse,
    PostTransactionResponse,
    TransactionStates,
    TransactionWatcherSignerStatus,
    ZeroExTransactionWithoutDomain,
} from '../types';
import { ethGasStationUtils } from '../utils/gas_station_utils';
import { quoteReportUtils } from '../utils/quote_report_utils';
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
    private readonly _kvRepository: Repository<KeyValueEntity>;
    private readonly _contractAddresses: ContractAddresses;

    public static isEligibleForFreeMetaTxn(apiKey: string): boolean {
        return META_TXN_SUBMIT_WHITELISTED_API_KEYS.includes(apiKey);
    }
    private static _calculateProtocolFee(numOrders: number, gasPrice: BigNumber): BigNumber {
        return new BigNumber(70000).times(gasPrice).times(numOrders);
    }
    constructor(
        orderbook: Orderbook,
        provider: SupportedProvider,
        dbConnection: Connection,
        contractAddresses: ContractAddresses,
    ) {
        this._provider = provider;
        const swapQuoterOpts: Partial<SwapQuoterOpts> = {
            ...SWAP_QUOTER_OPTS,
            rfqt: {
                ...SWAP_QUOTER_OPTS.rfqt,
                warningLogger: logger.warn.bind(logger),
                infoLogger: logger.info.bind(logger),
            },
            contractAddresses,
        };
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._contractWrappers = new ContractWrappers(this._provider, { chainId: CHAIN_ID, contractAddresses });
        this._web3Wrapper = new Web3Wrapper(this._provider);
        this._devUtils = new DevUtilsContract(this._contractWrappers.contractAddresses.devUtils, this._provider);
        this._connection = dbConnection;
        this._transactionEntityRepository = this._connection.getRepository(TransactionEntity);
        this._kvRepository = this._connection.getRepository(KeyValueEntity);
        this._contractAddresses = contractAddresses;
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
        const assetSwapperOpts: Partial<SwapQuoteRequestOpts> = {
            ...ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS,
            bridgeSlippage: slippagePercentage,
            excludedSources: ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS.excludedSources.concat(...(excludedSources || [])),
            rfqt: _rfqt,
        };

        let swapQuote: MarketSellSwapQuote | MarketBuySwapQuote | undefined;
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
        const { gasPrice, quoteReport } = swapQuote;
        const { gas, protocolFeeInWeiAmount: protocolFee } = swapQuote.worstCaseQuoteInfo;
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
        const allowanceTarget = this._contractAddresses.erc20Proxy;

        const response: CalculateMetaTransactionPriceResponse = {
            takerAddress,
            buyAmount: makerAssetAmount,
            sellAmount: totalTakerAssetAmount,
            price,
            swapQuote,
            sources: serviceUtils.convertSourceBreakdownToArray(swapQuote.sourceBreakdown),
            estimatedGas: new BigNumber(gas),
            gasPrice,
            protocolFee,
            minimumProtocolFee: protocolFee,
            allowanceTarget,
            quoteReport,
        };
        return response;
    }
    public async calculateMetaTransactionQuoteAsync(
        params: CalculateMetaTransactionQuoteParams,
    ): Promise<GetMetaTransactionQuoteResponse> {
        const {
            takerAddress,
            sellAmount,
            buyAmount,
            swapQuote,
            price,
            estimatedGas,
            protocolFee,
            minimumProtocolFee,
            quoteReport,
        } = await this.calculateMetaTransactionPriceAsync(params, 'quote');

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

        // log quote report and associate with txn hash if this is an RFQT firm quote
        if (quoteReport) {
            quoteReportUtils.logQuoteReport({ submissionBy: 'metaTxn', quoteReport, zeroExTransactionHash });
        }

        const makerAssetAmount = swapQuote.bestCaseQuoteInfo.makerAssetAmount;
        const totalTakerAssetAmount = swapQuote.bestCaseQuoteInfo.totalTakerAssetAmount;
        const allowanceTarget = this._contractAddresses.erc20Proxy;
        const apiMetaTransactionQuote: GetMetaTransactionQuoteResponse = {
            price,
            sellTokenAddress: params.sellTokenAddress,
            buyTokenAddress: params.buyTokenAddress,
            zeroExTransactionHash,
            zeroExTransaction,
            buyAmount: makerAssetAmount,
            sellAmount: totalTakerAssetAmount,
            orders: serviceUtils.cleanSignedOrderFields(orders),
            sources: serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
            gasPrice,
            estimatedGas,
            gas: estimatedGas,
            protocolFee,
            minimumProtocolFee,
            estimatedGasTokenRefund: ZERO,
            value: protocolFee,
            allowanceTarget,
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
        const sixtySecondsFromNow = new BigNumber(Date.now() + ONE_MINUTE_MS).dividedBy(ONE_SECOND_MS);
        if (zeroExTransaction.expirationTimeSeconds.lte(sixtySecondsFromNow)) {
            throw new Error('zeroExTransaction expirationTimeSeconds in less than 60 seconds from now');
        }

        const [, orders] = await this._devUtils.decodeZeroExTransactionData(zeroExTransaction.data).callAsync();

        const gasPrice = zeroExTransaction.gasPrice;
        const currentFastGasPrice = await ethGasStationUtils.getGasPriceOrThrowAsync();
        // Make sure gasPrice is not 3X the current fast EthGasStation gas price
        // tslint:disable-next-line:custom-no-magic-numbers
        if (currentFastGasPrice.lt(gasPrice) && gasPrice.minus(currentFastGasPrice).gte(currentFastGasPrice.times(3))) {
            throw new Error('Gas price too high');
        }

        const protocolFee = MetaTransactionService._calculateProtocolFee(orders.length, gasPrice);

        try {
            await this._contractWrappers.exchange.executeTransaction(zeroExTransaction, signature).callAsync({
                from: PUBLIC_ADDRESS_FOR_ETH_CALLS,
                gasPrice,
                value: protocolFee,
                gas: DEFAULT_VALIDATION_GAS_LIMIT,
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
        apiKey: string,
        affiliateAddress?: string,
    ): Promise<PostTransactionResponse> {
        const data = serviceUtils.attributeCallData(
            this._contractWrappers.exchange
                .executeTransaction(zeroExTransaction, signature)
                .getABIEncodedTransactionData(),
            affiliateAddress,
        );
        const transactionEntity = TransactionEntity.make({
            refHash: zeroExTransactionHash,
            status: TransactionStates.Unsubmitted,
            takerAddress: zeroExTransaction.signerAddress,
            to: this._contractWrappers.exchange.address,
            data: data.affiliatedData,
            value: protocolFee,
            apiKey,
            gasPrice: zeroExTransaction.gasPrice,
            expectedMinedInSec: META_TXN_RELAY_EXPECTED_MINED_SEC,
        });
        await this._transactionEntityRepository.save(transactionEntity);
        const { ethereumTransactionHash } = await this._waitUntilTxHashAsync(transactionEntity);
        return {
            ethereumTransactionHash,
            zeroExTransactionHash,
        };
    }
    public async isSignerLiveAsync(): Promise<boolean> {
        const statusKV = await this._kvRepository.findOne(SIGNER_STATUS_DB_KEY);
        if (utils.isNil(statusKV) || utils.isNil(statusKV.value)) {
            logger.error({
                message: `signer status entry is not present in the database`,
            });
            return false;
        }
        const signerStatus: TransactionWatcherSignerStatus = JSON.parse(statusKV.value);
        const hasUpdatedRecently =
            !utils.isNil(statusKV.updatedAt) && statusKV.updatedAt.getTime() > Date.now() - TEN_MINUTES_MS;
        // tslint:disable-next-line:no-boolean-literal-compare
        return signerStatus.live === true && hasUpdatedRecently;
    }
    private async _waitUntilTxHashAsync(txEntity: TransactionEntity): Promise<{ ethereumTransactionHash: string }> {
        return utils.runWithTimeout(async () => {
            while (true) {
                const tx = await this._transactionEntityRepository.findOne(txEntity.refHash);
                if (!utils.isNil(tx) && !utils.isNil(tx.txHash) && !utils.isNil(tx.data)) {
                    return { ethereumTransactionHash: tx.txHash };
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
