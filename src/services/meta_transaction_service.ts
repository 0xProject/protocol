import { generatePseudoRandomSalt, getExchangeProxyMetaTransactionHash } from '@0x/order-utils';
import { MetaTransaction } from '@0x/protocol-utils';
import { ExchangeProxyMetaTransaction } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Kafka, Producer } from 'kafkajs';

import { ContractAddresses, AffiliateFeeType, NATIVE_FEE_TOKEN_BY_CHAIN_ID } from '../asset-swapper';
import { CHAIN_ID, FEE_RECIPIENT_ADDRESS, KAFKA_BROKERS, META_TX_EXPIRATION_BUFFER_MS } from '../config';
import { AFFILIATE_DATA_SELECTOR, NULL_ADDRESS, ONE_GWEI, ONE_SECOND_MS, ZERO } from '../constants';
import {
    MetaTransactionV1QuoteParams,
    GetSwapQuoteResponse,
    MetaTransactionV1QuoteResponse,
    AffiliateFee,
    IMetaTransactionService,
    MetaTransactionV1QuoteResult,
    MetaTransactionV2QuoteParams,
    MetaTransactionV2QuoteResponse,
    MetaTransactionV2QuoteResult,
    GetSwapQuoteParams,
} from '../types';
import { publishQuoteReport } from '../utils/quote_report_utils';
import { SwapService } from './swap_service';

let kafkaProducer: Producer | undefined;
if (KAFKA_BROKERS !== undefined) {
    const kafka = new Kafka({
        clientId: '0x-api',
        brokers: KAFKA_BROKERS,
    });

    kafkaProducer = kafka.producer();
    kafkaProducer.connect();
}

export class MetaTransactionService implements IMetaTransactionService {
    private readonly _swapService: SwapService;
    private readonly _exchangeProxyAddress: string;

    constructor(swapService: SwapService, contractAddresses: ContractAddresses) {
        this._exchangeProxyAddress = contractAddresses.exchangeProxy;
        this._swapService = swapService;
    }

    /**
     * Get meta-transaction v2 price. The function is currently a copy of (with minor modifications) `getMetaTransactionPriceAsync` for scaffolding.
     */
    public async getMetaTransactionV2PriceAsync(
        params: MetaTransactionV2QuoteParams,
    ): Promise<MetaTransactionV2QuoteResult> {
        return this._getMetaTransactionV2QuoteAsync(params, 'price');
    }

    /**
     * Get meta-transaction v2 quote. The function is currently a copy of (with minor modifications) `getMetaTransactionQuoteAsync` for scaffolding.
     */
    public async getMetaTransactionV2QuoteAsync(
        params: MetaTransactionV2QuoteParams,
    ): Promise<MetaTransactionV2QuoteResponse> {
        const quote = await this._getMetaTransactionV2QuoteAsync(params, 'quote');

        const commonQuoteFields = {
            chainId: quote.chainId,
            price: quote.price,
            estimatedPriceImpact: quote.estimatedPriceImpact,
            sellTokenAddress: params.sellTokenAddress,
            buyTokenAddress: params.buyTokenAddress,
            buyAmount: quote.buyAmount,
            sellAmount: quote.sellAmount,
            sources: quote.sources,
            gasPrice: quote.gasPrice,
            estimatedGas: quote.estimatedGas,
            gas: quote.estimatedGas,
            protocolFee: quote.protocolFee,
            minimumProtocolFee: quote.minimumProtocolFee,
            value: quote.protocolFee,
            allowanceTarget: quote.allowanceTarget,
            sellTokenToEthRate: quote.sellTokenToEthRate,
            buyTokenToEthRate: quote.buyTokenToEthRate,
        };

        // Generate meta-transaction
        switch (params.metaTransactionVersion) {
            case 'v1': {
                const metaTransaction = this._generateMetaTransactionV1(
                    quote.callData,
                    quote.taker,
                    ZERO, // protocol fee
                );
                return {
                    ...commonQuoteFields,
                    trade: {
                        kind: 'metatransaction',
                        hash: metaTransaction.getHash(),
                        metaTransaction,
                    },
                };
            }
            case 'v2':
            default:
                throw new Error(`metaTransactionVersion ${params.metaTransactionVersion} is not supported`);
        }
    }

    public async getMetaTransactionV1PriceAsync(
        params: MetaTransactionV1QuoteParams,
    ): Promise<MetaTransactionV1QuoteResult> {
        return this._getMetaTransactionQuoteAsync(params, 'price');
    }

