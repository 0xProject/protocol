import { BigNumber, BridgeReportSource, QuoteReport } from '@0x/asset-swapper';
import _ = require('lodash');

import { NUMBER_SOURCES_PER_LOG_LINE } from '../constants';
import { logger } from '../logger';

interface QuoteReportLogOptionsBase {
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
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

export const quoteReportUtils = {
    logQuoteReport(logOpts: QuoteReportLogOptions): void {
        // NOTE: Removes bridge report fillData which we do not want to log to Kibana
        const qr: QuoteReport = {
            ...logOpts.quoteReport,
            sourcesConsidered: logOpts.quoteReport.sourcesConsidered.map(source => {
                const cleanedSource = { ...source };
                if ((cleanedSource as BridgeReportSource).fillData) {
                    delete (cleanedSource as BridgeReportSource).fillData;
                }

                return cleanedSource;
            }),
        };

        let logBase: { [key: string]: string | boolean | undefined } = {
            firmQuoteReport: true,
            submissionBy: logOpts.submissionBy,
            buyAmount: logOpts.buyAmount ? logOpts.buyAmount.toString() : undefined,
            sellAmount: logOpts.sellAmount ? logOpts.sellAmount.toString() : undefined,
            buyTokenAddress: logOpts.buyTokenAddress,
            sellTokenAddress: logOpts.sellTokenAddress,
        };
        if (logOpts.submissionBy === 'metaTxn') {
            logBase = { ...logBase, zeroExTransactionHash: logOpts.zeroExTransactionHash };
        } else if (logOpts.submissionBy === 'taker') {
            logBase = { ...logBase, decodedUniqueId: logOpts.decodedUniqueId };
        }

        // Deliver in chunks since Kibana can't handle logs large requests
        const sourcesConsideredChunks = _.chunk(qr.sourcesConsidered, NUMBER_SOURCES_PER_LOG_LINE);
        sourcesConsideredChunks.forEach((chunk, i) => {
            logger.info({
                ...logBase,
                sourcesConsidered: chunk,
                sourcesConsideredChunkIndex: i,
                sourcesConsideredChunkLength: sourcesConsideredChunks.length,
            });
        });
        const sourcesDeliveredChunks = _.chunk(qr.sourcesDelivered, NUMBER_SOURCES_PER_LOG_LINE);
        sourcesDeliveredChunks.forEach((chunk, i) => {
            logger.info({
                ...logBase,
                sourcesDelivered: chunk,
                sourcesDeliveredChunkIndex: i,
                sourcesDeliveredChunkLength: sourcesDeliveredChunks.length,
            });
        });
    },
};
