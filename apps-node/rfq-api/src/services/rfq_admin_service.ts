import { BigNumber } from '@0x/utils';

import { ONE_SECOND_MS } from '../core/constants';
import { RfqmJobStatus, UnresolvedRfqmJobStatuses } from '../entities/types';
import { logger } from '../logger';
import { RfqmDbUtils } from '../utils/rfqm_db_utils';

import { CleanupJobsResponse } from './types';

/**
 * RfqAdminService is the coordination layer for admin HTTP services.
 * It currently uses the admin API key for authentication, but
 * this can be replaced with a more sophisticated means of authentication.
 */
export class RfqAdminService {
    constructor(private readonly _dbUtils: RfqmDbUtils) {}

    /**
     * Cleans up pending jobs by manually setting the status to `FailedExpired`.
     * Ignores jobs not in a pending status.
     */
    public async cleanupJobsAsync(orderHashes: string[], now: Date = new Date()): Promise<CleanupJobsResponse> {
        const modifiedJobs: string[] = [];
        const unmodifiedJobs: string[] = [];

        const handleJob = async (orderHash: string): Promise<void> => {
            const job = await this._dbUtils.findV2JobByOrderHashAsync(orderHash);

            if (!job) {
                logger.error({ orderHash }, `No job found for order hash`);
                unmodifiedJobs.push(orderHash);
                return;
            }

            if (!UnresolvedRfqmJobStatuses.includes(job.status)) {
                logger.error({ orderHash, status: job.status }, 'Tried to clean up a resolved job');
                unmodifiedJobs.push(orderHash);
                return;
            }

            try {
                const { expiry } = job;
                const thirtySecondsPastExpiry = expiry.plus(new BigNumber(30));
                const nowSeconds = new BigNumber(now.getTime() / ONE_SECOND_MS);

                if (nowSeconds.isGreaterThan(thirtySecondsPastExpiry)) {
                    job.status = RfqmJobStatus.FailedExpired;
                    await this._dbUtils.updateRfqmJobAsync(job);
                    logger.info({ orderHash }, 'Job status manually updated to failure');
                    modifiedJobs.push(orderHash);
                } else {
                    logger.error({ orderHash }, 'Tried to clean up an unexpired job');
                    unmodifiedJobs.push(orderHash);
                }
            } catch (error) {
                logger.error({ orderHash }, 'Failed to clean up the job');
                unmodifiedJobs.push(orderHash);
            }
        };

        await Promise.all(orderHashes.map((h) => handleJob(h)));

        return {
            modifiedJobs,
            unmodifiedJobs,
        };
    }
}
