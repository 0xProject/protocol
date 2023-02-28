import { BigNumber } from '@0x/utils';
import { ZERO } from '../constants';
import {
    GasFee,
    GasFeeConfig,
    FeeConfigs,
    Fees,
    IntegratorShareFee,
    IntegratorShareFeeConfig,
    VolumeBasedFee,
    VolumeBasedFeeConfig,
} from '../types';

interface OnChainTransfer {
    feeToken: string;
    feeAmount: BigNumber;
    feeRecipient: string;
}

/**
 * Calculate fees object which contains total fee amount and a breakdown of integrator, 0x and gas fees.
 *
 * @param opts feeConfigs: Fee configs parsed from input.
 *             sellToken: Address of the sell token.
 *             sellTokenAmount: Amount of the sell token.
 *             sellTokenAmountPerWei: Amount of sell token per wei.
 *             gasPrice: Estimated gas price.
 *             quoteGasEstimate: The gas estimate to fill the quote.
 *             gasPerOnChainTransfer: The gas cost per on-chain transfer.
 * @returns Fee object, the total on-chain fee amount, on-chain transfers and the gas associated with on-chain transfers.
 */
export function calculateFees(opts: {
    feeConfigs: FeeConfigs | undefined;
    sellToken: string;
    sellTokenAmount: BigNumber;
    sellTokenAmountPerWei: BigNumber | undefined;
    gasPrice: BigNumber;
    quoteGasEstimate: BigNumber;
    gasPerOnChainTransfer: BigNumber;
}): {
    fees: Fees | undefined;
    totalOnChainFeeAmount: BigNumber;
    onChainTransfers: OnChainTransfer[];
    onChainTransfersGas: BigNumber;
} {
    if (!opts.feeConfigs) {
        return {
            fees: undefined,
            totalOnChainFeeAmount: ZERO,
            onChainTransfers: [],
            onChainTransfersGas: ZERO,
        };
    }

    const integratorFee = _calculateIntegratorFee({
        integratorFeeConfig: opts.feeConfigs.integratorFee,
        sellToken: opts.sellToken,
        sellTokenAmount: opts.sellTokenAmount,
    });

    const zeroExFee = _calculateZeroExFee({
        zeroExFeeConfig: opts.feeConfigs.zeroExFee,
        sellToken: opts.sellToken,
        sellTokenAmount: opts.sellTokenAmount,
        integratorFee,
    });

    const gasFee = _calculateGasFee({
        gasFeeConfig: opts.feeConfigs.gasFee,
        sellToken: opts.sellToken,
        sellTokenAmountPerWei: opts.sellTokenAmountPerWei,
        gasPrice: opts.gasPrice,
        quoteGasEstimate: opts.quoteGasEstimate,
        gasPerOnChainTransfer: opts.gasPerOnChainTransfer,
        integratorFee,
        zeroExFee,
    });

    const fees = {
        integratorFee,
        zeroExFee,
        gasFee,
    };

    return {
        fees,
        ..._calculateTotalOnChainFees(fees, opts.gasPerOnChainTransfer),
    };
}

/**
 * Calculate fees that needs to be transferred on-chain.
 *
 * @param fees Fees object.
 * @param gasPerOnChainTransfer: The gas cost per on-chain transfer.
 * @returns On-chain fee amount, transfers and corresponding gas cost.
 */
