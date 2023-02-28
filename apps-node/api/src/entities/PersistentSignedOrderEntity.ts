import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { OrderEventEndState } from '../types';

// Adds a field `orderState` to SignedOrderEntity
// Persists after cancellation, expiration, etc
// We save these to support account history for Matcha front-end
@Entity({ name: 'persistent_signed_orders' })
@Index(['makerAssetData', 'takerAssetData'], { unique: false })
export class PersistentSignedOrderEntity {
    @PrimaryColumn({ name: 'hash', type: 'varchar' })
    public hash?: string;

    @Column({ name: 'sender_address', type: 'varchar' })
    public senderAddress?: string;

    @Index()
    @Column({ name: 'maker_address', type: 'varchar' })
    public makerAddress?: string;

    @Column({ name: 'taker_address', type: 'varchar' })
    public takerAddress?: string;

    @Index()
    @Column({ name: 'maker_asset_data', type: 'varchar' })
    public makerAssetData?: string;

    @Index()
    @Column({ name: 'taker_asset_data', type: 'varchar' })
    public takerAssetData?: string;

    @Column({ name: 'exchange_address', type: 'varchar' })
    public exchangeAddress?: string;

    @Index()
    @Column({ name: 'fee_recipient_address', type: 'varchar' })
    public feeRecipientAddress?: string;

    @Column({ name: 'expiration_time_seconds', type: 'varchar' })
    public expirationTimeSeconds?: string;

    @Column({ name: 'maker_fee', type: 'varchar' })
    public makerFee?: string;

    @Column({ name: 'taker_fee', type: 'varchar' })
    public takerFee?: string;

    @Column({ name: 'maker_asset_amount', type: 'varchar' })
    public makerAssetAmount?: string;

    @Column({ name: 'taker_asset_amount', type: 'varchar' })
    public takerAssetAmount?: string;

    @Column({ name: 'salt', type: 'varchar' })
    public salt?: string;

    @Column({ name: 'signature', type: 'varchar' })
    public signature?: string;

    @Column({ name: 'remaining_fillable_taker_asset_amount', type: 'varchar' })
    public remainingFillableTakerAssetAmount?: string;

    @Column({ name: 'maker_fee_asset_data', type: 'varchar' })
    public makerFeeAssetData?: string;

    @Column({ name: 'taker_fee_asset_data', type: 'varchar' })
    public takerFeeAssetData?: string;

    @Column({ name: 'state', type: 'enum', enum: OrderEventEndState, default: OrderEventEndState.Added })
    public orderState?: OrderEventEndState;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt?: string;
    constructor(
        opts: {
            hash?: string;
            senderAddress?: string;
            makerAddress?: string;
            takerAddress?: string;
            makerAssetData?: string;
            takerAssetData?: string;
            exchangeAddress?: string;
            feeRecipientAddress?: string;
            expirationTimeSeconds?: string;
            makerFee?: string;
            takerFee?: string;
            makerFeeAssetData?: string;
            takerFeeAssetData?: string;
            makerAssetAmount?: string;
            takerAssetAmount?: string;
            salt?: string;
            signature?: string;
            remainingFillableTakerAssetAmount?: string;
            orderState?: OrderEventEndState;
        } = {},
    ) {
        this.hash = opts.hash;
        this.senderAddress = opts.senderAddress;
        this.makerAddress = opts.makerAddress;
        this.takerAddress = opts.takerAddress;
        this.makerAssetData = opts.makerAssetData;
        this.takerAssetData = opts.takerAssetData;
        this.exchangeAddress = opts.exchangeAddress;
        this.feeRecipientAddress = opts.feeRecipientAddress;
        this.expirationTimeSeconds = opts.expirationTimeSeconds;
        this.makerFee = opts.makerFee;
        this.takerFee = opts.takerFee;
        this.makerFeeAssetData = opts.makerFeeAssetData;
        this.takerFeeAssetData = opts.takerFeeAssetData;
        this.makerAssetAmount = opts.makerAssetAmount;
        this.takerAssetAmount = opts.takerAssetAmount;
        this.salt = opts.salt;
        this.signature = opts.signature;
        this.remainingFillableTakerAssetAmount = opts.remainingFillableTakerAssetAmount;
        this.orderState = opts.orderState || OrderEventEndState.Added;
    }
}
