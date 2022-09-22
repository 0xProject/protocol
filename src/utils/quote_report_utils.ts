import type { PinoLogger } from '@0x/api-utils';
import { Producer } from 'kafkajs';
import _ = require('lodash');

import {
    BigNumber,
    ExtendedQuoteReport,
    ExtendedQuoteReportSources,
    jsonifyFillData,
    QuoteReport,
    QuoteReportEntry,
    SignedNativeOrder,
} from '../asset-swapper';
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
    blockNumber: number | undefined;
    estimatedGas: BigNumber;
}
interface QuoteReportForTakerTxn extends QuoteReportLogOptionsBase {
    quoteReport: QuoteReport;
    submissionBy: 'taker';
    decodedUniqueId: string;
}
interface ExtendedQuoteReportForTakerTxn extends QuoteReportLogOptionsBase {
    quoteReportSources: ExtendedQuoteReportSources;
    submissionBy: 'taker';
    decodedUniqueId: string;
}
interface ExtendedQuoteReportForGaslessSwapAmm extends QuoteReportLogOptionsBase {
    quoteReportSources: ExtendedQuoteReportSources;
    submissionBy: 'gaslessSwapAmm';
    decodedUniqueId: string;
}

export interface WrappedSignedNativeOrderMM {
    order: SignedNativeOrder;
    makerUri: string;
}

type ExtendedQuoteReportLogOptions = ExtendedQuoteReportForTakerTxn | ExtendedQuoteReportForGaslessSwapAmm;

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

/**
 * Extracts timestamp from decoded unique identifier for taker transactions.
 * @param decodedUniqueId unique identifier for an affiliate
 * @returns timestamp used when the unique identifier is generated
 */
const getTimestampFromUniqueId = (decodedUniqueId: string): number => {
    return parseInt(decodedUniqueId.slice(decodedUniqueId.indexOf('-') + 1), 10);
};

export const quoteReportUtils = {
    logQuoteReport(logOpts: QuoteReportForTakerTxn, contextLogger?: PinoLogger): void {
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
            blockNumber: logOpts.blockNumber?.toString(),
            estimatedGas: logOpts.estimatedGas.toString(),
        };
        if (logOpts.submissionBy === 'taker' || logOpts.submissionBy === 'gaslessSwapAmm') {
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
                timestamp:
                    logOpts.submissionBy === 'taker' ? getTimestampFromUniqueId(logOpts.decodedUniqueId) : Date.now(),
                firmQuoteReport: isFirmQuote,
                submissionBy: logOpts.submissionBy,
                buyAmount: logOpts.buyAmount ? logOpts.buyAmount.toString() : undefined,
                sellAmount: logOpts.sellAmount ? logOpts.sellAmount.toString() : undefined,
                buyTokenAddress: logOpts.buyTokenAddress,
                sellTokenAddress: logOpts.sellTokenAddress,
                integratorId: logOpts.integratorId,
                slippageBips: logOpts.slippage ? logOpts.slippage * BIPS_IN_INT : undefined,
                decodedUniqueId:
                    logOpts.submissionBy === 'taker' || logOpts.submissionBy === 'gaslessSwapAmm'
                        ? logOpts.decodedUniqueId
                        : undefined,
                sourcesConsidered: logOpts.quoteReportSources.sourcesConsidered.map(jsonifyFillData),
                sourcesDelivered: logOpts.quoteReportSources.sourcesDelivered?.map(jsonifyFillData),
                blockNumber: logOpts.blockNumber,
                estimatedGas: logOpts.estimatedGas.toString(),
            };
            kafkaProducer
                .send({
                    topic: KAFKA_TOPIC_QUOTE_REPORT,
                    messages: [
                        {
                            value: JSON.stringify(extendedQuoteReport),
                        },
                    ],
                })
                .catch((err) => {
                    logger.error(`Error publishing quote report to Kafka: ${err}`);
                });
        }
    },
};
