import { ContractFunctionObj } from '@0x/base-contract';
import { BigNumber, decodeBytesAsRevertError, logUtils } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { ERC20BridgeSource, FillData, MeasuredSamplerResult, MeasuredSourceQuoteOperation } from './types';

export type Parameters<T> = T extends (...args: infer TArgs) => any ? TArgs : never;

export interface MeasuredSamplerContractCall<
    TFunc extends (...args: any[]) => ContractFunctionObj<any>,
    TFillData extends FillData = FillData
> {
    contract: ERC20BridgeSamplerContract;
    function: TFunc;
    params: Parameters<TFunc>;
    callback?: (callResults: string, fillData: TFillData) => MeasuredSamplerResult;
}

class PathDeregister {
    private static _instance: PathDeregister;
    // Presence in this registry with a negtive number indicates the Path has been deregistered
    private readonly _registry: { [key in ERC20BridgeSource]?: { [key: string]: number } } = {};
    private readonly _MAX_RESULTS = 100;

    public static createKey(args: any[]): string {
        return args
            .map(a => {
                if (typeof a === 'object' && a !== null) {
                    return Object.values(a).join('-');
                }
                if (Array.isArray(a)) {
                    return a.join('-');
                }
                return a.toString();
            })
            .join('-');
    }

    public static getInstance(): PathDeregister {
        if (!PathDeregister._instance) {
            PathDeregister._instance = new PathDeregister();
        }
        return PathDeregister._instance;
    }

    private static _getRandom(): number {
        // tslint:disable-next-line: custom-no-magic-numbers
        return Math.floor(Math.random() * (100 - 0 + 1)) + 0;
    }

    public isDeregistered(source: ERC20BridgeSource, key: string): boolean {
        if (!this._registry[source]) {
            this._registry[source] = {};
        }
        // Randomly allow the ops to be re-registered
        if (PathDeregister._getRandom() === 1) {
            return false;
        }
        return this._registry[source]![key] < 0;
    }

    // Registers a successful result. Upon having one single success
    // a Path is no longer deregistered
    public handleResult(source: ERC20BridgeSource, key: string, result: MeasuredSamplerResult): void {
        if (!this._registry[source]) {
            this._registry[source] = {};
        }

        // Defaults to 0
        if (!this._registry[source]![key]) {
            this._registry[source]![key] = 0;
        }

        if (this._didSucceed(result)) {
            if (this._registry[source]![key] < 0) {
                this._registry[source]![key] = 0;
            }
            this._registry[source]![key] = Math.min(this._MAX_RESULTS, this._registry[source]![key] + 1);
        } else {
            this._registry[source]![key] = Math.max(-this._MAX_RESULTS, this._registry[source]![key] - 1);
        }
    }

    // tslint:disable-next-line: prefer-function-over-method
    private _didSucceed(result: MeasuredSamplerResult): boolean {
        const nonZeroSample = result.samples.find(s => s.isGreaterThan(0));
        return nonZeroSample !== undefined && result.samples.length > 0;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class MeasuredSamplerContractOperation<
    TFunc extends (...args: any[]) => ContractFunctionObj<any>,
    TFillData extends FillData = FillData
> implements MeasuredSourceQuoteOperation<TFillData> {
    public readonly source: ERC20BridgeSource;
    public fillData: TFillData;
    private readonly _samplerContract: ERC20BridgeSamplerContract;
    private readonly _samplerFunction: TFunc;
    private readonly _params: Parameters<TFunc>;
    private readonly _callback?: (callResults: string, fillData: TFillData) => MeasuredSamplerResult;
    private readonly _deregisterKey: string | undefined;
    private readonly _deregisterable: boolean;
    private readonly _log: boolean;

    constructor(
        opts: {
            source: ERC20BridgeSource;
            fillData?: TFillData;
            deregisterable?: boolean;
            log?: boolean;
        } & MeasuredSamplerContractCall<TFunc, TFillData>,
    ) {
        this.source = opts.source;
        this.fillData = opts.fillData || ({} as TFillData); // tslint:disable-line:no-object-literal-type-assertion
        this._samplerContract = opts.contract;
        this._samplerFunction = opts.function;
        this._params = opts.params;
        this._callback = opts.callback;
        this._deregisterable = opts.deregisterable || false;
        this._log = opts.log || false;
        if (this._deregisterable) {
            this._deregisterKey = PathDeregister.createKey(this._params.slice(0, this._params.length - 1));
        }
    }

    public encodeCall(): string {
        return this._samplerFunction
            .bind(this._samplerContract)(...this._params)
            .getABIEncodedTransactionData();
    }

    public handleCallResults(callResults: string): MeasuredSamplerResult {
        let result: MeasuredSamplerResult;
        if (this._callback !== undefined) {
            result = this._callback(callResults, this.fillData);
        } else {
            const [gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<[BigNumber[], BigNumber[]]>(
                this._samplerFunction.name,
                callResults,
            );
            result = { gasUsed, samples };
        }
        if (this._deregisterKey) {
            PathDeregister.getInstance().handleResult(this.source, this._deregisterKey, result);
        }
        if (this._log) {
            logUtils.log({ source: this.source, fillData: this.fillData, ...result });
        }
        return result;
    }

    public handleRevert(callResults: string): MeasuredSamplerResult {
        let msg = callResults;
        try {
            msg = decodeBytesAsRevertError(callResults).toString();
        } catch (e) {
            // do nothing
        }
        logUtils.warn(
            `SamplerContractOperation: ${this.source}.${this._samplerFunction.name} reverted ${msg} ${JSON.stringify(
                this.fillData,
                null,
                2,
            )}`,
        );
        const result = { gasUsed: [], samples: [] };
        if (this._deregisterKey) {
            PathDeregister.getInstance().handleResult(this.source, this._deregisterKey, result);
        }
        return result;
    }

    public isDeregistered(): boolean {
        if (this._deregisterKey) {
            return PathDeregister.getInstance().isDeregistered(this.source, this._deregisterKey);
        }
        return false;
    }
}
