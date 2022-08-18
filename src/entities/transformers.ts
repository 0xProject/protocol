import { MetaTransaction, MetaTransactionFields } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { ValueTransformer } from 'typeorm';

import { FeeWithDetails } from '../services/types';

import { StoredFee } from './types';

export const BigIntTransformer: ValueTransformer = {
    from: (value: string | null): number | null => {
        if (value === null) {
            return null;
        }
        const num = Number(value);
        if (!Number.isSafeInteger(num)) {
            throw new Error('unsafe integer precision when transforming value');
        }
        return value === null ? null : Number(value);
    },
    to: (value: number | null | undefined): string | null => {
        if (value === null || value === undefined) {
            return null;
        }
        if (!Number.isSafeInteger(value)) {
            throw new Error('unsafe integer precision when transforming value');
        }
        return value.toString();
    },
};

export const BigNumberTransformer: ValueTransformer = {
    from: (value: string | null): BigNumber | null => {
        return value === null ? null : new BigNumber(value);
    },
    to: (value: BigNumber | null | undefined): string | null => {
        return value === null || value === undefined ? null : value.toString();
    },
};

export const MetaTransactionTransformer: ValueTransformer = {
    /**
     * Used to marshal `MetaTransaction` when writing to the database.
     */
    to: (metaTransaction: MetaTransaction): Record<keyof MetaTransactionFields, string> => {
        const { minGasPrice, maxGasPrice, expirationTimeSeconds, salt, value, feeAmount, chainId } = metaTransaction;
        return {
            ...metaTransaction,
            minGasPrice: minGasPrice.toString(),
            maxGasPrice: maxGasPrice.toString(),
            expirationTimeSeconds: expirationTimeSeconds.toString(),
            salt: salt.toString(),
            value: value.toString(),
            feeAmount: feeAmount.toString(),
            chainId: chainId.toString(),
        };
    },
    /**
     * Used to unmarshal `MetaTransaction` when reading from the database.
     */
    from: (storedValue: Record<keyof MetaTransactionFields, string>): MetaTransaction => {
        const { minGasPrice, maxGasPrice, expirationTimeSeconds, salt, value, feeAmount, chainId } = storedValue;
        return new MetaTransaction({
            ...storedValue,
            minGasPrice: new BigNumber(minGasPrice),
            maxGasPrice: new BigNumber(maxGasPrice),
            expirationTimeSeconds: new BigNumber(expirationTimeSeconds),
            salt: new BigNumber(salt),
            value: new BigNumber(value),
            feeAmount: new BigNumber(feeAmount),
            chainId: Number(chainId),
        });
    },
};

export const FeeTransformer: ValueTransformer = {
    /**
     * Used to marshal `Fee` when writing to the database.
     */
    to: (value: Fee): StoredFee => {
        return feeToStoredFee(value);
    },
    /**
     * Used to unmarshal `Fee` when reading from the database.
     */
    from: (storedValue: StoredFee): Fee => {
        return {
            token: storedValue.token,
            amount: new BigNumber(storedValue.amount),
            type: storedValue.type,
        };
    },
};

const tokenPriceUsdToString = (tokenPriceUsd: BigNumber | null): string | undefined => {
    if (tokenPriceUsd === null) {
        return undefined;
    }
    return tokenPriceUsd.toString();
};

const isInstanceOfFeeWithDetails = (fee: Fee): fee is FeeWithDetails => {
    return 'details' in fee;
};

const feeToStoredFee = (fee: Fee): StoredFee => {
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

    return {
        token: fee.token,
        amount: fee.amount.toString(),
        type: fee.type,
        details,
    };
};
