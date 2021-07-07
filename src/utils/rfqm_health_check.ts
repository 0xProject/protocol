import { RfqMakerAssetOfferings } from '@0x/asset-swapper';
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

const BALANCE_DEGRADED_THRESHOLD_WEI = new BigNumber(BALANCE_DEGRADED_THRESHOLD).shiftedBy(ETH_DECIMALS);
const BALANCE_FAILED_THRESHOLD_WEI = new BigNumber(BALANCE_FAILED_THRESHOLD).shiftedBy(ETH_DECIMALS);

export enum HealthCheckStatus {
    Operational = 'operational',
    Maintenance = 'maintenance',
    Degraded = 'degraded',
    Failed = 'failed',
}

interface HealthCheckIssue {
    status: HealthCheckStatus;
    description: string;
}

/**
 * The complete result of an RFQm health check routine.
 * For public users, this should be converted to a `RfqmHealthCheckShortResponse` before being
 * sent in the reponse in order to not expose potentially-sensitive system details.
 */
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
 * Produces a full health check from the given inupts.
 */
export async function computeHealthCheckAsync(
    isMaintainenceMode: boolean,
    registryBalance: BigNumber,
    offerings: RfqMakerAssetOfferings,
    producer: Producer,
    heartbeats: RfqmWorkerHeartbeatEntity[],
): Promise<HealthCheckResult> {
    const pairs = transformPairs(offerings);

    const httpIssues = getHttpIssues(isMaintainenceMode, registryBalance);
    const httpStatus = getWorstStatus(httpIssues.map((issue) => issue.status));

    const queueIssues = await checkSqsQueueAsync(producer);
    const heartbeatIssues = await checkWorkerHeartbeatsAsync(heartbeats);
    const workersIssues = [...queueIssues, ...heartbeatIssues];
    const workersStatus = getWorstStatus(workersIssues.map((issue) => issue.status));

    return {
        status: getWorstStatus([httpStatus, workersStatus]),
        pairs,
        http: { status: httpStatus, issues: httpIssues },
        workers: { status: workersStatus, issues: workersIssues },
    };
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
 * Changes the set of trading pairs from the format used in config to the format used in the health check response.
 */
function transformPairs(offerings: RfqMakerAssetOfferings): { [pair: string]: HealthCheckStatus } {
    return Object.values(offerings)
        .flat()
        .reduce((result: { [pair: string]: HealthCheckStatus }, pair) => {
            const [tokenA, tokenB] = pair.sort();
            // Currently, we assume all pairs are operation. In the future, this may not be the case.
            result[`${tokenA}-${tokenB}`] = HealthCheckStatus.Operational;
            return result;
        }, {});
}

/**
 * Creates issues related to the server/API not specific to the worker farm.
 */
export function getHttpIssues(isMaintainenceMode: boolean, registryBalance: BigNumber): HealthCheckIssue[] {
    const issues = [];
    if (isMaintainenceMode) {
        issues.push({
            status: HealthCheckStatus.Maintenance,
            description: 'RFQM is set to maintainence mode via the 0x API configuration',
        });
    }

    if (registryBalance.isLessThan(BALANCE_FAILED_THRESHOLD_WEI)) {
        issues.push({
            status: HealthCheckStatus.Failed,
            description: `Registry balance is ${registryBalance
                .shiftedBy(ETH_DECIMALS * -1)
                .toFixed(2)} (threshold is ${BALANCE_FAILED_THRESHOLD})`,
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
 * Returns a numerical value which corresponds to the "severity" of a `HealthCheckStatus` enum member.
 * Higher values are more severe. (Oh to have SwiftLang enums here.)
 */
function statusSeverity(status: HealthCheckStatus): number {
    // tslint:disable custom-no-magic-numbers
    switch (status) {
        case HealthCheckStatus.Failed:
            return 4;
        case HealthCheckStatus.Maintenance:
            return 3;
        case HealthCheckStatus.Degraded:
            return 2;
        case HealthCheckStatus.Operational:
            return 1;
        default:
            throw new Error(`Received unknown status: ${status}`);
    }
    // tslint:enable custom-no-magic-numbers
}

/**
 * Accepts a list of statuses and returns the worst status
 */
function getWorstStatus(statuses: HealthCheckStatus[]): HealthCheckStatus {
    if (!statuses.length) {
        return HealthCheckStatus.Operational;
    }
    return statuses.reduce(
        (worstStatus, currentStatus) =>
            statusSeverity(currentStatus) > statusSeverity(worstStatus) ? currentStatus : worstStatus,
        HealthCheckStatus.Operational,
    );
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
    const heartbeatsAboveCriticalBalanceThreshold = heartbeats.filter(({ balance }) =>
        balance.isGreaterThanOrEqualTo(BALANCE_FAILED_THRESHOLD_WEI),
    );
    if (heartbeatsAboveCriticalBalanceThreshold.length === 0) {
        results.push({
            status: HealthCheckStatus.Failed,
            description: `No worker has a balance greater than the failed threshold (${BALANCE_FAILED_THRESHOLD})`,
        });
    }

    heartbeats.forEach(({ address, balance, index }) => {
        if (balance.isLessThan(BALANCE_DEGRADED_THRESHOLD_WEI)) {
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
