import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { StoredFee } from '../core/types';

import { StoredOtcOrder } from './types';

export type RfqtV2QuoteConstructorOpts = Pick<
    RfqtV2QuoteEntity,
    'chainId' | 'fee' | 'integratorId' | 'makerId' | 'makerUri' | 'orderHash' | 'order'
> &
    Partial<RfqtV2QuoteEntity>;

@Entity({ name: 'rfqt_v2_quotes' })
export class RfqtV2QuoteEntity {
    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @Column({ name: 'integrator_id', type: 'varchar' })
    public integratorId: string;

    @Column({ name: 'maker_id', type: 'varchar' })
    public makerId: string;

    @Column({ name: 'maker_uri', type: 'varchar' })
    public makerUri: string;

    @Column({ name: 'fee', type: 'jsonb' })
    public fee: StoredFee;

    @Column({ name: 'order', type: 'jsonb' })
    public order: StoredOtcOrder;

    @Column({ name: 'affiliate_address', type: 'varchar', nullable: true })
    public affiliateAddress: string | null;

    constructor(opts: RfqtV2QuoteConstructorOpts = {} as RfqtV2QuoteConstructorOpts) {
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress ?? null;
        this.chainId = opts.chainId;
        this.fee = opts.fee;
        this.integratorId = opts.integratorId;
        this.makerId = opts.makerId;
        this.makerUri = opts.makerUri;
        this.order = opts.order;
        this.orderHash = opts.orderHash;
    }
}
