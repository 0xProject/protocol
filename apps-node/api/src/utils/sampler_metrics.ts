import { BigNumber } from '@0x/utils';
import { Gauge, Summary } from 'prom-client';

const SAMPLER_GAS_USED_SUMMARY = new Summary({
    name: 'sampler_gas_used_summary',
    help: 'The gas used during a sampler call',
    labelNames: ['side'],
});

const SAMPLER_GAS_LIMIT_SUMMARY = new Summary({
    name: 'sampler_gas_limit_summary',
    help: 'The gas limit detected during a sampler call',
});

const SAMPLER_BLOCK_NUMBER_GAUGE = new Gauge({
    name: 'sampler_blocknumber',
    help: 'The block number of a sampler call',
});

const ROUTER_EXECUTION_TIME_SUMMARY = new Summary({
    name: 'router_execution_time',
    help: 'Execution time for routing related logic',
    labelNames: ['router', 'type'],
});

export const SAMPLER_METRICS = {
    /**
     * Logs the gas information performed during a sampler call.
     *
     * @param side The market side
     * @param gasLimit The gas limit (gas remaining measured before any operations have been performed)
     * @param gasLeft The gas remaining measured after all operations have been performed
     */
    logGasDetails: ({
        side,
        gasLimit,
        gasUsed,
    }: {
        side: 'buy' | 'sell';
        gasLimit: BigNumber;
        gasUsed: BigNumber;
    }): void => {
        SAMPLER_GAS_USED_SUMMARY.observe({ side }, gasUsed.toNumber());
        SAMPLER_GAS_LIMIT_SUMMARY.observe(gasLimit.toNumber());
    },

    /**
     * Logs the block number
     *
     * @param blockNumber block number of the sampler call
     */
    logBlockNumber: (blockNumber: BigNumber): void => {
        SAMPLER_BLOCK_NUMBER_GAUGE.set(blockNumber.toNumber());
    },

    /**
     * Logs the routing timings
     *
     * @param data.router The router type (neon-router or js)
     * @param data.type The type of timing being recorded (e.g total timing, all sources timing or vip timing)
     * @param data.timingMs The timing in milliseconds
     */
    logRouterDetails: (data: {
        router: 'neon-router' | 'js';
        type: 'all' | 'vip' | 'total';
        timingMs: number;
    }): void => {
        const { router, type, timingMs } = data;
        ROUTER_EXECUTION_TIME_SUMMARY.observe({ router, type }, timingMs);
    },
};