function _calculateTotalOnChainFees(
    fees: Fees,
    gasPerOnChainTransfer: BigNumber,
): {
    totalOnChainFeeAmount: BigNumber;
    onChainTransfers: OnChainTransfer[];
    onChainTransfersGas: BigNumber;
} {
    const feeRecipientToOnChainTransfer = new Map<string, OnChainTransfer>();

    // Integrator fee
    if (
        fees.integratorFee &&
        fees.integratorFee.billingType === 'on-chain' &&
        fees.integratorFee.feeRecipient &&
        fees.integratorFee.feeAmount.gt(ZERO)
    ) {
        const currentIntegratorFeeAmount =
            feeRecipientToOnChainTransfer.get(fees.integratorFee.feeRecipient)?.feeAmount ?? ZERO;
        let zeroExFeeAdjustment = ZERO;

        // If 0x fee is on-chain integrator share fee, we need to adjust integrator fee
        if (
            fees.zeroExFee &&
            fees.zeroExFee.billingType === 'on-chain' &&
            fees.zeroExFee.feeRecipient &&
            fees.zeroExFee.type === 'integrator_share'
        ) {
            zeroExFeeAdjustment = fees.zeroExFee.feeAmount;
        }

        feeRecipientToOnChainTransfer.set(fees.integratorFee.feeRecipient, {
            feeRecipient: fees.integratorFee.feeRecipient,
            feeToken: fees.integratorFee.feeToken,
            feeAmount: currentIntegratorFeeAmount.plus(fees.integratorFee.feeAmount.minus(zeroExFeeAdjustment)),
        });
    }
    // 0x fee
    if (
        fees.zeroExFee &&
        fees.zeroExFee.billingType === 'on-chain' &&
        fees.zeroExFee.feeRecipient &&
        fees.zeroExFee.feeAmount.gt(ZERO)
    ) {
        const currentZeroExFeeAmount =
            feeRecipientToOnChainTransfer.get(fees.zeroExFee.feeRecipient)?.feeAmount ?? ZERO;
        feeRecipientToOnChainTransfer.set(fees.zeroExFee.feeRecipient, {
            feeRecipient: fees.zeroExFee.feeRecipient,
            feeToken: fees.zeroExFee.feeToken,
            feeAmount: currentZeroExFeeAmount.plus(fees.zeroExFee.feeAmount),
        });
    }
    // Gas fee
    if (
        fees.gasFee &&
        fees.gasFee.billingType === 'on-chain' &&
        fees.gasFee.feeRecipient &&
        fees.gasFee.feeAmount.gt(ZERO)
    ) {
        const currentGasFeeAmount = feeRecipientToOnChainTransfer.get(fees.gasFee.feeRecipient)?.feeAmount ?? ZERO;
        feeRecipientToOnChainTransfer.set(fees.gasFee.feeRecipient, {
            feeRecipient: fees.gasFee.feeRecipient,
            feeToken: fees.gasFee.feeToken,
            feeAmount: currentGasFeeAmount.plus(fees.gasFee.feeAmount),
        });
    }

    const onChainTransfersGas = gasPerOnChainTransfer.times(feeRecipientToOnChainTransfer.size);
    const onChainTransfers = [...feeRecipientToOnChainTransfer.values()];
    return {
        totalOnChainFeeAmount: onChainTransfers.reduce(
            (totalOnChainFeeAmount, onChainTransfer) => totalOnChainFeeAmount.plus(onChainTransfer.feeAmount),
            ZERO,
        ),
        onChainTransfers,
        onChainTransfersGas,
    };
}

function _calculateIntegratorFee(opts: {
    integratorFeeConfig?: VolumeBasedFeeConfig;
    sellToken: string;
    sellTokenAmount: BigNumber;
}): VolumeBasedFee | undefined {
    if (!opts.integratorFeeConfig) {
        return undefined;
    }

    return {
        type: 'volume',
        feeToken: opts.sellToken,
        feeAmount: opts.sellTokenAmount
            .times(opts.integratorFeeConfig.volumePercentage)
            .integerValue(BigNumber.ROUND_FLOOR),
        feeRecipient: opts.integratorFeeConfig.feeRecipient,
        billingType: opts.integratorFeeConfig.billingType,
        volumePercentage: opts.integratorFeeConfig.volumePercentage,
    };
}

