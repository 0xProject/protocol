import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';

import { BPS_TO_RATIO, ZERO } from '../constants';
import { ConfigManager } from '../utils/config_manager';
import { GasStationAttendant } from '../utils/GasStationAttendant';
import { calculateGasEstimate } from '../utils/rfqm_gas_estimate_utils';
import { TokenPriceOracle } from '../utils/TokenPriceOracle';

/**
 * Base interface for FeeBreakdown type.
 */
interface FeeBreakdownBase {
    /**
     * `kind` is used to mark the type of FeeBreakdown.
     */
    kind: 'gasOnly' | 'default' | 'margin';
    /**
     * Version number of fee model which determines the fee amount to charge MMs.
     *   * Version 0 includes estimated gas cost only.
     *   * Version 1 charge an additional bps as 0x fee, based on trade size, on top of gas.
     *   * Version 2 charge 0x fee based on detected margin of RFQm with AMMs.
     * While Verion 0 will use `gasOnly` FeeBreakdown, and Version 1 will use `default`, Version 2
     * will use all three of them: `gasOnly` for margin detection, `margin` if margin detection
     * succeeded, and `default` if margin detection failed.
     */
    feeModelVersion: number;
    gasFeeAmount: BigNumber;
    gasPrice: BigNumber;
}

/**
 * Interface for `margin` FeeBreakdown type. In this case the Fee is
 * calculated using margin based method
 */
interface MarginBasedFeeBreakDown extends FeeBreakdownBase {
    kind: 'margin';
    margin: BigNumber;
    marginRakeRatio: number;
    zeroExFeeAmount: BigNumber;
    /**
     * All token prices are from TokenPriceOracle. `null` value means the oracle
     * failed to provide price, or we don't need to query it. For example, the token
     * is not involved in fee calculation, or bps for given pair is 0.
     */
    feeTokenBaseUnitPriceUsd: BigNumber | null;
    takerTokenBaseUnitPriceUsd: BigNumber | null;
    makerTokenBaseUnitPriceUsd: BigNumber | null;
}

/**
 * Interface for `default` FeeBreakdown type. In this case the Fee is
 * calculated using default method, based on trade size and bps of underlying
 * pairs.
 */
interface DefaultFeeBreakdown extends FeeBreakdownBase {
    kind: 'default';
    tradeSizeBps: number;
    zeroExFeeAmount: BigNumber;
    feeTokenBaseUnitPriceUsd: BigNumber | null;
    takerTokenBaseUnitPriceUsd: BigNumber | null;
    makerTokenBaseUnitPriceUsd: BigNumber | null;
}

/**
 * Interface for `gasOnly` FeeBreakdown type. Only gas related information
 * is included.
 */
interface GasOnlyFeeBreakdown extends FeeBreakdownBase {
    kind: 'gasOnly';
}

type FeeBreakdown = GasOnlyFeeBreakdown | DefaultFeeBreakdown | MarginBasedFeeBreakDown;

/**
 * Extends Fee data schema to include a detailed breakdown session, which could
 * be one of `gasOnly`, `default` or `margin` type, depending on the approach used
 * to calculate the Fee.
 */
export interface FeeWithDetails extends Fee {
    details: FeeBreakdown;
}

/**
 * Hide fee detials before sending to MMs.
 */
export const hideFeeDetails = (fee: Fee): Fee => {
    const { type, token, amount } = fee;
    return { type, token, amount };
};

/**
 * RfqmFeeService is used by RfqmService to calculate RFQm Fees of all versions (0, 1 and 2).
 */
export class RfqmFeeService {
    constructor(
        private readonly _chainId: number,
        private readonly _feeTokenAddress: string,
        private readonly _feeTokenDecimals: number,
        private readonly _configManager: ConfigManager,
        private readonly _gasStationAttendant: GasStationAttendant,
        private readonly _tokenPriceOracle: TokenPriceOracle,
    ) {}

    /**
     * Retrieve estimated gas price from the gas station.
     *
     * @returns estimated gas price
     */
    public async getGasPriceEstimationAsync(): Promise<BigNumber> {
        const gasPriceEstimate = await this._gasStationAttendant.getExpectedTransactionGasRateAsync();
        return gasPriceEstimate;
    }

