import {
    ERC20BridgeSource,
    getSwapMinBuyAmount,
    OptimizedMarketOrder,
    SignedOrder,
    SwapQuote,
    SwapQuoteOrdersBreakdown,
} from '@0x/asset-swapper';
import { assetDataUtils } from '@0x/order-utils';
import { AbiEncoder, BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import { CHAIN_ID, FEE_RECIPIENT_ADDRESS } from '../config';
import {
    AFFILIATE_FEE_TRANSFORMER_GAS,
    DEFAULT_TOKEN_DECIMALS,
    HEX_BASE,
    ONE_SECOND_MS,
    PERCENTAGE_SIG_DIGITS,
    ZERO,
} from '../constants';
import { logger } from '../logger';
import { AffiliateFeeAmounts, GetSwapQuoteResponseLiquiditySource, PercentageFee } from '../types';
import { orderUtils } from '../utils/order_utils';
import { findTokenDecimalsIfExists } from '../utils/token_metadata_utils';

import { numberUtils } from './number_utils';

export const serviceUtils = {
    attributeSwapQuoteOrders(orders: OptimizedMarketOrder[]): OptimizedMarketOrder[] {
        // Where possible, attribute any fills of these orders to the Fee Recipient Address
        return orders.map(o => {
            try {
                const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData);
                if (orderUtils.isBridgeAssetData(decodedAssetData)) {
                    return {
                        ...o,
                        feeRecipientAddress: FEE_RECIPIENT_ADDRESS,
                    };
                }
                // tslint:disable-next-line:no-empty
            } catch (err) {}
            // Default to unmodified order
            return o;
        });
    },

    attributeCallData(
        data: string,
        affiliateAddress?: string,
    ): {
        affiliatedData: string;
        decodedUniqueId: string;
    } {
        const affiliateAddressOrDefault = affiliateAddress ? affiliateAddress : FEE_RECIPIENT_ADDRESS;
        const affiliateCallDataEncoder = new AbiEncoder.Method({
            constant: true,
            outputs: [],
            name: 'ZeroExAPIAffiliate',
            inputs: [
                { name: 'affiliate', type: 'address' },
                { name: 'timestamp', type: 'uint256' },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
        });

        // Generate unique identiifer
        const timestampInSeconds = new BigNumber(Date.now() / ONE_SECOND_MS).integerValue();
        const hexTimestamp = timestampInSeconds.toString(HEX_BASE);
        const randomNumber = numberUtils.randomHexNumberOfLength(10);

        // Concatenate the hex identifier with the hex timestamp
        // In the final encoded call data, this will leave us with a 5-byte ID followed by
        // a 4-byte timestamp, and won't break parsers of the timestamp made prior to the
        // addition of the ID
        const uniqueIdentifier = new BigNumber(`${randomNumber}${hexTimestamp}`, HEX_BASE);

        // Encode additional call data and return
        const encodedAffiliateData = affiliateCallDataEncoder.encode([affiliateAddressOrDefault, uniqueIdentifier]);
        const affiliatedData = `${data}${encodedAffiliateData.slice(2)}`;
        return { affiliatedData, decodedUniqueId: `${randomNumber}-${timestampInSeconds}` };
    },

    // tslint:disable-next-line:prefer-function-over-method
    cleanSignedOrderFields(orders: SignedOrder[]): SignedOrder[] {
        return orders.map(o => ({
            chainId: o.chainId,
            exchangeAddress: o.exchangeAddress,
            makerAddress: o.makerAddress,
            takerAddress: o.takerAddress,
            feeRecipientAddress: o.feeRecipientAddress,
            senderAddress: o.senderAddress,
            makerAssetAmount: o.makerAssetAmount,
            takerAssetAmount: o.takerAssetAmount,
            makerFee: o.makerFee,
            takerFee: o.takerFee,
            expirationTimeSeconds: o.expirationTimeSeconds,
            salt: o.salt,
            makerAssetData: o.makerAssetData,
            takerAssetData: o.takerAssetData,
            makerFeeAssetData: o.makerFeeAssetData,
            takerFeeAssetData: o.takerFeeAssetData,
            signature: o.signature,
        }));
    },

    async fetchTokenDecimalsIfRequiredAsync(tokenAddress: string, web3Wrapper: Web3Wrapper): Promise<number> {
        // HACK(dekz): Our ERC20Wrapper does not have decimals as it is optional
        // so we must encode this ourselves
        let decimals = findTokenDecimalsIfExists(tokenAddress, CHAIN_ID);
        if (!decimals) {
            const decimalsEncoder = new AbiEncoder.Method({
                constant: true,
                inputs: [],
                name: 'decimals',
                outputs: [{ name: '', type: 'uint8' }],
                payable: false,
                stateMutability: 'view',
                type: 'function',
            });
            const encodedCallData = decimalsEncoder.encode(tokenAddress);
            try {
                const result = await web3Wrapper.callAsync({ data: encodedCallData, to: tokenAddress });
                decimals = decimalsEncoder.strictDecodeReturnValue<number>(result);
                logger.info(`Unmapped token decimals ${tokenAddress} ${decimals}`);
            } catch (err) {
                logger.warn(`Error fetching token decimals ${tokenAddress}`);
                decimals = DEFAULT_TOKEN_DECIMALS;
            }
        }
        return decimals;
    },
    /**
     * Returns a new list of excluded sources that may contain additional excluded sources that were determined to be excluded.
     * @param currentExcludedSources the current list of `excludedSources`
     * @param apiKey the `0x-api-key` that was passed into the headers
     * @param allowedApiKeys an array of eligible API keys
     * @returns a copy of `currentExcludedSources` which may include additional excluded sources
     */
    determineExcludedSources(
        currentExcludedSources: ERC20BridgeSource[],
        apiKey: string | undefined,
        allowedApiKeys: string[],
    ): ERC20BridgeSource[] {
        const isWildcardEnabled = allowedApiKeys.length === 1 && allowedApiKeys[0] === '*';
        const isAPIKeyEnabled = isWildcardEnabled || allowedApiKeys.includes(apiKey);
        if (!isAPIKeyEnabled && !currentExcludedSources.includes(ERC20BridgeSource.LiquidityProvider)) {
            return currentExcludedSources.concat(ERC20BridgeSource.LiquidityProvider);
        }
        return currentExcludedSources;
    },
    convertSourceBreakdownToArray(sourceBreakdown: SwapQuoteOrdersBreakdown): GetSwapQuoteResponseLiquiditySource[] {
        const defaultSourceBreakdown: SwapQuoteOrdersBreakdown = Object.assign(
            {},
            ...Object.values(ERC20BridgeSource).map(s => ({ [s]: ZERO })),
        );

        return Object.entries({ ...defaultSourceBreakdown, ...sourceBreakdown }).reduce((acc, [source, breakdown]) => {
            let obj;
            if (source === ERC20BridgeSource.MultiHop && !BigNumber.isBigNumber(breakdown)) {
                obj = {
                    ...breakdown,
                    name: ERC20BridgeSource.MultiHop,
                    proportion: new BigNumber(breakdown.proportion.toPrecision(PERCENTAGE_SIG_DIGITS)),
                };
            } else {
                obj = {
                    name: source === ERC20BridgeSource.Native ? '0x' : source,
                    proportion: new BigNumber((breakdown as BigNumber).toPrecision(PERCENTAGE_SIG_DIGITS)),
                };
            }
            return [...acc, obj];
        }, []);
    },
    getAffiliateFeeAmounts(quote: SwapQuote, fee: PercentageFee): AffiliateFeeAmounts {
        const minBuyAmount = getSwapMinBuyAmount(quote);
        const buyTokenFeeAmount = minBuyAmount
            .times(fee.buyTokenPercentageFee)
            .dividedBy(fee.buyTokenPercentageFee + 1)
            .integerValue(BigNumber.ROUND_DOWN);
        return {
            sellTokenFeeAmount: ZERO,
            buyTokenFeeAmount,
            gasCost: buyTokenFeeAmount.isZero() ? ZERO : AFFILIATE_FEE_TRANSFORMER_GAS,
        };
    },
};
