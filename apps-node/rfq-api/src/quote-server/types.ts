import { SignedOrder as V3SignedOrder } from '@0x/order-utils';
import { OtcOrderFields as OtcOrder, RfqOrderFields as V4RfqOrder, Signature as V4Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Fee } from '../core/types';

// Requires that one of many properites is specified
// See https://stackoverflow.com/a/49725198
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys];

export type SupportedVersion = '3' | '4';

export interface V4SignedRfqOrder extends V4RfqOrder {
    signature: V4Signature;
}

export interface BaseTakerRequest {
    sellTokenAddress: string;
    buyTokenAddress: string;
    takerAddress: string;
    apiKey?: string;
    requestUuid?: string;
    sellAmountBaseUnits?: BigNumber;
    buyAmountBaseUnits?: BigNumber;
    comparisonPrice?: BigNumber;
}

export interface V3TakerRequest extends BaseTakerRequest {
    protocolVersion: '3';
}

export interface V4TakerRequest extends BaseTakerRequest {
    protocolVersion: '4';
    txOrigin: string;
    isLastLook: boolean;
    fee?: Fee;
}

export type TakerRequest = V3TakerRequest | V4TakerRequest;

export type TakerRequestQueryParamsUnnested = RequireOnlyOne<
    {
        sellTokenAddress: string;
        buyTokenAddress: string;
        takerAddress: string;
        sellAmountBaseUnits?: string;
        buyAmountBaseUnits?: string;
        comparisonPrice?: string;
        protocolVersion?: string;
        txOrigin?: string;
        isLastLook?: string;
        feeToken?: string;
        feeAmount?: string;
        feeType?: string;
        nonce?: string;
        nonceBucket?: string;
    },
    'sellAmountBaseUnits' | 'buyAmountBaseUnits'
>;

export type TakerRequestQueryParamsNested = RequireOnlyOne<
    {
        sellTokenAddress: string;
        buyTokenAddress: string;
        takerAddress: string;
        sellAmountBaseUnits?: string;
        buyAmountBaseUnits?: string;
        comparisonPrice?: string;
        protocolVersion?: string;
        txOrigin?: string;
        isLastLook?: string;
        fee?: {
            token: string;
            amount: string;
            type: string;
        };
        nonce?: string;
        nonceBucket?: string;
    },
    'sellAmountBaseUnits' | 'buyAmountBaseUnits'
>;

export interface VersionedQuote<Version, QuoteType> {
    protocolVersion: Version;
    response: QuoteType | undefined;
}

/*
// Indicative Quotes

Generate types for both V3 and V4 Indicative quotes. Then use the generic to tie them all together.
*/
export type V3RFQIndicativeQuote = Pick<
    V3SignedOrder,
    'makerAssetData' | 'makerAssetAmount' | 'takerAssetData' | 'takerAssetAmount' | 'expirationTimeSeconds'
>;

export type V4RFQIndicativeQuote = Pick<
    V4RfqOrder,
    'makerToken' | 'makerAmount' | 'takerToken' | 'takerAmount' | 'expiry'
>;

export interface IndicativeOtcQuote {
    expiry: BigNumber;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
}

export type IndicativeQuoteResponse =
    | VersionedQuote<'3', V3RFQIndicativeQuote>
    | VersionedQuote<'4', V4RFQIndicativeQuote>;

// Firm quotes, similar pattern
export interface V3RFQFirmQuote {
    signedOrder: V3SignedOrder;
}

export interface V4RFQFirmQuote {
    signedOrder: V4SignedRfqOrder;
}

export interface OtcOrderFirmQuoteResponse {
    order?: OtcOrder;
    signature?: V4Signature;
}

export type FirmQuoteResponse = VersionedQuote<'3', V3RFQFirmQuote> | VersionedQuote<'4', V4RFQFirmQuote>;

// Implement quoter that is version agnostic
export interface Quoter {
    fetchIndicativeQuoteAsync(takerRequest: TakerRequest): Promise<IndicativeQuoteResponse>;
    fetchIndicativeOtcQuoteAsync(takerRequest: TakerRequest): Promise<IndicativeOtcQuote>;
    fetchFirmQuoteAsync(takerRequest: TakerRequest): Promise<FirmQuoteResponse>;
    submitFillAsync(submitRequest: SubmitRequest): Promise<SubmitReceipt | undefined>;
    signOtcOrderAsync(signRequest: SignRequest): Promise<SignResponse | undefined>;
}

export interface SubmitReceipt {
    proceedWithFill: boolean; // must be true if maker agrees
    fee: Fee;
    signedOrderHash: string;
    takerTokenFillAmount: BigNumber;
}

export interface SubmitRequest {
    order: V4RfqOrder;
    orderHash: string;
    fee: Fee;
    apiKey?: string;
    takerTokenFillAmount: BigNumber;
}

export interface SignResponse {
    fee?: Fee;
    makerSignature?: V4Signature;
    proceedWithFill: boolean; // must be true if maker agrees
}

export interface SignRequest {
    fee: Fee;
    order: OtcOrder;
    orderHash: string;
    expiry: BigNumber;
    takerSignature?: V4Signature;
    takerSpecifiedSide?: string;
    trader: string;
    workflow: 'rfqm' | 'rfqt' | 'gasless-rfqt';
}

export interface ZeroExTransactionWithoutDomain {
    salt: BigNumber;
    expirationTimeSeconds: BigNumber;
    gasPrice: BigNumber;
    signerAddress: string;
    data: string;
}
