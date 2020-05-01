import { Orderbook, SwapQuoter, SwapQuoterOpts } from '@0x/asset-swapper';
import { ContractWrappers } from '@0x/contract-wrappers';
import { DevUtilsContract } from '@0x/contracts-dev-utils';
import { generatePseudoRandomSalt, SupportedProvider, ZeroExTransaction } from '@0x/order-utils';
import { SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import { ASSET_SWAPPER_MARKET_ORDERS_OPTS, CHAIN_ID, LIQUIDITY_POOL_REGISTRY_ADDRESS } from '../config';
import { ONE_GWEI, ONE_SECOND_MS, QUOTE_ORDER_EXPIRATION_BUFFER_MS, TEN_MINUTES_MS } from '../constants';
import {
    CalculateMetaTransactionPriceResponse,
    CalculateMetaTransactionQuoteParams,
    GetMetaTransactionQuoteResponse,
} from '../types';
import { serviceUtils } from '../utils/service_utils';

export class MetaTransactionService {
    private readonly _provider: SupportedProvider;
    private readonly _swapQuoter: SwapQuoter;
    private readonly _contractWrappers: ContractWrappers;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _devUtils: DevUtilsContract;

    constructor(orderbook: Orderbook, provider: SupportedProvider) {
        this._provider = provider;
        const swapQuoterOpts: Partial<SwapQuoterOpts> = {
            chainId: CHAIN_ID,
            expiryBufferMs: QUOTE_ORDER_EXPIRATION_BUFFER_MS,
            liquidityProviderRegistryAddress: LIQUIDITY_POOL_REGISTRY_ADDRESS,
        };
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._contractWrappers = new ContractWrappers(this._provider, { chainId: CHAIN_ID });
        this._web3Wrapper = new Web3Wrapper(this._provider);
        this._devUtils = new DevUtilsContract(this._contractWrappers.contractAddresses.devUtils, this._provider);
    }
    public async calculateMetaTransactionPriceAsync(
        params: CalculateMetaTransactionQuoteParams,
        endpoint: 'price' | 'quote',
    ): Promise<CalculateMetaTransactionPriceResponse> {
        const {
            takerAddress,
            sellAmount,
            buyAmount,
            buyTokenAddress,
            sellTokenAddress,
            slippagePercentage,
            excludedSources,
            apiKey,
        } = params;

        let _rfqt;
        if (apiKey !== undefined) {
            _rfqt = {
                intentOnFilling: endpoint === 'quote',
                isIndicative: endpoint === 'price',
                apiKey,
                takerAddress,
            };
        }
        const assetSwapperOpts = {
            ...ASSET_SWAPPER_MARKET_ORDERS_OPTS,
            slippagePercentage,
            bridgeSlippage: slippagePercentage,
            excludedSources, // TODO(dave4506): overrides the excluded sources selected by chainId
            rfqt: _rfqt,
        };

        let swapQuote;
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

        const makerAssetAmount = swapQuote.bestCaseQuoteInfo.makerAssetAmount;
        const totalTakerAssetAmount = swapQuote.bestCaseQuoteInfo.totalTakerAssetAmount;

        const buyTokenDecimals = await serviceUtils.fetchTokenDecimalsIfRequiredAsync(
            buyTokenAddress,
            this._web3Wrapper,
        );
        const sellTokenDecimals = await serviceUtils.fetchTokenDecimalsIfRequiredAsync(
            sellTokenAddress,
            this._web3Wrapper,
        );
        const unitMakerAssetAmount = Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
        const unitTakerAssetAMount = Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
        const price =
            buyAmount === undefined
                ? unitMakerAssetAmount.dividedBy(unitTakerAssetAMount).decimalPlaces(sellTokenDecimals)
                : unitTakerAssetAMount.dividedBy(unitMakerAssetAmount).decimalPlaces(buyTokenDecimals);

        const response: CalculateMetaTransactionPriceResponse = {
            takerAddress,
            sellAmount,
            buyAmount,
            price,
            swapQuote,
            sources: serviceUtils.convertSourceBreakdownToArray(swapQuote.sourceBreakdown),
        };
        return response;
    }
    public async calculateMetaTransactionQuoteAsync(
        params: CalculateMetaTransactionQuoteParams,
    ): Promise<GetMetaTransactionQuoteResponse> {
        const { takerAddress, sellAmount, buyAmount, swapQuote, price } = await this.calculateMetaTransactionPriceAsync(
            params,
            'quote',
        );

        const floatGasPrice = swapQuote.gasPrice;
        const gasPrice = floatGasPrice
            .div(ONE_GWEI)
            .integerValue(BigNumber.ROUND_UP)
            .times(ONE_GWEI);
        const attributedSwapQuote = serviceUtils.attributeSwapQuoteOrders(swapQuote);
        const { orders, sourceBreakdown } = attributedSwapQuote;
        const signatures = orders.map(order => order.signature);

        const zeroExTransaction = this._generateZeroExTransaction(
            orders,
            sellAmount,
            buyAmount,
            signatures,
            takerAddress,
            gasPrice,
        );

        // use the DevUtils contract to generate the transaction hash
        const zeroExTransactionHash = await this._devUtils
            .getTransactionHash(
                zeroExTransaction,
                new BigNumber(CHAIN_ID),
                this._contractWrappers.contractAddresses.exchange,
            )
            .callAsync();

        const makerAssetAmount = swapQuote.bestCaseQuoteInfo.makerAssetAmount;
        const totalTakerAssetAmount = swapQuote.bestCaseQuoteInfo.totalTakerAssetAmount;
        const apiMetaTransactionQuote: GetMetaTransactionQuoteResponse = {
            price,
            zeroExTransactionHash,
            zeroExTransaction,
            buyAmount: makerAssetAmount,
            sellAmount: totalTakerAssetAmount,
            orders: serviceUtils.cleanSignedOrderFields(orders),
            sources: serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
        };
        return apiMetaTransactionQuote;
    }
    private _generateZeroExTransaction(
        orders: SignedOrder[],
        sellAmount: BigNumber | undefined,
        buyAmount: BigNumber | undefined,
        signatures: string[],
        takerAddress: string,
        gasPrice: BigNumber,
    ): ZeroExTransaction {
        // generate txData for marketSellOrdersFillOrKill or marketBuyOrdersFillOrKill
        let txData;
        if (sellAmount !== undefined) {
            txData = this._contractWrappers.exchange
                .marketSellOrdersFillOrKill(orders, sellAmount, signatures)
                .getABIEncodedTransactionData();
        } else if (buyAmount !== undefined) {
            txData = this._contractWrappers.exchange
                .marketBuyOrdersFillOrKill(orders, buyAmount, signatures)
                .getABIEncodedTransactionData();
        } else {
            throw new Error('sellAmount or buyAmount required');
        }

        // generate the zeroExTransaction object
        const expirationTimeSeconds = new BigNumber(Date.now() + TEN_MINUTES_MS)
            .div(ONE_SECOND_MS)
            .integerValue(BigNumber.ROUND_CEIL);
        const zeroExTransaction: ZeroExTransaction = {
            data: txData,
            salt: generatePseudoRandomSalt(),
            signerAddress: takerAddress,
            gasPrice,
            expirationTimeSeconds,
            domain: {
                chainId: CHAIN_ID,
                verifyingContract: this._contractWrappers.contractAddresses.exchange,
            },
        };
        return zeroExTransaction;
    }
}
