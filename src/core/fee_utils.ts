import { BigNumber } from '@0x/utils';

import { Fee, FeeWithDetails, StoredFee } from './types';

const tokenPriceUsdToString = (tokenPriceUsd: BigNumber | null): string | undefined => {
    if (tokenPriceUsd === null) {
        return undefined;
    }
    return tokenPriceUsd.toString();
};

const isInstanceOfFeeWithDetails = (fee: Fee): fee is FeeWithDetails => {
    return 'details' in fee;
};

const isInstanceOfFeeWithBreakdown = (fee: Fee): fee is FeeWithDetails => {
    return 'breakdown' in fee && 'conversionRates' in fee;
};

export const feeToStoredFee = (fee: Fee): StoredFee => {
    let details;
    if (isInstanceOfFeeWithDetails(fee)) {
        switch (fee.details.kind) {
            case 'default':
                details = {
                    kind: fee.details.kind,
                    feeModelVersion: fee.details.feeModelVersion,
                    gasFeeAmount: fee.details.gasFeeAmount.toString(),
                    gasPrice: fee.details.gasPrice.toString(),
                    tradeSizeBps: fee.details.tradeSizeBps,
                    zeroExFeeAmount: fee.details.zeroExFeeAmount.toString(),
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    feeTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.details.feeTokenBaseUnitPriceUsd!),
                    takerTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.details.takerTokenBaseUnitPriceUsd),
                    makerTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.details.makerTokenBaseUnitPriceUsd),
                };
                break;
            case 'margin':
                details = {
                    kind: fee.details.kind,
                    feeModelVersion: fee.details.feeModelVersion,
                    gasFeeAmount: fee.details.gasFeeAmount.toString(),
                    gasPrice: fee.details.gasPrice.toString(),
                    margin: fee.details.margin.toString(),
                    marginRakeRatio: fee.details.marginRakeRatio,
                    zeroExFeeAmount: fee.details.zeroExFeeAmount.toString(),
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    feeTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.details.feeTokenBaseUnitPriceUsd!),
                    takerTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.details.takerTokenBaseUnitPriceUsd),
                    makerTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.details.makerTokenBaseUnitPriceUsd),
                };
                break;
            case 'gasOnly':
            default:
                details = {
                    kind: fee.details.kind,
                    feeModelVersion: fee.details.feeModelVersion,
                    gasFeeAmount: fee.details.gasFeeAmount.toString(),
                    gasPrice: fee.details.gasPrice.toString(),
                };
        }
    }

    let breakdown, conversionRates;
    if (isInstanceOfFeeWithBreakdown(fee)) {
        if (fee.breakdown) {
            let gas, zeroEx;
            if (fee.breakdown.gas) {
                gas = {
                    amount: fee.breakdown.gas.amount.toString(),
                    details: {
                        gasPrice: fee.breakdown.gas.details.gasPrice.toString(),
                        estimatedGas: fee.breakdown.gas.details.estimatedGas.toString(),
                    },
                };
            }
            if (fee.breakdown.zeroEx) {
                let details;
                switch (fee.breakdown.zeroEx.details.kind) {
                    case 'volume':
                        details = {
                            kind: fee.breakdown.zeroEx.details.kind,
                            tradeSizeBps: fee.breakdown.zeroEx.details.tradeSizeBps,
                        };
                        break;
                    case 'price_improvement':
                        details = {
                            kind: fee.breakdown.zeroEx.details.kind,
                            priceImprovement: fee.breakdown.zeroEx.details.priceImprovement.toString(),
                            rakeRatio: fee.breakdown.zeroEx.details.rakeRatio,
                        };
                        break;
                    default:
                        throw new Error(`Invalide zeroEx fee details: ${JSON.stringify(fee.breakdown.zeroEx.details)}`);
                }
                zeroEx = {
                    amount: fee.breakdown.zeroEx.amount.toString(),
                    details,
                };
            }
            breakdown = {
                gas,
                zeroEx,
            };
        }
        if (fee.conversionRates) {
            conversionRates = {
                nativeTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.conversionRates.nativeTokenBaseUnitPriceUsd),
                feeTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.conversionRates.feeTokenBaseUnitPriceUsd),
                takerTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.conversionRates.takerTokenBaseUnitPriceUsd),
                makerTokenBaseUnitPriceUsd: tokenPriceUsdToString(fee.conversionRates.makerTokenBaseUnitPriceUsd),
            };
        }
    }

    return {
        token: fee.token,
        amount: fee.amount.toString(),
        type: fee.type,
        details,
        breakdown,
        conversionRates,
    };
};

export const storedFeeToFee = (fee: StoredFee): Fee => {
    return {
        token: fee.token,
        amount: new BigNumber(fee.amount),
        type: fee.type,
    };
};
