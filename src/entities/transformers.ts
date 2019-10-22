import { BigNumber } from '@0x/utils';
import { ValueTransformer } from 'typeorm';

import { ZeroExTransactionWithoutDomain } from '../types';

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

export const ZeroExTransactionWithoutDomainTransformer: ValueTransformer = {
    from: (value: string | undefined | null): ZeroExTransactionWithoutDomain | null => {
        if (value === undefined || value === null) {
            return null;
        }
        const obj = JSON.parse(value);
        obj.salt = new BigNumber(obj.salt);
        obj.expirationTimeSeconds = new BigNumber(obj.expirationTimeSeconds);
        obj.gasPrice = new BigNumber(obj.gasPrice);
        return obj;
    },
    to: (value: ZeroExTransactionWithoutDomain | null | undefined): string | null => {
        if (value === null || value === undefined) {
            return null;
        }
        const objToStore = {
            ...value,
            salt: value.salt.toString(),
            expirationTimeSeconds: value.expirationTimeSeconds.toString(),
            gasPrice: value.gasPrice.toString(),
        };
        return JSON.stringify(objToStore);
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
