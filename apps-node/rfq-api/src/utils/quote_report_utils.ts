import { BigNumber } from '@0x/utils';
import { Producer } from 'kafkajs';

import { logger } from '../logger';
import { FirmOtcQuote, IndicativeQuote, RfqtV2Quote, StoredFee } from '../core/types';

import { numberUtils } from './number_utils';
import { RawFees } from '../core/types/meta_transaction_fees';
import {
    FillQuoteTransformerLimitOrderInfo,
    FillQuoteTransformerRfqOrderInfo,
    RfqOrderFields,
} from '@0x/protocol-utils';

/** Migrated from @0x/asset-swapper */

/**
 * DEX sources to aggregate.
 */
enum ERC20BridgeSource {
    Native = 'Native',
    Uniswap = 'Uniswap',
    UniswapV2 = 'Uniswap_V2',
    Eth2Dai = 'Eth2Dai',
    Kyber = 'Kyber',
    Curve = 'Curve',
    LiquidityProvider = 'LiquidityProvider',
    MultiBridge = 'MultiBridge',
    Balancer = 'Balancer',
    BalancerV2 = 'Balancer_V2',
    Cream = 'CREAM',
    Bancor = 'Bancor',
    MakerPsm = 'MakerPsm',
    MStable = 'mStable',
    Mooniswap = 'Mooniswap',
    MultiHop = 'MultiHop',
    Shell = 'Shell',
    Swerve = 'Swerve',
    SnowSwap = 'SnowSwap',
    SushiSwap = 'SushiSwap',
    Dodo = 'DODO',
    DodoV2 = 'DODO_V2',
    CryptoCom = 'CryptoCom',
    Linkswap = 'Linkswap',
    KyberDmm = 'KyberDMM',
    Smoothy = 'Smoothy',
    Component = 'Component',
    Saddle = 'Saddle',
    XSigma = 'xSigma',
    UniswapV3 = 'Uniswap_V3',
    CurveV2 = 'Curve_V2',
    Lido = 'Lido',
    ShibaSwap = 'ShibaSwap',
    AaveV2 = 'Aave_V2',
    Compound = 'Compound',
    PancakeSwap = 'PancakeSwap',
    PancakeSwapV2 = 'PancakeSwap_V2',
    BakerySwap = 'BakerySwap',
    Nerve = 'Nerve',
    Belt = 'Belt',
    Ellipsis = 'Ellipsis',
    ApeSwap = 'ApeSwap',
    CafeSwap = 'CafeSwap',
    CheeseSwap = 'CheeseSwap',
    JulSwap = 'JulSwap',
    ACryptos = 'ACryptoS',
    QuickSwap = 'QuickSwap',
    ComethSwap = 'ComethSwap',
    Dfyn = 'Dfyn',
    WaultSwap = 'WaultSwap',
    Polydex = 'Polydex',
    FirebirdOneSwap = 'FirebirdOneSwap',
    JetSwap = 'JetSwap',
    IronSwap = 'IronSwap',
    Pangolin = 'Pangolin',
    TraderJoe = 'TraderJoe',
    UbeSwap = 'UbeSwap',
    SpiritSwap = 'SpiritSwap',
    SpookySwap = 'SpookySwap',
    Beethovenx = 'Beethovenx',
    MorpheusSwap = 'MorpheusSwap',
}
export interface ExtendedQuoteReport {
    quoteId?: string;
    taker?: string;
    timestamp: number;
    firmQuoteReport: boolean;
    submissionBy: 'taker' | 'metaTxn' | 'rfqm' | 'gaslessSwapRfq' | 'gaslessSwapAmm';
    buyAmount?: string;
    sellAmount?: string;
    buyTokenAddress: string;
    sellTokenAddress: string;
    integratorId?: string;
    slippageBips?: number;
    zeroExTransactionHash?: string;
    decodedUniqueId?: string;
    sourcesConsidered: ExtendedQuoteReportIndexedEntryOutbound[];
    sourcesDelivered: ExtendedQuoteReportIndexedEntryOutbound[] | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FillData {} // yes, it was really this in asset swapper
type NativeFillData = FillQuoteTransformerRfqOrderInfo | FillQuoteTransformerLimitOrderInfo;
export interface QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    fillData: FillData;
}
export interface BridgeQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: Exclude<ERC20BridgeSource, ERC20BridgeSource.Native>;
}
export interface MultiHopQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.MultiHop;
    hopSources: ERC20BridgeSource[];
}
export interface NativeLimitOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillData: NativeFillData;
    fillableTakerAmount: BigNumber;
    isRFQ: false;
}
export interface NativeRfqOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillData: NativeFillData;
    fillableTakerAmount: BigNumber;
    isRFQ: true;
    nativeOrder: RfqOrderFields;
    makerUri: string;
    comparisonPrice?: number;
}
export interface IndicativeRfqOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillableTakerAmount: BigNumber;
    isRFQ: true;
    makerUri?: string;
    comparisonPrice?: number;
}

export declare type ExtendedQuoteReportEntry =
    | BridgeQuoteReportEntry
    | MultiHopQuoteReportEntry
    | NativeLimitOrderQuoteReportEntry
    | NativeRfqOrderQuoteReportEntry
    | IndicativeRfqOrderQuoteReportEntry;

export type ExtendedQuoteReportIndexedEntry = ExtendedQuoteReportEntry & {
    quoteEntryIndex: number;
    isDelivered: boolean;
};

export type ExtendedQuoteReportIndexedEntryOutbound = Omit<ExtendedQuoteReportIndexedEntry, 'fillData'> & {
    fillData?: string;
};

/************************************/

