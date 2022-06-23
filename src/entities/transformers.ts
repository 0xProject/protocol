import { BigNumber } from '@0x/utils';
import { ValueTransformer } from 'typeorm';

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
