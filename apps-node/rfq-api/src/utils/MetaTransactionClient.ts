import { ValidationError, ValidationErrorCodes, ValidationErrorItem } from '@0x/api-utils';
import pino from 'pino';
import { MetaTransaction, MetaTransactionFields, MetaTransactionV2, MetaTransactionV2Fields } from '@0x/protocol-utils';
import { EIP712DomainWithDefaultSchema } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { BAD_REQUEST } from 'http-status-codes';
import { Summary } from 'prom-client';
import { META_TRANSACTION_V1_CLIENT_TIMEOUT_MS, META_TRANSACTION_V2_CLIENT_TIMEOUT_MS, ZERO } from '../core/constants';
import { APIErrorCodes } from '../core/errors';
import { rawFeesToFees } from '../core/meta_transaction_fee_utils';
import { GaslessTypes, SwapQuoterError } from '../core/types';
import { FeeConfigs, Fees, RawFees } from '../core/types/meta_transaction_fees';

import { FetchIndicativeQuoteResponse, LiquiditySource } from '../services/types';
import { stringsToMetaTransactionFields, stringsToMetaTransactionV2Fields } from './rfqm_request_utils';

interface QuoteParams {
    affiliateAddress?: string;
    chainId: number;
    buyAmount?: BigNumber;
    buyToken: string;
    integratorId: string;
    sellAmount?: BigNumber;
    sellToken: string;
    slippagePercentage?: BigNumber;
    priceImpactProtectionPercentage?: BigNumber;
    takerAddress: string;
    quoteUniqueId?: string; // ID to use for the quote report `decodedUniqueId`
    metaTransactionVersion?: 'v1' | 'v2';
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

export interface BasePriceResponse extends QuoteBase {
    sellTokenAddress: string;
    buyTokenAddress: string;
    value: BigNumber;
    gas: BigNumber;
}

// Raw type of `BasePriceResponse` as the quote response sent by meta-transaction endpoints is serialized.
interface RawBasePriceResponse extends RawQuoteBase {
    sellTokenAddress: string;
    buyTokenAddress: string;
    value: string;
    gas: string;
}

/****** Types for 0x-api meta-transaction v1 endpoints ******/
// Raw type of `ExchangeProxyMetaTransaction` as the quote response sent by meta-transaction endpoints is serialized.
interface RawExchangeProxyMetaTransaction {
    signer: string;
    sender: string;
    minGasPrice: string;
    maxGasPrice: string;
    expirationTimeSeconds: string;
    salt: string;
    callData: string;
    value: string;
    feeToken: string;
    feeAmount: string;
    domain: EIP712DomainWithDefaultSchema;
}

interface GetMetaTransactionV1QuoteResponse extends RawBasePriceResponse {
    metaTransactionHash: string;
    metaTransaction: RawExchangeProxyMetaTransaction;
}

/****** Types for 0x-api meta-transaction v2 endpoints ******/
type RawTradeResponse = RawMetaTransactionV1TradeResponse | RawMetaTransactionV2TradeResponse;

interface RawMetaTransactionV1TradeResponse {
    kind: GaslessTypes.MetaTransaction;
    hash: string;
    metaTransaction: Record<keyof Omit<MetaTransactionFields, 'chainId'>, string> & { chainId: number };
}

interface RawMetaTransactionV2TradeResponse {
    kind: GaslessTypes.MetaTransactionV2;
    hash: string;
    metaTransaction: Record<keyof Omit<MetaTransactionV2Fields, 'chainId' | 'fees'>, string> & {
        chainId: number;
    } & Record<
            'fees',
            {
                recipient: string;
                amount: string;
            }[]
        >;
}

// Quote response sent by meta-transaction v2 /quote endpoint
interface GetMetaTransactionV2QuoteResponse extends RawBasePriceResponse {
    trade: RawTradeResponse;
    fees?: RawFees;
}

/****** Response types for client quote endpoints ******/
type MetaTransactionClientTradeResponse = MetaTransactionV1ClientTradeResponse | MetaTransactionV2ClientTradeResponse;

interface MetaTransactionV1ClientTradeResponse {
    kind: GaslessTypes.MetaTransaction;
    hash: string;
    metaTransaction: MetaTransaction;
}

interface MetaTransactionV2ClientTradeResponse {
    kind: GaslessTypes.MetaTransactionV2;
    hash: string;
    metaTransaction: MetaTransactionV2;
}

export interface MetaTransactionClientQuoteResponse {
    trade: MetaTransactionClientTradeResponse;
    price: FetchIndicativeQuoteResponse;
    sources?: LiquiditySource[];
    fees?: Fees;
}

/**
 * Queries the MetaTransaction v1 endpoints for an AMM quote wrapped in a
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
): Promise<MetaTransactionClientQuoteResponse | null> {
    const stopTimer = meter?.requestDurationSummary.startTimer({ chainId: meter.chainId });

    let response: AxiosResponse<GetMetaTransactionV1QuoteResponse>;
    try {
        response = await axiosInstance.get<GetMetaTransactionV1QuoteResponse>(url.toString(), {
            params,
            // TODO (rhinodavid): Formalize this value once we have a good idea of the
            // actual numbers
            timeout: META_TRANSACTION_V1_CLIENT_TIMEOUT_MS,
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

    const { buyAmount, buyTokenAddress, gas, price, sellAmount, sellTokenAddress, metaTransactionHash } = response.data;

    // A fun thing here is that the return from the API, @0x/types:ExchangeProxyMetaTransaction
    // does not match @0x/protocol-utils:MetaTransaction. So, we pull the domain information out
    // and put it at the top level of the constructor parameters
    const metaTransaction = new MetaTransaction(
        stringsToMetaTransactionFields({
            ...response.data.metaTransaction,
            chainId: response.data.metaTransaction.domain.chainId,
            verifyingContract: response.data.metaTransaction.domain.verifyingContract,
        }),
    );

    const computedHash = metaTransaction.getHash();
    if (computedHash !== metaTransactionHash) {
        throw new Error(
            `Computered meta-transaction hash ${computedHash} is different from hash returned from meta-transaction endpoints ${metaTransactionHash}`,
        );
    }

    return {
        trade: {
            kind: GaslessTypes.MetaTransaction,
            hash: metaTransaction.getHash(),
            metaTransaction,
        },
        price: {
            buyAmount: new BigNumber(buyAmount),
            buyTokenAddress,
            gas: new BigNumber(gas),
            price: new BigNumber(price),
            sellAmount: new BigNumber(sellAmount),
            sellTokenAddress,
        },
    };
}

/**
 * Queries the meta-transaction v2 endpoints for a meta-transaction quote wrapped in a
 * meta-transaction. The meta-transaction type returned could be either v1 or v2.
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
): Promise<MetaTransactionClientQuoteResponse | null> {
    const stopTimer = meter?.requestDurationSummary.startTimer({ chainId: meter.chainId });

    let response: AxiosResponse<GetMetaTransactionV2QuoteResponse>;
    try {
        response = await axiosInstance.post<GetMetaTransactionV2QuoteResponse>(url.toString(), params, {
            timeout: META_TRANSACTION_V2_CLIENT_TIMEOUT_MS,
        });
    } catch (e) {
        stopTimer && stopTimer({ success: 'false' });
        return handleQuoteError(e, params, noLiquidityLogger);
    }

    stopTimer && stopTimer({ success: 'true' });

    const {
        buyAmount: rawBuyAmount,
        buyTokenAddress,
        estimatedPriceImpact: rawEstimatedPriceImpact,
        price: rawPrice,
        sellAmount: rawSellAmount,
        sellTokenAddress,
        trade: rawTrade,
    } = response.data;

    // Construct common fields
    const price = {
        buyAmount: new BigNumber(rawBuyAmount),
        buyTokenAddress,
        estimatedPriceImpact: rawEstimatedPriceImpact ? new BigNumber(rawEstimatedPriceImpact) : null,
        price: new BigNumber(rawPrice),
        sellAmount: new BigNumber(rawSellAmount),
        sellTokenAddress,
    };
    const sources = response.data.sources
        .map((source) => {
            return {
                ...source,
                proportion: new BigNumber(source.proportion),
            };
        })
        .filter((source) => source.proportion.gt(ZERO));
    const fees = rawFeesToFees(response.data.fees);

    // Typescript does not narrow types on nested values so need to extract it explicitly
    const tradeKind = rawTrade.kind;
    switch (tradeKind) {
        case GaslessTypes.MetaTransaction: {
            const metaTransaction = new MetaTransaction(
                stringsToMetaTransactionFields({
                    ...rawTrade.metaTransaction,
                }),
            );

            const computedHash = metaTransaction.getHash();
            if (computedHash !== rawTrade.hash) {
                throw new Error(
                    `Computered meta-transaction hash ${computedHash} is different from hash returned from meta-transaction endpoints ${rawTrade.hash}`,
                );
            }

            return {
                trade: {
                    kind: GaslessTypes.MetaTransaction,
                    hash: rawTrade.hash,
                    metaTransaction,
                },
                price,
                sources,
                fees,
            };
        }
        case GaslessTypes.MetaTransactionV2: {
            const metaTransaction = new MetaTransactionV2(
                stringsToMetaTransactionV2Fields({ ...rawTrade.metaTransaction }),
            );

            const computedHash = metaTransaction.getHash();
            if (computedHash !== rawTrade.hash) {
                throw new Error(
                    `Computered meta-transaction v2 hash ${computedHash} is different from hash returned from meta-transaction endpoints ${rawTrade.hash}`,
                );
            }

            return {
                trade: {
                    kind: GaslessTypes.MetaTransactionV2,
                    hash: rawTrade.hash,
                    metaTransaction,
                },
                price,
                sources,
                fees,
            };
        }
        default:
            ((_x: never) => {
                throw new Error('unreachable');
            })(tradeKind);
    }
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
