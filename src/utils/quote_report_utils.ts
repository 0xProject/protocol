import { Producer } from 'kafkajs';

import {
    BigNumber,
    ExtendedQuoteReport,
    ExtendedQuoteReportSources,
    jsonifyFillData,
    SignedNativeOrder,
} from '../asset-swapper';
import { KAFKA_TOPIC_QUOTE_REPORT } from '../config';
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
    enableSlippageProtection: boolean | undefined;
    expectedSlippage?: BigNumber | null;
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
 * Extracts timestamp from decoded unique identifier for taker transactions.
 * @param decodedUniqueId unique identifier for an affiliate
 * @returns timestamp used when the unique identifier is generated
 */
const getTimestampFromUniqueId = (decodedUniqueId: string): number => {
    return parseInt(decodedUniqueId.slice(decodedUniqueId.indexOf('-') + 1), 10);
};

/**
 * Publishes a quote report to kafka. As of fall 2022, this eventually
 * makes its way to the Hashalytics database.
 *
 * This fuction is a no-op if KAFKA_TOPIC_QUOTE_REPORT is not defined.
 */
export function publishQuoteReport(
    logOpts: ExtendedQuoteReportLogOptions,
    isFirmQuote: boolean,
    kafkaProducer: Producer,
): void {
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
            enableSlippageProtection: logOpts.enableSlippageProtection,
            expectedSlippage: logOpts.expectedSlippage?.toString(),
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
}
