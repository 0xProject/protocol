import { BigNumber } from '@0x/asset-swapper';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { RfqmTranasctionSubmissionStatus } from '../utils/rfqm_db_utils';

import { BigIntTransformer, BigNumberTransformer } from './transformers';

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
    public createdAt?: Date;

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
    public status?: RfqmTranasctionSubmissionStatus;

    @Column({ name: 'status_reason', type: 'varchar', nullable: true })
    public statusReason: string | null;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    public metadata: object | null;

    constructor(partialEntity: Partial<RfqmTransactionSubmissionEntity> = {}) {
        this.transactionHash = partialEntity.transactionHash;
        this.orderHash = partialEntity.orderHash;
        this.createdAt = partialEntity.createdAt;
        this.updatedAt = partialEntity.updatedAt || null;
        this.from = partialEntity.from || null;
        this.to = partialEntity.to || null;
        this.gasPrice = partialEntity.gasPrice || null;
        this.gasUsed = partialEntity.gasUsed || null;
        this.blockMined = partialEntity.blockMined || null;
        this.nonce = partialEntity.nonce || null;
        this.status = partialEntity.status;
        this.statusReason = partialEntity.statusReason || null;
        this.metadata = partialEntity.metadata || null;
    }
}
