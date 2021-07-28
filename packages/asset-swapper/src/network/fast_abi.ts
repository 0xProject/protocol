import { EncoderOverrides } from '@0x/base-contract';
import { BigNumber } from '@0x/utils';
import { MethodAbi } from 'ethereum-types';
import { FastABI } from 'fast-abi';

import { ContractWrapperType } from './types';
import { timeIt } from '../utils/utils';

// Cache to avoid creating tons of FastABI instances for commonly used contracts.
const ABI_ENCODER_CACHE: { [k: string]: EncoderOverrides } = {};

export function createFastAbiEncoderOverrides<T extends any>(contractType: ContractWrapperType<T>): EncoderOverrides {
    let fastAbi = ABI_ENCODER_CACHE[contractType.contractName];
    if (!fastAbi) {
        fastAbi = new FastABI(contractType.ABI() as MethodAbi[], { BigNumber });
        ABI_ENCODER_CACHE[contractType.contractName] = fastAbi;
    }
    return {
        encodeInput: (fnName: string, values: any) => timeIt(() => fastAbi.encodeInput(fnName, values), dt => `${fnName} encode took ${dt}ms`),
        decodeOutput: (fnName: string, data: string) => timeIt(() => fastAbi.decodeOutput(fnName, data), dt => `${fnName} decode too ${dt}ms`),
    };
}
