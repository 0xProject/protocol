import { Column, Entity, PrimaryColumn } from 'typeorm';

export type LastLookRejectionCooldownOpts = LastLookRejectionCooldownEntity;

// A table of issued cooldowns due to bad last look rejection
@Entity({ name: 'last_look_rejection_cooldowns' })
export class LastLookRejectionCooldownEntity {
    // The ID of blocked market maker
    @PrimaryColumn({ name: 'maker_id', type: 'varchar' })
    public makerId: string;

    // The chain ID of the chain market maker is blocked on
    @PrimaryColumn({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    // Token pair string of blocked pair (in format of "0x1-0x2")
    @PrimaryColumn({ name: 'pair_key', type: 'varchar' })
    public pairKey: string;

    // The time the market maker is blocked from issuing quotes
    @PrimaryColumn({ name: 'start_time', type: 'timestamptz' })
    public startTime: Date;

    // The time the market maker is unblocked
    @Column({ name: 'end_time', type: 'timestamptz' })
    public endTime: Date;

    // The order hash of the order with bad last look rejection
    @Column({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    constructor(opts: LastLookRejectionCooldownOpts = {} as LastLookRejectionCooldownOpts) {
        this.makerId = opts.makerId;
        this.chainId = opts.chainId;
        this.pairKey = opts.pairKey;
        this.startTime = opts.startTime;
        this.endTime = opts.endTime;
        this.orderHash = opts.orderHash;
    }
}
