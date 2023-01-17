/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContractTxFunctionObj } from '@0x/base-contract';
import { constants } from '@0x/contracts-test-utils';
import { LimitOrderFields, Signature } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../../src/asset-swapper/../wrappers';
import { SamplerCallResult } from '../../../src/asset-swapper/types';

type GetOrderFillableAssetAmountResult = BigNumber[];
type GetOrderFillableAssetAmountHandler = (
    orders: LimitOrderFields[],
    signatures: Signature[],
    devUtilsAddress: string,
) => GetOrderFillableAssetAmountResult;

type SampleResults = BigNumber[];
type SampleSellsUniswapHandler = (
    router: string,
    takerToken: string,
    makerToken: string,
    takerTokenAmounts: BigNumber[],
) => SampleResults;
type SampleBuysUniswapHandler = (
    router: string,
    takerToken: string,
    makerToken: string,
    makerTokenAmounts: BigNumber[],
) => SampleResults;
type SampleUniswapV2Handler = (router: string, path: string[], assetAmounts: BigNumber[]) => SampleResults;
type SampleUniswapV3Handler = (quoter: string, path: string[], assetAmounts: BigNumber[]) => UniswapV3SampleResults;
type UniswapV3SampleResults = [string[], BigNumber[], BigNumber[]];

const DUMMY_PROVIDER = {
    sendAsync: (..._args: any[]): any => {
        /* no-op */
    },
};

interface Handlers {
    getLimitOrderFillableMakerAssetAmounts: GetOrderFillableAssetAmountHandler;
    getLimitOrderFillableTakerAssetAmounts: GetOrderFillableAssetAmountHandler;
    sampleSellsFromUniswap: SampleSellsUniswapHandler;
    sampleSellsFromUniswapV2: SampleUniswapV2Handler;
    sampleSellsFromUniswapV3: SampleUniswapV3Handler;
    sampleBuysFromUniswap: SampleBuysUniswapHandler;
    sampleBuysFromUniswapV2: SampleUniswapV2Handler;
    sampleBuysFromUniswapV3: SampleUniswapV3Handler;
}

export class MockSamplerContract extends ERC20BridgeSamplerContract {
    private readonly _handlers: Partial<Handlers> = {};

    public constructor(handlers: Partial<Handlers> = {}) {
        super(constants.NULL_ADDRESS, DUMMY_PROVIDER);
        this._handlers = handlers;
    }

    public batchCall(callDatas: string[]): ContractTxFunctionObj<SamplerCallResult[]> {
        return {
            ...super.batchCall(callDatas),
            callAsync: async (..._callArgs: any[]) =>
                callDatas.map((callData) => ({ success: true, data: this._callEncodedFunction(callData) })),
        };
    }

    public getLimitOrderFillableMakerAssetAmounts(
        orders: LimitOrderFields[],
        signatures: Signature[],
    ): ContractTxFunctionObj<GetOrderFillableAssetAmountResult> {
        return this._wrapCall(
            super.getLimitOrderFillableMakerAssetAmounts,
            this._handlers.getLimitOrderFillableMakerAssetAmounts,
            orders,
            signatures,
            constants.NULL_ADDRESS,
        );
    }

    public getLimitOrderFillableTakerAssetAmounts(
        orders: LimitOrderFields[],
        signatures: Signature[],
    ): ContractTxFunctionObj<GetOrderFillableAssetAmountResult> {
        return this._wrapCall(
            super.getLimitOrderFillableTakerAssetAmounts,
            this._handlers.getLimitOrderFillableTakerAssetAmounts,
            orders,
            signatures,
            constants.NULL_ADDRESS,
        );
    }

    public sampleSellsFromUniswap(
        router: string,
        takerToken: string,
        makerToken: string,
        takerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleSellsFromUniswap,
            this._handlers.sampleSellsFromUniswap,
            router,
            takerToken,
            makerToken,
            takerAssetAmounts,
        );
    }

    public sampleSellsFromUniswapV2(
        router: string,
        path: string[],
        takerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleSellsFromUniswapV2,
            this._handlers.sampleSellsFromUniswapV2,
            router,
            path,
            takerAssetAmounts,
        );
    }

    public sampleBuysFromUniswap(
        router: string,
        takerToken: string,
        makerToken: string,
        makerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleBuysFromUniswap,
            this._handlers.sampleBuysFromUniswap,
            router,
            takerToken,
            makerToken,
            makerAssetAmounts,
        );
    }

    public sampleBuysFromUniswapV2(
        router: string,
        path: string[],
        makerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleBuysFromUniswapV2,
            this._handlers.sampleBuysFromUniswapV2,
            router,
            path,
            makerAssetAmounts,
        );
    }

    private _callEncodedFunction(callData: string): string {
        if (callData === '0x') {
            return callData;
        }
        const selector = hexUtils.slice(callData, 0, 4);
        for (const [name, handler] of Object.entries(this._handlers)) {
            if (handler && this.getSelector(name) === selector) {
                const args = this.getABIDecodedTransactionData<any>(name, callData);
                const result = (handler as any)(...args);
                const encoder = this._lookupAbiEncoder(this.getFunctionSignature(name));
                if (encoder.getReturnValueDataItem().components?.length === 1) {
                    return encoder.encodeReturnValues([result]);
                } else {
                    return encoder.encodeReturnValues(result);
                }
            }
        }
        if (selector === this.getSelector('batchCall')) {
            const calls = this.getABIDecodedTransactionData<string[]>('batchCall', callData);
            const results: SamplerCallResult[] = calls.map((cd) => ({
                success: true,
                data: this._callEncodedFunction(cd),
            }));
            return this._lookupAbiEncoder(this.getFunctionSignature('batchCall')).encodeReturnValues([results]);
        }
        throw new Error(`Unkown selector: ${selector}`);
    }

    private _wrapCall<TArgs extends any[], TResult>(
        superFn: (this: MockSamplerContract, ...args: TArgs) => ContractTxFunctionObj<TResult>,
        handler?: (this: MockSamplerContract, ...args: TArgs) => TResult,
        ...args: TArgs
    ): ContractTxFunctionObj<TResult> {
        return {
            ...superFn.call(this, ...args),
            callAsync: async (..._callArgs: any[]): Promise<TResult> => {
                if (!handler) {
                    throw new Error(`${superFn.name} handler undefined`);
                }
                return handler.call(this, ...args);
            },
        };
    }
}
