import { PrimaryColumn, ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
    name: 'valid_signed_orders_v4',
    materialized: true,
    synchronize: false,
})
class ValidSignedOrderV4Entity {
    @PrimaryColumn({ name: 'hash' })
    public hash?: string;

    @ViewColumn({ name: 'maker_token' })
    public makerToken?: string;

    @ViewColumn({ name: 'taker_token' })
    public takerToken?: string;

    @ViewColumn({ name: 'maker_amount' })
    public makerAmount?: string;

    @ViewColumn({ name: 'taker_amount' })
    public takerAmount?: string;

    @ViewColumn()
    public maker?: string;

    @ViewColumn()
    public taker?: string;

    @ViewColumn()
    public pool?: string;

    @ViewColumn()
    public expiry?: string;

    @ViewColumn()
    public salt?: string;

    @ViewColumn({ name: 'verifying_contract' })
    public verifyingContract?: string;

    @ViewColumn({ name: 'taker_token_fee_amount' })
    public takerTokenFeeAmount?: string;

    @ViewColumn()
    public sender?: string;

    @ViewColumn({ name: 'fee_recipient' })
    public feeRecipient?: string;

    @ViewColumn()
    public signature?: string;

    @ViewColumn({ name: 'remaining_fillable_taker_amount' })
    public remainingFillableTakerAmount?: string;

    @ViewColumn({ name: 'created_at' })
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
        Object.assign(this, opts);
    }
}

export { ValidSignedOrderV4Entity as SignedOrderV4Entity };