    public async getMetaTransactionV1QuoteAsync(
        params: MetaTransactionV1QuoteParams,
    ): Promise<MetaTransactionV1QuoteResponse> {
        const quote = await this._getMetaTransactionQuoteAsync(params, 'quote');

        const commonQuoteFields = {
            chainId: quote.chainId,
            price: quote.price,
            estimatedPriceImpact: quote.estimatedPriceImpact,
            sellTokenAddress: params.sellTokenAddress,
            buyTokenAddress: params.buyTokenAddress,
            buyAmount: quote.buyAmount,
            sellAmount: quote.sellAmount,
            // orders: quote.orders,
            sources: quote.sources,
            gasPrice: quote.gasPrice,
            estimatedGas: quote.estimatedGas,
            gas: quote.estimatedGas,
            protocolFee: quote.protocolFee,
            minimumProtocolFee: quote.minimumProtocolFee,
            value: quote.protocolFee,
            allowanceTarget: quote.allowanceTarget,
            sellTokenToEthRate: quote.sellTokenToEthRate,
            buyTokenToEthRate: quote.buyTokenToEthRate,
        };

        // Go through the Exchange Proxy.
        const metaTransaction = this._generateExchangeProxyMetaTransaction(
            quote.callData,
            quote.taker,
            normalizeGasPrice(quote.gasPrice),
            ZERO, // protocol fee
        );

        const metaTransactionHash = getExchangeProxyMetaTransactionHash(metaTransaction);
        return {
            ...commonQuoteFields,
            metaTransaction,
            metaTransactionHash,
        };
    }

    // TODO: Remove this function and usages after /meta-transaction/v1 endpoints are deprecated
    private _generateExchangeProxyMetaTransaction(
        callData: string,
        takerAddress: string,
        _gasPrice: BigNumber,
        protocolFee: BigNumber,
    ): ExchangeProxyMetaTransaction {
        return {
            callData,
            minGasPrice: new BigNumber(1),
            maxGasPrice: new BigNumber(2).pow(48), // high value 0x1000000000000
            expirationTimeSeconds: createExpirationTime(),
            salt: generatePseudoRandomSalt(),
            signer: takerAddress,
            sender: NULL_ADDRESS,
            feeAmount: ZERO,
            feeToken: NULL_ADDRESS,
            value: protocolFee,
            domain: {
                chainId: CHAIN_ID,
                verifyingContract: this._exchangeProxyAddress,
            },
        };
    }

    /**
     * Generate meta-transaction v1. This should be used in favor of `_generateExchangeProxyMetaTransaction` which
     * exists for historic reason.
     */
    private _generateMetaTransactionV1(
        callData: string,
        takerAddress: string,
        protocolFee: BigNumber,
    ): MetaTransaction {
        return new MetaTransaction({
            callData,
            minGasPrice: ZERO,
            maxGasPrice: new BigNumber(2).pow(48), // high value 0x1000000000000
            expirationTimeSeconds: createExpirationTime(),
            salt: generatePseudoRandomSalt(),
            signer: takerAddress,
            sender: NULL_ADDRESS,
            feeAmount: ZERO,
            feeToken: NULL_ADDRESS,
            value: protocolFee,
            chainId: CHAIN_ID,
            verifyingContract: this._exchangeProxyAddress,
        });
    }

    /**
     * Internal function to get meta-transaction v2 quote. The function is currently a copy of (with minor modifications) `_getMetaTransactionQuoteAsync` for scaffolding.
     */
    private async _getMetaTransactionV2QuoteAsync(
        params: MetaTransactionV2QuoteParams,
        endpoint: 'price' | 'quote',
    ): Promise<MetaTransactionV2QuoteResult> {
        const wrappedNativeToken = NATIVE_FEE_TOKEN_BY_CHAIN_ID[CHAIN_ID];

        const quoteParams: GetSwapQuoteParams = {
            ...params,
            // NOTE: Internally all ETH trades are for WETH, we just wrap/unwrap automatically
            buyToken: params.isETHBuy ? wrappedNativeToken : params.buyTokenAddress,
            endpoint,
            isUnwrap: false,
            isWrap: false,
            metaTransactionVersion: 'v1',
            sellToken: params.sellTokenAddress,
            shouldSellEntireBalance: false,
            skipValidation: true,
            isDebugEnabled: false,
        };

        const quote = await this._swapService.calculateSwapQuoteAsync(quoteParams);

        // Quote Report
        if (endpoint === 'quote' && quote.extendedQuoteReportSources && kafkaProducer) {
            const quoteId = getQuoteIdFromSwapQuote(quote);
            publishQuoteReport(
                {
                    quoteId,
                    taker: params.takerAddress,
                    quoteReportSources: quote.extendedQuoteReportSources,
                    submissionBy: 'gaslessSwapAmm',
                    decodedUniqueId: params.quoteUniqueId ? params.quoteUniqueId : quote.decodedUniqueId,
                    buyTokenAddress: quote.buyTokenAddress,
                    sellTokenAddress: quote.sellTokenAddress,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    integratorId: params.integratorId,
                    blockNumber: quote.blockNumber,
                    slippage: params.slippagePercentage,
                    estimatedGas: quote.estimatedGas,
                    enableSlippageProtection: false,
                    expectedSlippage: quote.expectedSlippage,
                    estimatedPriceImpact: quote.estimatedPriceImpact,
                    priceImpactProtectionPercentage: params.priceImpactProtectionPercentage,
                },
                true,
                kafkaProducer,
            );
        }

        return {
            chainId: quote.chainId,
            price: quote.price,
            estimatedPriceImpact: quote.estimatedPriceImpact,
            gasPrice: quote.gasPrice,
            protocolFee: quote.protocolFee,
            sources: quote.sources,
            buyAmount: quote.buyAmount,
            sellAmount: quote.sellAmount,
            estimatedGas: quote.estimatedGas,
            allowanceTarget: quote.allowanceTarget,
            sellTokenToEthRate: quote.sellTokenToEthRate,
            buyTokenToEthRate: quote.buyTokenToEthRate,
            callData: quote.data,
            minimumProtocolFee: quote.protocolFee,
            buyTokenAddress: params.buyTokenAddress,
            sellTokenAddress: params.sellTokenAddress,
            taker: params.takerAddress,
        };
    }

