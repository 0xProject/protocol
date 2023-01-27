import { pino, ValidationError, ValidationErrorCodes, ValidationErrorItem } from '@0x/api-utils';
import { SwapQuoterError } from '@0x/asset-swapper';
import { MetaTransaction } from '@0x/protocol-utils';
import { ExchangeProxyMetaTransaction } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { BAD_REQUEST } from 'http-status-codes';
import { Summary } from 'prom-client';
import { TwirpError } from 'twirpscript';
import { META_TRANSACTION_SERVICE_RPC_URL } from '../config';
import { ZERO } from '../core/constants';
import { APIErrorCodes } from '../core/errors';
import { rawFeesToFees } from '../core/meta_transaction_fee_utils';
import { FeeConfigs, Fees, RawFees } from '../core/types/meta_transaction_fees';
import { GetQuote, GetQuoteResponse } from '../proto-ts/meta_transaction.pb';

import { FetchIndicativeQuoteResponse, LiquiditySource, MetaTransactionV2 } from '../services/types';
import { bigNumberToProto, protoToBigNumber } from './ProtoUtils';
import { stringsToMetaTransactionFields } from './rfqm_request_utils';

interface QuoteParams {
    affiliateAddress?: string;
    chainId: number;
    buyAmount?: BigNumber;
    buyToken: string;
    integratorId: string;
    sellAmount?: BigNumber;
    sellToken: string;
    slippagePercentage?: BigNumber;
    takerAddress: string;
    quoteUniqueId?: string; // ID to use for the quote report `decodedUniqueId`
    feeConfigs?: FeeConfigs;
}

// Types
//
// NOTE: These types are copied here from 0x API. Once we have
// a solution for a real service architecture, these types should
// become part of the RPC interface published by a future
// MetaTransactionService. Also we will make it MetatransactionService.

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

// Raw type of `QuoteBase` as the quote response sent by meta-transaction endpoints is serialized.
interface RawQuoteBase {
    chainId: number;
    price: string;
    buyAmount: string;
    sellAmount: string;
    sources: {
        name: string;
        proportion: string;
        intermediateToken?: string;
        hops?: string[];
    }[];
    gasPrice: string;
    estimatedGas: string;
    sellTokenToEthRate: string;
    buyTokenToEthRate: string;
    protocolFee: string;
    minimumProtocolFee: string;
    allowanceTarget?: string;
    // Our calculated price impact or null if we were unable to
    // to calculate any price impact
    estimatedPriceImpact: string | null;
}

// Raw type of `BasePriceResponse` as the quote response sent by meta-transaction endpoints is serialized.
interface RawBasePriceResponse extends RawQuoteBase {
    sellTokenAddress: string;
    buyTokenAddress: string;
    value: string;
    gas: string;
}

// Quote response sent by meta-transaction v2 /quote endpoint
interface GetMetaTransactionV2QuoteResponse extends RawBasePriceResponse {
    metaTransactionHash: string;
    // TODO: This needs to be updated when the smart contract change is finished and the new type is published
    metaTransaction: Record<keyof Omit<ExchangeProxyMetaTransaction, 'domain'>, string> & {
        domain: { chainId: number; verifyingContract: string };
    };
    fees?: RawFees;
}

/**
 * Queries the MetaTransaction v1 service for an AMM quote wrapped in a
 * MetaTransaction.
 * If no AMM liquidity is available, returns `null`.
 *
 * If a prometheus 'Summary' is provided to the `requestDurationSummary`
 * parameter, the function will call its `observe` method with the request
 * duration in ms.
 *
 * @throws `AxiosError`
 */
