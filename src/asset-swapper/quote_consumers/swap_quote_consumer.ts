import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import * as _ from 'lodash';

import { constants } from '../constants';
import {
    CalldataInfo,
    SwapQuote,
    SwapQuoteConsumerBase,
    SwapQuoteConsumerOpts,
    SwapQuoteGetOutputOpts,
} from '../types';

import { ExchangeProxySwapQuoteConsumer } from './exchange_proxy_swap_quote_consumer';

export class SwapQuoteConsumer implements SwapQuoteConsumerBase {
    private readonly contractAddresses: ContractAddresses;
    private readonly exchangeProxyConsumer: ExchangeProxySwapQuoteConsumer;

    public static getSwapQuoteConsumer(options: Partial<SwapQuoteConsumerOpts> = {}): SwapQuoteConsumer {
        return new SwapQuoteConsumer(options);
    }

    constructor(options: Partial<SwapQuoteConsumerOpts> = {}) {
        const { chainId } = _.merge({}, constants.DEFAULT_SWAP_QUOTER_OPTS, options);

        this.contractAddresses = options.contractAddresses || getContractAddressesForChainOrThrow(chainId);
        this.exchangeProxyConsumer = new ExchangeProxySwapQuoteConsumer(this.contractAddresses, options);
    }

    /**
     * Given a SwapQuote, returns 'CalldataInfo' for a 0x extesion or exchange call. See type definition of CalldataInfo for more information.
     * @param quote An object that conforms to SwapQuote. See type definition for more information.
     * @param opts  Options for getting SmartContractParams. See type definition for more information.
     */
    public async getCalldataOrThrowAsync(
        quote: SwapQuote,
        opts: Partial<SwapQuoteGetOutputOpts> = {},
    ): Promise<CalldataInfo> {
        const consumer = this._getConsumerForSwapQuote(opts);
        return consumer.getCalldataOrThrowAsync(quote, opts);
    }

    private _getConsumerForSwapQuote(_opts: Partial<SwapQuoteGetOutputOpts>): SwapQuoteConsumerBase {
        return this.exchangeProxyConsumer;
    }
}
