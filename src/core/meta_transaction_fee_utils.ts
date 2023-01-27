import { BigNumber } from '@0x/utils';
import { Fees, GasFee, IntegratorShareFee, RawFees, VolumeBasedFee } from './types/meta_transaction_fees';

export function rawFeesToFees(rawFees: RawFees | undefined): Fees | undefined {
    if (!rawFees) {
        return undefined;
    }

    let integratorFee: VolumeBasedFee | undefined;
    if (rawFees.integratorFee) {
        const rawIntegratorFee = rawFees.integratorFee;

        integratorFee = {
            type: 'volume',
            feeToken: rawIntegratorFee.feeToken,
            feeAmount: new BigNumber(rawIntegratorFee.feeAmount),
            feeRecipient: rawFees.integratorFee.feeRecipient,
            volumePercentage: new BigNumber(rawFees.integratorFee.volumePercentage),
        };
    }

    let zeroExFee: VolumeBasedFee | IntegratorShareFee | undefined;
    if (rawFees.zeroExFee) {
        const rawZeroExFee = rawFees.zeroExFee;

        if (rawZeroExFee.type === 'volume') {
            zeroExFee = {
                type: 'volume',
                feeToken: rawZeroExFee.feeToken,
                feeAmount: new BigNumber(rawZeroExFee.feeAmount),
                feeRecipient: rawZeroExFee.feeRecipient,
                volumePercentage: new BigNumber(rawZeroExFee.volumePercentage),
            };
        } else if (rawZeroExFee.type === 'integrator_share') {
            zeroExFee = {
                type: 'integrator_share',
                feeToken: rawZeroExFee.feeToken,
                feeAmount: new BigNumber(rawZeroExFee.feeAmount),
                feeRecipient: rawZeroExFee.feeRecipient,
                integratorSharePercentage: new BigNumber(rawZeroExFee.integratorSharePercentage),
            };
        }
    }

    let gasFee: GasFee | undefined;
    if (rawFees.gasFee) {
        const rawGasFee = rawFees.gasFee;

        gasFee = {
            type: 'gas',
            feeToken: rawGasFee.feeToken,
            feeAmount: new BigNumber(rawGasFee.feeAmount),
            feeRecipient: rawGasFee.feeRecipient,
            gasPrice: new BigNumber(rawGasFee.gasPrice),
            estimatedGas: new BigNumber(rawGasFee.estimatedGas),
            feeTokenAmountPerBaseUnitNativeToken: new BigNumber(rawGasFee.feeTokenAmountPerBaseUnitNativeToken),
        };
    }

    return {
        integratorFee,
        zeroExFee,
        gasFee,
    };
}