function _calculateZeroExFee(opts: {
    zeroExFeeConfig?: VolumeBasedFeeConfig | IntegratorShareFeeConfig;
    sellToken: string;
    sellTokenAmount: BigNumber;
    integratorFee?: VolumeBasedFee;
}): VolumeBasedFee | IntegratorShareFee | undefined {
    if (!opts.zeroExFeeConfig) {
        return undefined;
    }

    switch (opts.zeroExFeeConfig.type) {
        case 'volume':
            return {
                type: 'volume',
                feeToken: opts.sellToken,
                feeAmount: opts.sellTokenAmount
                    .times(opts.zeroExFeeConfig.volumePercentage)
                    .integerValue(BigNumber.ROUND_FLOOR),
                feeRecipient: opts.zeroExFeeConfig.feeRecipient,
                billingType: opts.zeroExFeeConfig.billingType,
                volumePercentage: opts.zeroExFeeConfig.volumePercentage,
            };
        case 'integrator_share':
            if (!opts.integratorFee) {
                // This should never happen
                throw new Error('Integrator fee is undefined');
            }

            return {
                type: 'integrator_share',
                feeToken: opts.sellToken,
                feeAmount: opts.integratorFee.feeAmount
                    .times(opts.zeroExFeeConfig.integratorSharePercentage)
                    .integerValue(BigNumber.ROUND_FLOOR),
                feeRecipient: opts.zeroExFeeConfig.feeRecipient,
                billingType: opts.zeroExFeeConfig.billingType,
                integratorSharePercentage: opts.zeroExFeeConfig.integratorSharePercentage,
            };
        default:
            return undefined;
    }
}

function _calculateGasFee(opts: {
    gasFeeConfig?: GasFeeConfig;
    sellToken: string;
    sellTokenAmountPerWei: BigNumber | undefined;
    gasPrice: BigNumber;
    quoteGasEstimate: BigNumber;
    gasPerOnChainTransfer: BigNumber;
    integratorFee?: VolumeBasedFee;
    zeroExFee?: VolumeBasedFee | IntegratorShareFee;
}): GasFee | undefined {
    if (!opts.gasFeeConfig) {
        return undefined;
    }
    if (!opts.sellTokenAmountPerWei) {
        throw new Error(`Undefined sellTokenAmountPerWei when gas fee config is not undefined ${opts.gasFeeConfig}`);
    }

    // TODO: Throw error for mainnet if we can't get sell token to native token conversion rate (sellTokenAmountPerWei is 0)

    // Check the number of on-chain transfer necessary for fee
    const feeRecipients = new Set<string>();
    if (
        opts.integratorFee &&
        opts.integratorFee.billingType === 'on-chain' &&
        opts.integratorFee.feeRecipient &&
        opts.integratorFee.feeAmount.gt(ZERO)
    ) {
        feeRecipients.add(opts.integratorFee.feeRecipient);
    }
    if (
        opts.zeroExFee &&
        opts.zeroExFee.billingType === 'on-chain' &&
        opts.zeroExFee.feeRecipient &&
        opts.zeroExFee.feeAmount.gt(ZERO)
    ) {
        feeRecipients.add(opts.zeroExFee.feeRecipient);
    }
    if (
        opts.gasFeeConfig &&
        opts.gasFeeConfig.billingType === 'on-chain' &&
        opts.gasFeeConfig.feeRecipient &&
        opts.sellTokenAmountPerWei.gt(ZERO)
    ) {
        feeRecipients.add(opts.gasFeeConfig.feeRecipient);
    }

    const numOnChainTransfer = feeRecipients.size;
    // Add the on-chain transfer gas cost
    const estimatedGas = opts.quoteGasEstimate.plus(opts.gasPerOnChainTransfer.times(numOnChainTransfer));

    return {
        type: 'gas',
        feeToken: opts.sellToken,
        feeAmount: opts.sellTokenAmountPerWei
            .times(opts.gasPrice)
            .times(estimatedGas)
            .integerValue(BigNumber.ROUND_FLOOR),
        feeRecipient: opts.gasFeeConfig.feeRecipient,
        billingType: opts.gasFeeConfig.billingType,
        feeTokenAmountPerWei: opts.sellTokenAmountPerWei,
        gasPrice: opts.gasPrice,
        estimatedGas,
    };
}