type ExtendedQuoteReportEntryWithIntermediateQuote = ExtendedQuoteReportIndexedEntryOutbound & {
    isIntermediate: boolean;
};

type ExtendedQuoteReportWithIntermediateQuote = Omit<ExtendedQuoteReport, 'sourcesConsidered'> & {
    sourcesConsidered: ExtendedQuoteReportEntryWithIntermediateQuote[];
};

type ExtendedQuoteReportWithFee = ExtendedQuoteReportWithIntermediateQuote & {
    fee: StoredFee;
    ammQuoteUniqueId?: string;
    isLiquidityAvailable?: boolean;
};

interface ExtendedQuoteReportForRFQMLogOptions {
    isFirmQuote: boolean;
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
    isLiquidityAvailable?: boolean;
}
/**
 * RFQt V2 Fee Event Interfaces
 */
interface RfqtV2FeeEventLogOptions {
    requestedBuyAmount: BigNumber | null;
    requestedSellAmount: BigNumber | null;
    requestedTakerAddress: string;
    buyTokenAddress: string;
    sellTokenAddress: string;
    integratorId: string;
    blockNumber?: number;
    quotes: RfqtV2Quote[];
    fee: StoredFee;
}

interface RfqtV2FeeEvent {
    createdAt: number;
    orderHash: string;
    requestedBuyAmount: BigNumber | null;
    requestedSellAmount: BigNumber | null;
    requestedTakerAddress: string;
    fillableBuyAmount: BigNumber;
    fillableSellAmount: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    fee: StoredFee;
    integratorId: string;
    makerId?: string;
    makerUri?: string;
    expiry: BigNumber;
    blockNumber?: number;
}

interface TxRelayV1FeeEvent {
    createdAt: number;
    tradeHash: string;
    type: string;
    takerAddress: string;
    buyTokenAddress: string;
    sellTokenAddress: string;
    requestedBuyAmount: BigNumber | null;
    requestedSellAmount: BigNumber | null;
    quotedBuyAmount: BigNumber;
    quotedSellAmount: BigNumber;
    integratorId: string;
    fee: RawFees;
}

export const quoteReportUtils = {
    async publishRFQMQuoteReportAsync(
        logOpts: ExtendedQuoteReportForRFQMLogOptions,
        kafkaProducer: Producer,
        quoteReportTopic?: string,
        extendedQuoteReportSubmissionBy: ExtendedQuoteReport['submissionBy'] = 'rfqm',
    ): Promise</* quoteId */ string | null> {
        if (kafkaProducer && quoteReportTopic) {
            const quoteId = numberUtils.randomHexNumberOfLength(10);
            logger.info(`Generating and pushing RFQm Quote Report for: ${quoteId}`);

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
                firmQuoteReport: logOpts.isFirmQuote,
                submissionBy: extendedQuoteReportSubmissionBy,
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
                isLiquidityAvailable: logOpts.isLiquidityAvailable,
            };
            kafkaProducer.send({
                topic: quoteReportTopic,
                messages: [
                    {
                        value: JSON.stringify(extendedQuoteReport),
                    },
                ],
            });
            return quoteId;
        }
        return null;
    },
    async publishTxRelayV1FeeEvent(
        logOpts: Omit<TxRelayV1FeeEvent, 'createdAt'>,
        kafkaProducer?: Producer,
        feeEventTopic?: string,
    ) {
        if (kafkaProducer && feeEventTopic) {
            const createdAt = Date.now();
            logger.info('Generating and publishing Tx Relay V1 fee event');

            const feeEvent: TxRelayV1FeeEvent = {
                createdAt,
                ...logOpts,
            };
            kafkaProducer.send({
                topic: feeEventTopic,
                messages: [
                    {
                        value: JSON.stringify(feeEvent),
                    },
                ],
            });
        }
    },
    async publishRfqtV2FeeEvent(logOpts: RfqtV2FeeEventLogOptions, kafkaProducer: Producer, feeEventTopic?: string) {
        if (kafkaProducer && feeEventTopic) {
            const createdAt = Date.now();
            logger.info(`Generating and pushing RFQt V2 fee event`);

            logOpts.quotes.map((quote) => {
                const feeEvent: RfqtV2FeeEvent = {
                    createdAt,
                    orderHash: quote.order.getHash(),
                    requestedBuyAmount: logOpts.requestedBuyAmount,
                    requestedSellAmount: logOpts.requestedSellAmount,
                    requestedTakerAddress: logOpts.requestedTakerAddress,
                    fillableBuyAmount: quote.fillableMakerAmount,
                    fillableSellAmount: quote.fillableTakerAmount,
                    buyTokenAddress: logOpts.buyTokenAddress,
                    sellTokenAddress: logOpts.sellTokenAddress,
                    fee: logOpts.fee,
                    integratorId: logOpts.integratorId,
                    makerId: quote.makerId,
                    makerUri: quote.makerUri,
                    expiry: quote.order.expiry,
                    blockNumber: logOpts.blockNumber,
                };

                kafkaProducer.send({
                    topic: feeEventTopic,
                    messages: [
                        {
                            value: JSON.stringify(feeEvent),
                        },
                    ],
                });
            });
        }
    },
};

function isFirmQuote(quote: FirmOtcQuote | IndicativeQuote): quote is FirmOtcQuote {
    return (quote as FirmOtcQuote).order !== undefined;
}

/**
 * Migrated from @0x/asset-swapper
 */
export function jsonifyFillData(source: ExtendedQuoteReportIndexedEntry): ExtendedQuoteReportIndexedEntryOutbound {
    return {
        ...source,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fillData: JSON.stringify(source.fillData, (key: string, value: any) => {
            if (key === '_samplerContract') {
                return {};
            } else {
                return value;
            }
        }),
    };
}
