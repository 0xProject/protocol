import { BigNumber } from '@0x/asset-swapper';
import { RfqOrder } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { Connection } from 'typeorm/connection/Connection';

import { RfqmJobEntity, RfqmQuoteEntity } from '../entities';

export interface RfqmJobOpts {
    orderHash?: string;
    metaTransactionHash?: string;
    createdAt?: Date;
    updatedAt?: Date;
    expiry?: BigNumber;
    chainId?: number;
    integratorId?: string | null;
    makerUri?: string;
    status?: RfqmJobStatus;
    statusReason?: string | null;
    calldata?: string;
    fee?: StoredFee | null;
    order?: StoredOrder | null;
    metadata?: object;
}

export enum RfqmJobStatus {
    InQueue = 'inQueue',
    Processing = 'processing',
    Submitted = 'submitted',
    Successful = 'successful',
    Failed = 'failed',
}

export enum RfqmOrderTypes {
    V4Rfq = 'v4Rfq',
}

export interface V4StringRfqOrderFields {
    txOrigin: string;
    maker: string;
    taker: string;
    makerToken: string;
    takerToken: string;
    makerAmount: string;
    takerAmount: string;
    pool: string;
    expiry: string;
    salt: string;
    chainId: string;
    verifyingContract: string;
}

export interface V4RfqStoredOrder {
    type: RfqmOrderTypes.V4Rfq;
    order: V4StringRfqOrderFields;
}

export type RfqmOrder = RfqOrder;
export type StoredOrder = V4RfqStoredOrder;

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
            expiry: new BigNumber(storedOrder.order.takerAmount),
            verifyingContract: storedOrder.order.verifyingContract,
            chainId: Number(storedOrder.order.chainId),
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

export interface StoredFee {
    token: string;
    amount: string;
    type: 'fixed' | 'bps';
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

    /**
     * updateRfqmJobAsync allows for partial updates of an RfqmJob at the given orderHash
     */
    public async updateRfqmJobAsync(orderHash: string, rfqmJobOpts: RfqmJobOpts): Promise<void> {
        await this._connection.getRepository(RfqmJobEntity).save({ ...rfqmJobOpts, orderHash });
    }

    public async writeRfqmJobToDbAsync(rfqmJobOpts: RfqmJobOpts): Promise<void> {
        await this._connection.getRepository(RfqmJobEntity).insert(new RfqmJobEntity(rfqmJobOpts));
    }
}
