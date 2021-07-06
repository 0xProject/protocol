import { AbiEncoder, logUtils, NULL_BYTES } from '@0x/utils';
import { marshaller, Web3Wrapper } from '@0x/web3-wrapper';
import _ = require('lodash');

import { SamplerCallResult, SamplerOverrides } from '../../types';

import { DexOrderSampler } from './sampler';
import { BatchedOperation } from './types';

const BASIC_TYPES = ['int256', 'uint256', 'string', 'bool', 'address', 'bytes', 'bytes32'];
const LOG_PERMUTATIONS = [...BASIC_TYPES, ...BASIC_TYPES.map(t => `${t}[]`)];

/**
 * Encapsulates interactions with the `ERC20BridgeSampler` contract.
 */
export class DebugDexOrderSampler extends DexOrderSampler {
    private readonly _decoders = LOG_PERMUTATIONS.map(p => AbiEncoder.createMethod('log', p.split(',')));
    /**
     * Run a series of operations from `DexOrderSampler.ops` in a single transaction.
     * Takes an arbitrary length array, but is not typesafe.
     */
    public async executeBatchAsync<T extends Array<BatchedOperation<any>>>(
        ops: T,
        opts: Partial<SamplerOverrides> = {},
    ): Promise<any[]> {
        const callDatas = ops.map(o => o.encodeCall());
        const { overrides, block } = _.merge(opts, this._samplerOverrides);

        // All operations are NOOPs
        if (callDatas.every(cd => cd === NULL_BYTES)) {
            return callDatas.map((_callData, i) => ops[i].handleCallResults(NULL_BYTES));
        }
        // Execute all non-empty calldatas.
        const batchCallData = this._samplerContract
            .batchCall(callDatas.filter(cd => cd !== NULL_BYTES))
            .getABIEncodedTransactionData();

        // HACK: reach in and re-use the samplers web3wrapper
        const web3Wrapper = (this._samplerContract as any)._web3Wrapper as Web3Wrapper;

        // https://geth.ethereum.org/docs/rpc/ns-debug#debug_tracecall
        const traceOpts = {
            disableStorage: true,
            disableMemory: false,
            tracer: TRACER,
            stateOverrides: marshaller.marshalCallOverrides(overrides || {}),
        };

        const traceResults = await web3Wrapper.sendRawPayloadAsync<{
            output: string;
            time: string;
            consoleLogs: string[];
        }>({
            method: 'debug_traceCall',
            params: [
                {
                    data: batchCallData,
                    to: this._samplerContract.address,
                },
                block,
                traceOpts,
            ],
        });

        if (traceResults.consoleLogs.length > 0) {
            logUtils.header(` DebugSampler logs (${traceResults.time})`);
            traceResults.consoleLogs.forEach(l => {
                const decoder = this._decoders.find(d => d.getSelector() === l.slice(0, 10));
                const log = decoder ? Object.values(decoder.decode(l)) : l;
                logUtils.log(log);
            });
        }

        const rawCallResults = this._samplerContract.getABIDecodedReturnData<SamplerCallResult[]>(
            'batchCall',
            traceResults.output,
        );
        // Return the parsed results.
        let rawCallResultsIdx = 0;
        const results = callDatas.map((callData, i) => {
            // tslint:disable-next-line:boolean-naming
            const { data, success } =
                callData !== NULL_BYTES ? rawCallResults[rawCallResultsIdx++] : { success: true, data: NULL_BYTES };
            return success ? ops[i].handleCallResults(data) : ops[i].handleRevert(data);
        });
        return results;
    }
}

const TRACER = `
{
    consoleLogs: [],
    // step is invoked for every opcode that the VM executes.
    step: function (log, db) {
      // We only care about system opcodes, faster if we pre-check once
      var syscall = (log.op.toNumber() & 0xf0) == 0xf0;
      var op = log.op.toString();
      // If a new method invocation is being done, add to the call stack
      if (
        syscall &&
        (op == "CALL" ||
          op == "CALLCODE" ||
          op == "DELEGATECALL" ||
          op == "STATICCALL")
      ) {
        var to = toHex(toAddress(log.stack.peek(1).toString(16)));
        // Hardhat Console address
        if (to !== "0x000000000000000000636f6e736f6c652e6c6f67") {
            return;
          }
        var off = op == "DELEGATECALL" || op == "STATICCALL" ? 0 : 1;

        var inOff = log.stack.peek(2 + off).valueOf();
        var inEnd = inOff + log.stack.peek(3 + off).valueOf();
        this.consoleLogs.push(toHex(log.memory.slice(inOff, inEnd)));
      }
    },

    // fault is invoked when the actual execution of an opcode fails.
    fault: function (log, db) {},

    // result is invoked when all the opcodes have been iterated over and returns
    // the final result of the tracing.
    result: function (ctx, db) {
      var result = {
        type: ctx.type,
        from: toHex(ctx.from),
        to: toHex(ctx.to),
        value: "0x" + ctx.value.toString(16),
        gas: "0x" + bigInt(ctx.gas).toString(16),
        gasUsed: "0x" + bigInt(ctx.gasUsed).toString(16),
        input: toHex(ctx.input),
        output: toHex(ctx.output),
        time: ctx.time,
      };
      return this.finalize(result);
    },

    // finalize recreates a call object using the final desired field oder for json
    // serialization. This is a nicety feature to pass meaningfully ordered results
    // to users who don't interpret it, just display it.
    finalize: function (call) {
      var sorted = {
        type: call.type,
        from: call.from,
        to: call.to,
        value: call.value,
        gas: call.gas,
        gasUsed: call.gasUsed,
        input: call.input,
        output: call.output,
        time: call.time,
        consoleLogs: this.consoleLogs,
        tos: this.tos
      };
      return sorted;
    },
}
`;
