import { SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { constants } from '../constants';
import {
    CalculateSwapQuoteOpts,
    MarketBuySwapQuote,
    MarketOperation,
    MarketSellSwapQuote,
    SwapQuote,
    SwapQuoteInfo,
    SwapQuoteOrdersBreakdown,
    SwapQuoterError,
} from '../types';

import { MarketOperationUtils } from './market_operation_utils';
import { SOURCE_FLAGS } from './market_operation_utils/constants';
import {
    ERC20BridgeSource,
    FeeSchedule,
    FillData,
    GetMarketOrdersOpts,
    OptimizedMarketOrder,
    OptimizerResultWithReport,
} from './market_operation_utils/types';
import { QuoteFillResult, simulateBestCaseFill, simulateWorstCaseFill } from './quote_simulation';
import { getTokenFromAssetData, isSupportedAssetDataInOrders } from './utils';

// TODO(dave4506) How do we want to reintroduce InsufficientAssetLiquidityError?
export class SwapQuoteCalculator {
    private readonly _marketOperationUtils: MarketOperationUtils;

    constructor(marketOperationUtils: MarketOperationUtils) {
        this._marketOperationUtils = marketOperationUtils;
    }

    public async calculateMarketSellSwapQuoteAsync(
        prunedOrders: SignedOrder[],
        takerAssetFillAmount: BigNumber,
        gasPrice: BigNumber,
        opts: CalculateSwapQuoteOpts,
    ): Promise<MarketSellSwapQuote> {
        return (await this._calculateSwapQuoteAsync(
            prunedOrders,
            takerAssetFillAmount,
            gasPrice,
            MarketOperation.Sell,
            opts,
        )) as MarketSellSwapQuote;
    }

    public async calculateMarketBuySwapQuoteAsync(
        prunedOrders: SignedOrder[],
        takerAssetFillAmount: BigNumber,
        gasPrice: BigNumber,
        opts: CalculateSwapQuoteOpts,
    ): Promise<MarketBuySwapQuote> {
        return (await this._calculateSwapQuoteAsync(
            prunedOrders,
            takerAssetFillAmount,
            gasPrice,
            MarketOperation.Buy,
            opts,
        )) as MarketBuySwapQuote;
    }

    public async calculateBatchMarketBuySwapQuoteAsync(
        batchPrunedOrders: SignedOrder[][],
        takerAssetFillAmounts: BigNumber[],
        gasPrice: BigNumber,
        opts: CalculateSwapQuoteOpts,
    ): Promise<Array<MarketBuySwapQuote | undefined>> {
        return (await this._calculateBatchBuySwapQuoteAsync(
            batchPrunedOrders,
            takerAssetFillAmounts,
            gasPrice,
            MarketOperation.Buy,
            opts,
        )) as Array<MarketBuySwapQuote | undefined>;
    }

    private async _calculateBatchBuySwapQuoteAsync(
        batchPrunedOrders: SignedOrder[][],
        assetFillAmounts: BigNumber[],
        gasPrice: BigNumber,
        operation: MarketOperation,
        opts: CalculateSwapQuoteOpts,
    ): Promise<Array<SwapQuote | undefined>> {
        const optimizerResults = await this._marketOperationUtils.getBatchMarketBuyOrdersAsync(
            batchPrunedOrders,
            assetFillAmounts,
            opts,
        );

        const batchSwapQuotes = await Promise.all(
            optimizerResults.map(async (result, i) => {
                if (result) {
                    const { makerAssetData, takerAssetData } = batchPrunedOrders[i][0];
                    return createSwapQuote(
                        result,
                        makerAssetData,
                        takerAssetData,
                        operation,
                        assetFillAmounts[i],
                        gasPrice,
                        opts.gasSchedule,
                    );
                } else {
                    return undefined;
                }
            }),
        );
        return batchSwapQuotes;
    }
    private async _calculateSwapQuoteAsync(
        prunedOrders: SignedOrder[],
        assetFillAmount: BigNumber,
        gasPrice: BigNumber,
        operation: MarketOperation,
        opts: CalculateSwapQuoteOpts,
    ): Promise<SwapQuote> {
        // checks if maker asset is ERC20 and taker asset is ERC20
        if (!isSupportedAssetDataInOrders(prunedOrders)) {
            throw Error(SwapQuoterError.AssetDataUnsupported);
        }
        // since prunedOrders do not have fillState, we will add a buffer of fillable orders to consider that some native are orders are partially filled

        // Scale fees by gas price.
        const _opts: GetMarketOrdersOpts = {
            ...opts,
            feeSchedule: _.mapValues(opts.feeSchedule, gasCost => (fillData?: FillData) =>
                gasCost === undefined ? 0 : gasPrice.times(gasCost(fillData)),
            ),
            exchangeProxyOverhead: flags => gasPrice.times(opts.exchangeProxyOverhead(flags)),
        };

        const result =
            operation === MarketOperation.Buy
                ? await this._marketOperationUtils.getMarketBuyOrdersAsync(prunedOrders, assetFillAmount, _opts)
                : await this._marketOperationUtils.getMarketSellOrdersAsync(prunedOrders, assetFillAmount, _opts);

        const { makerAssetData, takerAssetData } = prunedOrders[0];
        const swapQuote = createSwapQuote(
            result,
            makerAssetData,
            takerAssetData,
            operation,
            assetFillAmount,
            gasPrice,
            opts.gasSchedule,
        );

        // Use the raw gas, not scaled by gas price
        const exchangeProxyOverhead = opts.exchangeProxyOverhead(result.sourceFlags).toNumber();
        swapQuote.bestCaseQuoteInfo.gas += exchangeProxyOverhead;
        swapQuote.worstCaseQuoteInfo.gas += exchangeProxyOverhead;
        swapQuote.unoptimizedQuoteInfo.gas += exchangeProxyOverhead;

        return swapQuote;
    }
}

function createSwapQuote(
    optimizerResult: OptimizerResultWithReport,
    makerAssetData: string,
    takerAssetData: string,
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: FeeSchedule,
): SwapQuote {
    const {
        optimizedOrders,
        quoteReport,
        sourceFlags,
        unoptimizedPath,
        ethToTakerAssetRate,
        ethToMakerAssetRate,
    } = optimizerResult;
    const isTwoHop = sourceFlags === SOURCE_FLAGS[ERC20BridgeSource.MultiHop];

    // Calculate quote info
    const { bestCaseQuoteInfo, worstCaseQuoteInfo, sourceBreakdown } = isTwoHop
        ? calculateTwoHopQuoteInfo(optimizedOrders, operation, gasSchedule)
        : calculateQuoteInfo(optimizedOrders, operation, assetFillAmount, gasPrice, gasSchedule);

    // Calculate the unoptimised alternative
    const unoptimizedOrders = unoptimizedPath !== undefined ? unoptimizedPath.orders : [];
    const unoptimizedFillResult = simulateBestCaseFill({
        gasPrice,
        orders: unoptimizedOrders,
        side: operation,
        fillAmount: assetFillAmount,
        opts: { gasSchedule },
    });
    const unoptimizedQuoteInfo = fillResultsToQuoteInfo(unoptimizedFillResult);

    // Put together the swap quote
    const { makerTokenDecimals, takerTokenDecimals } = optimizerResult.marketSideLiquidity;
    const swapQuote = {
        makerAssetData,
        takerAssetData,
        gasPrice,
        orders: optimizedOrders,
        bestCaseQuoteInfo,
        worstCaseQuoteInfo,
        unoptimizedQuoteInfo,
        unoptimizedOrders,
        sourceBreakdown,
        makerTokenDecimals,
        takerTokenDecimals,
        ethToTakerAssetRate,
        ethToMakerAssetRate,
        quoteReport,
        isTwoHop,
    };

    if (operation === MarketOperation.Buy) {
        return {
            ...swapQuote,
            type: MarketOperation.Buy,
            makerAssetFillAmount: assetFillAmount,
        };
    } else {
        return {
            ...swapQuote,
            type: MarketOperation.Sell,
            takerAssetFillAmount: assetFillAmount,
        };
    }
}

function calculateQuoteInfo(
    optimizedOrders: OptimizedMarketOrder[],
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: FeeSchedule,
): { bestCaseQuoteInfo: SwapQuoteInfo; worstCaseQuoteInfo: SwapQuoteInfo; sourceBreakdown: SwapQuoteOrdersBreakdown } {
    const bestCaseFillResult = simulateBestCaseFill({
        gasPrice,
        orders: optimizedOrders,
        side: operation,
        fillAmount: assetFillAmount,
        opts: { gasSchedule },
    });

    const worstCaseFillResult = simulateWorstCaseFill({
        gasPrice,
        orders: optimizedOrders,
        side: operation,
        fillAmount: assetFillAmount,
        opts: { gasSchedule },
    });

    return {
        bestCaseQuoteInfo: fillResultsToQuoteInfo(bestCaseFillResult),
        worstCaseQuoteInfo: fillResultsToQuoteInfo(worstCaseFillResult),
        sourceBreakdown: getSwapQuoteOrdersBreakdown(bestCaseFillResult.fillAmountBySource),
    };
}

function calculateTwoHopQuoteInfo(
    optimizedOrders: OptimizedMarketOrder[],
    operation: MarketOperation,
    gasSchedule: FeeSchedule,
): { bestCaseQuoteInfo: SwapQuoteInfo; worstCaseQuoteInfo: SwapQuoteInfo; sourceBreakdown: SwapQuoteOrdersBreakdown } {
    const [firstHopOrder, secondHopOrder] = optimizedOrders;
    const [firstHopFill] = firstHopOrder.fills;
    const [secondHopFill] = secondHopOrder.fills;
    const gas = new BigNumber(
        gasSchedule[ERC20BridgeSource.MultiHop]!({
            firstHopSource: _.pick(firstHopFill, 'source', 'fillData'),
            secondHopSource: _.pick(secondHopFill, 'source', 'fillData'),
        }),
    ).toNumber();

    return {
        bestCaseQuoteInfo: {
            makerAssetAmount: operation === MarketOperation.Sell ? secondHopFill.output : secondHopFill.input,
            takerAssetAmount: operation === MarketOperation.Sell ? firstHopFill.input : firstHopFill.output,
            totalTakerAssetAmount: operation === MarketOperation.Sell ? firstHopFill.input : firstHopFill.output,
            feeTakerAssetAmount: constants.ZERO_AMOUNT,
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
        },
        worstCaseQuoteInfo: {
            makerAssetAmount: secondHopOrder.makerAssetAmount,
            takerAssetAmount: firstHopOrder.takerAssetAmount,
            totalTakerAssetAmount: firstHopOrder.takerAssetAmount,
            feeTakerAssetAmount: constants.ZERO_AMOUNT,
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
        },
        sourceBreakdown: {
            [ERC20BridgeSource.MultiHop]: {
                proportion: new BigNumber(1),
                intermediateToken: getTokenFromAssetData(secondHopOrder.takerAssetData),
                hops: [firstHopFill.source, secondHopFill.source],
            },
        },
    };
}

function getSwapQuoteOrdersBreakdown(fillAmountBySource: { [source: string]: BigNumber }): SwapQuoteOrdersBreakdown {
    const totalFillAmount = BigNumber.sum(...Object.values(fillAmountBySource));
    const breakdown: SwapQuoteOrdersBreakdown = {};
    Object.entries(fillAmountBySource).forEach(([source, fillAmount]) => {
        breakdown[source as keyof SwapQuoteOrdersBreakdown] = fillAmount.div(totalFillAmount);
    });
    return breakdown;
}

function fillResultsToQuoteInfo(fr: QuoteFillResult): SwapQuoteInfo {
    return {
        makerAssetAmount: fr.totalMakerAssetAmount,
        takerAssetAmount: fr.takerAssetAmount,
        totalTakerAssetAmount: fr.totalTakerAssetAmount,
        feeTakerAssetAmount: fr.takerFeeTakerAssetAmount,
        protocolFeeInWeiAmount: fr.protocolFeeAmount,
        gas: fr.gas,
    };
}
