import { pino, ValidationErrorItem } from '@0x/api-utils';
import { SwapQuoterError } from '@0x/asset-swapper';
import { MetaTransaction } from '@0x/protocol-utils';
import { ExchangeProxyMetaTransaction } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { BAD_REQUEST } from 'http-status-codes';
import { Summary } from 'prom-client';

import { FetchIndicativeQuoteResponse } from '../services/types';

// Types
//
// NOTE: These types are copied here from 0x API. Once we have
// a solution for a real service architecture, these types should
// become part of the RPC interface published by a future
// MetaTransactionService. Also we will make it MetatransactionService.

interface LiquiditySource {
    name: string;
    proportion: BigNumber;
    intermediateToken?: string;
    hops?: string[];
}

interface QuoteBase {
    chainId: number;
    price: BigNumber;
    buyAmount: BigNumber;
    sellAmount: BigNumber;
    sources: LiquiditySource[];
    gasPrice: BigNumber;
    estimatedGas: BigNumber;
    sellTokenToEthRate: BigNumber;
    buyTokenToEthRate: BigNumber;
    protocolFee: BigNumber;
    minimumProtocolFee: BigNumber;
    allowanceTarget?: string;
    // Our calculated price impact or null if we were unable to
    // to calculate any price impact
    estimatedPriceImpact: BigNumber | null;
}

export interface BasePriceResponse extends QuoteBase {
    sellTokenAddress: string;
    buyTokenAddress: string;
    value: BigNumber;
    gas: BigNumber;
}

interface GetMetaTransactionQuoteResponse extends BasePriceResponse {
    metaTransactionHash: string;
    metaTransaction: ExchangeProxyMetaTransaction;
}

/**
 * Queries the MetaTransaction service for an AMM quote wrapped in a
 * MetaTransaction.
 * If no AMM liquidity is available, returns `null`.
 *
 * If a prometheus 'Summary' is provided to the `requestDurationSummary`
 * parameter, the function will call its `observe` method with the request
 * duration in ms.
 *
 * @throws `AxiosError`
 */
export async function getQuoteAsync(
    axiosInstance: AxiosInstance,
    url: URL,
    params: {
        buyAmount?: BigNumber;
        buyToken: string;
        integratorId: string;
        sellAmount?: BigNumber;
        sellToken: string;
        slippagePercentage?: BigNumber;
        takerAddress: string;
        quoteUniqueId?: string; // ID to use for the quote report `decodedUniqueId`
    },
    meter?: { requestDurationSummary: Summary<'chainId' | 'success'>; chainId: number },
    noLiquidityLogger?: pino.LogFn,
): Promise<{ metaTransaction: MetaTransaction; price: FetchIndicativeQuoteResponse } | null> {
    const stopTimer = meter?.requestDurationSummary.startTimer({ chainId: meter.chainId });

    let response: AxiosResponse<GetMetaTransactionQuoteResponse>;
    try {
        response = await axiosInstance.get<GetMetaTransactionQuoteResponse>(url.toString(), {
            params,
            // TODO (rhinodavid): Formalize this value once we have a good idea of the
            // actual numbers
            timeout: 10000,
            paramsSerializer: (data: typeof params) => {
                const result = new URLSearchParams({
                    buyToken: data.buyToken,
                    sellToken: data.sellToken,
                    takerAddress: data.takerAddress,
                    integratorId: data.integratorId,
                });
                const {
                    buyAmount: buyAmountData,
                    sellAmount: sellAmountData,
                    slippagePercentage,
                    quoteUniqueId,
                } = data;

                buyAmountData && result.append('buyAmount', buyAmountData.toString());
                sellAmountData && result.append('sellAmount', sellAmountData.toString());
                slippagePercentage && result.append('slippagePercentage', slippagePercentage.toString());
                quoteUniqueId && result.append('quoteUniqueId', quoteUniqueId);

                return result.toString();
            },
        });
    } catch (e) {
        stopTimer && stopTimer({ success: 'false' });

        if (e.response?.data) {
            const axiosError = e as AxiosError<{
                code: number;
                reason: string;
                validationErrors?: ValidationErrorItem[];
            }>;
            //  The response for no liquidity is a 400 status with a body like:
            //  {
            //     "code": 100,
            //     "reason": "Validation Failed",
            //     "validationErrors": [
            //       {
            //         "field": "sellAmount",
            //         "code": 1004,
            //         "reason": "INSUFFICIENT_ASSET_LIQUIDITY"
            //       }
            //     ]
            //   }
            if (
                axiosError.response?.status === BAD_REQUEST &&
                axiosError.response?.data?.validationErrors?.length === 1 &&
                axiosError.response?.data?.validationErrors
                    ?.map((v) => v.reason)
                    .includes(SwapQuoterError.InsufficientAssetLiquidity)
            ) {
                // Looks like there is no liquidity for the quote...
                noLiquidityLogger &&
                    noLiquidityLogger(
                        { ammQuoteRequestParams: params },
                        `[MetaTransactionClient] No liquitity returned for pair`,
                    );
                return null;
            }
        }
        // This error is not the standard no liquidity error
        throw e;
    }

    stopTimer && stopTimer({ success: 'true' });

    const { buyAmount, buyTokenAddress, gas, price, sellAmount, sellTokenAddress } = response.data;

    // A fun thing here is that the return from the API, @0x/types:ExchangeProxyMetaTransaction
    // does not match @0x/protocol-utils:MetaTransaction. So, we pull the domain information out
    // and put it at the top level of the constructor parameters
    return {
        metaTransaction: new MetaTransaction({
            ...response.data.metaTransaction,
            chainId: response.data.metaTransaction.domain.chainId,
            verifyingContract: response.data.metaTransaction.domain.verifyingContract,
        }),
        price: { buyAmount, buyTokenAddress, gas, price, sellAmount, sellTokenAddress },
    };
}
