import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

// This should only be used in tests to set the state of `signed_orders_v4`.
// In production, we only care about valid orders, so use
// `ValidSignedOrderV4Entity` instead.
@Entity({ name: 'signed_orders_v4' })
export class OrderWatcherSignedOrderEntity {
    @PrimaryColumn({ name: 'hash', type: 'varchar' })
    public hash?: string;

    @Index()
    @Column({ name: 'maker_token', type: 'varchar' })
    public makerToken?: string;

    @Index()
    @Column({ name: 'taker_token', type: 'varchar' })
    public takerToken?: string;

    @Column({ name: 'maker_amount', type: 'varchar' })
    public makerAmount?: string;

    @Column({ name: 'taker_amount', type: 'varchar' })
    public takerAmount?: string;

    @Index()
    @Column({ name: 'maker', type: 'varchar' })
    public maker?: string;

    @Column({ name: 'taker', type: 'varchar' })
    public taker?: string;

    @Column({ name: 'pool', type: 'varchar' })
    public pool?: string;

    @Column({ name: 'expiry', type: 'varchar' })
    public expiry?: string;

    @Column({ name: 'salt', type: 'varchar' })
    public salt?: string;

    @Column({ name: 'verifying_contract', type: 'varchar' })
    public verifyingContract?: string;

    @Column({ name: 'taker_token_fee_amount', type: 'varchar' })
    public takerTokenFeeAmount?: string;

    @Column({ name: 'sender', type: 'varchar' })
    public sender?: string;

    @Index()
    @Column({ name: 'fee_recipient', type: 'varchar' })
    public feeRecipient?: string;

    @Column({ name: 'signature', type: 'varchar' })
    public signature?: string;

    @Column({ name: 'remaining_fillable_taker_amount', type: 'varchar' })
    public remainingFillableTakerAmount?: string;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt?: string;

    constructor(
        opts: {
            hash?: string;
            makerToken?: string;
            takerToken?: string;
            makerAmount?: string;
            takerAmount?: string;
            maker?: string;
            taker?: string;
            pool?: string;
            expiry?: string;
            salt?: string;
            verifyingContract?: string;
            takerTokenFeeAmount?: string;
            sender?: string;
            feeRecipient?: string;
            signature?: string;
            remainingFillableTakerAmount?: string;
        } = {},
    ) {
        this.hash = opts.hash;
        this.makerToken = opts.makerToken;
        this.takerToken = opts.takerToken;
        this.makerAmount = opts.makerAmount;
        this.takerAmount = opts.takerAmount;
        this.maker = opts.maker;
        this.taker = opts.taker;
        this.pool = opts.pool;
        this.expiry = opts.expiry;
        this.salt = opts.salt;
        this.verifyingContract = opts.verifyingContract;
        this.takerTokenFeeAmount = opts.takerTokenFeeAmount;
        this.sender = opts.sender;
        this.feeRecipient = opts.feeRecipient;
        this.signature = opts.signature;
        this.remainingFillableTakerAmount = opts.remainingFillableTakerAmount;
        this.signature = opts.signature;
    }
}
