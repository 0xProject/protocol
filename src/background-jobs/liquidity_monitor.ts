import { getTokenMetadataIfExists, nativeWrappedTokenSymbol } from '@0x/token-metadata';
import axios from 'axios';
import { Job, Queue } from 'bullmq';
import * as HttpStatus from 'http-status-codes';
import { Gauge } from 'prom-client';
import { DataSource } from 'typeorm';
import * as uuid from 'uuid';

import { CHAIN_CONFIGURATIONS, INTEGRATORS_ACL, RFQ_MAKER_CONFIGS } from '../config';
import { NULL_ADDRESS } from '../constants';
import { RfqMaker } from '../entities';
import { getDbDataSourceAsync } from '../getDbDataSourceAsync';
import { logger } from '../logger';
import { getAxiosRequestConfigWithProxy } from '../utils/rfqm_service_builder';

import { BackgroundJobBlueprint } from './blueprint';

// ,' ,  ,` '  ,'╭╮','╭╮╭┳┳╮, '  ` ' ,,`╭┳╮' `, '
// ,'  _ , ', ,╭╮┣╋━┳┳╋╋╯┣┫╰┳┳╮╭━━┳━┳━┳╋┫╰┳━┳┳╮
//  , o\`.  , '┃╰┫┃╋┃┃┃┃╋┃┃╭┫┃┃┃┃┃┃╋┃┃┃┃┃╭┫╋┃╭╯
// ',' +/\| , ,╰━┻┻╮┣━┻┻━┻┻━╋╮┃╰┻┻┻━┻┻━┻┻━┻━┻╯
// ,   |\  ,'' ,',`╰╯'`  , ,`╰━╯ '  , `  ` , ` '

/**
 * The liquidity monitor runs periodically to create a history
 * of liquidity being served by 0x products.
 */

const QUEUE_NAME = 'liquidity-monitor';
const REMOVE_ON_COMPLETE_OPS = {
    count: 10,
};
const REMOVE_ON_FAILURE_OPS = {
    count: 10,
};
const SCHEDULE = '*/5 * * * *'; // job will be scheduled at every 5 minutes
const DESCRIPTION = 'Makes requests to 0x API endpoints and logs the results of\
available liquidity to Prometheus';

export interface BackgroundJobLiquidityMonitorData {
    timestamp: number;
}

export interface BackgroundJobLiquidityMonitorResult {
    jobName: string;
    timestamp: number;
}

const backgroundJobLiquidityMonitor: BackgroundJobBlueprint<
    BackgroundJobLiquidityMonitorData,
    BackgroundJobLiquidityMonitorResult
> = {
    queueName: QUEUE_NAME,
    schedule: SCHEDULE,
    description: DESCRIPTION,
    createAsync,
    processAsync,
};
// tslint:disable-next-line: no-default-export
export default backgroundJobLiquidityMonitor;

/**
 * The status of a liquidity request.
 *
 * In grafana, these integers can be mapped to names and colors
 * in the State Timeline graph -> Value mappings panel.
 */
enum Status {
    Fail = 0,
    NoLiquidityAvailable,
    LiquidityAvailable,
}

const LIQUIDITY_MONITOR_GAUGE = new Gauge({
    name: 'liquidity_monitor_gauge',
    labelNames: [
        'pair',
        'source', // can be specific market maker or product, i.e. zero/g, rfqm, etc.
        'chain_id',
    ],
    help: 'Gauge indicating whether liquidity is available for the pair/source/chain combination. Value is a Status type.',
});

/**
 * The interface which defines all the necessary information
 * needed to create a Grafana state timeline panel for a sepecific
 * pair on a specific chain:
 *         _____________________________________
 *         |        WMATIC-USDC (polygon)       |
 *         |------------------------------------|
 *         | zero/g   | xxxxxxx   xxxxxxxxxxxx  |
 *         | altonomy | xxxxxxxxxxxxxxxxxxxxxx  |
 *         | jump     |         xxxxxxxxxx      |
 *         |------------------------------------|
 *
 * Each item in `checks` will result in a new row in the panel.
 */
interface PairCheck {
    buyAmount: string;
    buyToken: string; // contract address
    chainId: number;
    checks: { source: string; checkerFunction: CheckerFunction }[];
    feeAmount: string;
    pair: string; // buy token - sell token, e.g. WETH-USDT
    sellToken: string; // contract address
}

