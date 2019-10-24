export class SignedOrderModel {
    public hash?: string;
    public senderAddress?: string;
    public makerAddress?: string;
    public takerAddress?: string;
    public makerAssetData?: string;
    public takerAssetData?: string;
    public exchangeAddress?: string;
    public feeRecipientAddress?: string;
    public expirationTimeSeconds?: number;
    public makerFee?: string;
    public takerFee?: string;
    public makerAssetAmount?: string;
    public takerAssetAmount?: string;
    public salt?: string;
    public signature?: string;
    public remainingFillableTakerAssetAmount?: string;
    public makerFeeAssetData?: string;
    public takerFeeAssetData?: string;
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
            expirationTimeSeconds?: number;
            makerFee?: string;
            takerFee?: string;
            makerFeeAssetData?: string;
            takerFeeAssetData?: string;
            makerAssetAmount?: string;
            takerAssetAmount?: string;
            salt?: string;
            signature?: string;
            remainingFillableTakerAssetAmount?: string;
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
    }
}
