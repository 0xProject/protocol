import { BigNumber } from '@0x/asset-swapper';
import { OtcOrder } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { FindOptionsWhere, In } from 'typeorm';
import { Connection } from 'typeorm/connection/Connection';

import { RfqmV2JobEntity, RfqmV2QuoteEntity, RfqmV2TransactionSubmissionEntity } from '../entities';
import { RfqmV2JobConstructorOpts, StoredOtcOrder } from '../entities/RfqmV2JobEntity';
import { RfqmV2QuoteConstructorOpts } from '../entities/RfqmV2QuoteEntity';
import { RfqmV2TransactionSubmissionEntityConstructorOpts } from '../entities/RfqmV2TransactionSubmissionEntity';
import { RfqmWorkerHeartbeatEntity } from '../entities/RfqmWorkerHeartbeatEntity';
import { RfqmJobStatus, RfqmOrderTypes, StoredFee, UnresolvedRfqmJobStatuses } from '../entities/types';

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
     * Fetches all the worker heartbeats for the provided chain ID.
     */
    public async findRfqmWorkerHeartbeatsAsync(chainId: number): Promise<RfqmWorkerHeartbeatEntity[]> {
        return this._connection.getRepository(RfqmWorkerHeartbeatEntity).find({ where: { chainId } });
    }

    /**
     * Updates an existing RFQM job
     */
    public async updateRfqmJobAsync(job: RfqmV2JobEntity): Promise<void> {
        await this._connection.getRepository(RfqmV2JobEntity).save(job);
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
            const findConditions: FindOptionsWhere<RfqmWorkerHeartbeatEntity> = {
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
    public async updateRfqmTransactionSubmissionsAsync(
        entities: RfqmV2TransactionSubmissionEntity[],
    ): Promise<RfqmV2TransactionSubmissionEntity[]> {
        if (entities.length === 0) {
            return [];
        }
        return this._connection.getRepository(RfqmV2TransactionSubmissionEntity).save(entities);
    }

    /**
     * [RFQm v2] Queries the rfqm_job table with the given orderHash
     */
    public async findV2JobByOrderHashAsync(orderHash: string): Promise<RfqmV2JobEntity | null> {
        return this._connection.getRepository(RfqmV2JobEntity).findOne({
            where: { orderHash },
        });
    }

    /**
     * [RFQm v2] Queries the rfqm_quote table with the given orderHash
     */
    public async findV2QuoteByOrderHashAsync(orderHash: string): Promise<RfqmV2QuoteEntity | null> {
        return this._connection.getRepository(RfqmV2QuoteEntity).findOne({
            where: { orderHash },
        });
    }

    /**
     * Queries the `rfqm_v2_jobs` table for all jobs with the specified statuses
     */
    public async findV2JobsWithStatusesAsync(statuses: RfqmJobStatus[]): Promise<RfqmV2JobEntity[]> {
        return this._connection.getRepository(RfqmV2JobEntity).find({
            where: {
                status: In(statuses),
            },
        });
    }

    /**
     * [RFQm v2] Queries the rfqm_v2_transaction_submission table with the given transactionHash
     */
    public async findV2TransactionSubmissionByTransactionHashAsync(
        transactionHash: string,
    ): Promise<RfqmV2TransactionSubmissionEntity | null> {
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
     * for a given worker address and chain ID.
     */
    public async findV2UnresolvedJobsAsync(workerAddress: string, chainId: number): Promise<RfqmV2JobEntity[]> {
        return this._connection.getRepository(RfqmV2JobEntity).find({
            where: {
                chainId,
                status: In(UnresolvedRfqmJobStatuses),
                workerAddress,
            },
        });
    }
}