    private async _getMetaTransactionQuoteAsync(
        params: MetaTransactionV1QuoteParams,
        endpoint: 'price' | 'quote',
    ): Promise<MetaTransactionV1QuoteResult> {
        const wrappedNativeToken = NATIVE_FEE_TOKEN_BY_CHAIN_ID[CHAIN_ID];

        const affiliateFee: AffiliateFee = {
            feeType: AffiliateFeeType.GaslessFee,
            recipient: FEE_RECIPIENT_ADDRESS,
        };
        const quoteParams: GetSwapQuoteParams = {
            ...params,
            // NOTE: Internally all ETH trades are for WETH, we just wrap/unwrap automatically
            buyToken: params.isETHBuy ? wrappedNativeToken : params.buyTokenAddress,
            endpoint,
            isUnwrap: false,
            isWrap: false,
            metaTransactionVersion: 'v1',
            sellToken: params.sellTokenAddress,
            shouldSellEntireBalance: false,
            skipValidation: true,
            affiliateFee,
            isDebugEnabled: false,
        };

        const quote = await this._swapService.calculateSwapQuoteAsync(quoteParams);

        // Quote Report
        if (endpoint === 'quote' && quote.extendedQuoteReportSources && kafkaProducer) {
            const quoteId = getQuoteIdFromSwapQuote(quote);
            publishQuoteReport(
                {
                    quoteId,
                    taker: params.takerAddress,
                    quoteReportSources: quote.extendedQuoteReportSources,
                    submissionBy: 'gaslessSwapAmm',
                    decodedUniqueId: params.quoteUniqueId ? params.quoteUniqueId : quote.decodedUniqueId,
                    buyTokenAddress: quote.buyTokenAddress,
                    sellTokenAddress: quote.sellTokenAddress,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    integratorId: params.integratorId,
                    blockNumber: quote.blockNumber,
                    slippage: params.slippagePercentage,
                    estimatedGas: quote.estimatedGas,
                    enableSlippageProtection: false,
                    expectedSlippage: quote.expectedSlippage,
                    estimatedPriceImpact: quote.estimatedPriceImpact,
                    priceImpactProtectionPercentage: params.priceImpactProtectionPercentage,
                },
                true,
                kafkaProducer,
            );
        }

        return {
            chainId: quote.chainId,
            price: quote.price,
            estimatedPriceImpact: quote.estimatedPriceImpact,
            gasPrice: quote.gasPrice,
            protocolFee: quote.protocolFee,
            sources: quote.sources,
            buyAmount: quote.buyAmount,
            sellAmount: quote.sellAmount,
            estimatedGas: quote.estimatedGas,
            allowanceTarget: quote.allowanceTarget,
            sellTokenToEthRate: quote.sellTokenToEthRate,
            buyTokenToEthRate: quote.buyTokenToEthRate,
            callData: quote.data,
            minimumProtocolFee: quote.protocolFee,
            buyTokenAddress: params.buyTokenAddress,
            sellTokenAddress: params.sellTokenAddress,
            taker: params.takerAddress,
        };
    }
}

function normalizeGasPrice(gasPrice: BigNumber): BigNumber {
    return gasPrice.div(ONE_GWEI).integerValue(BigNumber.ROUND_UP).times(ONE_GWEI);
}

function createExpirationTime(): BigNumber {
    return new BigNumber(Date.now() + META_TX_EXPIRATION_BUFFER_MS)
        .div(ONE_SECOND_MS)
        .integerValue(BigNumber.ROUND_CEIL);
}

/*
 * Extract the quote ID from the quote filldata
 */
function getQuoteIdFromSwapQuote(quote: GetSwapQuoteResponse): string {
    const bytesPos = quote.data.indexOf(AFFILIATE_DATA_SELECTOR);
    const quoteIdOffset = 118; // Offset of quoteId from Affiliate data selector
    const startingIndex = bytesPos + quoteIdOffset;
    const quoteId = quote.data.slice(startingIndex, startingIndex + 10);
    return quoteId;
}
