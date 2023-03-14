import { MetaTransactionV2, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { Approval } from '../core/types';

import { BigNumberTransformer, MetaTransactionV2Transformer } from './transformers';
import { RfqmJobStatus } from './types';

export type MetaTransactionV2JobConstructorOpts = Pick<
    MetaTransactionV2JobEntity,
    | 'calledFunction'
    | 'chainId'
    | 'expiry'
    | 'inputToken'
    | 'inputTokenAmount'
    | 'integratorId'
    | 'metaTransaction'
    | 'metaTransactionHash'
    | 'minOutputTokenAmount'
    | 'outputToken'
    | 'takerAddress'
    | 'takerSignature'
    | 'tokens'
> &
    Partial<MetaTransactionV2JobEntity>;

@Entity({ name: 'meta_transaction_v2_jobs' })
export class MetaTransactionV2JobEntity {
    // Differentiator for different flavors of meta-transaaction jobs
    public kind: 'meta_transaction_v2_job';

    // UUID would be generated automatically during insertion
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

    @Column({ name: 'meta_transaction', type: 'jsonb', transformer: MetaTransactionV2Transformer })
    public metaTransaction: MetaTransactionV2;

    // Function wrapped by the meta-transaction, e.g. transformERC20, multiplexBatchSellTokenForToken and more. This column
    // is included for human readability when querying the table. The column can be decoded from `callData` field from
    // meta-transaction
    @Column({ name: 'called_function', type: 'varchar' })
    public calledFunction: string;

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

    @Index()
    @Column({ name: 'input_token', type: 'varchar' })
    public inputToken: string;

    @Column({ name: 'output_token', type: 'varchar' })
    public outputToken: string;

    // simple-array type can store primitive array values in a single string column delimited by comma.
    // Read more about simple-array type here: https://orkhan.gitbook.io/typeorm/docs/entities#simple-array-column-type
    @Column({ name: 'tokens', type: 'varchar', array: true })
    public tokens: string[];

    @Column({ name: 'input_token_amount', type: 'numeric', transformer: BigNumberTransformer })
    public inputTokenAmount: BigNumber;

    @Column({ name: 'min_output_token_amount', type: 'numeric', transformer: BigNumberTransformer })
    public minOutputTokenAmount: BigNumber;

    /**
     * Silimilar to `MetaTransactionJobEntity`, used to get the 'canonical' hash of the job.
     * This is useful in `RfqmService.getStatusAsync` in which hash could be obtained from each job
     * instance.
     */
    public getHash(): string {
        return this.metaTransactionHash;
    }

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: MetaTransactionV2JobConstructorOpts = {} as MetaTransactionV2JobConstructorOpts) {
        this.kind = 'meta_transaction_v2_job';

        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress ?? null;
        this.approval = opts.approval ?? null;
        this.approvalSignature = opts.approvalSignature ?? null;
        this.chainId = opts.chainId;
        this.expiry = opts.expiry;
        this.inputToken = opts.inputToken;
        this.inputTokenAmount = opts.inputTokenAmount;
        this.integratorId = opts.integratorId;
        this.calledFunction = opts.calledFunction;
        this.metaTransaction = opts.metaTransaction;
        this.metaTransactionHash = opts.metaTransactionHash;
        this.minOutputTokenAmount = opts.minOutputTokenAmount;
        this.outputToken = opts.outputToken;
        this.status = opts.status ?? RfqmJobStatus.PendingEnqueued;
        this.takerAddress = opts.takerAddress;
        this.takerSignature = opts.takerSignature;
        this.tokens = opts.tokens;
        this.updatedAt = opts.updatedAt ?? null;
        this.workerAddress = opts.workerAddress ?? null;
    }
}
