import {
    ExtensionContractType,
    MarketBuySwapQuote,
    MarketSellSwapQuote,
    Orderbook,
    SignedOrder,
    SwapQuoteConsumer,
    SwapQuoter,
} from '@0x/asset-swapper';
import { assetDataUtils, SupportedProvider } from '@0x/order-utils';
import { AbiEncoder, BigNumber, RevertError } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';

import { CHAIN_ID, FEE_RECIPIENT_ADDRESS } from '../config';
import {
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    DEFAULT_TOKEN_DECIMALS,
    QUOTE_ORDER_EXPIRATION_BUFFER_MS,
} from '../constants';
import { logger } from '../logger';
import { CalculateSwapQuoteParams, GetSwapQuoteResponse } from '../types';
import { orderUtils } from '../utils/order_utils';
import { findTokenDecimalsIfExists } from '../utils/token_metadata_utils';

export class SwapService {
    private readonly _provider: SupportedProvider;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _swapQuoteConsumer: SwapQuoteConsumer;
    private readonly _web3Wrapper: Web3Wrapper;
    constructor(orderbook: Orderbook, provider: SupportedProvider) {
        this._provider = provider;
        const swapQuoterOpts = {
            chainId: CHAIN_ID,
            expiryBufferMs: QUOTE_ORDER_EXPIRATION_BUFFER_MS,
        };
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._swapQuoteConsumer = new SwapQuoteConsumer(this._provider);
        this._web3Wrapper = new Web3Wrapper(this._provider);
    }
    public async calculateSwapQuoteAsync(params: CalculateSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        let swapQuote;
        const {
            sellAmount,
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            slippagePercentage,
            gasPrice: providedGasPrice,
            isETHSell,
            from,
        } = params;
        const assetSwapperOpts = {
            slippagePercentage,
            gasPrice: providedGasPrice,
            ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
        };
        if (sellAmount !== undefined) {
            swapQuote = await this._swapQuoter.getMarketSellSwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                sellAmount,
                assetSwapperOpts,
            );
        } else if (buyAmount !== undefined) {
            swapQuote = await this._swapQuoter.getMarketBuySwapQuoteAsync(
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                assetSwapperOpts,
            );
        } else {
            throw new Error('sellAmount or buyAmount required');
        }
        const attributedSwapQuote = this._attributeSwapQuoteOrders(swapQuote);
        const {
            makerAssetAmount,
            totalTakerAssetAmount,
            protocolFeeInWeiAmount: protocolFee,
        } = attributedSwapQuote.bestCaseQuoteInfo;
        const { orders, gasPrice } = attributedSwapQuote;

        // If ETH was specified as the token to sell then we use the Forwarder
        const extensionContractType = isETHSell ? ExtensionContractType.Forwarder : ExtensionContractType.None;
        const {
            calldataHexString: data,
            ethAmount: value,
            toAddress: to,
        } = await this._swapQuoteConsumer.getCalldataOrThrowAsync(attributedSwapQuote, {
            useExtensionContract: extensionContractType,
            extensionContractOpts: {
                // Apply the Fee Recipient for the Forwarder
                feeRecipient: FEE_RECIPIENT_ADDRESS,
            },
        });

        let gas;
        if (from) {
            gas = await this._estimateGasOrThrowRevertErrorAsync({
                to,
                data,
                from,
                value,
                gasPrice,
            });
        }

        const buyTokenDecimals = await this._fetchTokenDecimalsIfRequiredAsync(buyTokenAddress);
        const sellTokenDecimals = await this._fetchTokenDecimalsIfRequiredAsync(sellTokenAddress);
        const price = Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals)
            .dividedBy(Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals))
            .decimalPlaces(sellTokenDecimals);

        const apiSwapQuote: GetSwapQuoteResponse = {
            price,
            to,
            data,
            value,
            gas,
            from,
            gasPrice,
            protocolFee,
            makerAssetAmount,
            totalTakerAssetAmount,
            orders: this._cleanSignedOrderFields(orders),
        };
        return apiSwapQuote;
    }

    private async _estimateGasOrThrowRevertErrorAsync(txData: Partial<TxData>): Promise<BigNumber> {
        // Perform this concurrently
        // if the call fails the gas estimation will also fail, we can throw a more helpful
        // error message than gas estimation failure
        const estimateGasPromise = this._web3Wrapper.estimateGasAsync(txData);
        const callResult = await this._web3Wrapper.callAsync(txData);
        throwIfRevertError(callResult);
        const gas = await estimateGasPromise;
        return new BigNumber(gas);
    }

    // tslint:disable-next-line:prefer-function-over-method
    private _attributeSwapQuoteOrders(
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
    }

    // tslint:disable-next-line:prefer-function-over-method
    private _cleanSignedOrderFields(orders: SignedOrder[]): SignedOrder[] {
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
    }
    private async _fetchTokenDecimalsIfRequiredAsync(tokenAddress: string): Promise<number> {
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
                const result = await this._web3Wrapper.callAsync({ data: encodedCallData, to: tokenAddress });
                decimals = decimalsEncoder.strictDecodeReturnValue<BigNumber>(result).toNumber();
                logger.info(`Unmapped token decimals ${tokenAddress} ${decimals}`);
            } catch (err) {
                logger.error(`Error fetching token decimals ${tokenAddress}`);
                decimals = DEFAULT_TOKEN_DECIMALS;
            }
        }
        return decimals;
    }
}

const throwIfRevertError = (result: string): void => {
    let revertError;
    try {
        revertError = RevertError.decode(result, false);
    } catch (e) {
        // No revert error
    }
    if (revertError) {
        throw revertError;
    }
};
