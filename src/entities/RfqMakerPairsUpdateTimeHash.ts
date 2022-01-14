import { ViewColumn, ViewEntity } from 'typeorm';

export type RfqMakerPairsUpdateTimeHashOpts = Pick<RfqMakerPairsUpdateTimeHash, 'hash' | 'chainId'> &
    Partial<RfqMakerPairsUpdateTimeHash>;

/**
 * A materialized view for a hash of all makers' last update time for each chain.
 * The materialized view will be updated immidiately after table `rfq_maker_pairs` is updated.
 * The hashes (one per chain) are used by PairsManger to determine whether a refresh is needed.
 * The expression of ViewEntity is duplicated with the corresponding mirgation file, and is only used when
 * `synchronize` is set to `true` which is the case when running some test cases.
 */
@ViewEntity({
    name: 'rfq_maker_pairs_update_time_hashes',
    expression: `
        SELECT
            encode(
                digest(
                    array_agg(
                        updated_at ORDER BY updated_at NULLS FIRST
                    )::text,
                'sha256'),
            'hex') AS hash,
            chain_id
        FROM rfq_maker_pairs
        GROUP BY chain_id
    `,
})
export class RfqMakerPairsUpdateTimeHash {
    @ViewColumn({ name: 'chain_id' })
    public chainId: number;

    @ViewColumn({ name: 'hash' })
    public hash: string;

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqMakerPairsUpdateTimeHashOpts = {} as RfqMakerPairsUpdateTimeHashOpts) {
        this.chainId = opts.chainId;
        this.hash = opts.hash;
    }
}
