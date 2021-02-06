import { Web3Wrapper } from '@0x/dev-utils';
import { TakerRequestQueryParams, V4RFQFirmQuote, V4RFQIndicativeQuote } from '@0x/quote-server';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { AltFirmQuoteReponse, AltIndicativeQuoteReponse, AltOffering, AltQuoteRequestData, AltRfqtMakerAssetOfferings } from '../types';

const IMPUTED_EXPIRY_SECONDS = 120;

export function getAltMarketInfo(
    offerings: AltOffering[],
    buyTokenAddress: string,
    sellTokenAddress: string,
): AltOffering | undefined {
    for (const offering of offerings) {
        if (
            (buyTokenAddress === offering.baseAsset && sellTokenAddress === offering.quoteAsset) ||
            (sellTokenAddress === offering.baseAsset && buyTokenAddress === offering.quoteAsset)
        ) {
            return offering;
        }
    }
    return undefined;
}

export function parseFirmQuoteResponseFromAltMM(altFirmQuoteReponse: AltFirmQuoteReponse): V4RFQFirmQuote {
    return {
        signedOrder: altFirmQuoteReponse.data['0xv4order'],
    };
}

export function parseIndicativeQuoteResponseFromAltMM(
    altIndicativeQuoteReponse: AltIndicativeQuoteReponse,
    altPair: AltOffering,
    makerToken: string,
    takerToken: string,
    ): V4RFQIndicativeQuote {
    let makerAmount: BigNumber;
    let takerAmount: BigNumber;

    if (!altIndicativeQuoteReponse.price) {
        throw new Error('Price not returned by alt MM');
    } else {
        if (makerToken === altPair.baseAsset) {
            if (altIndicativeQuoteReponse.amount) {
                makerAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(altIndicativeQuoteReponse.amount), altPair.baseAssetDecimals);
                takerAmount = Web3Wrapper.toBaseUnitAmount(
                    new BigNumber(altIndicativeQuoteReponse.amount).times(new BigNumber(altIndicativeQuoteReponse.price)), // get taker amount from price
                    altPair.baseAssetDecimals);
            } else if (altIndicativeQuoteReponse.value) {
                takerAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(altIndicativeQuoteReponse.value), altPair.quoteAssetDecimals);
                makerAmount = Web3Wrapper.toBaseUnitAmount(
                    new BigNumber(altIndicativeQuoteReponse.value).times(new BigNumber(altIndicativeQuoteReponse.price)), // get maker amount from price
                    altPair.quoteAssetDecimals);
            } else {
                throw new Error('niether amount or value were specified');
            }
        } else if (makerToken === altPair.quoteAsset) {
            if (altIndicativeQuoteReponse.amount) {
                takerAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(altIndicativeQuoteReponse.amount), altPair.quoteAssetDecimals);
                makerAmount = Web3Wrapper.toBaseUnitAmount(
                    new BigNumber(altIndicativeQuoteReponse.amount).times(new BigNumber(altIndicativeQuoteReponse.price)), // get maker amount from price
                    altPair.baseAssetDecimals);
            } else if (altIndicativeQuoteReponse.value) {
                makerAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(altIndicativeQuoteReponse.value), altPair.quoteAssetDecimals);
                takerAmount = Web3Wrapper.toBaseUnitAmount(
                    new BigNumber(altIndicativeQuoteReponse.value).times(new BigNumber(altIndicativeQuoteReponse.price)), // get maker amount from price
                    altPair.quoteAssetDecimals);
            } else {
                throw new Error('neither amount or value were specified');
            }
        } else {
            throw new Error('');
        }
    }

    return {
        makerToken,
        makerAmount,
        takerToken,
        takerAmount,
        // tslint:disable-next-line:custom-no-magic-numbers
        expiry: new BigNumber(new BigNumber(Date.now() / 1000).integerValue(BigNumber.ROUND_DOWN).plus(IMPUTED_EXPIRY_SECONDS)),
    };
}

