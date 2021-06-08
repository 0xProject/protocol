import { BigNumber } from '@0x/asset-swapper';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { RfqmJobStatus, StoredFee, StoredOrder } from '../utils/rfqm_db_utils';

import { BigNumberTransformer } from './transformers';

@Entity({ name: 'rfqm_jobs' })
export class RfqmJobEntity {
    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash?: string;

    @Column({ name: 'metatransaction_hash', type: 'varchar', nullable: true, unique: true })
    public metaTransactionHash: string | null;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    @Column({ name: 'expiry', type: 'numeric', transformer: BigNumberTransformer })
    public expiry?: BigNumber;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId?: number;

    @Column({ name: 'integrator_id', type: 'varchar', nullable: true })
    public integratorId: string | null;

    @Column({ name: 'maker_uri', type: 'varchar' })
    public makerUri?: string;

    @Index()
    @Column({ name: 'status', type: 'varchar' })
    public status?: RfqmJobStatus;

    @Column({ name: 'status_reason', type: 'varchar', nullable: true })
    public statusReason: string | null;

    @Column({ name: 'calldata', type: 'varchar' })
    public calldata?: string;

    @Column({ name: 'fee', type: 'jsonb', nullable: true })
    public fee: StoredFee | null;

    @Column({ name: 'order', type: 'jsonb', nullable: true })
    public order: StoredOrder | null;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    public metadata: object | null;

    constructor(opts: Partial<RfqmJobEntity> = {}) {
        this.orderHash = opts.orderHash;
        this.metaTransactionHash = opts.metaTransactionHash || null;
        this.createdAt = opts.createdAt || new Date();
        this.updatedAt = opts.updatedAt || null;
        this.expiry = opts.expiry;
        this.chainId = opts.chainId;
        this.integratorId = opts.integratorId || null;
        this.makerUri = opts.makerUri;
        this.status = opts.status;
        this.statusReason = opts.statusReason || null;
        this.calldata = opts.calldata;
        this.fee = opts.fee || null;
        this.order = opts.order || null;
        this.metadata = opts.metadata || null;
    }
}
