import {
    BridgeReportSource,
    ERC20BridgeSource,
    FeeSchedule,
    MultiHopReportSource,
    NativeRFQTReportSource,
    QuoteReportSource,
    SushiSwapFillData,
    UniswapV2FillData,
} from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import { GAS_SCHEDULE } from '../config';
import { ZERO } from '../constants';
import { logger } from '../logger';
import { ChainId, SourceComparison } from '../types';

import { getTokenMetadataIfExists } from './token_metadata_utils';

// NOTE: Our internal Uniswap gas usage may be lower than the Uniswap UI usage
// Therefore we need to adjust the gas estimates to be representative of using the Uniswap UI.
const gasScheduleWithOverrides: FeeSchedule = {
    ...GAS_SCHEDULE,
    [ERC20BridgeSource.UniswapV2]: fillData => {
        let gas = 1.5e5;
        // tslint:disable-next-line:custom-no-magic-numbers
        if ((fillData as UniswapV2FillData).tokenAddressPath.length > 2) {
            // tslint:disable-next-line:custom-no-magic-numbers
            gas += 5e4;
        }
        return gas;
    },
    [ERC20BridgeSource.SushiSwap]: fillData => {
        let gas = 1.5e5;
        // tslint:disable-next-line:custom-no-magic-numbers
        if ((fillData as SushiSwapFillData).tokenAddressPath.length > 2) {
            // tslint:disable-next-line:custom-no-magic-numbers
            gas += 5e4;
        }
        return gas;
    },
};

const emptyPlaceholderSources = Object.values(ERC20BridgeSource).reduce<SourceComparison[]>((memo, liquiditySource) => {
    memo.push({
        name: liquiditySource,
        price: null,
        gas: null,
    });

    return memo;
}, []);

interface PartialRequestParams {
    buyAmount?: BigNumber;
    sellAmount?: BigNumber;
}

interface PartialQuote {
    buyAmount: BigNumber;
    sellAmount: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    quoteReport: { sourcesConsidered: QuoteReportSource[] };
}

export const priceComparisonUtils = {
    getPriceComparisonFromQuote(
        chainId: ChainId,
        params: PartialRequestParams,
        quote: PartialQuote,
    ): SourceComparison[] | undefined {
        // NOTE: don't fail quote request if comparison calculations error out
        try {
            const buyToken = getTokenMetadataIfExists(quote.buyTokenAddress, chainId);
            const sellToken = getTokenMetadataIfExists(quote.sellTokenAddress, chainId);

            const isSelling = !!params.sellAmount;

            const { sourcesConsidered } = quote.quoteReport;

            // Filter matching amount samples with a valid result
            const fullTradeSources = sourcesConsidered.filter(s =>
                isSelling
                    ? s.takerAmount.isEqualTo(quote.sellAmount) && s.makerAmount.isGreaterThan(ZERO)
                    : s.makerAmount.isEqualTo(quote.buyAmount) && s.takerAmount.isGreaterThan(ZERO),
            );

            // NOTE: Sort sources by the best outcome for the user
            // if the user is selling we want to maximize the maker amount they will receive
            // if the user is buying we want to minimize the taker amount they have to pay
            const sortedSources = isSelling
                ? fullTradeSources.slice().sort((a, b) => b.makerAmount.comparedTo(a.makerAmount))
                : fullTradeSources.slice().sort((a, b) => a.takerAmount.comparedTo(b.takerAmount));
            // Select the best (first in the sorted list) option for each source
            const uniqueSources = _.uniqBy(sortedSources, 'liquiditySource');

            const sourcePrices: SourceComparison[] = uniqueSources.map(source => {
                const { liquiditySource, makerAmount, takerAmount } = source;
                let gas: BigNumber;
                if (liquiditySource === ERC20BridgeSource.Native) {
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    const typedSource = source as NativeRFQTReportSource;
                    gas = new BigNumber(gasScheduleWithOverrides[typedSource.liquiditySource]());
                } else if (liquiditySource === ERC20BridgeSource.MultiHop) {
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    const typedSource = source as MultiHopReportSource;
                    gas = new BigNumber(gasScheduleWithOverrides[typedSource.liquiditySource](typedSource.fillData));
                } else {
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    const typedSource = source as BridgeReportSource;
                    gas = new BigNumber(gasScheduleWithOverrides[typedSource.liquiditySource](typedSource.fillData));
                }

                const unitMakerAmount = Web3Wrapper.toUnitAmount(makerAmount, buyToken.decimals);
                const unitTakerAmount = Web3Wrapper.toUnitAmount(takerAmount, sellToken.decimals);

                const price = isSelling
                    ? unitMakerAmount.dividedBy(unitTakerAmount).decimalPlaces(sellToken.decimals)
                    : unitTakerAmount.dividedBy(unitMakerAmount).decimalPlaces(buyToken.decimals);

                return {
                    name: liquiditySource,
                    price,
                    gas,
                };
            });

            // Add null values for all sources we don't have a result for so that we always have a full result set in the response
            const allSourcePrices = _.uniqBy<SourceComparison>([...sourcePrices, ...emptyPlaceholderSources], 'name');

            return allSourcePrices;
        } catch (err) {
            logger.error(err, `Failed to calculate price comparisons`);
        }
    },
};
