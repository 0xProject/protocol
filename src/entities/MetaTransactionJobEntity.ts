import { MetaTransaction, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Fee } from '../quote-server/types';

import { Approval } from '../types';

import { BigNumberTransformer, FeeTransformer, MetaTransactionTransformer } from './transformers';
import { RfqmJobStatus } from './types';

export type MetaTransactionJobConstructorOpts = Pick<
    MetaTransactionJobEntity,
    | 'chainId'
    | 'expiry'
    | 'fee'
    | 'inputToken'
    | 'inputTokenAmount'
    | 'integratorId'
    | 'metaTransaction'
    | 'metaTransactionHash'
    | 'minOutputTokenAmount'
    | 'outputToken'
    | 'takerAddress'
    | 'takerSignature'
> &
    Partial<MetaTransactionJobEntity>;

@Entity({ name: 'meta_transaction_jobs' })
export class MetaTransactionJobEntity {
    // Differentiator for different flavors of RFQM jobs
    public kind: 'meta_transaction_job';

    // UUID and would be generated automatically during insertion
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Index()
    @Column({ name: 'meta_transaction_hash', type: 'varchar', unique: true })
    public metaTransactionHash: string;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    // The expiration time of the job, in unix seconds
    @Column({ name: 'expiry', type: 'numeric', transformer: BigNumberTransformer })
    public expiry: BigNumber;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @Column({ name: 'integrator_id', type: 'varchar' })
    public integratorId: string;

    @Index()
    @Column({ name: 'status', type: 'varchar' })
    public status: RfqmJobStatus;

    @Column({ name: 'fee', type: 'jsonb', transformer: FeeTransformer })
    public fee: Fee;

    @Column({ name: 'meta_transaction', type: 'jsonb', transformer: MetaTransactionTransformer })
    public metaTransaction: MetaTransaction;

    @Index()
    @Column({ name: 'worker_address', type: 'varchar', nullable: true })
    public workerAddress: string | null;

    @Column({ name: 'affiliate_address', type: 'varchar', nullable: true })
    public affiliateAddress: string | null;

    @Index()
    @Column({ name: 'taker_address', type: 'varchar' })
    public takerAddress: string;

    // The taker's signature of the metaTransaction hash.
    @Column({ name: 'taker_signature', type: 'jsonb' })
    public takerSignature: Signature;

    // The optional approval object that contains the EIP-712 context (which includes
    // the message that the taker will sign). This is stored to help us prepare the
    // calldata for gasless approvals
    @Column({ name: 'approval', type: 'jsonb', nullable: true })
    public approval: Approval | null;

    // The signature for the approval.
    @Column({ name: 'approval_signature', type: 'jsonb', nullable: true })
    public approvalSignature: Signature | null;

    @Column({ name: 'input_token', type: 'varchar' })
    public inputToken: string;

    @Column({ name: 'output_token', type: 'varchar' })
    public outputToken: string;

    @Column({ name: 'input_token_amount', type: 'numeric', transformer: BigNumberTransformer })
    public inputTokenAmount: BigNumber;

    @Column({ name: 'min_output_token_amount', type: 'numeric', transformer: BigNumberTransformer })
    public minOutputTokenAmount: BigNumber;

    @Column({ name: 'settled_output_token_amount', type: 'numeric', transformer: BigNumberTransformer, nullable: true })
    public settledOutputTokenAmount: BigNumber | null;

    /**
     * Used to get the 'canonical' hash of the job. This is useful
     * because it can also be called on an rfqm job and
     * that will return the order hash.
     */
    public getHash(): string {
        return this.metaTransactionHash;
    }

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: MetaTransactionJobConstructorOpts = {} as MetaTransactionJobConstructorOpts) {
        this.kind = 'meta_transaction_job';

        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress ?? null;
        this.approval = opts.approval ?? null;
        this.approvalSignature = opts.approvalSignature ?? null;
        this.chainId = opts.chainId;
        this.expiry = opts.expiry;
        this.fee = opts.fee;
        this.inputToken = opts.inputToken;
        this.inputTokenAmount = opts.inputTokenAmount;
        this.integratorId = opts.integratorId;
        this.metaTransaction = opts.metaTransaction;
        this.metaTransactionHash = opts.metaTransactionHash;
        this.minOutputTokenAmount = opts.minOutputTokenAmount;
        this.outputToken = opts.outputToken;
        this.settledOutputTokenAmount = opts.settledOutputTokenAmount ?? null;
        this.status = opts.status ?? RfqmJobStatus.PendingEnqueued;
        this.takerAddress = opts.takerAddress;
        this.takerSignature = opts.takerSignature;
        this.updatedAt = opts.updatedAt ?? null;
        this.workerAddress = opts.workerAddress ?? null;
    }
}
