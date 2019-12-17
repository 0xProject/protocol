import { ExtensionContractType, Orderbook, SwapQuoteConsumer, SwapQuoter } from '@0x/asset-swapper';
import { SupportedProvider } from '@0x/order-utils';
import { BigNumber, RevertError } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';

import { CHAIN_ID } from '../config';
import {
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    DEFAULT_TOKEN_DECIMALS,
    QUOTE_ORDER_EXPIRATION_BUFFER_MS,
} from '../constants';
import { CalculateSwapQuoteParams, GetSwapQuoteResponse } from '../types';
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
        const {
            makerAssetAmount,
            totalTakerAssetAmount,
            protocolFeeInWeiAmount: protocolFee,
        } = swapQuote.bestCaseQuoteInfo;
        const { orders, gasPrice } = swapQuote;

        // If ETH was specified as the token to sell then we use the Forwarder
        const extensionContractType = isETHSell ? ExtensionContractType.Forwarder : ExtensionContractType.None;
        const {
            calldataHexString: data,
            ethAmount: value,
            toAddress: to,
        } = await this._swapQuoteConsumer.getCalldataOrThrowAsync(swapQuote, {
            useExtensionContract: extensionContractType,
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

        const buyTokenDecimals = findTokenDecimalsIfExists(buyTokenAddress, CHAIN_ID) || DEFAULT_TOKEN_DECIMALS;
        const sellTokenDecimals = findTokenDecimalsIfExists(sellTokenAddress, CHAIN_ID) || DEFAULT_TOKEN_DECIMALS;
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
            orders,
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
