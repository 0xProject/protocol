import { BigNumber } from '@0x/asset-swapper';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { BigIntTransformer, BigNumberTransformer } from './transformers';

export enum RfqmTransactionSubmissionStatus {
    DroppedAndReplaced = 'dropped_and_replaced',
    Presubmit = 'presubmit', // Transaction created but not yet broadcast
    RevertedConfirmed = 'reverted_confirmed',
    RevertedUnconfirmed = 'reverted_unconfirmed',
    Submitted = 'submitted',
    SucceededConfirmed = 'succeeded_confirmed',
    SucceededUnconfirmed = 'succeeded_unconfirmed',
}

@Entity({ name: 'rfqm_transaction_submissions' })
export class RfqmTransactionSubmissionEntity {
    @PrimaryColumn({ name: 'transaction_hash', type: 'varchar' })
    public transactionHash?: string;

    // specified as a foreign key to rfqm jobs in migration, but not in the typeorm
    // definition to preserve it's being read as a string
    @Column({ name: 'order_hash', type: 'varchar' })
    public orderHash?: string;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    @Column({ name: 'from', type: 'varchar', nullable: true })
    public from: string | null;

    @Column({ name: 'to', type: 'varchar', nullable: true })
    public to: string | null;

    @Column({ name: 'nonce', type: 'bigint', nullable: true, transformer: BigIntTransformer })
    public nonce: number | null;

    @Column({ name: 'gas_price', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public gasPrice: BigNumber | null;

    @Column({ name: 'gas_used', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public gasUsed: BigNumber | null;

    @Column({ name: 'block_mined', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public blockMined: BigNumber | null;

    @Index()
    @Column({ name: 'status', type: 'varchar' })
    public status: RfqmTransactionSubmissionStatus;

    @Column({ name: 'status_reason', type: 'varchar', nullable: true })
    public statusReason: string | null;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    public metadata: object | null;

    constructor(opts: Partial<RfqmTransactionSubmissionEntity> = {}) {
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.blockMined = opts.blockMined || null;
        this.from = opts.from || null;
        this.gasPrice = opts.gasPrice || null;
        this.gasUsed = opts.gasUsed || null;
        this.metadata = opts.metadata || null;
        this.nonce = opts.nonce !== undefined ? opts.nonce : null;
        this.orderHash = opts.orderHash;
        this.status = opts.status || RfqmTransactionSubmissionStatus.Submitted;
        this.statusReason = opts.statusReason || null;
        this.to = opts.to || null;
        this.transactionHash = opts.transactionHash;
        this.updatedAt = opts.updatedAt || null;
    }
}
