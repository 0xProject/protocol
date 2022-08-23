import { generatePseudoRandomSalt, getExchangeProxyMetaTransactionHash } from '@0x/order-utils';
import { getTokenMetadataIfExists } from '@0x/token-metadata';
import { ExchangeProxyMetaTransaction } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { ContractAddresses, QuoteReport, ZERO_AMOUNT } from '../asset-swapper';
import { CHAIN_ID, META_TX_EXPIRATION_BUFFER_MS } from '../config';
import { NULL_ADDRESS, ONE_GWEI, ONE_SECOND_MS, ZERO } from '../constants';
import {
    CalculateMetaTransactionQuoteParams,
    CalculateMetaTransactionQuoteResponse,
    GetMetaTransactionQuoteResponse,
    GetSwapQuoteParams,
    GetSwapQuoteResponse,
} from '../types';
import { quoteReportUtils } from '../utils/quote_report_utils';

const WETHToken = getTokenMetadataIfExists('WETH', CHAIN_ID)!;

interface SwapService {
    calculateSwapQuoteAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse>;
}

export class MetaTransactionService {
    private readonly _swapService: SwapService;
    private readonly _exchangeProxyAddress: string;

    constructor(swapService: SwapService, contractAddresses: ContractAddresses) {
        this._exchangeProxyAddress = contractAddresses.exchangeProxy;
        this._swapService = swapService;
    }

    public async calculateMetaTransactionPriceAsync(
        params: CalculateMetaTransactionQuoteParams,
    ): Promise<CalculateMetaTransactionQuoteResponse> {
        return this._calculateMetaTransactionQuoteAsync(params, 'price');
    }

    public async calculateMetaTransactionQuoteAsync(
        params: CalculateMetaTransactionQuoteParams,
    ): Promise<GetMetaTransactionQuoteResponse & { quoteReport?: QuoteReport }> {
        const quote = await this._calculateMetaTransactionQuoteAsync(params, 'quote');
        const { sellTokenToEthRate, buyTokenToEthRate } = quote;
        const commonQuoteFields = {
            chainId: quote.chainId,
            price: quote.price,
            estimatedPriceImpact: quote.estimatedPriceImpact,
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
            ZERO_AMOUNT, // protocol fee
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
                integratorId: params.apiKey,
                slippage: undefined,
                // TODO: if we ever want to turn metatxs back on we should return blocknumber here
                blockNumber: undefined,
                estimatedGas: quote.estimatedGas,
            });
        }
        return {
            ...commonQuoteFields,
            mtx: epmtx,
            mtxHash,
        };
    }

    private _generateExchangeProxyMetaTransaction(
        callData: string,
        takerAddress: string,
        _gasPrice: BigNumber,
        protocolFee: BigNumber,
    ): ExchangeProxyMetaTransaction {
        return {
            callData,
            minGasPrice: new BigNumber(1),
            maxGasPrice: new BigNumber(2).pow(32), // high value 0x100000000
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

    private async _calculateMetaTransactionQuoteAsync(
        params: CalculateMetaTransactionQuoteParams,
        endpoint: 'price' | 'quote',
    ): Promise<CalculateMetaTransactionQuoteResponse> {
        const quoteParams = {
            endpoint,
            skipValidation: true,
            // RFQT Disabled for MetaTxn
            // rfqt: {
            //     apiKey: params.apiKey,
            //     takerAddress: params.takerAddress,
            //     intentOnFilling: isQuote,
            //     isIndicative: !isQuote,
            // },
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
            quoteReport: quote.quoteReport,
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
