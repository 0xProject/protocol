import { BigNumber } from '@0x/utils';
import { Producer } from 'sqs-producer';

import { ETH_DECIMALS } from '../constants';
import { RfqmWorkerHeartbeatEntity } from '../entities';

const SQS_QUEUE_SIZE_DEGRADED_THRESHOLD = 10; // More messages sitting in queue than this will cause a DEGRADED issue
const SQS_QUEUE_SIZE_FAILED_THRESHOLD = 20; // More messages sitting in queue than this will cause a FAILED issue

const RECENT_HEARTBEAT_AGE_THRESHOLD = 5; // (minutes) Heartbeats older than this will produce a DEGRADED issue. A FAILED issue is produced if NO heartbeats are newer than this.

const BALANCE_FAILED_THRESHOLD = 0.04; // (eth) If NO worker has a balance higher than this, a FAILED issue gets created.
const BALANCE_DEGRADED_THRESHOLD = 0.1; // (eth) If < 2 workers have a balance lower than this, a DEGRADED issue gets created.

const MS_IN_MINUTE = 60000;

const BALANCE_DEGRADED_THRESHOLD_WEI = new BigNumber(BALANCE_DEGRADED_THRESHOLD).shiftedBy(ETH_DECIMALS);
const BALANCE_FAILED_THRESHOLD_WEI = new BigNumber(BALANCE_FAILED_THRESHOLD).shiftedBy(ETH_DECIMALS);

export enum HealthCheckStatus {
    Operational = 'operational',
    Maintenance = 'maintenance',
    Degraded = 'degraded',
    Failed = 'failed',
}

type HealthCheckLabel =
    | 'registry balance'
    | 'RFQM_MAINTENANCE_MODE config `true`'
    | 'queue size'
    | 'worker balance'
    | 'worker heartbeat';

interface HealthCheckIssue {
    status: HealthCheckStatus;
    description: string;
    label: HealthCheckLabel;
}

/**
 * Creates issues related to the server/API not specific to the worker farm.
 */
export function getHttpIssues(isMaintainenceMode: boolean, registryBalance: BigNumber): HealthCheckIssue[] {
    const issues: HealthCheckIssue[] = [];
    if (isMaintainenceMode) {
        issues.push({
            status: HealthCheckStatus.Maintenance,
            description: 'RFQM is set to maintainence mode via the 0x API configuration',
            label: 'RFQM_MAINTENANCE_MODE config `true`',
        });
    }

    if (
        registryBalance.isLessThan(BALANCE_DEGRADED_THRESHOLD_WEI) &&
        registryBalance.isGreaterThanOrEqualTo(BALANCE_FAILED_THRESHOLD_WEI)
    ) {
        issues.push({
            status: HealthCheckStatus.Degraded,
            description: `Registry balance is ${registryBalance
                .shiftedBy(ETH_DECIMALS * -1)
                .toFixed(2)} (threshold is ${BALANCE_DEGRADED_THRESHOLD})`,
            label: 'registry balance',
        });
    }

    if (registryBalance.isLessThan(BALANCE_FAILED_THRESHOLD_WEI)) {
        issues.push({
            status: HealthCheckStatus.Failed,
            description: `Registry balance is ${registryBalance
                .shiftedBy(ETH_DECIMALS * -1)
                .toFixed(2)} (threshold is ${BALANCE_FAILED_THRESHOLD})`,
            label: 'registry balance',
        });
    }
    return issues;
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
            label: 'queue size',
        });
    } else if (messagesInQueue > SQS_QUEUE_SIZE_DEGRADED_THRESHOLD) {
        results.push({
            status: HealthCheckStatus.Degraded,
            description: `SQS queue contains ${messagesInQueue} messages (threshold is ${SQS_QUEUE_SIZE_DEGRADED_THRESHOLD})`,
            label: 'queue size',
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
        return [
            {
                status: HealthCheckStatus.Failed,
                description: 'No worker heartbeats were found',
                label: 'worker heartbeat',
            },
        ];
    }

    // Heartbeat Age
    const sortedHeartbeats = heartbeats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const newestHeartbeat = sortedHeartbeats[0];
    const newestHeartbeatAgeMinutes = (nowDate.getTime() - newestHeartbeat.timestamp.getTime()) / MS_IN_MINUTE;
    if (newestHeartbeatAgeMinutes > RECENT_HEARTBEAT_AGE_THRESHOLD) {
        results.push({
            status: HealthCheckStatus.Failed,
            description: `No worker has published a heartbeat in the last ${RECENT_HEARTBEAT_AGE_THRESHOLD} minutes`,
            label: 'worker heartbeat',
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
                label: 'worker heartbeat',
            });
        }
    });

    // Balances
    const heartbeatsAboveCriticalBalanceThreshold = heartbeats.filter(({ balance }) =>
        balance.isGreaterThanOrEqualTo(BALANCE_FAILED_THRESHOLD_WEI),
    );
    if (heartbeatsAboveCriticalBalanceThreshold.length === 0) {
        results.push({
            status: HealthCheckStatus.Failed,
            description: `No worker has a balance greater than the failed threshold (${BALANCE_FAILED_THRESHOLD})`,
            label: 'worker heartbeat',
        });
    }

    const heartbeatsAboveDegradedBalanceThreshold = heartbeats.filter(({ balance }) =>
        balance.isGreaterThan(BALANCE_DEGRADED_THRESHOLD_WEI),
    );
    if (heartbeatsAboveDegradedBalanceThreshold.length < 2) {
        results.push({
            status: HealthCheckStatus.Degraded,
            description: `Less than two workers have a balance above the degraded threshold (${BALANCE_DEGRADED_THRESHOLD})`,
            label: 'worker heartbeat',
        });
    }
    return results;
}
