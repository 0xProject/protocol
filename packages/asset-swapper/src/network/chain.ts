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
    timeoutMs?: number;
}

interface QueuedEthCall {
    id: string;
    opts: ChainEthCallOpts;
    accept: (v: Bytes) => void;
    reject: (v: Error) => void;
}

export interface CreateChainOpts {
    provider: SupportedProvider;
    pruneFrequency?: number;
    tickFrequency?: number;
    maxCacheAgeMs?: number;
    maxBatchGas?: number;
    maxBatchBytes?: number;
    queueCapacity?: number;
}

const DEFAULT_CALL_GAS_LIMIT = 4e6;
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
    blockNumber: number;
    ethCallAsync(opts: ChainEthCallOpts): Promise<Bytes>;
}

export class LiveChain implements Chain {
    public get provider(): SupportedProvider {
        return this._w3.getProvider();
    }

    public get chainId(): ChainId {
        return this._chainId;
    }

    public get blockNumber(): number {
        return this._blockNumber;
    }

    private readonly _w3: Web3Wrapper;
    private readonly _chainId: ChainId;
    private readonly _cachedCallResults: { [id: string]: CachedDispatchedCallResult } = {};
    private readonly _maxCacheAgeMs: number;
    private readonly _maxBatchGas: number;
    private readonly _maxBatchBytes: number;
    // How "full" the queue is allowed to get before being immediately flushed.
    private readonly _maxQueueCapacity: number;
    // How "full" the queue is.
    private _queueFullness: number = 0;
    private _queue: QueuedEthCall[] = [];
    // The last block number returned by a dispatch call.
    private _blockNumber: number = 0;

    public static async createAsync(opts: CreateChainOpts): Promise<Chain> {
        const fullOpts = {
            maxCacheAgeMs: 10e3,
            pruneFrequency: 5000,
            // These numbers will all affect how calls are batched across
            // RPC calls.
            tickFrequency: 100,
            maxBatchGas: 512e6,
            maxBatchBytes: 1.024e6,
            queueCapacity: 1.5,
            ...opts,
        };
        const w3 = new Web3Wrapper(opts.provider);
        const chainId = (await w3.getChainIdAsync()) as ChainId;
        const inst = new LiveChain(
            chainId,
            w3,
            fullOpts.maxCacheAgeMs,
            fullOpts.maxBatchGas,
            fullOpts.maxBatchBytes,
            fullOpts.queueCapacity,
        );
        inst._tick(fullOpts.tickFrequency);
        inst._prune(fullOpts.pruneFrequency);
        return inst;
    }

    protected constructor(
        chainId: number,
        w3: Web3Wrapper,
        maxCacheAgeMs: number,
        maxBatchGas: number,
        maxBatchBytes: number,
        queueCapacity: number,
    ) {
        this._chainId = chainId;
        this._w3 = w3;
        this._maxCacheAgeMs = maxCacheAgeMs;
        this._maxBatchGas = maxBatchGas;
        this._maxBatchBytes = maxBatchBytes;
        this._maxQueueCapacity = queueCapacity;
    }

    public async ethCallAsync(opts: ChainEthCallOpts): Promise<Bytes> {
        let c: QueuedEthCall;
        const p = new Promise<Bytes>((accept, reject) => {
            // This executes right away so `c` will be defined in this fn.
            c = {
                id: hashCall(opts),
                opts,
                accept,
                reject,
            };
        });
        if (opts.maxCacheAgeMs) {
            // Check the cache.
            const cachedResult = this._findCachedCallResult(c!.id, opts.maxCacheAgeMs);
            if (cachedResult) {
                resolveQueuedCall(c!, cachedResult);
                return p;
            }
            // Cache both success and failure results.
            p.then(resultData => this._cacheCallResult(c!.id, resultData)).catch(error => {
                // Only cache reverts.
                if (error.message && error.message.indexOf('reverted') !== -1) {
                    this._cacheCallResult(c!.id, undefined, error);
                }
            });
        }
        if (opts.timeoutMs) {
            void (async () => setTimeout(() => c.reject(new Error('ethCall timed out')), opts.timeoutMs!))();
        }
        if (opts.immediate) {
            // Do not add to queue. Dispatch immediately.
            void this._executeAsync([c!]);
        } else {
            // Just queue up and batch dispatch later.
            this._queueCall(c!);
            // But dispatch now if the queue is "full",
            if (this._queueFullness >= this._maxQueueCapacity) {
                this._flushQueue();
            }
        }
        return p;
    }

