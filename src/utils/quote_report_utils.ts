import type { PinoLogger } from '@0x/api-utils';
import { BigNumber, QuoteReport, QuoteReportEntry } from '@0x/asset-swapper';
import _ = require('lodash');

import { NUMBER_SOURCES_PER_LOG_LINE } from '../constants';
import { logger } from '../logger';

interface QuoteReportLogOptionsBase {
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    apiKey?: string;
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
type QuoteReportLogOptions = QuoteReportForTakerTxn | QuoteReportForMetaTxn;

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
            apiKey: logOpts.apiKey,
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
};