export async function getV1QuoteAsync(
    axiosInstance: AxiosInstance,
    url: URL,
    params: QuoteParams,
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
                    chainId: data.chainId.toString(),
                });
                const {
                    affiliateAddress,
                    buyAmount: buyAmountData,
                    sellAmount: sellAmountData,
                    slippagePercentage,
                    quoteUniqueId,
                } = data;

                affiliateAddress && result.append('affiliateAddress', affiliateAddress);
                buyAmountData && result.append('buyAmount', buyAmountData.toString());
                sellAmountData && result.append('sellAmount', sellAmountData.toString());
                slippagePercentage && result.append('slippagePercentage', slippagePercentage.toString());
                quoteUniqueId && result.append('quoteUniqueId', quoteUniqueId);

                return result.toString();
            },
        });
    } catch (e) {
        stopTimer && stopTimer({ success: 'false' });
        return handleQuoteError(e, params, noLiquidityLogger);
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

/**
 * Queries the meta-transaction v2 service for a meta-transaction quote wrapped in a
 * meta-transaction.
 *
 * If no liquidity is available, returns `null`.
 *
 * If a prometheus 'Summary' is provided to the `requestDurationSummary`
 * parameter, the function will call its `observe` method with the request
 * duration in ms.
 *
 * @throws `AxiosError`
 */
export async function getV2QuoteAsync(
    axiosInstance: AxiosInstance,
    url: URL,
    params: QuoteParams,
    meter?: { requestDurationSummary: Summary<'chainId' | 'success'>; chainId: number },
    noLiquidityLogger?: pino.LogFn,
): Promise<{
    metaTransaction: MetaTransactionV2;
    price: FetchIndicativeQuoteResponse;
    sources: LiquiditySource[];
    fees?: Fees;
} | null> {
    const stopTimer = meter?.requestDurationSummary.startTimer({ chainId: meter.chainId });

    let response: AxiosResponse<GetMetaTransactionV2QuoteResponse>;
    try {
        response = await axiosInstance.post<GetMetaTransactionV2QuoteResponse>(url.toString(), params);
    } catch (e) {
        stopTimer && stopTimer({ success: 'false' });
        return handleQuoteError(e, params, noLiquidityLogger);
    }

    stopTimer && stopTimer({ success: 'true' });

    const { buyAmount, buyTokenAddress, gas, price, sellAmount, sellTokenAddress } = response.data;

    return {
        // TODO: This needs to be updated to the new meta-transaction type when smart contract changes are finished and corresponding types are published in packages
        metaTransaction: new MetaTransactionV2(
            stringsToMetaTransactionFields({
                ...response.data.metaTransaction,
                chainId: response.data.metaTransaction.domain.chainId,
                verifyingContract: response.data.metaTransaction.domain.verifyingContract,
            }),
        ),
        price: {
            buyAmount: new BigNumber(buyAmount),
            buyTokenAddress,
            gas: new BigNumber(gas),
            price: new BigNumber(price),
            sellAmount: new BigNumber(sellAmount),
            sellTokenAddress,
        },
        sources: response.data.sources
            .map((source) => {
                return {
                    ...source,
                    proportion: new BigNumber(source.proportion),
                };
            })
            .filter((source) => source.proportion.gt(ZERO)),
        fees: rawFeesToFees(response.data.fees),
    };
}

/**
 * Internal function to handle meta-transaction quote responses.
 *
 * @returns Null if it's no liquidty error.
 */
function handleQuoteError(
    e: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    params: QuoteParams,
    noLiquidityLogger?: pino.LogFn,
): null {
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
                    `[MetaTransactionClient] No liquidity returned for pair`,
                );
            return null;
        }

        // The response for insufficient fund error (primarily caused by trading amount is less than the fee)
        // is a 400 status and with a body like:
        // {
        //      "code": 109,
        //      "reason": "Insufficient funds for transaction"
        // }
        if (
            axiosError.response?.status === BAD_REQUEST &&
            axiosError.response?.data?.code === APIErrorCodes.InsufficientFundsError
        ) {
            if (params.sellAmount) {
                throw new ValidationError([
                    {
                        field: 'sellAmount',
                        code: ValidationErrorCodes.FieldInvalid,
                        reason: 'sellAmount too small',
                    },
                ]);
            }

            throw new ValidationError([
                {
                    field: 'buyAmount',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: 'buyAmount too small',
                },
            ]);
        }
    }
    // This error is neither the standard no liquidity error nor the insufficient fund error
    throw e;
}

/**
 * Queries the MetaTransaction RPC service for an AMM quote wrapped in a
 * MetaTransaction.
 * If no AMM liquidity is available, returns `null`.
 *
 * If a prometheus 'Summary' is provided to the `requestDurationSummary`
 * parameter, the function will call its `observe` method with the request
 * duration in ms.
 */
