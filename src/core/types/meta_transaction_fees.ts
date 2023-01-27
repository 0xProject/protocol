import { BigNumber } from '@0x/utils';

// The fee types below are copied from 0x-api
interface FeeConfigBase {
    feeRecipient: string | null;
}

export interface VolumeBasedFeeConfig extends FeeConfigBase {
    type: 'volume';
    volumePercentage: BigNumber;
}

export interface GasFeeConfig extends FeeConfigBase {
    type: 'gas';
}

export interface IntegratorShareFeeConfig extends FeeConfigBase {
    type: 'integrator_share';
    integratorSharePercentage: BigNumber;
}

// Fee configs passed to /meta_transaction/v2/price and /meta_transaction/v2/quote
export interface FeeConfigs {
    integratorFee?: VolumeBasedFeeConfig;
    zeroExFee?: VolumeBasedFeeConfig | IntegratorShareFeeConfig;
    gasFee?: GasFeeConfig;
}

interface FeeBase {
    feeToken: string;
    feeAmount: BigNumber;
    feeRecipient: string | null;
}

interface RawFeeBase {
    feeToken: string;
    feeAmount: string;
    feeRecipient: string | null;
}

export interface VolumeBasedFee extends FeeBase {
    type: 'volume';
    volumePercentage: BigNumber;
}

interface RawVolumeBasedFee extends RawFeeBase {
    type: 'volume';
    volumePercentage: string;
}

export interface GasFee extends FeeBase {
    type: 'gas';
    gasPrice: BigNumber;
    estimatedGas: BigNumber;
    feeTokenAmountPerBaseUnitNativeToken: BigNumber;
}

interface RawGasFee extends RawFeeBase {
    type: 'gas';
    gasPrice: string;
    estimatedGas: string;
    feeTokenAmountPerBaseUnitNativeToken: string;
}

export interface IntegratorShareFee extends FeeBase {
    type: 'integrator_share';
    integratorSharePercentage: BigNumber;
}

interface RawIntegratorShareFee extends RawFeeBase {
    type: 'integrator_share';
    integratorSharePercentage: string;
}

// Fees returned to the caller of /meta_transaction/v2/price and /meta_transaction/v2/quote
export interface Fees {
    integratorFee?: VolumeBasedFee;
    zeroExFee?: VolumeBasedFee | IntegratorShareFee;
    gasFee?: GasFee;
}

export interface RawFees {
    integratorFee?: RawVolumeBasedFee;
    zeroExFee?: RawVolumeBasedFee | RawIntegratorShareFee;
    gasFee?: RawGasFee;
}