/**
 * A function containing the information needed to execute a liquidity
 * check against a 0x API endpoint or a market maker quote server endpoint.
 *
 * Returns `true` if liquidity is available.
 */
type CheckerFunction = (parameters: {
    buyAmount: string;
    buyToken: string;
    chainId: number;
    feeAmount?: string;
    sellToken: string;
}) => Promise<boolean>;

/**
 * Creates a checker function to check top-level 0x API endpoints
 * like rfqm or zero/g
 */
function createCheckProduct(url: string): CheckerFunction {
    return async (params: {
        buyAmount: string;
        buyToken: string;
        chainId: number;
        sellToken: string;
    }): Promise<boolean> => {
        const devApiKey = INTEGRATORS_ACL.find((i) => i.label === '0x Internal')?.apiKeys[0];
        if (!devApiKey) {
            throw new Error('[liquidity montior] Unable to get API key');
        }
        const axiosInstance = axios.create();
        const response = await axiosInstance.get<{ liquidityAvailable: boolean }>(url, {
            params: {
                buyToken: params.buyToken,
                sellToken: params.sellToken,
                buyAmount: params.buyAmount,
                takerAddress: '0x4Ea754349AcE5303c82f0d1D491041e042f2ad22', // dev reserve
            },
            headers: {
                '0x-api-key': devApiKey,
                '0x-chain-id': params.chainId.toString(),
            },
        });

        if (response.status !== HttpStatus.OK) {
            return false;
        }
        const body = response.data;
        if (!body.hasOwnProperty('liquidityAvailable')) {
            throw new Error('Malformed response');
        }
        return body.liquidityAvailable;
    };
}

/**
 * Creates a checker function to check a market maker's rfqm
 * quote server
 */
function createCheckMarketMaker(label: string, dataSource: DataSource): CheckerFunction {
    const maker = RFQ_MAKER_CONFIGS.find((m) => m.label.toLowerCase() === label.toLowerCase());
    if (!maker) {
        throw new Error(`Unable to find maker configuration with label ${label}`);
    }

    return async (params: {
        buyAmount: string;
        buyToken: string;
        chainId: number;
        feeAmount?: string;
        sellToken: string;
    }): Promise<boolean> => {
        const devIntegratorId = INTEGRATORS_ACL.find((i) => i.label === '0x Internal')?.integratorId;
        if (!devIntegratorId) {
            throw new Error('[liquidity montior] Unable to get 0x integrator id');
        }

        const makerRecord = await dataSource
            .getRepository(RfqMaker)
            .findOne({ select: { rfqmUri: true }, where: { makerId: maker.makerId, chainId: params.chainId } });
        if (!makerRecord) {
            throw new Error(`Unable to find maker record with label ${label}`);
        }
        const url = makerRecord.rfqmUri;
        if (!url) {
            throw new Error(`No rfqmUri exists for maker with label ${label}`);
        }

        const registryAddress = CHAIN_CONFIGURATIONS.find((chain) => chain.chainId === params.chainId)?.registryAddress;
        if (!registryAddress) {
            throw new Error(`Cannot find registry address for chain ${params.chainId}`);
        }

        const nativeWrappedTokenSymbolValue = nativeWrappedTokenSymbol(params.chainId);
        const nativeWrappedTokenMetadata = getTokenMetadataIfExists(nativeWrappedTokenSymbolValue, params.chainId);
        if (!nativeWrappedTokenMetadata) {
            throw new Error(`Cannot find native token data for chain ${params.chainId}`);
        }
        const nativeWrappedTokenAddress = nativeWrappedTokenMetadata.tokenAddress;

        const axiosInstance = axios.create(getAxiosRequestConfigWithProxy());
        const response = await axiosInstance.get(`${url}/rfqm/v2/price`, {
            params: {
                buyAmountBaseUnits: params.buyAmount,
                buyTokenAddress: params.buyToken,
                chainId: params.chainId,
                feeAmount: params.feeAmount ?? '0',
                feeToken: nativeWrappedTokenAddress,
                feeType: 'fixed',
                isLastLook: true,
                protocolVersion: 4,
                sellTokenAddress: params.sellToken,
                takerAddress: NULL_ADDRESS,
                txOrigin: registryAddress,
            },
            headers: {
                '0x-chain-id': params.chainId.toString(),
                '0x-integrator-id': devIntegratorId,
                '0x-request-uuid': uuid.v4(),
            },
        });

        if (response.status !== HttpStatus.OK) {
            return false;
        }

        // Check a few properties that should be present
        const body = response.data;
        if (body === undefined) {
            return false;
        }
        if (
            !body.hasOwnProperty('expiry') ||
            !body.hasOwnProperty('makerToken') ||
            !body.hasOwnProperty('takerToken')
        ) {
            logger.error({ responseBody: body }, 'Malformed response from market maker');
            throw new Error('Malformed response');
        }
        return true;
    };
}

