import {
    ERC20BridgeSource,
    MarketBuySwapQuote,
    MarketSellSwapQuote,
    SignedOrder,
    SwapQuoteOrdersBreakdown,
} from '@0x/asset-swapper';
import { assetDataUtils } from '@0x/order-utils';
import { AbiEncoder, BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { CHAIN_ID, FEE_RECIPIENT_ADDRESS } from '../config';
import { DEFAULT_TOKEN_DECIMALS, ONE_SECOND_MS, PERCENTAGE_SIG_DIGITS, ZERO } from '../constants';
import { logger } from '../logger';
import { GetSwapQuoteResponseLiquiditySource } from '../types';
import { orderUtils } from '../utils/order_utils';
import { findTokenDecimalsIfExists } from '../utils/token_metadata_utils';

export const serviceUtils = {
    attributeSwapQuoteOrders(
        swapQuote: MarketSellSwapQuote | MarketBuySwapQuote,
    ): MarketSellSwapQuote | MarketBuySwapQuote {
        // Where possible, attribute any fills of these orders to the Fee Recipient Address
        const attributedOrders = swapQuote.orders.map(o => {
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
        const attributedSwapQuote = {
            ...swapQuote,
            orders: attributedOrders,
        };
        return attributedSwapQuote;
    },

    attributeCallData(data: string, affiliateAddress?: string): string {
        const affiliateAddressOrDefault = affiliateAddress ? affiliateAddress : FEE_RECIPIENT_ADDRESS;
        const affiliateCallDataEncoder = new AbiEncoder.Method({
            constant: true,
            outputs: [],
            name: 'ZeroExAPIAffiliate',
            inputs: [{ name: 'affiliate', type: 'address' }, { name: 'timestamp', type: 'uint256' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
        });
        const timestamp = new BigNumber(Date.now() / ONE_SECOND_MS).integerValue();
        const encodedAffiliateData = affiliateCallDataEncoder.encode([affiliateAddressOrDefault, timestamp]);
        const affiliatedData = `${data}${encodedAffiliateData.slice(2)}`;
        return affiliatedData;
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

    convertSourceBreakdownToArray(sourceBreakdown: SwapQuoteOrdersBreakdown): GetSwapQuoteResponseLiquiditySource[] {
        const defaultSourceBreakdown: SwapQuoteOrdersBreakdown = Object.assign(
            {},
            ...Object.values(ERC20BridgeSource).map(s => ({ [s]: ZERO })),
        );

        const breakdown: GetSwapQuoteResponseLiquiditySource[] = [];
        return Object.entries({ ...defaultSourceBreakdown, ...sourceBreakdown }).reduce(
            (acc: GetSwapQuoteResponseLiquiditySource[], [source, percentage]) => {
                return [
                    ...acc,
                    {
                        name: source === ERC20BridgeSource.Native ? '0x' : source,
                        proportion: new BigNumber(percentage.toPrecision(PERCENTAGE_SIG_DIGITS)),
                    },
                ];
            },
            breakdown,
        );
    },
};
