import { BigNumber } from '@0x/asset-swapper';
import { RfqOrder } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { In } from 'typeorm';
import { Connection } from 'typeorm/connection/Connection';

import { RfqmJobEntity, RfqmQuoteEntity, RfqmTransactionSubmissionEntity } from '../entities';
import {
    RfqmJobConstructorOpts,
    RfqmJobStatus,
    RfqmOrderTypes,
    StoredFee,
    StoredOrder,
} from '../entities/RfqmJobEntity';
import { RfqmQuoteConstructorOpts } from '../entities/RfqmQuoteEntity';
import { RfqmWorkerHeartbeatEntity } from '../entities/RfqmWorkerHeartbeatEntity';

export type RfqmOrder = RfqOrder;

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

    public async findJobByOrderHashAsync(orderHash: string): Promise<RfqmJobEntity | undefined> {
        return this._connection.getRepository(RfqmJobEntity).findOne({
            where: { orderHash },
        });
    }

    public async findQuoteByOrderHashAsync(orderHash: string): Promise<RfqmQuoteEntity | undefined> {
        return this._connection.getRepository(RfqmQuoteEntity).findOne({
            where: { orderHash },
        });
    }

    public async findQuoteByMetaTransactionHashAsync(
        metaTransactionHash: string,
    ): Promise<RfqmQuoteEntity | undefined> {
        return this._connection.getRepository(RfqmQuoteEntity).findOne({
            where: { metaTransactionHash },
        });
    }

    public async findRfqmTransactionSubmissionByTransactionHashAsync(
        transactionHash: string,
    ): Promise<RfqmTransactionSubmissionEntity | undefined> {
        return this._connection.getRepository(RfqmTransactionSubmissionEntity).findOne({
            where: { transactionHash },
        });
    }

    public async findRfqmTransactionSubmissionsByOrderHashAsync(
        orderHash: string,
    ): Promise<RfqmTransactionSubmissionEntity[]> {
        return this._connection.getRepository(RfqmTransactionSubmissionEntity).find({
            where: { orderHash },
        });
    }

    public async findRfqmWorkerHeartbeatsAsync(): Promise<RfqmWorkerHeartbeatEntity[]> {
        return this._connection.getRepository(RfqmWorkerHeartbeatEntity).find();
    }

    /**
     * updateRfqmJobAsync allows for partial updates of an RfqmJob at the given orderHash
     */
    public async updateRfqmJobAsync(
        orderHash: string,
        isCompleted: boolean,
        rfqmJobOpts: Partial<RfqmJobEntity>,
    ): Promise<void> {
        await this._connection.getRepository(RfqmJobEntity).save({ ...rfqmJobOpts, isCompleted, orderHash });
    }

    public async writeRfqmQuoteToDbAsync(rfqmQuoteOpts: RfqmQuoteConstructorOpts): Promise<void> {
        await this._connection.getRepository(RfqmQuoteEntity).insert(new RfqmQuoteEntity(rfqmQuoteOpts));
    }

    public async writeRfqmJobToDbAsync(rfqmJobOpts: RfqmJobConstructorOpts): Promise<void> {
        await this._connection.getRepository(RfqmJobEntity).insert(new RfqmJobEntity(rfqmJobOpts));
    }

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
        const updatedEntity = await repository.preload({ address, index, balance });
        if (updatedEntity !== undefined) {
            await this._connection.getRepository(RfqmWorkerHeartbeatEntity).update(address, updatedEntity);
            return updatedEntity;
        }

        const newEntity = new RfqmWorkerHeartbeatEntity({ address, index, balance });
        await this._connection.getRepository(RfqmWorkerHeartbeatEntity).insert(newEntity);
        return newEntity;
    }

    public async updateRfqmTransactionSubmissionsAsync(
        entities: Partial<RfqmTransactionSubmissionEntity>[],
    ): Promise<RfqmTransactionSubmissionEntity[]> {
        return this._connection.getRepository(RfqmTransactionSubmissionEntity).save(entities);
    }

    public async findUnresolvedJobsAsync(workerAddress: string): Promise<RfqmJobEntity[]> {
        return this._connection
            .getRepository(RfqmJobEntity)
            .createQueryBuilder()
            .where('worker_address = :workerAddress AND is_completed = FALSE', { workerAddress })
            .getMany();
    }

    /**
     * Queries the `rfqm_jobs` table for all jobs with the specified statuses
     */
    public async findJobsWithStatusesAsync(statuses: RfqmJobStatus[]): Promise<RfqmJobEntity[]> {
        return this._connection.getRepository(RfqmJobEntity).find({
            status: In(statuses),
        });
    }
}
