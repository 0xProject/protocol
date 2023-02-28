import { AbiEncoder, BigNumber } from '@0x/utils';

import {
    AffiliateFeeType,
    ERC20BridgeSource,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
    SwapQuote,
    SwapQuoteSourceBreakdown,
} from '../asset-swapper';
import { CHAIN_ID, FEE_RECIPIENT_ADDRESS, GASLESS_SWAP_FEE_ENABLED } from '../config';
import {
    AFFILIATE_FEE_TRANSFORMER_GAS,
    HEX_BASE,
    NULL_ADDRESS,
    ONE_SECOND_MS,
    PERCENTAGE_SIG_DIGITS,
    POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS,
    ZERO,
} from '../constants';
import { AffiliateFee, AffiliateFeeAmounts, GetSwapQuoteResponseLiquiditySource } from '../types';

import { numberUtils } from './number_utils';

export const getBuyTokenPercentageFeeOrZero = (affiliateFee: AffiliateFee) => {
    switch (affiliateFee.feeType) {
        case AffiliateFeeType.GaslessFee:
        case AffiliateFeeType.PositiveSlippageFee:
            return 0;
        default:
            return affiliateFee.buyTokenPercentageFee;
    }
};

export const serviceUtils = {
    attributeCallData(
        data: string,
        affiliateAddress?: string,
    ): {
        affiliatedData: string;
        decodedUniqueId: string;
    } {
        const affiliateAddressOrDefault = affiliateAddress ? affiliateAddress : FEE_RECIPIENT_ADDRESS;
        const affiliateCallDataEncoder = new AbiEncoder.Method({
            constant: true,
            outputs: [],
            name: 'ZeroExAPIAffiliate',
            inputs: [
                { name: 'affiliate', type: 'address' },
                { name: 'timestamp', type: 'uint256' },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
        });

        // Generate unique identifier
        const timestampInSeconds = new BigNumber(Date.now() / ONE_SECOND_MS).integerValue();
        const hexTimestamp = timestampInSeconds.toString(HEX_BASE);
        const randomNumber = numberUtils.randomHexNumberOfLength(10);

        // Concatenate the hex identifier with the hex timestamp
        // In the final encoded call data, this will leave us with a 5-byte ID followed by
        // a 4-byte timestamp, and won't break parsers of the timestamp made prior to the
        // addition of the ID
        const uniqueIdentifier = new BigNumber(`${randomNumber}${hexTimestamp}`, HEX_BASE);

        // Encode additional call data and return
        const encodedAffiliateData = affiliateCallDataEncoder.encode([affiliateAddressOrDefault, uniqueIdentifier]);
        const affiliatedData = `${data}${encodedAffiliateData.slice(2)}`;
        return { affiliatedData, decodedUniqueId: `${randomNumber}-${timestampInSeconds}` };
    },
    convertToLiquiditySources(sourceBreakdown: SwapQuoteSourceBreakdown): GetSwapQuoteResponseLiquiditySource[] {
        const toExternalFormat = (source: string) => (source === ERC20BridgeSource.Native ? '0x' : source);

        // TODO Jacob SELL is a superset of BUY, but may not always be
        const allSingleSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[CHAIN_ID].sources.filter(
            (source) => source !== ERC20BridgeSource.MultiHop,
        );
        const defaultSingleSourceBreakdown = Object.fromEntries(
            allSingleSources.map((source) => [source, new BigNumber(0)]),
        );

        const singleSourceBreakdown = { ...defaultSingleSourceBreakdown, ...sourceBreakdown.singleSource };

        const singleSourceLiquiditySources = Object.entries(singleSourceBreakdown).map(([source, proportion]) => ({
            name: toExternalFormat(source),
            proportion: new BigNumber(proportion.toPrecision(PERCENTAGE_SIG_DIGITS)),
        }));
        const multihopLiquiditySources = sourceBreakdown.multihop.map((breakdown) => ({
            name: ERC20BridgeSource.MultiHop,
            proportion: new BigNumber(breakdown.proportion.toPrecision(PERCENTAGE_SIG_DIGITS)),
            intermediateToken: breakdown.intermediateToken,
            hops: breakdown.hops.map(toExternalFormat),
        }));

        return [...singleSourceLiquiditySources, ...multihopLiquiditySources];
    },
    getBuyTokenFeeAmounts(quote: SwapQuote, fee: AffiliateFee): AffiliateFeeAmounts {
        if (fee.feeType === AffiliateFeeType.None || fee.recipient === NULL_ADDRESS || fee.recipient === '') {
            return {
                sellTokenFeeAmount: ZERO,
                buyTokenFeeAmount: ZERO,
                gasCost: ZERO,
            };
        }

        if (fee.feeType === AffiliateFeeType.GaslessFee) {
            const buyTokenFeeAmount = GASLESS_SWAP_FEE_ENABLED
                ? quote.makerAmountPerEth
                      .times(quote.gasPrice)
                      .times(quote.worstCaseQuoteInfo.gas)
                      .integerValue(BigNumber.ROUND_DOWN)
                : ZERO;
            return {
                sellTokenFeeAmount: ZERO,
                buyTokenFeeAmount,
                gasCost: AFFILIATE_FEE_TRANSFORMER_GAS,
            };
        }

        const minBuyAmount = quote.worstCaseQuoteInfo.makerAmount;
        const buyTokenFeeAmount = minBuyAmount
            .times(getBuyTokenPercentageFeeOrZero(fee))
            .dividedBy(getBuyTokenPercentageFeeOrZero(fee) + 1)
            .integerValue(BigNumber.ROUND_DOWN);
        return {
            sellTokenFeeAmount: ZERO,
            buyTokenFeeAmount,
            gasCost:
                fee.feeType === AffiliateFeeType.PercentageFee
                    ? AFFILIATE_FEE_TRANSFORMER_GAS
                    : POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS,
        };
    },
};