/**
 * Pushes a liquidity monitor job to the work queue
 */
async function createAsync(
    queue: Queue,
    data: BackgroundJobLiquidityMonitorData,
): Promise<Job<BackgroundJobLiquidityMonitorData, BackgroundJobLiquidityMonitorResult>> {
    logger.info({ queue: QUEUE_NAME, data }, 'Creating a liquidity monitor job on queue');
    return queue.add(`${QUEUE_NAME}.${data.timestamp}`, data, {
        removeOnComplete: REMOVE_ON_COMPLETE_OPS,
        removeOnFail: REMOVE_ON_FAILURE_OPS,
    });
}

/**
 * The logic that runs to check liquidity and update the gauge
 */
async function processAsync(
    job: Job<BackgroundJobLiquidityMonitorData, BackgroundJobLiquidityMonitorResult>,
): Promise<BackgroundJobLiquidityMonitorResult> {
    logger.info(
        { jobName: job.name, queue: job.queueName, data: job.data, timestamp: Date.now() },
        'Processing liquidity monitor job',
    );

    const dataSource = await getDbDataSourceAsync();

    /////////////////////////////////////////////////////
    // ADD NEW CHECKS HERE
    /////////////////////////////////////////////////////

    const wmaticUsdcPolygonCheck = {
        buyAmount: '1000000000000000000', // 1 WMATIC | 18 decimals
        buyToken: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        chainId: 137,
        checks: [
            {
                checkerFunction: createCheckProduct('https://polygon.api.0x.org/rfqm/v1/quote'),
                source: 'rfqm',
            },
            {
                checkerFunction: createCheckProduct('https://polygon.api.0x.org/zero-gas/swap/v1/quote'),
                source: 'zero/g',
            },
            { checkerFunction: createCheckMarketMaker('Altonomy', dataSource), source: 'altonomy' },
            { checkerFunction: createCheckMarketMaker('Jump', dataSource), source: 'jump' },
            { checkerFunction: createCheckMarketMaker('Wintermute', dataSource), source: 'wintermute' },
        ],
        feeAmount: '0',
        pair: 'WMATIC-USDC',
        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    };

    const pairChecks: PairCheck[] = [wmaticUsdcPolygonCheck];

    /////////////////////////////////////////////////////

    let progress = 0;
    await job.updateProgress(0);
    const totalCheckCount = pairChecks.flatMap((pairCheck) => pairCheck.checks).length;

    pairChecks.forEach((pairCheck) => {
        pairCheck.checks.forEach(async (check) => {
            try {
                const isLiquidityAvailable = await check.checkerFunction({
                    buyAmount: pairCheck.buyAmount,
                    buyToken: pairCheck.buyToken,
                    chainId: pairCheck.chainId,
                    sellToken: pairCheck.sellToken,
                });

                LIQUIDITY_MONITOR_GAUGE.labels(pairCheck.pair, check.source, pairCheck.chainId.toString()).set(
                    isLiquidityAvailable ? Status.LiquidityAvailable : Status.NoLiquidityAvailable,
                );
            } catch (e) {
                const errorJson = axios.isAxiosError(e) ? e.toJSON() : null;
                logger.error({ message: e.message, axiosErrorJson: errorJson }, 'Liquidity check failed');
                LIQUIDITY_MONITOR_GAUGE.labels(pairCheck.pair, check.source, pairCheck.chainId.toString()).set(
                    Status.Fail,
                );
            } finally {
                progress += 100 / totalCheckCount; // tslint:disable-line: custom-no-magic-numbers
                await job.updateProgress(progress);
            }
        });
    });

    // tslint:disable-next-line: custom-no-magic-numbers
    await job.updateProgress(100);
    return {
        jobName: job.name,
        timestamp: Date.now(),
    };
}
