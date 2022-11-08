import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import * as _ from 'lodash';

import { constants } from '../constants';
import {
    CalldataInfo,
    SwapQuote,
    SwapQuoteConsumerBase,
    SwapQuoteConsumerOpts,
    SwapQuoteExecutionOpts,
    SwapQuoteGetOutputOpts,
} from '../types';
import { assert } from '../utils/assert';

import { ExchangeProxySwapQuoteConsumer } from './exchange_proxy_swap_quote_consumer';

export class SwapQuoteConsumer implements SwapQuoteConsumerBase {
    public readonly chainId: number;

    private readonly _contractAddresses: ContractAddresses;
    private readonly _exchangeProxyConsumer: ExchangeProxySwapQuoteConsumer;

    public static getSwapQuoteConsumer(options: Partial<SwapQuoteConsumerOpts> = {}): SwapQuoteConsumer {
        return new SwapQuoteConsumer(options);
    }

    constructor(options: Partial<SwapQuoteConsumerOpts> = {}) {
        const { chainId } = _.merge({}, constants.DEFAULT_SWAP_QUOTER_OPTS, options);
        assert.isNumber('chainId', chainId);

        this.chainId = chainId;
        this._contractAddresses = options.contractAddresses || getContractAddressesForChainOrThrow(chainId);
        this._exchangeProxyConsumer = new ExchangeProxySwapQuoteConsumer(this._contractAddresses, options);
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
        const consumer = await this._getConsumerForSwapQuoteAsync(opts);
        return consumer.getCalldataOrThrowAsync(quote, opts);
    }

    /**
     * Given a SwapQuote and desired rate (in takerAsset), attempt to execute the swap with 0x extension or exchange contract.
     * @param quote An object that conforms to SwapQuote. See type definition for more information.
     * @param opts  Options for getting CalldataInfo. See type definition for more information.
     */
    public async executeSwapQuoteOrThrowAsync(
        quote: SwapQuote,
        opts: Partial<SwapQuoteExecutionOpts> = {},
    ): Promise<string> {
        const consumer = await this._getConsumerForSwapQuoteAsync(opts);
        return consumer.executeSwapQuoteOrThrowAsync(quote, opts);
    }

    private async _getConsumerForSwapQuoteAsync(
        _opts: Partial<SwapQuoteGetOutputOpts>,
    ): Promise<SwapQuoteConsumerBase> {
        return this._exchangeProxyConsumer;
    }
}
