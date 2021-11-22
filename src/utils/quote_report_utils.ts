import {
    BigNumber,
    ERC20BridgeSource,
    ExtendedQuoteReport,
    ExtendedQuoteReportIndexedEntry,
    jsonifyFillData,
    V4RFQIndicativeQuoteMM,
} from '@0x/asset-swapper';
import { Producer } from 'kafkajs';

import { KAFKA_TOPIC_QUOTE_REPORT } from '../config';
import { logger } from '../logger';
import { FirmQuote } from '../types';

import { numberUtils } from './number_utils';

interface ExtendedQuoteReportForRFQMLogOptions {
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    integratorId?: string;
    taker?: string;
    allQuotes: V4RFQIndicativeQuoteMM[] | FirmQuote[];
    bestQuote: V4RFQIndicativeQuoteMM | FirmQuote | null;
}

export const quoteReportUtils = {
    publishRFQMQuoteReport(logOpts: ExtendedQuoteReportForRFQMLogOptions, kafkaProducer: Producer): void {
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
                firmQuoteReport: isFirmQuote(logOpts.allQuotes[0]),
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

function isFirmQuote(quote: FirmQuote | V4RFQIndicativeQuoteMM): quote is FirmQuote {
    return (quote as FirmQuote).order !== undefined;
}
