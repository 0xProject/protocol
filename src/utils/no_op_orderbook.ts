import { Orderbook, SignedNativeOrder } from '../asset-swapper';

export class NoOpOrderbook extends Orderbook {
    constructor() {
        super();
    }

    public async getOrdersAsync(
        _makerToken: string,
        _takerToken: string,
        _pruneFn?: (o: SignedNativeOrder) => boolean,
    ): Promise<SignedNativeOrder[]> {
        return [];
    }
    public async getBatchOrdersAsync(
        _makerTokens: string[],
        _takerToken: string,
        _pruneFn?: (o: SignedNativeOrder) => boolean,
    ): Promise<SignedNativeOrder[][]> {
        return [];
    }
    public async destroyAsync(): Promise<void> {
        return;
    }
}
