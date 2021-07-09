import { ChainId } from '@0x/contract-addresses';
import { SupportedProvider } from '@0x/subproviders';
import { BigNumber, hexUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as crypto from 'crypto';

import { artifacts } from '../artifacts';
import { CallDispatcherContract } from '../wrappers';

import { DUMMY_PROVIDER, NULL_BYTES, ZERO_AMOUNT } from './constants';
import { createFastAbiEncoderOverrides } from './fast_abi';
import { Address, Bytes } from './types';

export interface ChainEthCallOverrides {
    [address: string]: {
        code?: Bytes;
    };
}

export interface ChainEthCallOpts {
    data: Bytes;
    to: Address;
    value?: BigNumber;
    overrides?: ChainEthCallOverrides;
    immediate?: boolean;
    maxCacheAgeMs?: number;
    gas?: number;
    gasPrice?: BigNumber;
}

interface QueuedEthCall {
    opts: ChainEthCallOpts;
    accept: (v: Bytes) => void;
    reject: (v: string | Bytes) => void;
}

export interface CreateChainOpts {
    provider: SupportedProvider;
    tickFrequency?: number;
    maxCacheAgeMs?: number;
}

const DEFAULT_CALL_GAS_LIMIT = 10e6;
const DEFAULT_CALLER_ADDRESS = hexUtils.random(20);
const DISPATCHER_CONTRACT_ADDRESS = hexUtils.random(20);
const DISPATCHER_CONTRACT_BYTECODE = artifacts.CallDispatcher.compilerOutput.evm.deployedBytecode.object;
const DISPATCHER_CONTRACT = new CallDispatcherContract(
    DISPATCHER_CONTRACT_ADDRESS,
    DUMMY_PROVIDER,
    {},
    {},
    DISPATCHER_CONTRACT_BYTECODE,
    createFastAbiEncoderOverrides(CallDispatcherContract),
);

export interface DispatchedCallResult {
    success: boolean;
    resultData: Bytes;
}

interface CachedDispatchedCallResult {
    result: DispatchedCallResult;
    cacheTimeMs: number;
}

export interface Chain {
    chainId: ChainId;
    provider: SupportedProvider;
    ethCallAsync(opts: ChainEthCallOpts): Promise<Bytes>;
}

export class LiveChain implements Chain {
    public get provider(): SupportedProvider {
        return this._w3.getProvider();
    }

    public get chainId(): ChainId {
        return this._chainId;
    }
    private readonly _w3: Web3Wrapper;
    private readonly _chainId: ChainId;
    private readonly _cachedCallResults: { [id: string]: CachedDispatchedCallResult } = {};
    private readonly _maxCacheAgeMs: number = 0;
    private _tickTimer: NodeJS.Timeout | null = null;
    private _queue: QueuedEthCall[] = [];

    public static async createAsync(opts: CreateChainOpts): Promise<Chain> {
        const fullOpts = { tickFrequency: 100, maxCacheAgeMs: 30e3, ...opts };
        const w3 = new Web3Wrapper(opts.provider);
        const chainId = (await w3.getChainIdAsync()) as ChainId;
        const inst = new LiveChain(chainId, w3, fullOpts.maxCacheAgeMs);
        await inst._startAsync(fullOpts.tickFrequency);
        return inst;
    }

    private static _mergeBatchCalls(calls: QueuedEthCall[]): BatchedChainEthCallOpts {
        if (calls.length === 1) {
            // If we just have one call, don't bother batching it.
            return {
                gas: calls[0].opts.gas || DEFAULT_CALL_GAS_LIMIT,
                from: DEFAULT_CALLER_ADDRESS,
                gasPrice: calls[0].opts.gasPrice || ZERO_AMOUNT,
                to: calls[0].opts.to,
                value: calls[0].opts.value || ZERO_AMOUNT,
                data: calls[0].opts.data,
                overrides: calls[0].opts.overrides || {},
            };
        }
        const callInfos = calls.map(c => ({
            data: c.opts.data,
            to: c.opts.to,
            gas: new BigNumber(c.opts.gas || 0),
            value: c.opts.value || ZERO_AMOUNT,
        }));
        return {
            gas: calls.reduce((s, c) => (c.opts.gas || DEFAULT_CALL_GAS_LIMIT) + s, 0) || DEFAULT_CALL_GAS_LIMIT,
            from: DEFAULT_CALLER_ADDRESS,
            gasPrice: BigNumber.sum(...calls.map(c => c.opts.gasPrice || 0)),
            to: DISPATCHER_CONTRACT.address,
            value: BigNumber.sum(...calls.map(c => c.opts.value || 0)),
            data: DISPATCHER_CONTRACT.dispatch(callInfos).getABIEncodedTransactionData(),
            overrides: Object.assign(
                { [DISPATCHER_CONTRACT.address]: { code: DISPATCHER_CONTRACT_BYTECODE } },
                ...calls.map(c => c.opts.overrides),
            ),
        };
    }

    protected constructor(chainId: number, w3: Web3Wrapper, maxCacheAgeMs: number) {
        this._chainId = chainId;
        this._w3 = w3;
        this._maxCacheAgeMs = maxCacheAgeMs;
    }

    protected async _startAsync(tickFrequency: number): Promise<void> {
        await this._tickAsync(tickFrequency, true);
    }

    public async ethCallAsync(opts: ChainEthCallOpts): Promise<Bytes> {
        let c: QueuedEthCall | undefined;
        const p = new Promise<Bytes>((accept, reject) => {
            // This executes right away so `c` will be defined in this fn.
            c = {
                opts,
                accept,
                reject,
            };
        });
        if (opts.maxCacheAgeMs) {
            // Check the cache.
            const cachedResult = this._findCachedCallResult(c!.opts);
            if (cachedResult) {
                resolveQueuedCall(c!, cachedResult);
                return p;
            }
            // Cache both success and failure results.
            p.then(resultData => this._cacheCallResult(c!.opts, resultData)).catch(error =>
                this._cacheCallResult(c!.opts, undefined, error),
            );
        }
        if (opts.immediate) {
            // Do not add to queue. Dispatch immediately.
            void this._executeAsync([c!]);
        } else {
            // Just queue up and batch dispatch later.
            this._queue.push(c!);
        }
        return p;
    }

    private _findCachedCallResult(c: ChainEthCallOpts): DispatchedCallResult | undefined {
        const cached = this._cachedCallResults[hashCall(c)];
        if (cached && Date.now() - cached.cacheTimeMs < (c.maxCacheAgeMs || 0)) {
            return cached.result;
        }
        return;
    }

    private _cacheCallResult(c: ChainEthCallOpts, successResult?: Bytes, error?: string): void {
        this._cachedCallResults[hashCall(c)] = {
            cacheTimeMs: Date.now(),
            result: {
                success: !!error,
                resultData: error || successResult!,
            },
        };
    }

    private async _tickAsync(tickFrequency: number, bootstrap: boolean = false): Promise<void> {
        if (!bootstrap && !this._tickTimer) {
            return;
        }
        this._tickTimer = null;
        this._pruneCache();
        {
            const queue = this._queue;
            this._queue = [];
            void this._executeAsync(queue);
        }
        this._tickTimer = setTimeout(async () => this._tickAsync(tickFrequency), tickFrequency);
    }

    private _pruneCache(): void {
        const now = Date.now();
        for (const id in this._cachedCallResults) {
            if (now - this._cachedCallResults[id].cacheTimeMs >= this._maxCacheAgeMs) {
                delete this._cachedCallResults[id];
            }
        }
    }

    private async _executeAsync(queue: QueuedEthCall[]): Promise<void> {
        // dispatch each batch of calls.
        const batches = [...generateCallBatches(queue)];
        await Promise.all(batches.map(async b => this._dispatchBatchAsync(b)));
    }

    private async _dispatchBatchAsync(calls: QueuedEthCall[]): Promise<void> {
        const rejectBatch = (err: any) => {
            calls.forEach(c => c.reject(err));
        };
        let rawResultData;
        try {
            rawResultData = await this._w3.callAsync(LiveChain._mergeBatchCalls(calls));
        } catch (err) {
            // tslint:disable-next-line: no-console
            console.error(err);
            rejectBatch(err);
            return;
        }
        if (!rawResultData || rawResultData === NULL_BYTES) {
            rejectBatch(`EVM Dispatch call failed`);
            return;
        }
        if (calls.length === 1) {
            // Direct call (not batched).
            return calls[0].accept(rawResultData);
        }
        const results = DISPATCHER_CONTRACT.getABIDecodedReturnData<DispatchedCallResult[]>('dispatch', rawResultData);
        if (results.length !== calls.length) {
            rejectBatch(`Expected dispatcher result to be the same length as number of calls`);
            return;
        }
        // resolve each call in the batch.
        results.forEach((r, i) => resolveQueuedCall(calls[i], r));
    }
}

function* generateCallBatches(queue: QueuedEthCall[]): Generator<QueuedEthCall[]> {
    let nextQueue = queue;
    while (nextQueue.length > 0) {
        const _queue = nextQueue;
        nextQueue = [];
        const batch = [];
        for (const c of _queue) {
            if (canBatchCallWith(c, batch)) {
                batch.push(c);
            } else {
                nextQueue.push(c);
            }
        }
        yield batch;
    }
}

function resolveQueuedCall(c: QueuedEthCall, r: DispatchedCallResult): void {
    if (r.success) {
        c.accept(r.resultData);
    } else {
        c.reject(tryDecodeStringRevertErrorResult(r.resultData) || `EVM call reverted: ${r.resultData}`);
    }
}

function tryDecodeStringRevertErrorResult(rawResultData: Bytes): string | undefined {
    if (rawResultData.startsWith('0x08c379a0')) {
        const strLen: number = new BigNumber(hexUtils.slice(rawResultData, 4, 36)).toNumber();
        return Buffer.from(hexUtils.slice(rawResultData, 68, 68 + strLen).slice(2), 'hex').toString();
    }
    return;
}

function canBatchCallWith(ethCall: QueuedEthCall, batch: QueuedEthCall[]): boolean {
    const { overrides, gasPrice } = {
        overrides: {},
        ...ethCall.opts,
    };
    // Overrides must not conflict.
    const batchOverrides = Object.assign({}, ...batch.map(b => b.opts.overrides || {}));
    for (const addr in overrides) {
        const a = overrides[addr];
        const b = batchOverrides[addr];
        if (a && b && a.code !== b.code) {
            return false;
        }
    }
    // Gas prices must not be in conflict.
    const batchGasPriceIfExists = batch.filter(b => b.opts.gasPrice).map(b => b.opts.gasPrice)[0];
    if (batchGasPriceIfExists && gasPrice && !gasPrice.eq(batchGasPriceIfExists!)) {
        return false;
    }
    return true;
}

function hashCall(c: ChainEthCallOpts): string {
    return crypto
        .createHash('sha1')
        .update(JSON.stringify(c))
        .digest('hex');
}

interface BatchedChainEthCallOpts {
    gas: number;
    to: Address;
    from: Address;
    gasPrice: BigNumber;
    overrides: ChainEthCallOverrides;
    data: Bytes;
    value: BigNumber;
}
