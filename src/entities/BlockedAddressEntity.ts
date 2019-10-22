import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type BlockedAddressConstructorOpts = Pick<BlockedAddressEntity, 'address'> & Partial<BlockedAddressEntity>;
@Entity({ name: 'blocked_addresses' })
export class BlockedAddressEntity {
    @PrimaryColumn({ name: 'address', type: 'varchar' })
    @Check('address = lower(address)')
    public address: string;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'parent', type: 'varchar', nullable: true })
    public parent: string | null;

    @Column({ name: 'last_seen_nonce', type: 'bigint', nullable: true })
    public lastSeenNonce: number | null;

    @Column({ name: 'ignore', type: 'boolean', default: () => false })
    public ignore: boolean;

    // tslint:disable-next-line: no-object-literal-type-assertion
    constructor(opts: BlockedAddressConstructorOpts = {} as BlockedAddressConstructorOpts) {
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }
        this.address = opts.address;
        this.parent = opts.parent || null;
        this.lastSeenNonce = opts.lastSeenNonce || null;
        this.ignore = opts.ignore || false;
    }
}
