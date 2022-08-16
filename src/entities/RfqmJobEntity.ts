import { RfqOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { BigNumberTransformer } from './transformers';
import { RfqmJobStatus, RfqmOrderTypes, StoredFee } from './types';

export interface V4RfqStoredOrder {
    type: RfqmOrderTypes.V4Rfq;
    order: V4StringRfqOrderFields;
}

export type StoredOrder = V4RfqStoredOrder;

export type V4StringRfqOrderFields = Record<keyof RfqOrderFields, string>;

export type RfqmJobConstructorOpts = Pick<RfqmJobEntity, 'calldata' | 'chainId' | 'expiry' | 'makerUri' | 'orderHash'> &
    Partial<RfqmJobEntity>;

@Entity({ name: 'rfqm_jobs' })
export class RfqmJobEntity {
    // Differentiator for different flavors of RFQM jobs
    public kind: 'rfqm_v1_job';

    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Column({ name: 'metatransaction_hash', type: 'varchar', nullable: true, unique: true })
    public metaTransactionHash: string | null;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    // The expiration time of the job, in unix seconds
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

    @Column({ name: 'calldata', type: 'varchar' })
    public calldata: string;

    @Column({ name: 'fee', type: 'jsonb', nullable: true })
    public fee: StoredFee | null;

    @Column({ name: 'order', type: 'jsonb', nullable: true })
    public order: StoredOrder | null;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    public metadata: object | null;

    @Column({ name: 'is_completed', type: 'boolean', nullable: false, default: 'false' })
    public isCompleted: boolean;

    @Column({ name: 'worker_address', type: 'varchar', nullable: true })
    public workerAddress: string | null;

    @Column({ name: 'last_look_result', type: 'boolean', nullable: true })
    public lastLookResult: boolean | null;

    @Column({ name: 'affiliate_address', type: 'varchar', nullable: true })
    public affiliateAddress: string | null;

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqmJobConstructorOpts = {} as RfqmJobConstructorOpts) {
        this.kind = 'rfqm_v1_job';
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress || null;
        this.calldata = opts.calldata;
        this.chainId = opts.chainId;
        this.expiry = opts.expiry;
        this.fee = opts.fee || null;
        this.integratorId = opts.integratorId || null;
        this.isCompleted = opts.isCompleted || false;
        this.lastLookResult = opts.lastLookResult || null;
        this.makerUri = opts.makerUri;
        this.metadata = opts.metadata || null;
        this.metaTransactionHash = opts.metaTransactionHash || null;
        this.order = opts.order || null;
        this.orderHash = opts.orderHash;
        this.status = opts.status || RfqmJobStatus.PendingEnqueued;
        this.updatedAt = opts.updatedAt || null;
        this.workerAddress = opts.workerAddress || null;
    }
}
