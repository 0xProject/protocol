import { expect } from '@0x/contracts-test-utils';
import 'mocha';
import { AssetSwapperOrderbook } from '../../src/orderbook/asset_swapper_orderbook';
import { OrderBookService } from '../../src/services/orderbook_service';

describe('AssetSwapperOrderbook', () => {
    describe('getOrdersAsync', () => {
        it('Returns an empty array of orders on failure', async () => {
            const fakeOrderbookService = {
                getOrdersAsync: async () => {
                    throw new Error('orderbook service failure');
                },
            } as unknown as OrderBookService;

            const orderbook = new AssetSwapperOrderbook(fakeOrderbookService);
            const orders = await orderbook.getOrdersAsync('makerToken', 'takerToken');

            expect(orders).to.have.lengthOf(0);
        });
    });
});
