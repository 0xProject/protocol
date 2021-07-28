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

import { timeIt, timeItAsync } from '../utils/utils';

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
    pruneFrequencyMs?: number;
    flushFrequencyMs?: number;
    maxCacheAgeMs?: number;
    maxBatchGas?: number;
    maxBatchBytes?: number;
    burstFullness?: number;
    maxOutstandingCalls?: number;
    maxBurstOutstandingCalls?: number;
    callTimeoutMs?: number;
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
    private readonly _callTimeoutMs: number;
    private readonly _maxBatchGas: number;
    private readonly _maxBatchBytes: number;
    private readonly _burstFullness: number;
    private readonly _maxOutstandingCalls: number;
    private readonly _maxBurstOutstandingCalls: number;
    private _queue: QueuedEthCall[] = [];
    // How many outstanding eth_calls there are.
    private _outstandingCalls: Promise<void>[] = [];
    // How "full" the queue is.
    private _queueFullness: number = 0;
    // The last block number returned by a dispatch call.
    private _blockNumber: number = 0;

    public static async createAsync(opts: CreateChainOpts): Promise<Chain> {
        const fullOpts = {
            maxCacheAgeMs: 30e3,
            pruneFrequencyMs: 5e3,
            callTimeoutMs: 5e3,
            // These numbers will all affect how calls are batched across
            // RPC calls.
            flushFrequencyMs: 100,
            maxBatchGas: 800e6,
            maxBatchBytes: 0.750e6,
            burstFullness: 16,
            maxOutstandingCalls: 4,
            maxBurstOutstandingCalls: 8,
            ...opts,
        };
        const w3 = new Web3Wrapper(opts.provider);
        const chainId = (await w3.getChainIdAsync()) as ChainId;
        const inst = new LiveChain({
            chainId,
            w3,
            ...fullOpts,
        });
        void inst._flushAsync(fullOpts.flushFrequencyMs);
        inst._prune(fullOpts.pruneFrequencyMs);
        return inst;
    }

    protected constructor(opts: {
        chainId: number;
        w3: Web3Wrapper;
        maxCacheAgeMs: number;
        callTimeoutMs: number;
        maxBatchGas: number;
        maxBatchBytes: number;
        burstFullness: number;
        maxOutstandingCalls: number;
        maxBurstOutstandingCalls: number;
    }) {
        this._chainId = opts.chainId;
        this._w3 = opts.w3;
        this._maxCacheAgeMs = opts.maxCacheAgeMs;
        this._callTimeoutMs = opts.callTimeoutMs;
        this._maxBatchGas = opts.maxBatchGas;
        this._maxBatchBytes = opts.maxBatchBytes;
        this._burstFullness = opts.burstFullness;
        this._maxOutstandingCalls = opts.maxOutstandingCalls;
        this._maxBurstOutstandingCalls = opts.maxBurstOutstandingCalls;
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
                console.log(`[DEBUG] cache hit ${c!.id}`);
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
            void this._dispatchBatchAsync([c!]);
        } else {
            // Just queue up and batch dispatch later.
            this._queueCall(c!);
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
        this._queueFullness += getCallFullness(c, this._maxBatchGas, this._maxBatchBytes);
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

    private async _flushAsync(frequency: number): Promise<void> {
        let nextFlushTime = Date.now() + frequency;
        const maxBatches = (this._queueFullness > this._burstFullness ?
            this._maxBurstOutstandingCalls : this._maxOutstandingCalls) - this._outstandingCalls.length;
        const batches = timeIt(() => this._generateCallBatches(maxBatches),
            dt => `_generateCallBatches took ${dt}ms`);
        const dispatchPromises = batches.map(b => this._dispatchBatchAsync(b));
        this._outstandingCalls.push(...dispatchPromises);
        for (const p of dispatchPromises) {
            p.finally(() => {
                this._outstandingCalls = this._outstandingCalls.filter(_p => p !== _p);
            });
        }
        if (this._outstandingCalls.length) {
            await Promise.race(this._outstandingCalls);
        }
        setTimeout(() => this._flushAsync(frequency), Math.max(0, nextFlushTime - Date.now()));
    }

    private _prune(frequency: number): void {
        timeIt(
            () => this._pruneCache(),
            dt => `pruneCache took ${dt}ms`,
        );
        setTimeout(async () => this._prune(frequency), frequency);
    }

    private _pruneCache(): void {
        const now = Date.now();
        for (const id in this._cachedCallResults) {
            if (now - this._cachedCallResults[id].cacheTimeMs >= this._maxCacheAgeMs) {
                delete this._cachedCallResults[id];
            }
        }
    }

    private async _dispatchBatchAsync(calls: QueuedEthCall[]): Promise<void> {
        if (calls.length === 0) {
            return;
        }
        const rejectBatch = (err: any) => {
            calls.forEach(c => c.reject(err));
        };
        let rawResultData: Bytes;
        const mergedCalls = mergeBatchCalls(calls);
        try {
            rawResultData = await timeItAsync(
                () => timeoutAsync(
                    this._w3.callAsync(mergedCalls),
                    this._callTimeoutMs,
                    () => new Error(`callAsync took too long`),
                ),
                dt => {
                    const kbSize = (mergedCalls.data.length + Object.values(mergedCalls.overrides).map(o => o.code!.length).reduce((a,v) => a + v, 0)) / 1024;
                    return `callAsync took ${dt}ms (${kbSize}kb) (${mergedCalls.gas / 1e6}M gas)`;
                }
            );
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
        const [results, blockNumber] = timeIt(() =>
        DISPATCHER_CONTRACT.getABIDecodedReturnData<[DispatchedCallResult[], BigNumber]>(
            'dispatch',
            rawResultData,
        ), dt => `dispatch ABI decode took ${dt}ms`);
        if (results.length !== calls.length) {
            rejectBatch(new Error(`Expected dispatcher result to be the same length as number of calls`));
            return;
        }
        this._blockNumber = Math.max(blockNumber.toNumber(), this._blockNumber);
        // resolve each call in the batch.
        results.forEach((r, i) => resolveQueuedCall(calls[i], r));
    }

    private _generateCallBatches(maxBatches: number = 8): QueuedEthCall[][] {
        if (maxBatches === 0) {
            return [];
        }
        const batch = [];
        let nextQueue = this._queue;
        while (batch.length < maxBatches && nextQueue.length > 0) {
            const _queue = nextQueue;
            nextQueue = [];
            const batcher = new CallBatcher(this._maxBatchGas, this._maxBatchBytes);
            // Go through each call in the queue and try to batch it.
            for (const c of _queue) {
                if (!batcher.tryToBatch(c)) {
                    // Couldn't batch it so return to the queue.
                    nextQueue.push(c);
                }
            }
            if (batcher.length === 0) {
                // Nothing to batch. Stop.
                break;
            }
            const batchFullness = batcher.calls
                .map(c => getCallFullness(c, this._maxBatchGas, this._maxBatchBytes))
                .reduce((a, v) => a + v, 0);
            this._queueFullness -= batchFullness;
            batch.push(batcher.calls);
        }
        // Whatever left over is our new queue.
        this._queue = nextQueue;
        return batch;
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
                if (!(a in this._batchOverrides)) {
                    estimatedBytesSize += (ethCall.opts.overrides[a].code || '').length;
                }
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

interface BatchedChainEthCallOpts {
    gas: number;
    to: Address;
    from: Address;
    gasPrice: BigNumber;
    overrides: ChainEthCallOverrides;
    data: Bytes;
    value: BigNumber;
}

function mergeBatchCalls(calls: QueuedEthCall[]): BatchedChainEthCallOpts {
    return timeIt(
        () => {
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
            const callInfos: any = [];
            const merged = {
                gas: calls.length * 20e3,
                from: DEFAULT_CALLER_ADDRESS,
                gasPrice: undefined as BigNumber | undefined,
                to: DISPATCHER_CONTRACT.address,
                value: ZERO_AMOUNT,
                data: NULL_BYTES,
                overrides: { [DISPATCHER_CONTRACT_ADDRESS]: { code: DISPATCHER_CONTRACT_BYTECODE } },
            };
            for (const c of calls) {
                callInfos.push({
                    data: c.opts.data,
                    to: c.opts.to,
                    gas: new BigNumber(c.opts.gas || DEFAULT_CALL_GAS_LIMIT),
                    value: c.opts.value || ZERO_AMOUNT,
                });
                merged.gas += c.opts.gas || DEFAULT_CALL_GAS_LIMIT;
                merged.gasPrice = merged.gasPrice === undefined ? c.opts.gasPrice : merged.gasPrice;
                if (c.opts.value) {
                    merged.value = merged.value === ZERO_AMOUNT
                        ? c.opts.value || ZERO_AMOUNT
                        : merged.value.plus(c.opts.value || ZERO_AMOUNT);
                }
                if (c.opts.overrides) {
                    for (const addr in c.opts.overrides) {
                        merged.overrides[addr] = c.opts.overrides[addr] as any;
                    }
                }
            }
            return {
                ...merged,
                data: timeIt(() => DISPATCHER_CONTRACT.dispatch(callInfos).getABIEncodedTransactionData(),
                    dt => `dispatch ABI encode took ${dt}ms (${calls.length} calls)`),
                gasPrice: merged.gasPrice || ZERO_AMOUNT,
            };
        },
        dt => `mergeBatchCalls took ${dt}ms`,
    );
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

function getCallFullness(c: QueuedEthCall, maxBatchGas: number, maxBatchBytes: number): number {
    return Math.max(
        (c.opts.gas || DEFAULT_CALL_GAS_LIMIT) / maxBatchGas,
        // This is just a rough metric so no need to include overrides size.
        c.opts.data.length / maxBatchBytes,
    );
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

async function timeoutAsync<TReturn extends any>(
    p: Promise<TReturn>,
    timeoutMs: number,
    onTimeout: (dt: number) => Error): Promise<TReturn>
{
    const startTime = Date.now();
    const timeoutPromise = new Promise<number>((_accept, reject) => {
        setTimeout(() => {
            const dt = Date.now() - startTime;
            reject(onTimeout(dt));
        }, timeoutMs);
    });
    return Promise.race([p, timeoutPromise as any])
}
