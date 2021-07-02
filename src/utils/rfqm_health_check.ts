import { BigNumber } from '@0x/utils';
import { Producer } from 'sqs-producer';

import { ETH_DECIMALS } from '../constants';
import { RfqmWorkerHeartbeatEntity } from '../entities';

const SQS_QUEUE_SIZE_DEGRADED_THRESHOLD = 10; // More messages sitting in queue than this will cause a DEGRADED issue
const SQS_QUEUE_SIZE_FAILED_THRESHOLD = 20; // More messages sitting in queue than this will cause a FAILED issue

const RECENT_HEARTBEAT_AGE_THRESHOLD = 5; // (minutes) Heartbeats older than this will produce a DEGRADED issue. A FAILED issue is produced if NO heartbeats are newer than this.

const BALANCE_FAILED_THRESHOLD = 0.04; // (eth) If NO worker has a balance higher than this, a FAILED issue gets created.
// tslint:disable-next-line: custom-no-magic-numbers
const BALANCE_DEGRADED_THRESHOLD = BALANCE_FAILED_THRESHOLD * 4; // (eth) If a worker's balance is lower than this, a DEGRADED issue gets created.

const MS_IN_MINUTE = 60000;
export enum HealthCheckStatus {
    Operational = 'operational',
    Unknown = 'unknown',
    Maintenance = 'maintenance',
    Degraded = 'degraded',
    Failed = 'failed',
}

interface HealthCheckIssue {
    status: HealthCheckStatus;
    description: string;
}

export interface HealthCheckResult {
    status: HealthCheckStatus;
    pairs: {
        [pair: string]: HealthCheckStatus; // where the pair has the form `${contractA}-${contractB}`
    };
    http: {
        status: HealthCheckStatus;
        issues: HealthCheckIssue[];
    };
    workers: {
        status: HealthCheckStatus;
        issues: HealthCheckIssue[];
    };
    // TODO (rhinodavid): Add MarketMakers
}

export interface RfqmHealthCheckShortResponse {
    isOperational: boolean;
    pairs: [string, string][];
}

/**
 * Transform the full health check result into the minimal response the Matcha UI requires.
 */
export function transformResultToShortResponse(result: HealthCheckResult): RfqmHealthCheckShortResponse {
    return {
        isOperational: result.status === HealthCheckStatus.Operational || result.status === HealthCheckStatus.Degraded,
        pairs: Object.entries(result.pairs)
            .filter(
                ([_pair, status]) => status === HealthCheckStatus.Operational || status === HealthCheckStatus.Degraded,
            )
            .map(([pair, _status]) => {
                const [tokenA, tokenB] = pair.split('-');
                return [tokenA, tokenB];
            }),
    };
}

/**
 * Runs checks on the SQS queue to detect if there are messages piling up.
 */
export async function checkSqsQueueAsync(producer: Producer): Promise<HealthCheckIssue[]> {
    const results: HealthCheckIssue[] = [];
    const messagesInQueue = await producer.queueSize();
    if (messagesInQueue === 0) {
        return results;
    }
    if (messagesInQueue > SQS_QUEUE_SIZE_FAILED_THRESHOLD) {
        results.push({
            status: HealthCheckStatus.Failed,
            description: `SQS queue contains ${messagesInQueue} messages (threshold is ${SQS_QUEUE_SIZE_FAILED_THRESHOLD})`,
        });
    } else if (messagesInQueue > SQS_QUEUE_SIZE_DEGRADED_THRESHOLD) {
        results.push({
            status: HealthCheckStatus.Degraded,
            description: `SQS queue contains ${messagesInQueue} messages (threshold is ${SQS_QUEUE_SIZE_DEGRADED_THRESHOLD})`,
        });
    }
    return results;
}

/**
 * Looks at the worker heartbeats and produces appropriate issues based on the age
 * of the heartbeats and the worker balances.
 *
 * Heartbeat Age: Checks the most recent heartbeat and produces a FAILED issue if it is older than the failed
 * threshold. For heartbeats other than the most recent, will only produce a DEGRADED issue. (i.e. the check only
 * fails if ALL workers are stuck)
 *
 * Worker Balance: Like with the age check, this only produces a FAILED issue if all workers are below the failed
 * balance. Individual worker balances produce a DEGRADED issue if they are below BALANCE_DEGRADED_THRESHOLD.
 *
 * Current date is an optional parameter for testing.
 */
export async function checkWorkerHeartbeatsAsync(
    heartbeats: RfqmWorkerHeartbeatEntity[],
    nowDate: Date = new Date(),
): Promise<HealthCheckIssue[]> {
    const results: HealthCheckIssue[] = [];
    if (!heartbeats.length) {
        return [{ status: HealthCheckStatus.Failed, description: 'No worker heartbeats were found' }];
    }

    // Heartbeat Age
    const sortedHeartbeats = heartbeats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const newestHeartbeat = sortedHeartbeats[0];
    const newestHeartbeatAgeMinutes = (nowDate.getTime() - newestHeartbeat.timestamp.getTime()) / MS_IN_MINUTE;
    if (newestHeartbeatAgeMinutes > RECENT_HEARTBEAT_AGE_THRESHOLD) {
        results.push({
            status: HealthCheckStatus.Failed,
            description: `No worker has published a heartbeat in the last ${RECENT_HEARTBEAT_AGE_THRESHOLD} minutes`,
        });
    }
    // TODO (rhinodavid): Think about how this will work when we downscale and a worker isn't producing new
    // hearbeats because it's been removed.
    sortedHeartbeats.forEach(({ index, timestamp, address }) => {
        const heartbeatAgeMinutes = (nowDate.getTime() - timestamp.getTime()) / MS_IN_MINUTE;
        if (heartbeatAgeMinutes >= RECENT_HEARTBEAT_AGE_THRESHOLD) {
            results.push({
                status: HealthCheckStatus.Degraded,
                description: `Worker ${index} (${address}) last heartbeat was ${heartbeatAgeMinutes} ago`,
            });
        }
    });

    // Balances
    const failedWeiThreshold = new BigNumber(BALANCE_FAILED_THRESHOLD).shiftedBy(ETH_DECIMALS);
    const heartbeatsAboveCriticalBalanceThreshold = heartbeats.filter(({ balance }) =>
        balance.isGreaterThanOrEqualTo(failedWeiThreshold),
    );
    if (heartbeatsAboveCriticalBalanceThreshold.length === 0) {
        results.push({
            status: HealthCheckStatus.Failed,
            description: `No worker has a balance greater than the failed threshold (${BALANCE_FAILED_THRESHOLD})`,
        });
    }

    const degradedThreshold = new BigNumber(BALANCE_DEGRADED_THRESHOLD).shiftedBy(ETH_DECIMALS);
    heartbeats.forEach(({ address, balance, index }) => {
        if (balance.isLessThan(degradedThreshold)) {
            results.push({
                status: HealthCheckStatus.Degraded,
                description: `Worker ${index} (${address}) has a low balance: ${balance
                    .shiftedBy(ETH_DECIMALS * -1)
                    .toFixed(3)}`, // tslint:disable-line: custom-no-magic-numbers
            });
        }
    });
    return results;
}