    private _queueCall(c: QueuedEthCall): void {
        // Check for duplicate calls already in the queue.
        for (const q of this._queue) {
            if (q.id === c.id) {
                // Found a duplicate. Just chain the callbacks on the existing one.
                q.accept = chainCalls(q.accept, c.accept);
                q.reject = chainCalls(q.reject, c.reject);
                return;
            }
        }
        this._queue.push(c);
        // Increase queue fullness by the greater of
        // gas / maxBatchGas or data.length / maxBatchBytes.
        this._queueFullness += Math.max(
            (c.opts.gas || DEFAULT_CALL_GAS_LIMIT) / this._maxBatchGas,
            // This is just a rough metric so no need to include overrides size.
            c.opts.data.length / this._maxBatchBytes,
        );
    }

    private _findCachedCallResult(callId: string, maxCacheAgeMs?: number): DispatchedCallResult | undefined {
        const cached = this._cachedCallResults[callId];
        if (cached && Date.now() - cached.cacheTimeMs < (maxCacheAgeMs || 0)) {
            return cached.result;
        }
        return;
    }

    private _cacheCallResult(callId: string, successResult?: Bytes, error?: string): void {
        this._cachedCallResults[callId] = {
            cacheTimeMs: Date.now(),
            result: {
                success: !error,
                resultData: error || successResult!,
            },
        };
    }

    private _tick(frequency: number): void {
        this._flushQueue();
        setTimeout(async () => this._tick(frequency), frequency);
    }

    private _prune(frequency: number): void {
        this._pruneCache();
        setTimeout(async () => this._tick(frequency), frequency);
    }

    private _flushQueue(): void {
        const queue = this._queue;
        this._queue = [];
        this._queueFullness = 0;
        void this._executeAsync(queue);
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
        const batches = [...this._generateCallBatches(queue)];
        await Promise.all(batches.map(async b => this._dispatchBatchAsync(b)));
    }

    private async _dispatchBatchAsync(calls: QueuedEthCall[]): Promise<void> {
        if (calls.length === 0) {
            return;
        }
        const rejectBatch = (err: any) => {
            calls.forEach(c => c.reject(err));
        };
        let rawResultData;
        try {
            rawResultData = await this._w3.callAsync(mergeBatchCalls(calls));
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
        const [results, blockNumber] = DISPATCHER_CONTRACT.getABIDecodedReturnData<[DispatchedCallResult[], BigNumber]>(
            'dispatch',
            rawResultData,
        );
        if (results.length !== calls.length) {
            rejectBatch(new Error(`Expected dispatcher result to be the same length as number of calls`));
            return;
        }
        this._blockNumber = Math.max(blockNumber.toNumber(), this._blockNumber);
        // resolve each call in the batch.
        results.forEach((r, i) => resolveQueuedCall(calls[i], r));
    }

    private *_generateCallBatches(queue: QueuedEthCall[]): Generator<QueuedEthCall[]> {
        let nextQueue = queue;
        while (nextQueue.length > 0) {
            const _queue = nextQueue;
            nextQueue = [];
            const batcher = new CallBatcher(this._maxBatchGas, this._maxBatchBytes);
            for (const c of _queue) {
                if (!batcher.tryToBatch(c)) {
                    nextQueue.push(c);
                }
            }
            if (batcher.length === 0) {
                break;
            }
            yield batcher.calls;
        }
    }
}

class CallBatcher {
    public readonly calls: QueuedEthCall[] = [];
    private _batchGas: number = 0;
    private _batchBytesSize: number = 0;
    private _batchGasPrice?: BigNumber;
    private readonly _batchOverrides: { [addr: string]: { code: string } } = {};