export async function getQuoteRpc(
    params: {
        affiliateAddress?: string;
        chainId: number;
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

    let response: GetQuoteResponse;
    try {
        // TODO (rhinodavid): Figure out how to set a timeout
        response = await GetQuote(
            {
                affiliateAddress: params.affiliateAddress,
                buyAmount: params.buyAmount ? bigNumberToProto(params.buyAmount) : undefined,
                buyTokenAddress: params.buyToken,
                chainId: params.chainId,
                integratorId: params.integratorId,
                quoteUniqueId: params.quoteUniqueId,
                sellAmount: params.sellAmount ? bigNumberToProto(params.sellAmount) : undefined,
                sellTokenAddress: params.sellToken,
                slippagePercentage: params.slippagePercentage ? bigNumberToProto(params.slippagePercentage) : undefined,
                takerAddress: params.takerAddress,
            },
            { baseURL: META_TRANSACTION_SERVICE_RPC_URL },
        );
    } catch (_e) {
        stopTimer && stopTimer({ success: 'false' });

        /**
         * Error handling:
         *
         * Twirp throws an error of the following type:
         * export interface TwirpError {
         *   code: ErrorCode;
         *   msg: string;
         *   meta?: Record<string, string>;
         * }
         *
         * To support the current error codes, we type `meta` as:
         *  meta: {
         *     zeroexErrorCode?: APIErrorCodes,
         *     validationErrors: JSON.stringify(ValidationErrorItem[])
         *  }
         */

        const e = _e as TwirpError;
        const zeroexErrorCode = Number.isNaN(parseInt(e.meta?.zeroexErrorCode ?? ''))
            ? null
            : parseInt(e.meta?.zeroexErrorCode ?? '');
        const validationErrors: ValidationErrorItem[] = JSON.parse(e.meta?.validationErrors ?? '[]');

        if (
            validationErrors?.length === 1 &&
            validationErrors?.map((v) => v.reason).includes(SwapQuoterError.InsufficientAssetLiquidity)
        ) {
            // Looks like there is no liquidity for the quote...
            noLiquidityLogger &&
                noLiquidityLogger(
                    { ammQuoteRequestParams: params },
                    `[MetaTransactionClient] No liquidity returned for pair`,
                );
            return null;
        }

        // The response for insufficient fund error (primarily caused by trading amount is less than the fee)
        // is a zeroexGeneralErrorCode `InsufficientFundsError`

        if (zeroexErrorCode === APIErrorCodes.InsufficientFundsError) {
            if (params.sellAmount) {
                throw new ValidationError([
                    {
                        field: 'sellAmount',
                        code: ValidationErrorCodes.FieldInvalid,
                        reason: 'sellAmount too small',
                    },
                ]);
            }

            throw new ValidationError([
                {
                    field: 'buyAmount',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: 'buyAmount too small',
                },
            ]);
        }
        // This error is neither the standard no liquidity error nor the insufficient fund error
        throw e;
    }

    stopTimer && stopTimer({ success: 'true' });

    return {
        metaTransaction: new MetaTransaction({
            signer: response.metaTransaction.signerAddress,
            sender: response.metaTransaction.senderAddress,
            minGasPrice: protoToBigNumber(response.metaTransaction.minGasPrice),
            maxGasPrice: protoToBigNumber(response.metaTransaction.maxGasPrice),
            expirationTimeSeconds: protoToBigNumber(response.metaTransaction.expirationTimeSeconds),
            salt: protoToBigNumber(response.metaTransaction.salt),
            callData: response.metaTransaction.callData,
            value: protoToBigNumber(response.metaTransaction.value),
            feeToken: response.metaTransaction.feeTokenAddress,
            feeAmount: protoToBigNumber(response.metaTransaction.feeAmount),
            chainId: response.metaTransaction.chainId,
            verifyingContract: response.metaTransaction.verifyingContract,
        }),
        price: {
            buyAmount: protoToBigNumber(response.quote.buyAmount),
            buyTokenAddress: response.quote.buyTokenAddress,
            gas: protoToBigNumber(response.quote.gas),
            price: protoToBigNumber(response.quote.price),
            sellAmount: protoToBigNumber(response.quote.sellAmount),
            sellTokenAddress: response.quote.sellTokenAddress,
        },
    };
}
