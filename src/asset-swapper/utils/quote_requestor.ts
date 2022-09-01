import { Signature } from '@0x/protocol-utils';
import { V4RFQIndicativeQuote } from '@0x/quote-server';

export interface V4RFQIndicativeQuoteMM extends V4RFQIndicativeQuote {
    makerUri: string;
}
function nativeDataToId(data: { signature: Signature }): string {
    const { v, r, s } = data.signature;
    return `${v}${r}${s}`;
}

/**
 * QuoteRequestor is a deprecated class and is maintained for its legacy usage by QuoteReport
 */
export class QuoteRequestor {
    private readonly _orderSignatureToMakerUri: { [signature: string]: string } = {};

    /**
     * Given an order signature, returns the makerUri that the order originated from
     */
    public getMakerUriForSignature(signature: Signature): string | undefined {
        return this._orderSignatureToMakerUri[nativeDataToId({ signature })];
    }

    /**
     * Set the makerUri for a given signature for future lookup by signature
     */
    public setMakerUriForSignature(signature: Signature, makerUri: string): void {
        this._orderSignatureToMakerUri[nativeDataToId({ signature })] = makerUri;
    }
}