    public constructor(private readonly _maxBatchGas: number, private readonly _maxBatchBytes: number) {}

    public get length(): number {
        return this.calls.length;
    }

    public tryToBatch(ethCall: QueuedEthCall): boolean {
        let estimatedBytesSize = ethCall.opts.data.length;
        if (ethCall.opts.overrides) {
            for (const a in ethCall.opts.overrides) {
                estimatedBytesSize += (ethCall.opts.overrides[a].code || '').length;
            }
        }
        if (this.calls.length !== 0) {
            // Total batch gas limit must not be too large.
            if ((ethCall.opts.gas || DEFAULT_CALL_GAS_LIMIT) + this._batchGas >= this._maxBatchGas) {
                return false;
            }
            // Gas prices must not conflict.
            if (this._batchGasPrice && ethCall.opts.gasPrice && !ethCall.opts.gasPrice.eq(this._batchGasPrice)) {
                return false;
            }
            // Overrides must not conflict.
            if (ethCall.opts.overrides) {
                for (const addr in ethCall.opts.overrides) {
                    if (addr in this._batchOverrides) {
                        if (this._batchOverrides[addr]?.code !== ethCall.opts.overrides[addr]?.code) {
                            return false;
                        }
                    }
                }
            }
            // Total batch bytes size must not be too large.
            if (this._batchBytesSize + estimatedBytesSize >= this._maxBatchBytes) {
                return false;
            }
        }
        this._batchGas += ethCall.opts.gas || DEFAULT_CALL_GAS_LIMIT;
        this._batchGasPrice = ethCall.opts.gasPrice ? ethCall.opts.gasPrice : this._batchGasPrice;
        this._batchBytesSize += estimatedBytesSize;
        Object.assign(this._batchOverrides, ethCall.opts.overrides || {});
        this.calls.push(ethCall);
        return true;
    }
}

function mergeBatchCalls(calls: QueuedEthCall[]): BatchedChainEthCallOpts {
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
        gas: new BigNumber(c.opts.gas || DEFAULT_CALL_GAS_LIMIT),
        value: c.opts.value || ZERO_AMOUNT,
    }));
    return {
        gas: calls.reduce((s, c) => (c.opts.gas || DEFAULT_CALL_GAS_LIMIT) + s, 0) + calls.length * 50e3,
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

function resolveQueuedCall(c: QueuedEthCall, r: DispatchedCallResult): void {
    if (r.success) {
        c.accept(r.resultData);
    } else {
        c.reject(new Error(`EVM call reverted: ${tryDecodeStringRevertErrorResult(r.resultData)}`));
    }
}

function tryDecodeStringRevertErrorResult(rawResultData: Bytes): string {
    if (rawResultData && rawResultData.startsWith('0x08c379a0')) {
        const strLen: number = new BigNumber(hexUtils.slice(rawResultData, 4, 36)).toNumber();
        return Buffer.from(hexUtils.slice(rawResultData, 68, 68 + strLen).slice(2), 'hex')
            .filter(b => b !== 0)
            .toString();
    }
    return '(no data)';
}

function hashCall(c: ChainEthCallOpts): string {
    return crypto
        .createHash('sha1')
        .update(
            [c.to, c.data, c.gas, c.gasPrice?.toString(10), JSON.stringify(c.overrides), c.value?.toString(10)].join(
                ',',
            ),
        )
        .digest('hex');
}

function chainCalls<TArgs extends any[], TReturn extends any>(
    // tslint:disable-next-line: trailing-comma
    ...fns: Array<(...args: TArgs) => TReturn>
): (...args: TArgs) => TReturn {
    return (...args: TArgs) => {
        let r: TReturn;
        for (const f of fns) {
            r = f.apply(undefined, args);
        }
        return r!;
    };
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
