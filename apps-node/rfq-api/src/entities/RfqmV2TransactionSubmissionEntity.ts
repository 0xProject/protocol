import { BigNumber } from '@0x/utils';
import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { BigIntTransformer, BigNumberTransformer } from './transformers';
import { RfqmTransactionSubmissionStatus, RfqmTransactionSubmissionType } from './types';

export type RfqmV2TransactionSubmissionEntityConstructorOpts = Pick<
    RfqmV2TransactionSubmissionEntity,
    'from' | 'nonce' | 'orderHash' | 'to' | 'transactionHash' | 'type'
> &
    Partial<RfqmV2TransactionSubmissionEntity>;

@Entity({ name: 'rfqm_v2_transaction_submissions' })
export class RfqmV2TransactionSubmissionEntity {
    public kind: 'rfqm_v2_transaction_submission';

    @PrimaryColumn({ name: 'transaction_hash', type: 'varchar' })
    public transactionHash: string;

    // specified as a foreign key to rfqm jobs in migration, but not in the typeorm
    // definition to preserve its being read as a string
    @Index()
    @Column({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    @Column({ name: 'from', type: 'varchar' })
    public from: string;

    @Column({ name: 'to', type: 'varchar' })
    public to: string;

    @Column({ name: 'nonce', type: 'bigint', transformer: BigIntTransformer })
    public nonce: number;

    // The gas price in wei. Set at transaction submission time in non-EIP1559 transactions. In EIP1559 transactions, this is set once we have the transaction receipt.
    @Column({ name: 'gas_price', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public gasPrice: BigNumber | null;

    // Max fee per gas in wei. Present in type 2 "EIP1559" transactions.
    @Column({ name: 'max_fee_per_gas', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public maxFeePerGas: BigNumber | null;

    // Max priority fee per gas in wei. Present in type 2 "EIP1559" transactions.
    @Column({ name: 'max_priority_fee_per_gas', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public maxPriorityFeePerGas: BigNumber | null;

    @Column({ name: 'gas_used', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public gasUsed: BigNumber | null;

    @Column({ name: 'block_mined', type: 'numeric', nullable: true, transformer: BigNumberTransformer })
    public blockMined: BigNumber | null;

    @Index()
    @Column({ name: 'status', type: 'varchar' })
    public status: RfqmTransactionSubmissionStatus;

    @Column({ name: 'type', type: 'varchar' })
    public type: RfqmTransactionSubmissionType;

    constructor(
        opts: RfqmV2TransactionSubmissionEntityConstructorOpts = {} as RfqmV2TransactionSubmissionEntityConstructorOpts,
    ) {
        this.kind = 'rfqm_v2_transaction_submission';

        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.blockMined = opts.blockMined ?? null;
        this.from = opts.from;
        this.gasPrice = opts.gasPrice ?? null;
        this.gasUsed = opts.gasUsed ?? null;
        this.maxFeePerGas = opts.maxFeePerGas ?? null;
        this.maxPriorityFeePerGas = opts.maxPriorityFeePerGas ?? null;
        this.nonce = opts.nonce;
        this.orderHash = opts.orderHash;
        this.status = opts.status ?? RfqmTransactionSubmissionStatus.Submitted;
        this.to = opts.to;
        this.transactionHash = opts.transactionHash;
        this.type = opts.type;
        this.updatedAt = opts.updatedAt ?? null;
    }
}