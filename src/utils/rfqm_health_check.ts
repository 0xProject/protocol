import { Producer } from 'sqs-producer';

const SQS_QUEUE_SIZE_DEGRADED_THRESHOLD = 10; // More messages sitting in queue than this will cause a DEGRADED issue
const SQS_QUEUE_SIZE_FAILED_THRESHOLD = 20; // More messages sitting in queue than this will cause a FAILED issue

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
