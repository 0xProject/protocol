import { BaseContract, ContractFunctionObj } from '@0x/base-contract';
import { ChainId } from '@0x/contract-addresses';
import { hexUtils } from '@0x/utils';
import { ContractAbi, ContractVersionData, MethodAbi, SupportedProvider } from 'ethereum-types';

import { artifacts } from '../artifacts';

import { Chain, ChainEthCallOpts } from './chain';
import { DUMMY_PROVIDER } from './constants';
import { createFastAbiEncoderOverrides } from './fast_abi';
import { Address, Bytes, DexSample, MultiHopCallInfo } from './types';

const ADDRESS_SIZE = 20;

interface ArtifactsMap {
    [artifactName: string]: ContractVersionData;
}

export interface ContractWrapperType<T> {
    contractName: string;
    new (
        address: Address,
        provider: SupportedProvider,
        _txDefaults: {},
        _logDeps: {},
        deployedBytecode: Bytes | undefined,
        encoderOverrides?: {
            encodeInput: (fnName: string, values: any) => Bytes;
            decodeOutput: (fnName: string, data: Bytes) => any;
        },
    ): T;
    ABI(): ContractAbi | MethodAbi[];
}

export function getDeterministicContractAddressFromBytecode(bytecode: Bytes): Address {
    return hexUtils.leftPad(hexUtils.hash(bytecode), ADDRESS_SIZE);
}

export function getBytecodeFromArtifact(artifact: ContractVersionData): Bytes {
    return artifact.compilerOutput.evm.deployedBytecode.object;
}

export function getDeterministicContractAddressFromArtifact(artifact: ContractVersionData): Address {
    return getDeterministicContractAddressFromBytecode(getBytecodeFromArtifact(artifact));
}

export interface GeneratedContract extends BaseContract {
    getABIDecodedReturnData: <T>(methodName: string, returnData: string) => T;
}

export type ContractFunction<TArgs extends any[], TReturn> = (...args: TArgs) => ContractFunctionObj<TReturn>;

export type ValueByChainId<T> = { [k in ChainId]: T };

// TODO(kimpers): Consolidate this implementation with the one in @0x/token-metadata
export function valueByChainId<T>(rest: Partial<ValueByChainId<T>>, defaultValue: T): { [key in ChainId]: T } {
    // TODO I don't like this but iterating through enums is weird
    return {
        [ChainId.Mainnet]: defaultValue,
        [ChainId.Ropsten]: defaultValue,
        [ChainId.Rinkeby]: defaultValue,
        [ChainId.Kovan]: defaultValue,
        [ChainId.Ganache]: defaultValue,
        [ChainId.BSC]: defaultValue,
        [ChainId.Polygon]: defaultValue,
        [ChainId.PolygonMumbai]: defaultValue,
        ...(rest || {}),
    };
}

/**
 * Use this function to create a contract wrapper instance and its equivalent
 * helper (see below) . If no address is provided, the contract is assumed to be
 * undeployed and the helper will use overrides to provide the bytecode during
 * execution. For undeployed contracts, a deterministic address will be used to
 * prevent uploading the same contract twice.
 */
export function createContractWrapperAndHelper<TContract extends GeneratedContract>(
    chain: Chain,
    contractType: ContractWrapperType<TContract>,
    artifactName: string,
    address?: Address,
): [TContract, ContractHelper<TContract>] {
    const artifact = (artifacts as ArtifactsMap)[artifactName];
    const wrapper = new contractType(
        address || getDeterministicContractAddressFromArtifact(artifact),
        DUMMY_PROVIDER,
        {},
        {},
        !address ? artifact.compilerOutput.evm.deployedBytecode.object : undefined,
        createFastAbiEncoderOverrides(contractType),
    );
    return [wrapper, new ContractHelper(chain, wrapper)];
}

export type UnwrapContractFunctionReturnType<T> = T extends ContractFunctionObj<infer U> ? U : never;

