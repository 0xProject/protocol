import { Web3Wrapper } from '@0x/dev-utils';
import { TakerRequestQueryParams, V4RFQFirmQuote, V4RFQIndicativeQuote } from '@0x/quote-server';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { constants } from '../constants';
import {
    AltFirmQuoteResponse,
    AltIndicativeQuoteResponse,
    AltOffering,
    AltQuoteModel,
    AltQuoteRequestData,
    AltQuoteSide,
    AltRfqtMakerAssetOfferings,
} from '../types';

function getAltMarketInfo(
    offerings: AltOffering[],
    buyTokenAddress: string,
    sellTokenAddress: string,
): AltOffering | undefined {
    for (const offering of offerings) {
        if (
            (buyTokenAddress.toLowerCase() === offering.baseAsset.toLowerCase() &&
                sellTokenAddress.toLowerCase() === offering.quoteAsset.toLowerCase()) ||
            (sellTokenAddress.toLowerCase() === offering.baseAsset.toLowerCase() &&
                buyTokenAddress.toLowerCase() === offering.quoteAsset.toLowerCase())
        ) {
            return offering;
        }
    }
    return undefined;
}

function parseFirmQuoteResponseFromAltMM(altFirmQuoteReponse: AltFirmQuoteResponse): V4RFQFirmQuote {
    return {
        signedOrder: altFirmQuoteReponse.data['0xv4order'],
    };
}

function parseIndicativeQuoteResponseFromAltMM(
    altIndicativeQuoteResponse: AltIndicativeQuoteResponse,
    altPair: AltOffering,
    makerToken: string,
    takerToken: string,
): V4RFQIndicativeQuote {
    let makerAmount: BigNumber;
    let takerAmount: BigNumber;
    let quoteAmount: BigNumber;
    let baseAmount: BigNumber;

    if (!altIndicativeQuoteResponse.price) {
        throw new Error('Price not returned by alt MM');
    }
    if (altIndicativeQuoteResponse.amount) {
        // if amount is specified, amount is the base token amount
        baseAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteResponse.amount),
            altPair.baseAssetDecimals,
        );
        // if amount is specified, use the price (quote/base) to get the quote amount
        quoteAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteResponse.amount)
                .times(new BigNumber(altIndicativeQuoteResponse.price))
                .decimalPlaces(altPair.quoteAssetDecimals, BigNumber.ROUND_DOWN),
            altPair.quoteAssetDecimals,
        );
    } else if (altIndicativeQuoteResponse.value) {
        // if value is specified, value is the quote token amount
        quoteAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteResponse.value),
            altPair.quoteAssetDecimals,
        );
        // if value is specified, use the price (quote/base) to get the base amount
        baseAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteResponse.value)
                .dividedBy(new BigNumber(altIndicativeQuoteResponse.price))
                .decimalPlaces(altPair.baseAssetDecimals, BigNumber.ROUND_DOWN),
            altPair.baseAssetDecimals,
        );
    } else {
        throw new Error('neither amount or value were specified');
    }
    if (makerToken.toLowerCase() === altPair.baseAsset.toLowerCase()) {
        makerAmount = baseAmount;
        takerAmount = quoteAmount;
    } else if (makerToken.toLowerCase() === altPair.quoteAsset.toLowerCase()) {
        makerAmount = quoteAmount;
        takerAmount = baseAmount;
    } else {
        throw new Error(`Base, quote tokens don't align with maker, taker tokens`);
    }

    return {
        makerToken,
        makerAmount,
        takerToken,
        takerAmount,
        // HACK: alt implementation does not return an expiration with indicative quotes
        // return now + { IMPUTED EXPIRY SECONDS } to have it included after order checks
        expiry:
            // tslint:disable-next-line:custom-no-magic-numbers
            new BigNumber(Date.now() / 1000)
                .integerValue(BigNumber.ROUND_DOWN)
                .plus(constants.ALT_MM_IMPUTED_INDICATIVE_EXPIRY_SECONDS),
    };
}

/**
 * Turn a standard quote request into an alt quote request
 * and return the appropriate standard quote response
 */
export async function returnQuoteFromAltMMAsync<ResponseT>(
    url: string,
    apiKey: string,
    profile: string,
    integratorKey: string,
    quoteModel: AltQuoteModel,
    makerToken: string,
    takerToken: string,
    maxResponseTimeMs: number,
    altRfqtAssetOfferings: AltRfqtMakerAssetOfferings,
    takerRequestQueryParams: TakerRequestQueryParams,
    axiosInstance: AxiosInstance,
): Promise<{ data: ResponseT; status: number }> {
    const altPair = getAltMarketInfo(
        altRfqtAssetOfferings[url],
        takerRequestQueryParams.buyTokenAddress,
        takerRequestQueryParams.sellTokenAddress,
    );

    if (!altPair) {
        throw new Error(`Alt pair not found`);
    }
    const side = altPair.baseAsset === takerRequestQueryParams.buyTokenAddress ? AltQuoteSide.Sell : AltQuoteSide.Buy;

    // comparison price needs to be quote/base
    // in the standard implementation, it's maker/taker
    let altComparisonPrice: string | undefined;
    if (altPair.quoteAsset === makerToken) {
        altComparisonPrice = takerRequestQueryParams.comparisonPrice
            ? takerRequestQueryParams.comparisonPrice
            : undefined;
    } else {
        altComparisonPrice = takerRequestQueryParams.comparisonPrice
            ? new BigNumber(takerRequestQueryParams.comparisonPrice).pow(-1).toString()
            : undefined;
    }

    let data: AltQuoteRequestData;
    data = {
        market: `${altPair.id}`,
        model: quoteModel,
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
            takerRequestQueryParams.buyTokenAddress === altPair.baseAsset
                ? altPair.baseAssetDecimals
                : altPair.quoteAssetDecimals,
        ).toString();
        if (takerRequestQueryParams.buyTokenAddress === altPair.baseAsset) {
            data.amount = requestSize;
            // add to 'existing order' if there is a comparison price
            if (data.meta.existingOrder) {
                data.meta.existingOrder.amount = requestSize;
            }
        } else {
            data.value = requestSize;
            // add to 'existing order' if there is a comparison price
            if (data.meta.existingOrder) {
                data.meta.existingOrder.value = requestSize;
            }
        }
    } else if (takerRequestQueryParams.sellAmountBaseUnits) {
        requestSize = Web3Wrapper.toUnitAmount(
            new BigNumber(takerRequestQueryParams.sellAmountBaseUnits),
            takerRequestQueryParams.sellTokenAddress === altPair.baseAsset
                ? altPair.baseAssetDecimals
                : altPair.quoteAssetDecimals,
        ).toString();
        if (takerRequestQueryParams.sellTokenAddress === altPair.baseAsset) {
            data.amount = requestSize;
            if (data.meta.existingOrder) {
                data.meta.existingOrder.amount = requestSize;
            }
        } else {
            data.value = requestSize;
            if (data.meta.existingOrder) {
                data.meta.existingOrder.value = requestSize;
            }
        }
    }

    const response = await axiosInstance.post(`${url}/quotes`, data, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: maxResponseTimeMs,
    });

    if (response.data.status === 'rejected') {
        throw new Error('alt MM rejected quote');
    }

    const parsedResponse =
        quoteModel === 'firm'
            ? parseFirmQuoteResponseFromAltMM(response.data)
            : parseIndicativeQuoteResponseFromAltMM(response.data, altPair, makerToken, takerToken);

    return {
        // hack to appease type checking
        data: (parsedResponse as unknown) as ResponseT,
        status: response.status,
    };
}
