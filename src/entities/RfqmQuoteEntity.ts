import { RfqOrder } from '@0x/asset-swapper';
import { Fee } from '@0x/quote-server/lib/src/types';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'rfqm_quotes' })
export class RfqmQuoteEntity {
    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash?: string;

    @Column({ name: 'metatransaction_hash', type: 'varchar', nullable: true, unique: true })
    public metaTransactionHash: string | null;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt?: Date;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId?: number;

    @Column({ name: 'integrator_id', type: 'varchar', nullable: true })
    public integratorId: string | null;

    @Column({ name: 'maker_uri', type: 'varchar' })
    public makerUri?: string;

    @Column({ name: 'fee', type: 'jsonb', nullable: true })
    public fee: Fee | null;

    @Column({ name: 'order', type: 'jsonb', nullable: true })
    public order: RfqOrder | null;

    constructor(
        opts: {
            orderHash?: string;
            metaTransactionHash?: string;
            chainId?: number;
            integratorId?: string;
            makerUri?: string;
            fee?: Fee;
            order?: RfqOrder;
        } = {},
    ) {
        this.orderHash = opts.orderHash;
        this.metaTransactionHash = opts.metaTransactionHash || null;
        this.chainId = opts.chainId;
        this.integratorId = opts.integratorId || null;
        this.makerUri = opts.makerUri;
        this.fee = opts.fee || null;
        this.order = opts.order || null;
    }
}
