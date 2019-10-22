import { Connection, Repository } from 'typeorm';

import { TransactionEntity } from '../../entities';
import { MetaTransactionRateLimiterResponse, MetaTransactionRollingLimiterConfig } from '../../types';

import { MetaTransactionBaseDbRateLimiter } from './base_db_limiter';
import { DatabaseKeysUsedForRateLimiter, MetaTransactionRateLimiterContext } from './types';

export class MetaTransactionRollingLimiter extends MetaTransactionBaseDbRateLimiter {
    private readonly _transactionRepository: Repository<TransactionEntity>;
    private readonly _limit: number;
    private readonly _intervalNumber: number;
    private readonly _intervalUnit: string;

    constructor(
        field: DatabaseKeysUsedForRateLimiter,
        dbConnection: Connection,
        config: MetaTransactionRollingLimiterConfig,
    ) {
        super(field);
        this._transactionRepository = dbConnection.getRepository(TransactionEntity);
        this._limit = config.allowedLimit;
        this._intervalNumber = config.intervalNumber;
        this._intervalUnit = config.intervalUnit;
    }

    public async isAllowedAsync(
        context: MetaTransactionRateLimiterContext,
    ): Promise<MetaTransactionRateLimiterResponse> {
        const key = this.getKeyFromContextOrThrow(context);

        const { count } = await this._transactionRepository
            .createQueryBuilder('tx')
            .select('COUNT(*)', 'count')
            .where(`tx.${this._dbField} = :key`, { key })
            .andWhere('AGE(NOW(), tx.created_at) < :interval', {
                interval: `'${this._intervalNumber} ${this._intervalUnit}'`,
            })
            .getRawOne();

        const isAllowed = parseInt(count, 10) < this._limit;
        return isAllowed
            ? { isAllowed }
            : {
                  isAllowed,
                  reason: `limit of ${this._limit} meta transactions in the last ${this._intervalNumber} ${this._intervalUnit}`,
              };
    }
}
