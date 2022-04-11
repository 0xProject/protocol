import {
    BigNumber,
    ERC20BridgeSource,
    ExtendedQuoteReport,
    ExtendedQuoteReportIndexedEntry,
    jsonifyFillData,
} from '@0x/asset-swapper';
import { Producer } from 'kafkajs';

import { KAFKA_TOPIC_QUOTE_REPORT } from '../config';
import { logger } from '../logger';
import { FirmOtcQuote, IndicativeQuote } from '../types';

import { numberUtils } from './number_utils';

interface ExtendedQuoteReportForRFQMLogOptions {
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    integratorId?: string;
    taker?: string;
    allQuotes: IndicativeQuote[] | FirmOtcQuote[];
    bestQuote: IndicativeQuote | FirmOtcQuote | null;
}

export const quoteReportUtils = {
    async publishRFQMQuoteReportAsync(
        logOpts: ExtendedQuoteReportForRFQMLogOptions,
        kafkaProducer: Producer,
    ): Promise<void> {
        if (kafkaProducer && KAFKA_TOPIC_QUOTE_REPORT) {
            const quoteId = numberUtils.randomHexNumberOfLength(10);
            logger.info(`Generating and pushing Quote report for: ${quoteId}`);

            let orderHash: string | undefined;
            if (logOpts.bestQuote && isFirmQuote(logOpts.bestQuote)) {
                orderHash = logOpts.bestQuote.order.getHash();
            }

            const sourcesConsidered = logOpts.allQuotes.map((quote, index): ExtendedQuoteReportIndexedEntry => {
                return {
                    quoteEntryIndex: index,
                    isDelivered: false,
                    liquiditySource: ERC20BridgeSource.Native,
                    makerAmount: isFirmQuote(quote) ? quote.order.makerAmount : quote.makerAmount,
                    takerAmount: isFirmQuote(quote) ? quote.order.takerAmount : quote.takerAmount,
                    fillableTakerAmount: isFirmQuote(quote) ? quote.order.takerAmount : quote.takerAmount,
                    isRFQ: true,
                    makerUri: quote.makerUri,
                    fillData: isFirmQuote(quote) ? quote.order : {},
                };
            });
            const bestQuote: ExtendedQuoteReportIndexedEntry | null = logOpts.bestQuote
                ? {
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
                  }
                : null;
            const extendedQuoteReport: ExtendedQuoteReport = {
                quoteId,
                taker: logOpts.taker,
                timestamp: Date.now(),
                firmQuoteReport: logOpts.allQuotes[0] ? isFirmQuote(logOpts.allQuotes[0]) : false,
                submissionBy: 'rfqm',
                buyAmount: logOpts.buyAmount ? logOpts.buyAmount.toString() : undefined,
                sellAmount: logOpts.sellAmount ? logOpts.sellAmount.toString() : undefined,
                buyTokenAddress: logOpts.buyTokenAddress,
                sellTokenAddress: logOpts.sellTokenAddress,
                integratorId: logOpts.integratorId,
                slippageBips: undefined,
                zeroExTransactionHash: orderHash,
                sourcesConsidered: sourcesConsidered.map(jsonifyFillData),
                sourcesDelivered: bestQuote ? [jsonifyFillData(bestQuote)] : undefined,
            };
            kafkaProducer.send({
                topic: KAFKA_TOPIC_QUOTE_REPORT,
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
