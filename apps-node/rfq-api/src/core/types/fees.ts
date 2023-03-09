import { BigNumber } from '@0x/utils';

export type FeeModelVersion = /* no 0x fee */ 0 | /* fixed rate */ 1 | /* margin rake */ 2;

export interface Fee {
    token: string;
    amount: BigNumber;
    type: 'fixed' | 'bps';
}

/**
 * (Deprecated) base interface for FeeDetails type.
 */
interface FeeDetailsBaseDeprecated {
    /**
     * `kind` is used to mark the type of FeeDetails.
     */
    kind: 'gasOnly' | 'default' | 'margin';
    /**
     * Version number of fee model which determines the fee amount to charge MMs.
     *   * Version 0 includes estimated gas cost only.
     *   * Version 1 charge an additional bps as 0x fee, based on trade size, on top of gas.
     *   * Version 2 charge 0x fee based on detected margin of RFQm with AMMs.
     * While Verion 0 will use `gasOnly` FeeDetails, and Version 1 will use `default`, Version 2
     * will use all three of them: `gasOnly` for margin detection, `margin` if margin detection
     * succeeded, and `default` if margin detection failed.
     */
    feeModelVersion: FeeModelVersion;
    gasFeeAmount: BigNumber;
    gasPrice: BigNumber;
}

/**
 * (Deprecated) interface for `margin` FeeDetails type. In this case the Fee is
 * calculated using margin based method
 */
export interface MarginBasedFeeDetailsDeprecated extends FeeDetailsBaseDeprecated {
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
 * (Deprecated) interface for `default` FeeDetails type. In this case the Fee is
 * calculated using default method, based on trade size and bps of underlying
 * pairs.
 */
export interface DefaultFeeDetailsDeprecated extends FeeDetailsBaseDeprecated {
    kind: 'default';
    tradeSizeBps: number;
    zeroExFeeAmount: BigNumber;
    feeTokenBaseUnitPriceUsd: BigNumber | null;
    takerTokenBaseUnitPriceUsd: BigNumber | null;
    makerTokenBaseUnitPriceUsd: BigNumber | null;
}

/**
 * (Deprecated) interface for `gasOnly` FeeDetails type. Only gas related information
 * is included.
 */
export interface GasOnlyFeeDetailsDeprecated extends FeeDetailsBaseDeprecated {
    kind: 'gasOnly';
}

interface GasFeeBreakdownDetails {
    gasPrice: BigNumber;
    estimatedGas: BigNumber;
}

interface VolumeBasedFeeBreakdownDetails {
    kind: 'volume';
    tradeSizeBps: number;
}

interface PriceImprovementBasedFeeBreakdownDetails {
    kind: 'price_improvement';
    priceImprovement: BigNumber;
    rakeRatio: number;
}

export interface FeeBreakdown {
    gas?: {
        amount: BigNumber;
        details: GasFeeBreakdownDetails;
    };
    zeroEx?: {
        amount: BigNumber;
        details: VolumeBasedFeeBreakdownDetails | PriceImprovementBasedFeeBreakdownDetails;
    };
}

export interface ConversionRates {
    nativeTokenBaseUnitPriceUsd: BigNumber | null;
    feeTokenBaseUnitPriceUsd: BigNumber | null;
    takerTokenBaseUnitPriceUsd: BigNumber | null;
    makerTokenBaseUnitPriceUsd: BigNumber | null;
}

/**
 * Extends Fee data schema to include a details session, which could be one
 * of `gasOnly`, `default` or `margin` type, depending on the approach used
 * to calculate the Fee.
 */
export interface FeeWithDetails extends Fee {
    details: GasOnlyFeeDetailsDeprecated | DefaultFeeDetailsDeprecated | MarginBasedFeeDetailsDeprecated;
    breakdown: FeeBreakdown;
    conversionRates: ConversionRates;
}

export interface StoredFee {
    token: string;
    amount: string;
    type: 'fixed' | 'bps';
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    /* eslint-disable @typescript-eslint/no-explicit-any */
    details?: any;
    breakdown?: any;
    conversionRates?: any;
    /* eslint-enable @typescript-eslint/no-explicit-any */
}
