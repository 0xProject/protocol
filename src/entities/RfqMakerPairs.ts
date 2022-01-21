import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type RfqMakerPairsOpts = Pick<RfqMakerPairs, 'makerId' | 'chainId' | 'pairs'> & Partial<RfqMakerPairs>;

/**
 * A representation of the pairs a market maker is active on for a given chain ID
 */
@Entity({ name: 'rfq_maker_pairs' })
export class RfqMakerPairs {
    @PrimaryColumn({ name: 'maker_id', type: 'varchar' })
    public makerId: string;

    @PrimaryColumn({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    @Column({ name: 'pairs', type: 'jsonb' })
    public pairs: [string, string][];

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqMakerPairsOpts = {} as RfqMakerPairsOpts) {
        this.makerId = opts.makerId;
        this.chainId = opts.chainId;
        this.pairs = opts.pairs;
        this.updatedAt = opts.updatedAt ?? null;
    }
}
