import { BigNumber } from '@0x/asset-swapper';
import { OtcOrder, RfqOrder } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { FindConditions, In } from 'typeorm';
import { Connection } from 'typeorm/connection/Connection';

import {
    RfqmJobEntity,
    RfqmQuoteEntity,
    RfqmTransactionSubmissionEntity,
    RfqmV2JobEntity,
    RfqmV2QuoteEntity,
    RfqmV2TransactionSubmissionEntity,
} from '../entities';
import { RfqmJobConstructorOpts, StoredOrder } from '../entities/RfqmJobEntity';
import { RfqmQuoteConstructorOpts } from '../entities/RfqmQuoteEntity';
import { RfqmV2JobConstructorOpts, StoredOtcOrder } from '../entities/RfqmV2JobEntity';
import { RfqmV2QuoteConstructorOpts } from '../entities/RfqmV2QuoteEntity';
import { RfqmV2TransactionSubmissionEntityConstructorOpts } from '../entities/RfqmV2TransactionSubmissionEntity';
import { RfqmWorkerHeartbeatEntity } from '../entities/RfqmWorkerHeartbeatEntity';
import { RfqmJobStatus, RfqmOrderTypes, StoredFee, UnresolvedRfqmJobStatuses } from '../entities/types';

export type RfqmOrder = RfqOrder;

/**
 * Map a StoredOtcOrder to an OtcOrder
 */
export function storedOtcOrderToOtcOrder(storedOrder: StoredOtcOrder): OtcOrder {
    return new OtcOrder({
        txOrigin: storedOrder.order.txOrigin,
        maker: storedOrder.order.maker,
        taker: storedOrder.order.taker,
        makerToken: storedOrder.order.makerToken,
        takerToken: storedOrder.order.takerToken,
        makerAmount: new BigNumber(storedOrder.order.makerAmount),
        takerAmount: new BigNumber(storedOrder.order.takerAmount),
        expiryAndNonce: new BigNumber(storedOrder.order.expiryAndNonce),
        verifyingContract: storedOrder.order.verifyingContract,
        chainId: Number(storedOrder.order.chainId),
    });
}

/**
 * Map an OtcOrder to a StoredOtcOrder
 */
export function otcOrderToStoredOtcOrder(order: OtcOrder): StoredOtcOrder {
    return {
        type: RfqmOrderTypes.Otc,
        order: {
            txOrigin: order.txOrigin,
            maker: order.maker,
            taker: order.taker,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            makerAmount: order.makerAmount.toString(),
            takerAmount: order.takerAmount.toString(),
            expiryAndNonce: order.expiryAndNonce.toString(),
            verifyingContract: order.verifyingContract,
            chainId: String(order.chainId),
        },
    };
}

/**
 * convert a stored order into the appropriate order class
 */
export function storedOrderToRfqmOrder(storedOrder: StoredOrder): RfqmOrder {
    if (storedOrder.type === RfqmOrderTypes.V4Rfq) {
        return new RfqOrder({
            txOrigin: storedOrder.order.txOrigin,
            maker: storedOrder.order.maker,
            taker: storedOrder.order.taker,
            makerToken: storedOrder.order.makerToken,
            takerToken: storedOrder.order.takerToken,
            makerAmount: new BigNumber(storedOrder.order.makerAmount),
            takerAmount: new BigNumber(storedOrder.order.takerAmount),
            salt: new BigNumber(storedOrder.order.salt),
            expiry: new BigNumber(storedOrder.order.expiry),
            verifyingContract: storedOrder.order.verifyingContract,
            chainId: Number(storedOrder.order.chainId),
            pool: storedOrder.order.pool,
        });
    } else {
        throw new Error(`Unknown order type`);
    }
}

/**
 * convert a v4 RFQ order into a 'StoredOrder' format for writing to the DB
 */
export function v4RfqOrderToStoredOrder(order: RfqOrder): StoredOrder {
    return {
        type: RfqmOrderTypes.V4Rfq,
        order: {
            makerAmount: order.makerAmount.toString(),
            takerAmount: order.takerAmount.toString(),
            expiry: order.expiry.toString(),
            salt: order.salt.toString(),
            txOrigin: order.txOrigin,
            maker: order.maker,
            taker: order.taker,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            pool: order.pool,
            verifyingContract: order.verifyingContract,
            chainId: String(order.chainId),
        },
    };
}

