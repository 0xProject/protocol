import { Connection, Repository } from 'typeorm';

import { TransactionEntity } from '../../entities';
import { MetaTransactionRateLimiterResponse, MetaTransactionRollingValueLimiterConfig } from '../../types';

import { MetaTransactionBaseDbRateLimiter } from './base_db_limiter';
import { DatabaseKeysUsedForRateLimiter, MetaTransactionRateLimiterContext } from './types';

export class MetaTransactionRollingValueLimiter extends MetaTransactionBaseDbRateLimiter {
    private readonly _transactionRepository: Repository<TransactionEntity>;
    private readonly _ethLimit: number;
    private readonly _intervalNumber: number;
    private readonly _intervalUnit: string;

    constructor(
        field: DatabaseKeysUsedForRateLimiter,
        dbConnection: Connection,
        config: MetaTransactionRollingValueLimiterConfig,
    ) {
        super(field);
        this._transactionRepository = dbConnection.getRepository(TransactionEntity);
        this._ethLimit = config.allowedLimitEth;
        this._intervalNumber = config.intervalNumber;
        this._intervalUnit = config.intervalUnit;
    }

    public async isAllowedAsync(
        context: MetaTransactionRateLimiterContext,
    ): Promise<MetaTransactionRateLimiterResponse> {
        const key = this.getKeyFromContextOrThrow(context);

        const { sum } = await this._transactionRepository
            .createQueryBuilder('tx')
            .select('SUM((tx.gas_price * tx.gas_used + tx.value) * 1e-18)', 'sum')
            .where(`tx.${this._dbField} = :key`, { key })
            .andWhere('AGE(NOW(), tx.created_at) < :interval', {
                interval: `'${this._intervalNumber} ${this._intervalUnit}'`,
            })
            .getRawOne();

        const isAllowed = parseFloat(sum) < this._ethLimit;
        return isAllowed
            ? { isAllowed }
            : {
                  isAllowed,
                  reason: `limit of ${this._ethLimit} ETH spent in the last ${this._intervalNumber} ${this._intervalUnit}`,
              };
    }
}
