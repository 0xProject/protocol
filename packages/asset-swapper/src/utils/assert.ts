import { assert as sharedAssert } from '@0x/assert';
import { schemas } from '@0x/json-schemas';
import { CommonOrderFields as Order } from '@0x/protocol-utils';
import * as _ from 'lodash';

import { Orderbook } from '../swap_quoter';
import { MarketOperation, OrderProviderRequest, SwapQuote, SwapQuoteInfo } from '../types';

export const assert = {
    ...sharedAssert,
    isValidSwapQuote(variableName: string, swapQuote: SwapQuote): void {
        sharedAssert.isETHAddressHex(`${variableName}.takerToken`, swapQuote.takerToken);
        sharedAssert.isETHAddressHex(`${variableName}.makerToken`, swapQuote.makerToken);
        sharedAssert.doesConformToSchema(`${variableName}.orders`, swapQuote.orders, schemas.signedOrdersSchema);
        if (swapQuote.isTwoHop) {
            assert.isValidTwoHopSwapQuoteOrders(
                `${variableName}.orders`,
                swapQuote.orders,
                swapQuote.makerToken,
                swapQuote.takerToken,
            );
        } else {
            assert.isValidSwapQuoteOrders(
                `${variableName}.orders`,
                swapQuote.orders,
                swapQuote.makerToken,
                swapQuote.takerToken,
            );
        }
        assert.isValidSwapQuoteInfo(`${variableName}.bestCaseQuoteInfo`, swapQuote.bestCaseQuoteInfo);
        assert.isValidSwapQuoteInfo(`${variableName}.worstCaseQuoteInfo`, swapQuote.worstCaseQuoteInfo);
        if (swapQuote.type === MarketOperation.Buy) {
            sharedAssert.isBigNumber(`${variableName}.makerAssetFillAmount`, swapQuote.makerAssetFillAmount);
        } else {
            sharedAssert.isBigNumber(`${variableName}.takerAssetFillAmount`, swapQuote.takerAssetFillAmount);
        }
    },
    isValidSwapQuoteOrders(variableName: string, orders: Order[], makerToken: string, takerToken: string): void {
        return orders.forEach((order: Order, index: number) => {
            assert.assert(
                makerToken === order.makerToken,
                `Expected ${variableName}[${index}].takerToken to be ${takerToken} but found ${order.takerToken}`,
            );
            assert.assert(
                makerToken !== order.makerToken,
                `Expected ${variableName}[${index}].makerToken to be ${makerToken} but found ${order.makerToken}`,
            );
        });
    },
    isValidTwoHopSwapQuoteOrders(variableName: string, orders: Order[], makerToken: string, takerToken: string): void {
        assert.assert(orders.length === 2, `Expected ${variableName}.length to be 2 for a two-hop quote`);
        assert.assert(
            takerToken === orders[0].takerToken,
            `Expected ${variableName}[0].takerToken to be ${takerToken} but found ${orders[0].takerToken}`,
        );
        assert.assert(
            makerToken === orders[1].makerToken,
            `Expected ${variableName}[1].makerToken to be ${makerToken} but found ${orders[1].makerToken}`,
        );
        assert.assert(
            orders[0].makerToken === orders[1].takerToken,
            `Expected ${variableName}[0].makerToken (${orders[0].makerToken}) to equal ${variableName}[1].takerToken (${
                orders[1].takerToken
            })`,
        );
    },
    isValidForwarderSwapQuote(variableName: string, swapQuote: SwapQuote, wethToken: string): void {
        assert.isValidSwapQuote(variableName, swapQuote);
        assert.isValidForwarderSignedOrders(`${variableName}.orders`, swapQuote.orders, wethToken);
    },
    isValidForwarderSignedOrders(variableName: string, orders: Order[], wethToken: string): void {
        _.forEach(orders, (o: Order, i: number) => {
            assert.isValidForwarderSignedOrder(`${variableName}[${i}]`, o, wethToken);
        });
    },
    isValidForwarderSignedOrder(variableName: string, order: Order, wethToken: string): void {
        assert.assert(
            order.takerToken === wethToken,
            `Expected ${variableName} to have takerAssetData set as ${wethToken}, but is ${order.takerToken}`,
        );
    },
    isValidSwapQuoteInfo(variableName: string, swapQuoteInfo: SwapQuoteInfo): void {
        sharedAssert.isNumber(`${variableName}.gas`, swapQuoteInfo.gas);
        sharedAssert.isBigNumber(`${variableName}.feeTakerTokenAmount`, swapQuoteInfo.feeTakerTokenAmount);
        sharedAssert.isBigNumber(`${variableName}.totalTakerAmount`, swapQuoteInfo.totalTakerAmount);
        sharedAssert.isBigNumber(`${variableName}.takerAmount`, swapQuoteInfo.takerAmount);
        sharedAssert.isBigNumber(`${variableName}.makerAmount`, swapQuoteInfo.makerAmount);
    },
    isValidOrderbook(variableName: string, orderFetcher: Orderbook): void {
        sharedAssert.isFunction(`${variableName}.getOrdersAsync`, orderFetcher.getOrdersAsync.bind(orderFetcher));
        sharedAssert.isFunction(
            `${variableName}.getBatchOrdersAsync`,
            orderFetcher.getBatchOrdersAsync.bind(orderFetcher),
        );
    },
    isValidOrderProviderRequest(variableName: string, orderFetcherRequest: OrderProviderRequest): void {
        sharedAssert.isHexString(`${variableName}.makerAssetData`, orderFetcherRequest.makerAssetData);
        sharedAssert.isHexString(`${variableName}.takerAssetData`, orderFetcherRequest.takerAssetData);
    },
    isValidPercentage(variableName: string, percentage: number): void {
        assert.isNumber(variableName, percentage);
        assert.assert(
            percentage >= 0 && percentage <= 1,
            `Expected ${variableName} to be between 0 and 1, but is ${percentage}`,
        );
    },
    isValidForwarderExtensionContractOpts(variableName: string, opts: any): void {
        assert.isValidPercentage(`${variableName}.feePercentage`, opts.feePercentage);
        assert.isETHAddressHex(`${variableName}.feeRecipient`, opts.feeRecipient);
    },
};