export const storedFeeToFee = (fee: StoredFee): Fee => {
    return {
        token: fee.token,
        amount: new BigNumber(fee.amount),
        type: fee.type,
    };
};

export const feeToStoredFee = (fee: Fee): StoredFee => {
    return {
        token: fee.token,
        amount: fee.amount.toString(),
        type: fee.type,
    };
};

/**
 * RfqmDbUtils provides tools for interacting with the database
 */
export class RfqmDbUtils {
    constructor(private readonly _connection: Connection) {}

    /**
     * [RFQm v1] Queries the rfqm_job table with the given orderHash
     */
    public async findJobByOrderHashAsync(orderHash: string): Promise<RfqmJobEntity | undefined> {
        return this._connection.getRepository(RfqmJobEntity).findOne({
            where: { orderHash },
        });
    }

    /**
     * [RFQm v1] Queries the rfqm_quote table with the given orderHash
     */
    public async findQuoteByOrderHashAsync(orderHash: string): Promise<RfqmQuoteEntity | undefined> {
        return this._connection.getRepository(RfqmQuoteEntity).findOne({
            where: { orderHash },
        });
    }

    /**
     * [RFQm v1] Queries the rfqm_quote table with the given metaTransactionHash
     */
    public async findQuoteByMetaTransactionHashAsync(
        metaTransactionHash: string,
    ): Promise<RfqmQuoteEntity | undefined> {
        return this._connection.getRepository(RfqmQuoteEntity).findOne({
            where: { metaTransactionHash },
        });
    }

    /**
     * [RFQm v1] Queries the rfqm_transaction_submission table with the given transactionHash
     */
    public async findRfqmTransactionSubmissionByTransactionHashAsync(
        transactionHash: string,
    ): Promise<RfqmTransactionSubmissionEntity | undefined> {
        return this._connection.getRepository(RfqmTransactionSubmissionEntity).findOne({
            where: { transactionHash },
        });
    }

    /**
     * [RFQm v1] Queries the rfqm_transaction_submission table with the given orderHash
     */
    public async findRfqmTransactionSubmissionsByOrderHashAsync(
        orderHash: string,
    ): Promise<RfqmTransactionSubmissionEntity[]> {
        return this._connection.getRepository(RfqmTransactionSubmissionEntity).find({
            where: { orderHash },
        });
    }

    /**
     * Fetches all the worker heartbeats for the provided chain ID.
     */
    public async findRfqmWorkerHeartbeatsAsync(chainId: number): Promise<RfqmWorkerHeartbeatEntity[]> {
        return this._connection.getRepository(RfqmWorkerHeartbeatEntity).find({ where: { chainId } });
    }

    /**
     * Updates an existing RFQM job
     */
    public async updateRfqmJobAsync<T extends RfqmJobEntity | RfqmV2JobEntity>(job: T): Promise<void> {
        const kind = job.kind;
        switch (kind) {
            case 'rfqm_v1_job':
                await this._connection.getRepository(RfqmJobEntity).save(job);
                return;
            case 'rfqm_v2_job':
                await this._connection.getRepository(RfqmV2JobEntity).save(job);
                return;
            default:
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }
    }

    /**
     * [RFQm v1] writes to the rfqm_quote table
     */
    public async writeRfqmQuoteToDbAsync(rfqmQuoteOpts: RfqmQuoteConstructorOpts): Promise<void> {
        await this._connection.getRepository(RfqmQuoteEntity).insert(new RfqmQuoteEntity(rfqmQuoteOpts));
    }

    /**
     * [RFQm v1] writes to the rfqm_job table
     */
    public async writeRfqmJobToDbAsync(rfqmJobOpts: RfqmJobConstructorOpts): Promise<void> {
        await this._connection.getRepository(RfqmJobEntity).insert(new RfqmJobEntity(rfqmJobOpts));
    }

