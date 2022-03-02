import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type RfqMakerOpts = Pick<RfqMaker, 'makerId' | 'chainId' | 'pairs' | 'rfqtUri' | 'rfqmUri'> & Partial<RfqMaker>;

/**
 * A representation of the pairs a market maker is active on for a given chain ID
 */
@Entity({ name: 'rfq_maker_pairs' })
export class RfqMaker {
    @PrimaryColumn({ name: 'maker_id', type: 'varchar' })
    public makerId: string;

    @PrimaryColumn({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    @Column({ name: 'pairs', type: 'jsonb' })
    public pairs: [string, string][];

    @Column({ name: 'rfqt_uri', type: 'varchar' })
    public rfqtUri: string | null;

    @Column({ name: 'rfqm_uri', type: 'varchar' })
    public rfqmUri: string | null;

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqMakerOpts = {} as RfqMakerOpts) {
        this.makerId = opts.makerId;
        this.chainId = opts.chainId;
        this.pairs = opts.pairs;
        this.rfqtUri = opts.rfqtUri;
        this.rfqmUri = opts.rfqmUri;
        this.updatedAt = opts.updatedAt ?? null;
    }
}