/**
 * This class is the preferred method for interaction with contract wrappers to
 * exploit automatic call batching. The methods here ensure the proper overrides
 * are included in the `eth_call` operation. Do not call `callAsync()` directly on a wrapper.
 * Instead, use `ethCallAsync()` here. You need a ContractHelper per contract.
 * The `createContractWrapperAndHelper()` function will create both in a single step.
 */
export class ContractHelper<TBaseContract extends GeneratedContract> {
    private readonly _defaultEthCallOpts: Partial<ChainEthCallOpts>;

    constructor(public readonly chain: Chain, public readonly contract: TBaseContract) {
        this._defaultEthCallOpts = {
            to: contract.address,
            ...(contract._deployedBytecodeIfExists
                ? {
                      overrides: {
                          [contract.address]: {
                              code: hexUtils.toHex(contract._deployedBytecodeIfExists),
                          },
                      },
                  }
                : {}),
        };
    }

    public async ethCallAsync<
        TContractFunction extends ContractFunction<TParams, TReturn>,
        TParams extends any[] = Parameters<TContractFunction>,
        TReturn = UnwrapContractFunctionReturnType<ReturnType<TContractFunction>>
    >(
        fn: TContractFunction,
        args: Parameters<TContractFunction>,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): Promise<TReturn> {
        const resultData = await this.chain.ethCallAsync(this.encodeCall(fn, args, callOpts));
        return this.decodeCallResult(fn, resultData);
    }

    public encodeCall<TArgs extends any[], TReturn>(
        fn: ContractFunction<TArgs, TReturn>,
        args: TArgs,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): ChainEthCallOpts {
        return encodeCall(this.contract, fn, args, mergeCallOpts(this._defaultEthCallOpts, callOpts));
    }

    public decodeCallResult<TArgs extends any[], TReturn>(
        fn: ContractFunction<TArgs, TReturn>,
        resultData: Bytes,
    ): TReturn {
        return decodeCallResult(this.contract, fn, resultData);
    }

    public createMultiHopCallInfo<TArgs extends any[], TReturn, TFillData>(
        fn: ContractFunction<TArgs, TReturn>,
        args: TArgs,
        resultHandler: (result: TReturn) => DexSample<TFillData>,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): MultiHopCallInfo {
        const c = this.encodeCall(fn, args, callOpts);
        return {
            quoterData: c.data,
            quoterTarget: c.to,
            overrides: c.overrides || {},
            resultHandler: resultData => resultHandler(this.decodeCallResult(fn, resultData)),
        };
    }
}

export function mergeCallOpts(...callOpts: Array<Partial<ChainEthCallOpts>>): Partial<ChainEthCallOpts> {
    return Object.assign(
        {},
        ...callOpts,
        // Mege overrides separately.
        {
            overrides: Object.assign({}, ...callOpts.map(o => o.overrides || {})),
        },
    );
}

export async function ethCallAsync<TArgs extends any[], TReturn>(
    chain: Chain,
    contract: GeneratedContract,
    fn: ContractFunction<TArgs, TReturn>,
    args: TArgs,
    callOpts: Partial<ChainEthCallOpts> = {},
): Promise<TReturn> {
    const resultData = await chain.ethCallAsync(encodeCall(contract, fn, args, callOpts));
    return decodeCallResult(contract, fn, resultData);
}

export function encodeCall<TArgs extends any[], TReturn>(
    contract: GeneratedContract,
    fn: ContractFunction<TArgs, TReturn>,
    args: TArgs,
    callOpts: Partial<ChainEthCallOpts> = {},
): ChainEthCallOpts {
    return {
        to: contract.address,
        data: fn.apply(contract, args).getABIEncodedTransactionData(),
        ...callOpts,
    };
}

export function decodeCallResult<TArgs extends any[], TReturn>(
    contract: GeneratedContract,
    fn: ContractFunction<TArgs, TReturn>,
    resultData: Bytes,
): TReturn {
    try {
        return contract.getABIDecodedReturnData<TReturn>(fn.name, resultData);
    } catch (err) {
        throw new Error(`eth_call to ${fn.name}() returned unexpected bytes: ${resultData}`);
    }
}
