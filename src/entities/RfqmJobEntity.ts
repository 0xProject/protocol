import { BigNumber } from '@0x/asset-swapper';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { BigNumberTransformer } from './transformers';

export interface StoredFee {
    token: string;
    amount: string;
    type: 'fixed' | 'bps';
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

export interface V4RfqStoredOrder {
    type: RfqmOrderTypes.V4Rfq;
    order: V4StringRfqOrderFields;
}

export interface V4RfqStoredOrder {
    type: RfqmOrderTypes.V4Rfq;
    order: V4StringRfqOrderFields;
}

export type StoredOrder = V4RfqStoredOrder;

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

export type RfqmJobConstructorOpts = Pick<RfqmJobEntity, 'calldata' | 'chainId' | 'expiry' | 'makerUri' | 'orderHash'> &
    Partial<RfqmJobEntity>;

@Entity({ name: 'rfqm_jobs' })
export class RfqmJobEntity {
    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Column({ name: 'metatransaction_hash', type: 'varchar', nullable: true, unique: true })
    public metaTransactionHash: string | null;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    @Column({ name: 'expiry', type: 'numeric', transformer: BigNumberTransformer })
    public expiry: BigNumber;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @Column({ name: 'integrator_id', type: 'varchar', nullable: true })
    public integratorId: string | null;

    @Column({ name: 'maker_uri', type: 'varchar' })
    public makerUri: string;

    @Index()
    @Column({ name: 'status', type: 'varchar' })
    public status: RfqmJobStatus;

    @Column({ name: 'status_reason', type: 'varchar', nullable: true })
    public statusReason: string | null;

    @Column({ name: 'calldata', type: 'varchar' })
    public calldata: string;

    @Column({ name: 'fee', type: 'jsonb', nullable: true })
    public fee: StoredFee | null;

    @Column({ name: 'order', type: 'jsonb', nullable: true })
    public order: StoredOrder | null;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    public metadata: object | null;

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqmJobConstructorOpts = {} as RfqmJobConstructorOpts) {
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.calldata = opts.calldata;
        this.chainId = opts.chainId;
        this.expiry = opts.expiry;
        this.fee = opts.fee || null;
        this.integratorId = opts.integratorId || null;
        this.makerUri = opts.makerUri;
        this.metadata = opts.metadata || null;
        this.metaTransactionHash = opts.metaTransactionHash || null;
        this.order = opts.order || null;
        this.orderHash = opts.orderHash;
        this.status = opts.status || RfqmJobStatus.InQueue;
        this.statusReason = opts.statusReason || null;
        this.updatedAt = opts.updatedAt || null;
    }
}
