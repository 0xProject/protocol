import { Web3Wrapper } from '@0x/dev-utils';
import { TakerRequestQueryParams, V4RFQFirmQuote, V4RFQIndicativeQuote } from '@0x/quote-server';
import { BigNumber, logUtils } from '@0x/utils';
import { AxiosInstance } from 'axios';

import {
    AltFirmQuoteResponse,
    AltIndicativeQuoteReponse,
    AltOffering,
    AltQuoteModel,
    AltQuoteRequestData,
    AltQuoteSide,
    AltRfqtMakerAssetOfferings,
} from '../types';

const IMPUTED_EXPIRY_SECONDS = 120;

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
    altIndicativeQuoteReponse: AltIndicativeQuoteReponse,
    altPair: AltOffering,
    makerToken: string,
    takerToken: string,
): V4RFQIndicativeQuote {
    let makerAmount: BigNumber;
    let takerAmount: BigNumber;
    let quoteAmount: BigNumber;
    let baseAmount: BigNumber;

    if (!altIndicativeQuoteReponse.price) {
        throw new Error('Price not returned by alt MM');
    }
    if (altIndicativeQuoteReponse.amount) {
        baseAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteReponse.amount),
            altPair.baseAssetDecimals,
        );
        quoteAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteReponse.amount)
                .times(new BigNumber(altIndicativeQuoteReponse.price))
                .decimalPlaces(altPair.quoteAssetDecimals, BigNumber.ROUND_DOWN),
            altPair.quoteAssetDecimals,
        );
    } else if (altIndicativeQuoteReponse.value) {
        quoteAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteReponse.value),
            altPair.baseAssetDecimals,
        );
        baseAmount = Web3Wrapper.toBaseUnitAmount(
            new BigNumber(altIndicativeQuoteReponse.value)
                .dividedBy(new BigNumber(altIndicativeQuoteReponse.price))
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
        expiry: new BigNumber(
            // tslint:disable-next-line:custom-no-magic-numbers
            new BigNumber(Date.now() / 1000).integerValue(BigNumber.ROUND_DOWN).plus(IMPUTED_EXPIRY_SECONDS),
        ),
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

    if (altPair) {
        const side =
            altPair.baseAsset === takerRequestQueryParams.buyTokenAddress ? AltQuoteSide.Buy : AltQuoteSide.Sell;

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
            market: `${altPair.baseSymbol}-${altPair.quoteSymbol}`,
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
                    data.meta.existingOrder.value = requestSize;
                }
            } else {
                data.value = requestSize;
                // add to 'existing order' if there is a comparison price
                if (data.meta.existingOrder) {
                    data.meta.existingOrder.amount = requestSize;
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
                    data.meta.existingOrder.value = requestSize;
                }
            } else {
                data.value = requestSize;
                if (data.meta.existingOrder) {
                    data.meta.existingOrder.amount = requestSize;
                }
            }
        }

        const response = await axiosInstance.post(`${url}/quotes`, data, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: maxResponseTimeMs,
        });

        logUtils.log('mocked response:');
        logUtils.log(JSON.stringify(response.data));

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
    } else {
        throw new Error(`Couldn't find asset pair info`);
    }
}