    /**
     * [RFQm v1] writes to the rfqm_transaction_submission table
     */
    public async writeRfqmTransactionSubmissionToDbAsync(
        partialRfqmTransactionSubmissionEntity: Partial<RfqmTransactionSubmissionEntity>,
    ): Promise<RfqmTransactionSubmissionEntity> {
        const entity = new RfqmTransactionSubmissionEntity(partialRfqmTransactionSubmissionEntity);
        await this._connection.getRepository(RfqmTransactionSubmissionEntity).insert(entity);

        return entity;
    }

    public async upsertRfqmWorkerHeartbeatToDbAsync(
        address: string,
        index: number,
        balance: BigNumber,
        chainId: number,
    ): Promise<RfqmWorkerHeartbeatEntity> {
        if (!Number.isInteger(index)) {
            throw new Error(`Index ${index} is not an integer`);
        }
        const repository = this._connection.getRepository(RfqmWorkerHeartbeatEntity);

        // Why I did not use `.save`:
        // The `rfqm_worker_heartbeat` table has a trigger to automatically update the timestamp on UPDATE
        // but the `.save` functionality is smart enough to not actually execute the update if none of the
        // data has changed. Since this only happens when a worker balance changes, the timestamp won't
        // update unless `.update` is explicitly called.
        const updatedEntity = await repository.preload({ address, index, balance, chainId });
        if (updatedEntity !== undefined) {
            const findConditions: FindConditions<RfqmWorkerHeartbeatEntity> = {
                address,
                chainId,
            };
            await this._connection.getRepository(RfqmWorkerHeartbeatEntity).update(findConditions, updatedEntity);
            return updatedEntity;
        }

        const newEntity = new RfqmWorkerHeartbeatEntity({ address, index, balance, chainId });
        await this._connection.getRepository(RfqmWorkerHeartbeatEntity).insert(newEntity);
        return newEntity;
    }

    /**
     * Updates transactions in the `rfqm_transaction_submission` or
     * the `rfqm_v2_transaction_submission` tables as appropriate
     */
    public async updateRfqmTransactionSubmissionsAsync<
        T extends RfqmTransactionSubmissionEntity[] | RfqmV2TransactionSubmissionEntity[],
    >(entities: T): Promise<(T[number] & Partial<T[number]>)[]> {
        if (entities.length === 0) {
            return [];
        }
        const kind = entities[0].kind;
        switch (kind) {
            case 'rfqm_v1_transaction_submission':
                return this._connection
                    .getRepository(RfqmTransactionSubmissionEntity)
                    .save(entities as Partial<RfqmTransactionSubmissionEntity>[]);
            case 'rfqm_v2_transaction_submission':
                return this._connection
                    .getRepository(RfqmV2TransactionSubmissionEntity)
                    .save(entities as Partial<RfqmV2TransactionSubmissionEntity>[]);
            default:
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }
    }

    /**
     * [RFQm v1] find unresolved jobs from the rfqm_jobs table
     */
    public async findUnresolvedJobsAsync(workerAddress: string): Promise<RfqmJobEntity[]> {
        return this._connection.getRepository(RfqmJobEntity).find({
            workerAddress,
            status: In(UnresolvedRfqmJobStatuses),
        });
    }

    /**
     * Queries the `rfqm_jobs` table for all jobs with the specified statuses
     */
    public async findJobsWithStatusesAsync(statuses: RfqmJobStatus[]): Promise<RfqmJobEntity[]> {
        return this._connection.getRepository(RfqmJobEntity).find({
            status: In(statuses),
        });
    }

    // ------------------------ RFQm v2 ------------------------ //

    /**
     * [RFQm v2] Queries the rfqm_job table with the given orderHash
     */
    public async findV2JobByOrderHashAsync(orderHash: string): Promise<RfqmV2JobEntity | undefined> {
        return this._connection.getRepository(RfqmV2JobEntity).findOne({
            where: { orderHash },
        });
    }

    /**
     * [RFQm v2] Queries the rfqm_quote table with the given orderHash
     */
    public async findV2QuoteByOrderHashAsync(orderHash: string): Promise<RfqmV2QuoteEntity | undefined> {
        return this._connection.getRepository(RfqmV2QuoteEntity).findOne({
            where: { orderHash },
        });
    }

