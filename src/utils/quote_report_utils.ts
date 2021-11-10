import type { PinoLogger } from '@0x/api-utils';
import {
    BigNumber,
    ExtendedQuoteReport,
    ExtendedQuoteReportSources,
    jsonifyFillData,
    QuoteReport,
    QuoteReportEntry,
    SignedNativeOrder,
} from '@0x/asset-swapper';
import { Producer } from 'kafkajs';
import _ = require('lodash');

import { KAFKA_TOPIC_QUOTE_REPORT } from '../config';
import { NUMBER_SOURCES_PER_LOG_LINE } from '../constants';
import { logger } from '../logger';

interface QuoteReportLogOptionsBase {
    quoteId?: string;
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    integratorId?: string;
    taker?: string;
    slippage: number | undefined;
}
interface QuoteReportForTakerTxn extends QuoteReportLogOptionsBase {
    quoteReport: QuoteReport;
    submissionBy: 'taker';
    decodedUniqueId: string;
}
interface QuoteReportForMetaTxn extends QuoteReportLogOptionsBase {
    quoteReport: QuoteReport;
    submissionBy: 'metaTxn';
    zeroExTransactionHash: string;
}
interface ExtendedQuoteReportForTakerTxn extends QuoteReportLogOptionsBase {
    quoteReportSources: ExtendedQuoteReportSources;
    submissionBy: 'taker';
    decodedUniqueId: string;
}
interface ExtendedQuoteReportForMetaTxn extends QuoteReportLogOptionsBase {
    quoteReportSources: ExtendedQuoteReportSources;
    submissionBy: 'metaTxn';
    zeroExTransactionHash: string;
}

export interface WrappedSignedNativeOrderMM {
    order: SignedNativeOrder;
    makerUri: string;
}

type QuoteReportLogOptions = QuoteReportForTakerTxn | QuoteReportForMetaTxn;
type ExtendedQuoteReportLogOptions = ExtendedQuoteReportForTakerTxn | ExtendedQuoteReportForMetaTxn;

const BIPS_IN_INT = 10000;

/**
 * In order to avoid the logger to output unnecessary data that break the Quote Report ETL
 * proess, we intentionally exclude fields that can contain huge output data.
 * @param source the quote report source
 */
const omitFillData = (source: QuoteReportEntry) => {
    return {
        ...source,
        fillData: undefined,
    };
};

export const quoteReportUtils = {
    logQuoteReport(logOpts: QuoteReportLogOptions, contextLogger?: PinoLogger): void {
        const _logger = contextLogger ? contextLogger : logger;
        // NOTE: Removes bridge report fillData which we do not want to log to Kibana
        const qr: QuoteReport = {
            ...logOpts.quoteReport,
            sourcesConsidered: logOpts.quoteReport.sourcesConsidered.map(
                (source) => _.omit(source, ['fillData']) as QuoteReportEntry,
            ),
        };

        let logBase: { [key: string]: string | boolean | undefined } = {
            firmQuoteReport: true,
            submissionBy: logOpts.submissionBy,
            buyAmount: logOpts.buyAmount ? logOpts.buyAmount.toString() : undefined,
            sellAmount: logOpts.sellAmount ? logOpts.sellAmount.toString() : undefined,
            buyTokenAddress: logOpts.buyTokenAddress,
            sellTokenAddress: logOpts.sellTokenAddress,
            integratorId: logOpts.integratorId,
        };
        if (logOpts.submissionBy === 'metaTxn') {
            logBase = { ...logBase, zeroExTransactionHash: logOpts.zeroExTransactionHash };
        } else if (logOpts.submissionBy === 'taker') {
            logBase = { ...logBase, decodedUniqueId: logOpts.decodedUniqueId };
        }

        // Deliver in chunks since Kibana can't handle logs large requests
        const sourcesConsideredChunks = _.chunk(qr.sourcesConsidered.map(omitFillData), NUMBER_SOURCES_PER_LOG_LINE);
        sourcesConsideredChunks.forEach((chunk, i) => {
            _logger.info({
                ...logBase,
                sourcesConsidered: chunk,
                sourcesConsideredChunkIndex: i,
                sourcesConsideredChunkLength: sourcesConsideredChunks.length,
            });
        });
        const sourcesDeliveredChunks = _.chunk(qr.sourcesDelivered.map(omitFillData), NUMBER_SOURCES_PER_LOG_LINE);
        sourcesDeliveredChunks.forEach((chunk, i) => {
            _logger.info({
                ...logBase,
                sourcesDelivered: chunk,
                sourcesDeliveredChunkIndex: i,
                sourcesDeliveredChunkLength: sourcesDeliveredChunks.length,
            });
        });
    },
    publishQuoteReport(logOpts: ExtendedQuoteReportLogOptions, isFirmQuote: boolean, kafkaProducer: Producer): void {
        if (kafkaProducer && KAFKA_TOPIC_QUOTE_REPORT) {
            const extendedQuoteReport: ExtendedQuoteReport = {
                quoteId: logOpts.quoteId,
                taker: logOpts.taker,
                timestamp: Date.now(),
                firmQuoteReport: isFirmQuote,
                submissionBy: logOpts.submissionBy,
                buyAmount: logOpts.buyAmount ? logOpts.buyAmount.toString() : undefined,
                sellAmount: logOpts.sellAmount ? logOpts.sellAmount.toString() : undefined,
                buyTokenAddress: logOpts.buyTokenAddress,
                sellTokenAddress: logOpts.sellTokenAddress,
                integratorId: logOpts.integratorId,
                slippageBips: logOpts.slippage ? logOpts.slippage * BIPS_IN_INT : undefined,
                zeroExTransactionHash: logOpts.submissionBy === 'metaTxn' ? logOpts.zeroExTransactionHash : undefined,
                decodedUniqueId: logOpts.submissionBy === 'taker' ? logOpts.decodedUniqueId : undefined,
                sourcesConsidered: logOpts.quoteReportSources.sourcesConsidered.map(jsonifyFillData),
                sourcesDelivered: logOpts.quoteReportSources.sourcesDelivered?.map(jsonifyFillData),
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
