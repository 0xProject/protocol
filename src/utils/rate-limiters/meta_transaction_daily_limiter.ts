import { Connection, Repository } from 'typeorm';

import { TransactionEntity } from '../../entities';
import { MetaTransactionDailyLimiterConfig, MetaTransactionRateLimiterResponse } from '../../types';

import { MetaTransactionBaseDbRateLimiter } from './base_db_limiter';
import { DatabaseKeysUsedForRateLimiter, MetaTransactionRateLimiterContext } from './types';

export class MetaTransactionDailyLimiter extends MetaTransactionBaseDbRateLimiter {
    private readonly _transactionRepository: Repository<TransactionEntity>;
    private readonly _dailyLimit: number;

    constructor(
        field: DatabaseKeysUsedForRateLimiter,
        dbConnection: Connection,
        config: MetaTransactionDailyLimiterConfig,
    ) {
        super(field);
        this._transactionRepository = dbConnection.getRepository(TransactionEntity);
        this._dailyLimit = config.allowedDailyLimit;
    }

    public async isAllowedAsync(
        context: MetaTransactionRateLimiterContext,
    ): Promise<MetaTransactionRateLimiterResponse> {
        const key = this.getKeyFromContextOrThrow(context);
        const { count } = await this._transactionRepository
            .createQueryBuilder('tx')
            .select('COUNT(*)', 'count')
            .where(`tx.${this._dbField} = :key`, { key })
            .andWhere('DATE(tx.created_at) = CURRENT_DATE')
            .getRawOne();

        const isAllowed = parseInt(count, 10) < this._dailyLimit;
        return isAllowed
            ? { isAllowed }
            : {
                  isAllowed,
                  reason: `daily limit of ${this._dailyLimit} meta transactions reached for given ${this._dbField}`,
              };
    }
}
