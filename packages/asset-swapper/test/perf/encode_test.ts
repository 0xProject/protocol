import { AbiEncoder, BigNumber, NULL_ADDRESS } from '@0x/utils';
import { MethodAbi } from 'ethereum-types';
import { utils } from 'ethers';
import { utils as ethers5Utils } from 'ethers5';
import _ = require('lodash');
import { performance, PerformanceObserver } from 'perf_hooks';

const percentile = require('percentile');

import { ZERO_AMOUNT } from '../../src/utils/market_operation_utils/constants';
import { getSampleAmounts } from '../../src/utils/market_operation_utils/sampler';

describe.only('Encoder perf', () => {
    const UNISWAP_V2_SELL_ABI: MethodAbi = {
        inputs: [
            {
                internalType: 'address',
                name: 'router',
                type: 'address',
            },
            {
                internalType: 'address[]',
                name: 'path',
                type: 'address[]',
            },
            {
                internalType: 'uint256[]',
                name: 'takerTokenAmounts',
                type: 'uint256[]',
            },
        ],
        name: 'sampleSellsFromUniswapV2',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'makerTokenAmounts',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    };
    // tslint:disable: custom-no-magic-numbers
    const QUARTILES = [25, 90, 99, 100];
    const RUNS = 100_000;
    let summary: any;
    const perf = (fn: () => void): any => {
        const wrapped = performance.timerify(fn);
        const resultsMs: number[] = [];
        const obs = new PerformanceObserver(list => resultsMs.push(list.getEntries()[0].duration));
        obs.observe({ entryTypes: ['function'] });
        _.times(RUNS, () => wrapped());
        obs.disconnect();
        summary = QUARTILES.map(n => [`p${n}:`, percentile(n, resultsMs), 'ms'].join(' ')).join(' ');
    };

    beforeEach(() => {
        summary = undefined;
    });
    afterEach(() => {
        console.log(summary);
    });

    const ZERO_EX_ENCODER = new AbiEncoder.Method(UNISWAP_V2_SELL_ABI);
    const ZERO_EX_UNOPTIMIZED: AbiEncoder.EncodingRules = { shouldOptimize: true, shouldAnnotate: false };

    const ETHERS_INTERFACE = new utils.Interface([UNISWAP_V2_SELL_ABI]);
    const ETHERS_ENCODER = ETHERS_INTERFACE.functions[UNISWAP_V2_SELL_ABI.name];

    const ETHERS_5_INTERFACE = new ethers5Utils.Interface([UNISWAP_V2_SELL_ABI]);
    const ETHERS_5_ENCODER = ETHERS_5_INTERFACE.functions[UNISWAP_V2_SELL_ABI.name];

    describe('Uniswap ABI', () => {
        describe('empty', () => {
            const params = [NULL_ADDRESS, [], []];
            it('ZeroEx', () => {
                const f = () => ZERO_EX_ENCODER.encode(params);
                perf(f);
            });
            it('Ethers', () => {
                const f = () => ETHERS_ENCODER.encode(params);
                perf(f);
            });
        });
        describe('zeroes', () => {
            const params = [NULL_ADDRESS, [NULL_ADDRESS, NULL_ADDRESS], [ZERO_AMOUNT.toString()]];
            it('ZeroEx', () => {
                const f = () => ZERO_EX_ENCODER.encode(params);
                perf(f);
            });
            it('Ethers', () => {
                const f = () => ETHERS_ENCODER.encode(params);
                perf(f);
            });
        });
        describe('13 zeros', () => {
            const params = [
                NULL_ADDRESS,
                [NULL_ADDRESS, NULL_ADDRESS],
                _.times(13, () => ZERO_AMOUNT).map(n => n.toString()),
            ];
            it('ZeroEx', () => {
                const f = () => ZERO_EX_ENCODER.encode(params);
                perf(f);
            });
            it('ZeroEx - no optimize', () => {
                const f = () => ZERO_EX_ENCODER.encode(params, ZERO_EX_UNOPTIMIZED);
                perf(f);
            });
            it('Ethers', () => {
                const f = () => ETHERS_ENCODER.encode(params);
                perf(f);
            });
        });
        describe('13 distributed samples', () => {
            const params = [
                NULL_ADDRESS,
                [NULL_ADDRESS, NULL_ADDRESS],
                getSampleAmounts(new BigNumber(1e6), 13, 1.03).map(n => n.toString()),
            ];
            it('ZeroEx', () => {
                const f = () => ZERO_EX_ENCODER.encode(params);
                perf(f);
            });
            it('ZeroEx - no optimize', () => {
                const f = () => ZERO_EX_ENCODER.encode(params, ZERO_EX_UNOPTIMIZED);
                perf(f);
            });
            it('Ethers', () => {
                const f = () => ETHERS_ENCODER.encode(params);
                perf(f);
            });
            it('Ethers 5', () => {
                const f = () => ETHERS_5_INTERFACE.encodeFunctionData(UNISWAP_V2_SELL_ABI.name, params);
                perf(f);
            });
        });
        describe('decode 13 distributed samples', () => {
            const params = [
                NULL_ADDRESS,
                [NULL_ADDRESS, NULL_ADDRESS],
                getSampleAmounts(new BigNumber(1e6), 13, 1.03).map(n => n.toString()),
            ];
            const encoded = ZERO_EX_ENCODER.encode(params);
            it('ZeroEx', () => {
                const f = () => ZERO_EX_ENCODER.decode(encoded);
                perf(f);
            });
            it('Ethers', () => {
                const f = () => ETHERS_INTERFACE.parseTransaction({ data: encoded });
                perf(f);
            });
            it('Ethers 5', () => {
                const f = () => ETHERS_5_INTERFACE.decodeFunctionData(UNISWAP_V2_SELL_ABI.name, encoded);
                perf(f);
            });
        });
    });
});
