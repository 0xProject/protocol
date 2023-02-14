import { ProtocolFeeUtils } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';

import { GWEI_DECIMALS, RFQM_TX_OTC_ORDER_GAS_ESTIMATE } from '../core/constants';

import { GasStationAttendant, Wei, WeiPerGas } from './GasStationAttendant';

// The total minimum bid recommended by the post here:
// https://forum.matic.network/t/recommended-min-gas-price-setting/2531
// Expect bids lower than this to be rejected by the RPC node.
const MINIMUM_BID_WEI = 30000000000;

// The maximum tip we're willing to pay, based on p99 historical data

// Increase multiplier for tip with each resubmission cycle
const TEN_PERCENT_INCREASE = 1.1;

/**
 * An implementation of `GasStationAttendant` designed for Polygon.
 *
 * Currently, the 0x Gas Oracle does not provide pricing for Polygon
 * in EIP-1559 format. Therefore, we'll use the 'fast' gas as a
 * `maxPriorityFeePerGas` estimate. This actually works out okay because
 * the Polygon base fee is always essentially zero as of April 2022.
 */
export class GasStationAttendantPolygon implements GasStationAttendant {
    private readonly _protocolFeeUtils: ProtocolFeeUtils;

    constructor(protocolFeeUtils: ProtocolFeeUtils) {
        this._protocolFeeUtils = protocolFeeUtils;
    }

    /**
     * The Safe Balance For Trade is from the p95 data shown here:
     * https://0xproject.slack.com/archives/CQG0ZGBFS/p1649708977452469
     */
    // tslint:disable-next-line: prefer-function-over-method
    public async getSafeBalanceForTradeAsync(): Promise<Wei> {
        const p95PriorityFeeGwei = 261;
        // Base fee is essentially zero
        // TODO (rhinodavid): Make this smarter as we have more historical data
        const gasEstimate = RFQM_TX_OTC_ORDER_GAS_ESTIMATE;
        // 0.0261 MATIC
        return new BigNumber(p95PriorityFeeGwei).shiftedBy(GWEI_DECIMALS).times(gasEstimate);
    }

    /**
     * Uses the current fast gas price as the `maxPriorityFeePerGas`
     * estimate. Plans for 3 resubmits at a 10% tip increase. Assumes
     * no base fee.
     *
     * Uses a fixed value of 110,000 for the transaction gas amount
     * estimate.
     */
    public async getWorkerBalanceForTradeAsync(): Promise<WeiPerGas> {
        // TODO (rhinodavid): Once the 0x gas oracle can give EIP-1559 data for Polygon
        // use that instead of the legacy fast gas price.
        const gasPriceEstimateWei = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();

        // Since the base fee is basically nothing, use this for our initial max priority fee
        const maxPriorityFeePerGas = gasPriceEstimateWei;

        // Pad the tip for 3 10% increases
        const maxPriorityFeePad = Math.pow(TEN_PERCENT_INCREASE, 3); // tslint:disable-line: custom-no-magic-numbers
        const paddedMaxPriorityFeePerGas = maxPriorityFeePerGas.times(maxPriorityFeePad);
        const gasRateWei = BigNumber.max(paddedMaxPriorityFeePerGas.plus(0), MINIMUM_BID_WEI); // Amortizing the base fee to 0

        // Pad a little until we get a better idea of token-specific costs
        const padding = 1.1;
        const gasEstimate = RFQM_TX_OTC_ORDER_GAS_ESTIMATE * padding;

        return gasRateWei.times(gasEstimate);
    }

    /**
     * Calculated using a similar methodology to `getWorkerBalanceForTradeAsync`,
     * but assumes we submit and average 1.5 transactions per trade, which is
     * what we see on Ethereum.
     *
     * TODO (rhinodavid): Update this once we have more historical data
     */
    public async getExpectedTransactionGasRateAsync(): Promise<WeiPerGas> {
        // use that instead of the legacy fast gas price.
        // `@0x/asset-swapper ProtocolFeeUtils::getGasPriceEstimationOrThrowAsync
        // returns WEI even though it's not documented anywhere in our public open source library
        // we intend other developers to use.
        const gasPriceEstimateWei = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();

        // Since the base fee is basically nothing, use this for our initial max priority fee
        const maxPriorityFeePerGas = gasPriceEstimateWei;

        // Pad the tip for 1.5 10% increases
        const baseFeePad = Math.pow(TEN_PERCENT_INCREASE, 1.5); // tslint:disable-line: custom-no-magic-numbers
        const paddedMaxPriorityFeePerGas = maxPriorityFeePerGas.times(baseFeePad);
        const gasRateWei = paddedMaxPriorityFeePerGas.plus(0); // Amortizing the base fee to 0

        return gasRateWei.integerValue(BigNumber.ROUND_CEIL);
    }
}
