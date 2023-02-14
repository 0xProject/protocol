import { BigNumber } from '@0x/utils';

import { GasOracle } from './GasOracle';
import { GasStationAttendant, Wei, WeiPerGas } from './GasStationAttendant';
import { calculateGasEstimate } from './rfqm_gas_estimate_utils';

/**
 * An implementation of `GasStationAttendant` designed for Ethereum Mainnet.
 */
export class GasStationAttendantEthereum implements GasStationAttendant {
    private readonly _gasOracle: GasOracle;

    constructor(gasOracle: GasOracle) {
        this._gasOracle = gasOracle;
    }

    /**
     * The Safe Balance For Trade is based on historical data as outlined here:
     * https://0xproject.quip.com/qZdFAHLpT7JI/RFQm-healthz-System-Health-Endpoint#temp:C:cXH5851e0f15e8c4828bffc1339d
     */
    // tslint:disable-next-line: prefer-function-over-method
    public async getSafeBalanceForTradeAsync(): Promise<Wei> {
        return new BigNumber(82500000000000000);
    }

    /**
     * Uses an estimate of the current base fee with 6
     * 10% increases plus the "instant" maxPriorityFeePerGas
     * as reported by the oracle.
     *
     * Gas amount is estimated for an unwrap of the AAVE-USDC pair.
     */
    public async getWorkerBalanceForTradeAsync(): Promise<WeiPerGas> {
        const baseFee = await this._gasOracle.getBaseFeePerGasWeiAsync();
        const instantTip = await this._gasOracle.getMaxPriorityFeePerGasWeiAsync('instant');

        // Pad the baseFee for 6 10% increases
        const baseFeePad = Math.pow(1.1, 6); // tslint:disable-line: custom-no-magic-numbers
        const paddedBaseFee = baseFee.times(baseFeePad);
        const gasRate = paddedBaseFee.plus(instantTip);

        // Use a gas estimate of a pretty high-cost pair
        const gasEstimate = calculateGasEstimate(
            '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
            'otc',
            true,
        );

        return gasRate.times(gasEstimate);
    }

    /**
     * Calculated by looking at historical data and seeing we average 1.5 transactions
     * per job. This means we expect to pay 2.75 GWEI priority fee plus the base fee.
     */
    public async getExpectedTransactionGasRateAsync(): Promise<WeiPerGas> {
        const baseFee = await this._gasOracle.getBaseFeePerGasWeiAsync();
        // Currently we submit a 2 GWEI tip then multiply it by 1.5 per submission
        // Trades take ~1.5 submissions on average, so that's 2.75 GWEI
        const avgMaxPriorityFeePerGasRate = 2750000000;
        return baseFee.plus(avgMaxPriorityFeePerGasRate).integerValue(BigNumber.ROUND_CEIL);
    }
}