    /**
     * Queries the `rfqm_v2_jobs` table for all jobs with the specified statuses
     */
    public async findV2JobsWithStatusesAsync(statuses: RfqmJobStatus[]): Promise<RfqmV2JobEntity[]> {
        return this._connection.getRepository(RfqmV2JobEntity).find({
            status: In(statuses),
        });
    }

    /**
     * [RFQm v2] Queries the rfqm_v2_transaction_submission table with the given transactionHash
     */
    public async findV2TransactionSubmissionByTransactionHashAsync(
        transactionHash: string,
    ): Promise<RfqmV2TransactionSubmissionEntity | undefined> {
        return this._connection.getRepository(RfqmV2TransactionSubmissionEntity).findOne({
            where: { transactionHash },
        });
    }

    /**
     * [RFQm v2] Queries the rfqm_v2_transaction_submission table with the given orderHash
     */
    public async findV2TransactionSubmissionsByOrderHashAsync(
        orderHash: string,
    ): Promise<RfqmV2TransactionSubmissionEntity[]> {
        return this._connection.getRepository(RfqmV2TransactionSubmissionEntity).find({
            where: { orderHash },
        });
    }

    /**
     * [RFQm v2] Updates an RfqmV2Job at the given orderHash
     */
    public async updateV2JobAsync(
        orderHash: string,
        isCompleted: boolean,
        rfqmJobOpts: Partial<RfqmV2JobEntity>,
    ): Promise<void> {
        await this._connection.getRepository(RfqmV2JobEntity).save({ ...rfqmJobOpts, isCompleted, orderHash });
    }

    /**
     * [RFQm v2] writes to the rfqm_v2_transaction_submission table
     */
    public async writeV2RfqmTransactionSubmissionToDbAsync(
        partialV2RfqmTransactionSubmissionEntity: RfqmV2TransactionSubmissionEntityConstructorOpts,
    ): Promise<RfqmV2TransactionSubmissionEntity> {
        const entity = new RfqmV2TransactionSubmissionEntity(partialV2RfqmTransactionSubmissionEntity);
        await this._connection.getRepository(RfqmV2TransactionSubmissionEntity).insert(entity);

        return entity;
    }

    /**
     * [RFQm v2] bulk update to the rfqm_v2_transaction_submission table
     */
    public async updateV2TransactionSubmissionsAsync(
        entities: Partial<RfqmV2TransactionSubmissionEntity>[],
    ): Promise<RfqmV2TransactionSubmissionEntity[]> {
        return this._connection.getRepository(RfqmV2TransactionSubmissionEntity).save(entities);
    }

    /**
     * [RFQm v2] writes to the rfqm_v2_quote table
     */
    public async writeV2QuoteAsync(rfqmV2QuoteOpts: RfqmV2QuoteConstructorOpts): Promise<void> {
        await this._connection.getRepository(RfqmV2QuoteEntity).insert(new RfqmV2QuoteEntity(rfqmV2QuoteOpts));
    }

    /**
     * [RFQm v2] writes to the rfqm_v2_job table
     */
    public async writeV2JobAsync(rfqmV2JobOpts: RfqmV2JobConstructorOpts): Promise<void> {
        await this._connection.getRepository(RfqmV2JobEntity).insert(new RfqmV2JobEntity(rfqmV2JobOpts));
    }

    /**
     * [RFQm v2] writes to the rfqm_v2_transaction_submission table
     */
    public async writeV2TransactionSubmissionAsync(
        constructorOpts: RfqmV2TransactionSubmissionEntityConstructorOpts,
    ): Promise<RfqmV2TransactionSubmissionEntity> {
        const entity = new RfqmV2TransactionSubmissionEntity(constructorOpts);
        await this._connection.getRepository(RfqmV2TransactionSubmissionEntity).insert(entity);

        return entity;
    }

    /**
     * [RFQm v2] find unresolved jobs from the rfqm_v2_jobs table
     */
    public async findV2UnresolvedJobsAsync(workerAddress: string): Promise<RfqmV2JobEntity[]> {
        return this._connection.getRepository(RfqmV2JobEntity).find({
            workerAddress,
            status: In(UnresolvedRfqmJobStatuses),
        });
    }
}
