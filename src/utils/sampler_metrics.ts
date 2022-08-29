import { BigNumber } from '@0x/utils';
import { Gauge, Summary } from 'prom-client';

const SAMPLER_GAS_USED_SUMMARY = new Summary({
    name: 'sampler_gas_used_summary',
    help: 'Provides information about the gas used during a sampler call',
    labelNames: ['side'],
});

const SAMPLER_GAS_LIMIT_SUMMARY = new Summary({
    name: 'sampler_gas_limit_summary',
    help: 'Provides information about the gas limit detected during a sampler call',
});

const SAMPLER_BLOCK_NUMBER_GAUGE = new Gauge({
    name: 'sampler_blocknumber',
    help: 'Provides information about the gas limit detected during a sampler call',
});

const ROUTER_EXECUTION_TIME_SUMMARY = new Summary({
    name: 'router_execution_time',
    help: 'Provides information about the execution time for routing related logic',
    labelNames: ['router', 'type'],
});

export const SAMPLER_METRICS = {
    /**
     * Logs the gas information performed during a sampler call.
     *
     * @param data.side The market side
     * @param data.gasBefore The gas remaining measured before any operations have been performed
     * @param data.gasAfter The gas remaining measured after all operations have been performed
     */
    logGasDetails: (data: { side: 'buy' | 'sell'; gasBefore: BigNumber; gasAfter: BigNumber }): void => {
        const { side, gasBefore, gasAfter } = data;
        const gasUsed = gasBefore.minus(gasAfter);

        SAMPLER_GAS_USED_SUMMARY.observe({ side }, gasUsed.toNumber());
        SAMPLER_GAS_LIMIT_SUMMARY.observe(gasBefore.toNumber());
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
