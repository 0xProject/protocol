import { Orderbook, SignedLimitOrder } from '../asset-swapper';

export class NoOpOrderbook extends Orderbook {
    constructor() {
        super();
    }

    public async getOrdersAsync(
        _makerToken: string,
        _takerToken: string,
        _pruneFn?: (o: SignedLimitOrder) => boolean,
    ): Promise<SignedLimitOrder[]> {
        return [];
    }
    public async destroyAsync(): Promise<void> {
        return;
    }
}
