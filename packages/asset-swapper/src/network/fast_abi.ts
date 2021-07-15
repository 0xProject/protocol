import { EncoderOverrides } from '@0x/base-contract';
import { BigNumber } from '@0x/utils';
import { MethodAbi } from 'ethereum-types';
import { FastABI } from 'fast-abi';

import { ContractWrapperType } from './types';

// Cache to avoid creating tons of FastABI instances for commonly used contracts.
const ABI_ENCODER_CACHE: { [k: string]: EncoderOverrides } = {};

export function createFastAbiEncoderOverrides<T extends any>(contractType: ContractWrapperType<T>): EncoderOverrides {
    let fastAbi = ABI_ENCODER_CACHE[contractType.contractName];
    if (!fastAbi) {
        fastAbi = new FastABI(contractType.ABI() as MethodAbi[], { BigNumber });
        ABI_ENCODER_CACHE[contractType.contractName] = fastAbi;
    }
    return {
        encodeInput: (fnName: string, values: any) => fastAbi.encodeInput(fnName, values),
        decodeOutput: (fnName: string, data: string) => fastAbi.decodeOutput(fnName, data),
    };
}
