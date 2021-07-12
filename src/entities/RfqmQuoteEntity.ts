import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { StoredFee, StoredOrder } from './RfqmJobEntity';

export type RfqmQuoteConstructorOpts = Pick<RfqmQuoteEntity, 'chainId' | 'makerUri' | 'orderHash'> &
    Partial<RfqmQuoteEntity>;

@Entity({ name: 'rfqm_quotes' })
export class RfqmQuoteEntity {
    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Column({ name: 'metatransaction_hash', type: 'varchar', nullable: true, unique: true })
    public metaTransactionHash: string | null;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @Column({ name: 'integrator_id', type: 'varchar', nullable: true })
    public integratorId: string | null;

    @Column({ name: 'maker_uri', type: 'varchar' })
    public makerUri: string;

    @Column({ name: 'fee', type: 'jsonb', nullable: true })
    public fee: StoredFee | null;

    @Column({ name: 'order', type: 'jsonb', nullable: true })
    public order: StoredOrder | null;

    @Column({ name: 'affiliate_address', type: 'varchar', nullable: true })
    public affiliateAddress: string | null;

    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqmQuoteConstructorOpts = {} as RfqmQuoteConstructorOpts) {
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress || null;
        this.chainId = opts.chainId;
        this.fee = opts.fee || null;
        this.integratorId = opts.integratorId || null;
        this.makerUri = opts.makerUri;
        this.metaTransactionHash = opts.metaTransactionHash || null;
        this.order = opts.order || null;
        this.orderHash = opts.orderHash;
    }
}
