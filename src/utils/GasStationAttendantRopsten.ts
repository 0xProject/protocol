import { ProtocolFeeUtils } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';

import { GWEI_DECIMALS, RFQM_TX_OTC_ORDER_GAS_ESTIMATE } from '../constants';

import { GasStationAttendant, Wei, WeiPerGas } from './GasStationAttendant';
import { SubmissionContext } from './SubmissionContext';

// Increase multiplier for tip/base fee with each resubmission cycle
const TEN_PERCENT_INCREASE = 1.1;

// No new trades will be submitted with a tip above 192 GWEI.
const MAXIMUM_TIP_WEI = new BigNumber(192).shiftedBy(GWEI_DECIMALS);

/**
 * An implementation of `GasStationAttendant` designed for Ropsten.
 *
 * This should only be used for testing (I mean, it's on a test net)
 * and does not meet the standards of code we have for production.
 *
 * Currently, the 0x Gas Oracle does not provide pricing for Ropsten
 * in EIP-1559 format. Therefore, we'll use the "pre-GasStationAttendant"
 * strategy where the fast gas + padding is used for billing
 * and we use 1.5 GWEI tip, increasing by 2x every trade.
 *
 * Other values are best guesses.
 */
export class GasStationAttendantRopsten implements GasStationAttendant {
    private readonly _protocolFeeUtils: ProtocolFeeUtils;

    constructor(protocolFeeUtils: ProtocolFeeUtils) {
        this._protocolFeeUtils = protocolFeeUtils;
    }

    /**
     * Assumes ~100 GWEI for a trade
     */
    // tslint:disable-next-line: prefer-function-over-method
    public async getSafeBalanceForTradeAsync(): Promise<Wei> {
        const estimatedTradeRateGwei = 100;
        const gasEstimate = RFQM_TX_OTC_ORDER_GAS_ESTIMATE;
        return new BigNumber(estimatedTradeRateGwei).shiftedBy(GWEI_DECIMALS).times(gasEstimate);
    }

    /**
     * Naïve 2x the fast gas price for a trade
     */
    public async getWorkerBalanceForTradeAsync(): Promise<WeiPerGas> {
        const gasPriceEstimateWei = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        const gasEstimate = RFQM_TX_OTC_ORDER_GAS_ESTIMATE;

        return gasPriceEstimateWei.times(2).times(gasEstimate);
    }

    /**
     * Use the 'fast' gas plus a padding
     */
    public async getExpectedTransactionGasRateAsync(): Promise<WeiPerGas> {
        // use that instead of the legacy fast gas price.
        const gasPriceEstimateWei = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        const padding = 1.5;
        return gasPriceEstimateWei.times(padding).integerValue(BigNumber.ROUND_CEIL);
    }

    /**
     * Double tip and increase maxFeePerGas by 10% to make nodes happy
     */
    public async getNextBidAsync(
        submissionContext: SubmissionContext | null,
    ): Promise<{ maxFeePerGas: BigNumber; maxPriorityFeePerGas: BigNumber } | null> {
        const gasPriceEstimateWei = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        const initialTip = new BigNumber(1.5).shiftedBy(GWEI_DECIMALS);
        if (!submissionContext) {
            const initialMaxPriorityFeePerGasWei = initialTip;
            const initialBaseFee = gasPriceEstimateWei.times(2);
            return {
                maxPriorityFeePerGas: initialMaxPriorityFeePerGasWei,
                maxFeePerGas: initialBaseFee.plus(initialMaxPriorityFeePerGasWei),
            };
        }

        const { maxFeePerGas: oldMaxFeePerGas, maxPriorityFeePerGas: oldMaxPriorityFeePerGas } =
            submissionContext.maxGasFees;

        const newMaxPriorityFeePerGas = BigNumber.max(oldMaxPriorityFeePerGas.times(2), gasPriceEstimateWei);

        if (newMaxPriorityFeePerGas.isGreaterThan(MAXIMUM_TIP_WEI)) {
            return null;
        }

        const newMaxFeePerGas = oldMaxFeePerGas.multipliedBy(TEN_PERCENT_INCREASE);

        return {
            maxPriorityFeePerGas: newMaxPriorityFeePerGas.integerValue(BigNumber.ROUND_CEIL),
            maxFeePerGas: newMaxFeePerGas.integerValue(BigNumber.ROUND_CEIL),
        };
    }
}
