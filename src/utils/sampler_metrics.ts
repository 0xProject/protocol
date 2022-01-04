import { SamplerMetrics } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';
import { Gauge, Summary } from 'prom-client';

const SAMPLER_GAS_USED_SUMMARY = new Summary({
    name: 'sampler_gas_used_summary',
    help: 'Provides information about the gas used during a sampler call',
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

export const SAMPLER_METRICS: SamplerMetrics = {
    logGasDetails: (data: { gasBefore: BigNumber; gasAfter: BigNumber }): void => {
        const { gasBefore, gasAfter } = data;
        const gasUsed = gasBefore.minus(gasAfter);

        SAMPLER_GAS_USED_SUMMARY.observe(gasUsed.toNumber());
        SAMPLER_GAS_LIMIT_SUMMARY.observe(gasBefore.toNumber());
    },

    logBlockNumber: (blockNumber: BigNumber): void => {
        SAMPLER_BLOCK_NUMBER_GAUGE.set(blockNumber.toNumber());
    },

    logRouterDetails: (data: {
        router: 'neon-router' | 'js';
        type: 'all' | 'vip' | 'total';
        timingMs: number;
    }): void => {
        const { router, type, timingMs } = data;
        ROUTER_EXECUTION_TIME_SUMMARY.observe({ router, type }, timingMs);
    },
};
