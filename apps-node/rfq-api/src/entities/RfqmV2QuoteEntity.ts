import { Signature } from '@0x/protocol-utils';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { StoredFee } from '../core/types';

import { StoredOtcOrder } from './types';

export type RfqmV2QuoteConstructorOpts = Pick<
    RfqmV2QuoteEntity,
    'chainId' | 'fee' | 'makerUri' | 'orderHash' | 'order' | 'workflow'
> &
    Partial<RfqmV2QuoteEntity>;

@Entity({ name: 'rfqm_v2_quotes' })
export class RfqmV2QuoteEntity {
    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @Column({ name: 'integrator_id', type: 'varchar', nullable: true })
    public integratorId: string | null;

    @Column({ name: 'maker_uri', type: 'varchar' })
    public makerUri: string;

    @Column({ name: 'fee', type: 'jsonb' })
    public fee: StoredFee;

    @Column({ name: 'order', type: 'jsonb' })
    public order: StoredOtcOrder;

    @Column({ name: 'workflow', type: 'varchar' })
    public workflow: 'rfqm' | 'gasless-rfqt';

    // The maker's signature of the order hash
    // In `gasless-rfqt` flow, MM signature is obtained before taker signature
    @Column({ name: 'maker_signature', type: 'jsonb', nullable: true })
    public makerSignature: Signature | null;

    // Whether the maker wrapped native token will be unwrapped to the native token
    // when passed to the taker
    @Column({ name: 'is_unwrap', type: 'boolean' })
    public isUnwrap: boolean;

    @Column({ name: 'affiliate_address', type: 'varchar', nullable: true })
    public affiliateAddress: string | null;

    // When requesting a quote, taker specifies one amount (maker or taker amount)
    // and the MM populates the other field.
    // This field preserves that information.
    // This field is accepted to be null, only for backward compatibility,
    // in normal operation "taker_specified_side" is always known.
    @Column({ name: 'taker_specified_side', type: 'varchar', nullable: true })
    public takerSpecifiedSide: 'makerToken' | 'takerToken' | null;

    constructor(opts: RfqmV2QuoteConstructorOpts = {} as RfqmV2QuoteConstructorOpts) {
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress ?? null;
        this.chainId = opts.chainId;
        this.fee = opts.fee;
        this.integratorId = opts.integratorId ?? null;
        this.isUnwrap = opts.isUnwrap ?? false;
        this.makerSignature = opts.makerSignature ?? null;
        this.makerUri = opts.makerUri;
        this.order = opts.order;
        this.orderHash = opts.orderHash;
        this.takerSpecifiedSide = opts.takerSpecifiedSide ?? null;
        this.workflow = opts.workflow;
    }
}
