import {
    ERC20BridgeSource,
    ExtendedQuoteReport,
    ExtendedQuoteReportIndexedEntryOutbound,
    jsonifyFillData,
} from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import { Producer } from 'kafkajs';

import { StoredFee } from '../entities/types';
import { logger } from '../logger';
import { FirmOtcQuote, IndicativeQuote } from '../types';

import { numberUtils } from './number_utils';

type ExtendedQuoteReportEntryWithIntermediateQuote = ExtendedQuoteReportIndexedEntryOutbound & {
    isIntermediate: boolean;
};

type ExtendedQuoteReportWithIntermediateQuote = Omit<ExtendedQuoteReport, 'sourcesConsidered'> & {
    sourcesConsidered: ExtendedQuoteReportEntryWithIntermediateQuote[];
};

type ExtendedQuoteReportWithFee = ExtendedQuoteReportWithIntermediateQuote & {
    fee: StoredFee;
    ammQuoteUniqueId?: string;
};

interface ExtendedQuoteReportForRFQMLogOptions {
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    integratorId?: string;
    taker?: string;
    finalQuotes: IndicativeQuote[] | FirmOtcQuote[];
    intermediateQuotes: IndicativeQuote[];
    bestQuote: IndicativeQuote | FirmOtcQuote | null;
    fee: StoredFee;
    ammQuoteUniqueId?: string;
}

export const quoteReportUtils = {
    async publishRFQMQuoteReportAsync(
        logOpts: ExtendedQuoteReportForRFQMLogOptions,
        kafkaProducer: Producer,
        quoteReportTopic?: string,
    ): Promise<void> {
        if (kafkaProducer && quoteReportTopic) {
            const quoteId = numberUtils.randomHexNumberOfLength(10);
            logger.info(`Generating and pushing Quote report for: ${quoteId}`);

            let orderHash: string | undefined;
            if (logOpts.bestQuote && isFirmQuote(logOpts.bestQuote)) {
                orderHash = logOpts.bestQuote.order.getHash();
            }

            const finalQuotes = logOpts.finalQuotes.map(
                (quote, index): ExtendedQuoteReportEntryWithIntermediateQuote => {
                    return {
                        ...jsonifyFillData({
                            quoteEntryIndex: index,
                            isDelivered: false,
                            liquiditySource: ERC20BridgeSource.Native,
                            makerAmount: isFirmQuote(quote) ? quote.order.makerAmount : quote.makerAmount,
                            takerAmount: isFirmQuote(quote) ? quote.order.takerAmount : quote.takerAmount,
                            fillableTakerAmount: isFirmQuote(quote) ? quote.order.takerAmount : quote.takerAmount,
                            isRFQ: true,
                            makerUri: quote.makerUri,
                            fillData: isFirmQuote(quote) ? quote.order : {},
                        }),
                        isIntermediate: false,
                    };
                },
            );

            const intermediateQuotes = logOpts.intermediateQuotes.map(
                (quote, index): ExtendedQuoteReportEntryWithIntermediateQuote => {
                    return {
                        ...jsonifyFillData({
                            quoteEntryIndex: index,
                            isDelivered: false,
                            liquiditySource: ERC20BridgeSource.Native,
                            makerAmount: isFirmQuote(quote) ? quote.order.makerAmount : quote.makerAmount,
                            takerAmount: isFirmQuote(quote) ? quote.order.takerAmount : quote.takerAmount,
                            fillableTakerAmount: isFirmQuote(quote) ? quote.order.takerAmount : quote.takerAmount,
                            isRFQ: true,
                            makerUri: quote.makerUri,
                            fillData: isFirmQuote(quote) ? quote.order : {},
                        }),
                        isIntermediate: true,
                    };
                },
            );

            const sourcesDelivered: ExtendedQuoteReportIndexedEntryOutbound[] | undefined = logOpts.bestQuote
                ? [
                      jsonifyFillData({
                          quoteEntryIndex: 0,
                          isDelivered: true,
                          liquiditySource: ERC20BridgeSource.Native,
                          makerAmount: isFirmQuote(logOpts.bestQuote)
                              ? logOpts.bestQuote?.order.makerAmount
                              : logOpts.bestQuote?.makerAmount,
                          takerAmount: isFirmQuote(logOpts.bestQuote)
                              ? logOpts.bestQuote?.order.takerAmount
                              : logOpts.bestQuote?.takerAmount,
                          fillableTakerAmount: isFirmQuote(logOpts.bestQuote)
                              ? logOpts.bestQuote?.order.takerAmount
                              : logOpts.bestQuote?.takerAmount,
                          isRFQ: true,
                          makerUri: logOpts.bestQuote?.makerUri,
                          fillData: isFirmQuote(logOpts.bestQuote) ? logOpts.bestQuote?.order : {},
                      }),
                  ]
                : undefined;
            const extendedQuoteReport: ExtendedQuoteReportWithFee = {
                quoteId,
                taker: logOpts.taker,
                timestamp: Date.now(),
                firmQuoteReport: logOpts.finalQuotes[0] ? isFirmQuote(logOpts.finalQuotes[0]) : false,
                submissionBy: 'rfqm',
                buyAmount: logOpts.buyAmount ? logOpts.buyAmount.toString() : undefined,
                sellAmount: logOpts.sellAmount ? logOpts.sellAmount.toString() : undefined,
                buyTokenAddress: logOpts.buyTokenAddress,
                sellTokenAddress: logOpts.sellTokenAddress,
                integratorId: logOpts.integratorId,
                slippageBips: undefined,
                zeroExTransactionHash: orderHash,
                sourcesConsidered: finalQuotes.concat(intermediateQuotes),
                sourcesDelivered,
                fee: logOpts.fee,
                ammQuoteUniqueId: logOpts.ammQuoteUniqueId,
            };
            kafkaProducer.send({
                topic: quoteReportTopic,
                messages: [
                    {
                        value: JSON.stringify(extendedQuoteReport),
                    },
                ],
            });
        }
    },
};

function isFirmQuote(quote: FirmOtcQuote | IndicativeQuote): quote is FirmOtcQuote {
    return (quote as FirmOtcQuote).order !== undefined;
}
