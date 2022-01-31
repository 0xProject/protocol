import { ContractTxFunctionObj } from '@0x/base-contract';
import { constants } from '@0x/contracts-test-utils';
import { LimitOrderFields, Signature } from '@0x/protocol-utils';
import { BigNumber, hexUtils, NULL_BYTES } from '@0x/utils';

import { SamplerCallResult } from '../../src/types';
import { KyberSamplerOpts } from '../../src/utils/market_operation_utils/types';
import { ERC20BridgeSamplerContract } from '../../src/wrappers';

export type GetOrderFillableAssetAmountResult = BigNumber[];
export type GetOrderFillableAssetAmountHandler = (
    orders: LimitOrderFields[],
    signatures: Signature[],
    devUtilsAddress: string,
) => GetOrderFillableAssetAmountResult;

export type SampleResults = BigNumber[];
export type SampleSellsUniswapHandler = (router: string, takerToken: string, makerToken: string) => SampleResults;
export type SampleBuysUniswapHandler = (router: string, takerToken: string, makerToken: string) => SampleResults;
export type SampleSellsEth2DaiHandler = (router: string, takerToken: string, makerToken: string) => SampleResults;
export type SampleBuysEth2DaiHandler = (router: string, takerToken: string, makerToken: string) => SampleResults;
export type SampleSellsKyberHandler = (
    opts: KyberSamplerOpts,
    takerToken: string,
    makerToken: string,
) => [string, string, SampleResults];
export type SampleBuysKyberHandler = (
    reserveId: string,
    takerToken: string,
    makerToken: string,
) => [string, SampleResults];
export type SampleUniswapV2Handler = (router: string, path: string[]) => SampleResults;
export type SampleBuysMultihopHandler = (path: string[]) => SampleResults;
export type SampleSellsLPHandler = (providerAddress: string, takerToken: string, makerToken: string) => SampleResults;
export type SampleSellsMultihopHandler = (path: string[]) => SampleResults;

const DUMMY_PROVIDER = {
    sendAsync: (..._args: any[]): any => {
        /* no-op */
    },
};

interface Handlers {
    getLimitOrderFillableMakerAssetAmounts: GetOrderFillableAssetAmountHandler;
    getLimitOrderFillableTakerAssetAmounts: GetOrderFillableAssetAmountHandler;
    sampleSellsFromKyberNetworkGlobal: SampleSellsKyberHandler;
    sampleSellsFromLiquidityProviderGlobal: SampleSellsLPHandler;
    sampleSellsFromUniswapGlobal: SampleSellsUniswapHandler;
    sampleSellsFromUniswapV2Global: SampleUniswapV2Handler;
    sampleBuysFromUniswapGlobal: SampleBuysUniswapHandler;
    sampleBuysFromUniswapV2Global: SampleUniswapV2Handler;
    sampleBuysFromLiquidityProviderGlobal: SampleSellsLPHandler;
}

// tslint:disable: no-unbound-method

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
                callDatas.map(callData => ({ success: true, data: this._callEncodedFunction(callData) })),
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

    public sampleSellsFromKyberNetwork(
        opts: KyberSamplerOpts,
        takerToken: string,
        makerToken: string,
        takerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<[string, string, BigNumber[]]> {
        return this._wrapCall(
            super.sampleSellsFromKyberNetworkGlobal,
            this._handlers.sampleSellsFromKyberNetworkGlobal,
            { ...opts, reserveOffset: new BigNumber(1), hint: NULL_BYTES },
            takerToken,
            makerToken,
        );
    }

    public sampleSellsFromUniswap(
        router: string,
        takerToken: string,
        makerToken: string,
        takerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleSellsFromUniswapGlobal,
            this._handlers.sampleSellsFromUniswapGlobal,
            router,
            takerToken,
            makerToken,
        );
    }

    public sampleSellsFromUniswapV2(
        router: string,
        path: string[],
        takerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleSellsFromUniswapV2Global,
            this._handlers.sampleSellsFromUniswapV2Global,
            router,
            path,
        );
    }

    public sampleSellsFromLiquidityProvider(
        providerAddress: string,
        takerToken: string,
        makerToken: string,
        takerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleSellsFromLiquidityProviderGlobal,
            this._handlers.sampleSellsFromLiquidityProviderGlobal,
            providerAddress,
            takerToken,
            makerToken,
        );
    }

    public sampleBuysFromUniswap(
        router: string,
        takerToken: string,
        makerToken: string,
        makerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleBuysFromUniswapGlobal,
            this._handlers.sampleBuysFromUniswapGlobal,
            router,
            takerToken,
            makerToken,
        );
    }

    public sampleBuysFromUniswapV2(
        router: string,
        path: string[],
        makerAssetAmounts: BigNumber[],
    ): ContractTxFunctionObj<BigNumber[]> {
        return this._wrapCall(
            super.sampleBuysFromUniswapV2Global,
            this._handlers.sampleBuysFromUniswapV2Global,
            router,
            path,
        );
    }

    private _callEncodedFunction(callData: string): string {
        if (callData === '0x') {
            return callData;
        }
        // tslint:disable-next-line: custom-no-magic-numbers
        const selector = hexUtils.slice(callData, 0, 4);
        for (const [name, handler] of Object.entries(this._handlers)) {
            if (handler && this.getSelector(name) === selector) {
                const args = this.getABIDecodedTransactionData<any>(name, callData);
                const result = (handler as any)(...args);
                const encoder = this._lookupAbiEncoder(this.getFunctionSignature(name));
                if (encoder.getReturnValueDataItem().components!.length === 1) {
                    return encoder.encodeReturnValues([result]);
                } else {
                    return encoder.encodeReturnValues(result);
                }
            }
        }
        if (selector === this.getSelector('batchCall')) {
            const calls = this.getABIDecodedTransactionData<string[]>('batchCall', callData);
            const results: SamplerCallResult[] = calls.map(cd => ({
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
        // tslint:disable-next-line: trailing-comma
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