export async function returnQuoteFromAltMMAsync<ResponseT>(
    url: string,
    apiKey: string,
    profile: string,
    integratorKey: string,
    quoteType: 'firm' | 'indicative',
    makerToken: string,
    takerToken: string,
    maxResponseTimeMs: number,
    altRfqtAssetOfferings: AltRfqtMakerAssetOfferings,
    takerRequestQueryParams: TakerRequestQueryParams,
    axiosInstance: AxiosInstance,
    ): Promise<{ data: ResponseT; status: number}> {

    const altPair = getAltMarketInfo(altRfqtAssetOfferings[url], takerRequestQueryParams.buyTokenAddress, takerRequestQueryParams.sellTokenAddress);

    if (altPair) {
        const side = altPair.baseAsset === takerRequestQueryParams.buyTokenAddress ? 'buy' : 'sell';

        // comparison price needs to be quote/base
        // in the standard implementation, it's maker/taker
        const altComparisonPrice = altPair.quoteAsset === makerToken ?
            takerRequestQueryParams.comparisonPrice ? takerRequestQueryParams.comparisonPrice : undefined :
            takerRequestQueryParams.comparisonPrice ? new BigNumber(takerRequestQueryParams.comparisonPrice).pow(-1).toString() : undefined;

        let data: AltQuoteRequestData;
        data = {
            market: `${altPair.baseSymbol}-${altPair.quoteSymbol}`,
            model: quoteType,
            profile,
            side,
            meta: {
                txOrigin: takerRequestQueryParams.txOrigin!,
                taker: takerRequestQueryParams.takerAddress,
                client: integratorKey,
            },
        };

        // specify a comparison price if it exists
        if (altComparisonPrice) {
            data.meta.existingOrder = {
                price: altComparisonPrice,
            };
        }

        // need to specify amount or value
        // amount is units of the base asset
        // value is units of the quote asset
        let requestSize: string;
        if (takerRequestQueryParams.buyAmountBaseUnits) {
            requestSize = Web3Wrapper.toUnitAmount(
                new BigNumber(takerRequestQueryParams.buyAmountBaseUnits),
                takerRequestQueryParams.buyTokenAddress === altPair.baseAsset ? altPair.baseAssetDecimals : altPair.quoteAssetDecimals,
            ).toString();
            if (takerRequestQueryParams.buyTokenAddress === altPair.baseAsset) {
                data.value = requestSize;
                if (data.meta.existingOrder) {
                    data.meta.existingOrder.value = requestSize;
                }
            } else {
                data.amount = requestSize;
                if (data.meta.existingOrder) {
                    data.meta.existingOrder.amount = requestSize;
                }
            }
        } else if (takerRequestQueryParams.sellAmountBaseUnits) {
            requestSize = Web3Wrapper.toUnitAmount(
                new BigNumber(takerRequestQueryParams.sellAmountBaseUnits),
                takerRequestQueryParams.sellTokenAddress === altPair.baseAsset ? altPair.baseAssetDecimals : altPair.quoteAssetDecimals,
            ).toString();
            if (takerRequestQueryParams.sellTokenAddress === altPair.baseAsset) {
                data.value = requestSize;
                if (data.meta.existingOrder) {
                    data.meta.existingOrder.value = requestSize;
                }
            } else {
                data.amount = requestSize;
                if (data.meta.existingOrder) {
                    data.meta.existingOrder.amount = requestSize;
                }
            }
        }

        const response = await axiosInstance.post(`${url}/quotes`, {
            headers: { 'Authorization': `Bearer ${apiKey}`},
            data,
            timeout: maxResponseTimeMs,
        });

        if (response.data.status === 'rejected') {
            throw new Error('alt MM rejected quote');
        }

        const parsedResponse = quoteType === 'firm' ?
            parseFirmQuoteResponseFromAltMM(response.data) :
            parseIndicativeQuoteResponseFromAltMM(response.data, altPair, makerToken, takerToken);

        return {
            // hack to appease type checking
            data: parsedResponse as unknown as ResponseT,
            status: response.status,
        };
    } else {
        throw new Error(`Couldn't find asset pair info`);
    }
}