    /**
     * Calculate gas fee for all fee model versions, based on gas price query and gas estimation.
     *
     * @returns estimated gas fee with `gasOnly` details
     */
    public async calculateGasFeeAsync(
        makerToken: string,
        takerToken: string,
        isUnwrap: boolean,
        feeModelVersion: number,
    ): Promise<FeeWithDetails> {
        const gasPrice: BigNumber = await this.getGasPriceEstimationAsync();
        const gasEstimate = calculateGasEstimate(makerToken, takerToken, 'otc', isUnwrap);
        const gasFeeAmount = gasPrice.times(gasEstimate);

        return {
            amount: gasFeeAmount,
            token: this._feeTokenAddress,
            type: 'fixed',
            details: {
                feeModelVersion,
                kind: 'gasOnly',
                gasFeeAmount,
                gasPrice,
            },
        };
    }

    /**
     * Calculate fee with fee model v1, including gas fee and trade size based fee.
     *
     * @returns fee with `default` details
     */
    public async calculateFeeV1Async(
        makerToken: string,
        takerToken: string,
        makerTokenDecimals: number,
        takerTokenDecimals: number,
        isUnwrap: boolean,
        isSelling: boolean,
        assetFillAmount: BigNumber,
    ): Promise<FeeWithDetails & { details: DefaultFeeBreakdown }> {
        const gasFee = await this.calculateGasFeeAsync(makerToken, takerToken, isUnwrap, 1);

        const feeModelConfiguration = this._configManager.getFeeModelConfiguration(
            this._chainId,
            makerToken,
            takerToken,
        );
        const { zeroExFeeAmount, tradeSizeBps, feeTokenBaseUnitPriceUsd, tradeTokenBaseUnitPriceInUsd } =
            await this._calculateDefaultFeeAsync(
                /* tradeToken */ isSelling ? takerToken : makerToken,
                /* tradeTokenDecimals */ isSelling ? takerTokenDecimals : makerTokenDecimals,
                /* tradeAmount */ assetFillAmount,
                feeModelConfiguration.tradeSizeBps,
            );

        return {
            type: 'fixed',
            token: this._feeTokenAddress,
            amount: gasFee.amount.plus(zeroExFeeAmount),
            details: {
                feeModelVersion: 1,
                kind: 'default',
                gasFeeAmount: gasFee.amount,
                gasPrice: gasFee.details.gasPrice,
                zeroExFeeAmount,
                tradeSizeBps,
                feeTokenBaseUnitPriceUsd,
                takerTokenBaseUnitPriceUsd: isSelling ? tradeTokenBaseUnitPriceInUsd : null,
                makerTokenBaseUnitPriceUsd: isSelling ? null : tradeTokenBaseUnitPriceInUsd,
            },
        };
    }

    /**
     * Internal method to calculate zeroEx fee based on trade size.
     */
    private async _calculateDefaultFeeAsync(
        tradeToken: string,
        tradeTokenDecimals: number,
        tradeAmount: BigNumber,
        tradeSizeBps: number,
    ): Promise<{
        zeroExFeeAmount: BigNumber;
        tradeSizeBps: number;
        tradeTokenBaseUnitPriceInUsd: BigNumber | null;
        feeTokenBaseUnitPriceUsd: BigNumber | null;
    }> {
        let zeroExFeeAmount = ZERO;
        let bps = tradeSizeBps;
        let tradeTokenBaseUnitPriceInUsd = null;
        let feeTokenBaseUnitPriceUsd = null;

        if (bps > 0) {
            [tradeTokenBaseUnitPriceInUsd, feeTokenBaseUnitPriceUsd] =
                await this._tokenPriceOracle.batchFetchTokenPriceAsync([
                    {
                        chainId: this._chainId,
                        tokenAddress: tradeToken,
                        tokenDecimals: tradeTokenDecimals,
                    },
                    {
                        chainId: this._chainId,
                        tokenAddress: this._feeTokenAddress,
                        tokenDecimals: this._feeTokenDecimals,
                    },
                ]);

            if (tradeTokenBaseUnitPriceInUsd !== null && feeTokenBaseUnitPriceUsd !== null) {
                zeroExFeeAmount = tradeAmount
                    .times(bps * BPS_TO_RATIO)
                    .times(tradeTokenBaseUnitPriceInUsd)
                    .dividedBy(feeTokenBaseUnitPriceUsd);
            } else {
                bps = 0;
                tradeTokenBaseUnitPriceInUsd = null;
                feeTokenBaseUnitPriceUsd = null;
            }
        }

        return {
            zeroExFeeAmount,
            tradeSizeBps: bps,
            tradeTokenBaseUnitPriceInUsd,
            feeTokenBaseUnitPriceUsd,
        };
    }
}
