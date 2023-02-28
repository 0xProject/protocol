import { WETH9Contract } from '@0x/contract-wrappers';
import { ETH_TOKEN_ADDRESS, RevertError } from '@0x/protocol-utils';
import { getTokenMetadataIfExists } from '@0x/token-metadata';
import { MarketOperation } from '@0x/types';
import { BigNumber, decodeThrownErrorAsRevertError } from '@0x/utils';
import { TxData, Web3Wrapper } from '@0x/web3-wrapper';
import axios from 'axios';
import { SupportedProvider } from 'ethereum-types';
import * as _ from 'lodash';
import { Counter } from 'prom-client';

import {
    AffiliateFeeAmount,
    AffiliateFeeType,
    AltRfqMakerAssetOfferings,
    artifacts,
    AssetSwapperContractAddresses,
    BlockParamLiteral,
    ContractAddresses,
    FakeTakerContract,
    GetMarketOrdersRfqOpts,
    IdentityFillAdjustor,
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
    Orderbook,
    RfqFirmQuoteValidator,
    SwapQuote,
    SwapQuoteConsumer,
    SwapQuoter,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
    ZERO_AMOUNT,
} from '../asset-swapper';
import { ExchangeProxySwapQuoteConsumer } from '../asset-swapper/quote_consumers/exchange_proxy_swap_quote_consumer';
import { ExchangeProxyContractOpts } from '../asset-swapper/types';
import {
    ALT_RFQ_MM_API_KEY,
    ALT_RFQ_MM_ENDPOINT,
    CHAIN_HAS_VIPS,
    CHAIN_ID,
    RFQT_REQUEST_MAX_RESPONSE_MS,
    UNWRAP_QUOTE_GAS,
    WRAP_QUOTE_GAS,
    ZERO_EX_FEE_RECIPIENT_ADDRESS,
    ZERO_EX_FEE_TOKENS,
} from '../config';
import {
    ASSET_SWAPPER_MARKET_ORDERS_OPTS,
    ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP,
    SWAP_QUOTER_OPTS,
} from '../options';
import {
    AVG_MULTIPLEX_TRANFORM_ERC_20_GAS,
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    DEFAULT_VALIDATION_GAS_LIMIT,
    GAS_LIMIT_BUFFER_MULTIPLIER,
    NULL_ADDRESS,
    NULL_BYTES,
    ONE,
    ONE_MINUTE_MS,
    TRANSFER_FROM_GAS,
    TRANSFER_GAS,
    ZERO,
} from '../constants';
import {
    GasEstimationError,
    InsufficientFundsError,
    ServiceDisabledError,
    ValidationError,
    ValidationErrorCodes,
    ValidationErrorReasons,
} from '../errors';
import { logger } from '../logger';
import {
    AffiliateFee,
    FeeConfigs,
    Fees,
    GetSwapQuoteParams,
    GetSwapQuoteResponse,
    ISwapService,
    SwapQuoteResponsePartialTransaction,
} from '../types';
import { altMarketResponseToAltOfferings } from '../utils/alt_mm_utils';
import { calculateFees } from '../utils/fee_calculator';
import { createResultCache } from '../utils/result_cache';
import { RfqClient } from '../utils/rfq_client';
import { RfqDynamicBlacklist } from '../utils/rfq_dyanmic_blacklist';
import { serviceUtils, getBuyTokenPercentageFeeOrZero } from '../utils/service_utils';
import { SlippageModelFillAdjustor } from '../utils/slippage_model_fill_adjustor';
import { SlippageModelManager } from '../utils/slippage_model_manager';
import { utils } from '../utils/utils';
import { ChainId } from '@0x/contract-addresses';

const PRICE_IMPACT_TOO_HIGH = new Counter({
    name: 'price_impact_too_high',
    help: 'The number of price impact events',
    labelNames: ['reason'],
});

export class SwapService implements ISwapService {
    private readonly _provider: SupportedProvider;
    private readonly _fakeTaker: FakeTakerContract;
    private readonly _swapQuoteConsumer: SwapQuoteConsumer;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _wethContract: WETH9Contract;
    private readonly _contractAddresses: ContractAddresses;
    private readonly _firmQuoteValidator: RfqFirmQuoteValidator | undefined;
    private readonly _swapQuoterOpts: Partial<SwapQuoterOpts>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
    private _altRfqMarketsCache: any;
    private _swapQuoter: SwapQuoter;

    /**
     * Returns an estimated price impact percent. This is estimated
     * as the information used for calculation is based off of
     * median values (fee sources) and not an exhaustive set of liquidity sources
     * @param price the final price from the swap quote (inverted if buys)
     * @param sellTokenToEthRate the rate of selling the sellToken to the native asset (e.g USDC->FTM)
     * @param buyTokenToEthRate  the rate of selling the buy token to the native asset (e.g DAI->FTM)
     * @param marketSide whether this is a sell or a buy (as the price is flipped)
     * @returns an estimated price impact percentage calculated from the fee sources (median value).
     * We return null if we are unable to calculate a price impact
     */
    private static _calculateEstimatedPriceImpactPercent(
        price: BigNumber,
        sellTokenToEthRate: BigNumber,
        buyTokenToEthRate: BigNumber,
        marketSide: MarketOperation,
    ): BigNumber | null {
        // There are cases where our fee source information is limited
        // since it is only a shallow search, as such we can't calculate price impact
        if (sellTokenToEthRate.isZero() || buyTokenToEthRate.isZero()) {
            return null;
        }
        // ETH to USDC
        // price: "2418.92"
        // sellTokenToEthRate: "1"
        // buyTokenToEthRate: "2438.74"

        // If sell then price is in taker token, if buy price is inverted
        const normalizedPrice = marketSide === MarketOperation.Sell ? price : new BigNumber(1).dividedBy(price);
        // 2418.92 / (2438.74/1) = 0.99187 or 99.187%
        const actualPriceToEstimatedPriceRatio = normalizedPrice.dividedBy(
            buyTokenToEthRate.dividedBy(sellTokenToEthRate),
        );
        // 0.99187 -> 0.812%
        const estimatedPriceImpactPercentage = new BigNumber(1)
            .minus(actualPriceToEstimatedPriceRatio)
            .times(100)
            .decimalPlaces(4, BigNumber.ROUND_CEIL);

        // In theory, price impact should always be positive
        // the sellTokenToEthRate and buyTokenToEthRate are calculated
        // from fee sources which is a median and not an exhaustive list
        // of all sources, so it's possible that the median price is less
        // than the best route
        if (estimatedPriceImpactPercentage.isLessThanOrEqualTo(0)) {
            return ZERO_AMOUNT;
        }

        return estimatedPriceImpactPercentage;
    }

    private static _getSwapQuotePrice(
        buyAmount: BigNumber | undefined,
        buyTokenDecimals: number,
        sellTokenDecimals: number,
        swapQuote: SwapQuote,
        affiliateFee: AffiliateFee,
        sellTokenFeeAmount: BigNumber,
    ): { price: BigNumber; guaranteedPrice: BigNumber } {
        const { makerAmount, totalTakerAmount } = swapQuote.bestCaseQuoteInfo;
        const { totalTakerAmount: guaranteedTotalTakerAmount, makerAmount: guaranteedMakerAmount } =
            swapQuote.worstCaseQuoteInfo;
        const unitMakerAmount = Web3Wrapper.toUnitAmount(makerAmount, buyTokenDecimals);
        const unitTakerAmount = Web3Wrapper.toUnitAmount(totalTakerAmount.plus(sellTokenFeeAmount), sellTokenDecimals);
        const guaranteedUnitMakerAmount = Web3Wrapper.toUnitAmount(guaranteedMakerAmount, buyTokenDecimals);
        const guaranteedUnitTakerAmount = Web3Wrapper.toUnitAmount(
            guaranteedTotalTakerAmount.plus(sellTokenFeeAmount),
            sellTokenDecimals,
        );
        const affiliateFeeUnitMakerAmount = guaranteedUnitMakerAmount.times(
            getBuyTokenPercentageFeeOrZero(affiliateFee),
        );

        const isSelling = buyAmount === undefined;
        // NOTE: In order to not communicate a price better than the actual quote we
        // should make sure to always round towards a worse price
        const roundingStrategy = isSelling ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_CEIL;
        // Best price
        const price = isSelling
            ? unitMakerAmount
                  .minus(affiliateFeeUnitMakerAmount)
                  .dividedBy(unitTakerAmount)
                  .decimalPlaces(buyTokenDecimals, roundingStrategy)
            : unitTakerAmount
                  .dividedBy(unitMakerAmount.minus(affiliateFeeUnitMakerAmount))
                  .decimalPlaces(sellTokenDecimals, roundingStrategy);
        // Guaranteed price before revert occurs
        const guaranteedPrice = isSelling
            ? guaranteedUnitMakerAmount
                  .minus(affiliateFeeUnitMakerAmount)
                  .dividedBy(guaranteedUnitTakerAmount)
                  .decimalPlaces(buyTokenDecimals, roundingStrategy)
            : guaranteedUnitTakerAmount
                  .dividedBy(guaranteedUnitMakerAmount.minus(affiliateFeeUnitMakerAmount))
                  .decimalPlaces(sellTokenDecimals, roundingStrategy);
        return {
            price,
            guaranteedPrice,
        };
    }

    constructor(
        orderbook: Orderbook,
        provider: SupportedProvider,
        contractAddresses: AssetSwapperContractAddresses,
        private readonly _rfqClient: RfqClient,
        firmQuoteValidator?: RfqFirmQuoteValidator | undefined,
        rfqDynamicBlacklist?: RfqDynamicBlacklist,
        readonly slippageModelManager?: SlippageModelManager,
    ) {
        this._provider = provider;
        this._firmQuoteValidator = firmQuoteValidator;

        this._swapQuoterOpts = {
            ...SWAP_QUOTER_OPTS,
            contractAddresses,
        };

        if (this._swapQuoterOpts.rfqt !== undefined && rfqDynamicBlacklist !== undefined) {
            this._swapQuoterOpts.rfqt.txOriginBlacklist = rfqDynamicBlacklist;
        }

        if (CHAIN_ID === ChainId.Ganache) {
            this._swapQuoterOpts.samplerOverrides = {
                block: BlockParamLiteral.Latest,
                overrides: {},
                to: contractAddresses.erc20BridgeSampler,
                ...(this._swapQuoterOpts.samplerOverrides || {}),
            };
        }
        this._swapQuoter = new SwapQuoter(this._provider, orderbook, this._swapQuoterOpts);

        this._swapQuoteConsumer = ExchangeProxySwapQuoteConsumer.create(CHAIN_ID, contractAddresses);
        this._web3Wrapper = new Web3Wrapper(this._provider);

        this._contractAddresses = contractAddresses;
        this._wethContract = new WETH9Contract(this._contractAddresses.etherToken, this._provider);
        this._fakeTaker = new FakeTakerContract(NULL_ADDRESS, this._provider);
    }

    public async calculateSwapQuoteAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        const {
            endpoint,
            takerAddress,
            sellAmount,
            buyAmount,
            buyToken,
            sellToken,
            slippagePercentage,
            isETHSell,
            isETHBuy,
            excludedSources,
            includedSources,
            integrator,
            feeConfigs,
            metaTransactionVersion,
            rfqt,
            affiliateAddress,
            affiliateFee,
            skipValidation,
            shouldSellEntireBalance,
            enableSlippageProtection,
            priceImpactProtectionPercentage,
        } = params;
        let { gasPrice: providedGasPrice } = params;

        let _rfqt: GetMarketOrdersRfqOpts | undefined;

        // If rfqt is exclusively asked but the service is unavailable, throw an explicit error.
        if (rfqt && _.isEqual(includedSources, ['RFQT']) && !this._rfqClient.isRfqtEnabled()) {
            throw new ServiceDisabledError('RFQt Service is not available');
        }

        // Only enable RFQT if there's an API key and either (a) it's a
        // forwarder transaction (isETHSell===true), (b) there's a taker
        // address present, or (c) it's an indicative quote.
        const shouldEnableRfqt =
            integrator !== undefined && (isETHSell || takerAddress !== undefined || (rfqt && rfqt.isIndicative));

        // Check if integrator ID specifically whitelists a set of maker URIs. If whitelist is "undefined" then it
        // means all integrators will be enabled.

        if (shouldEnableRfqt) {
            const altRfqAssetOfferings = await this._getAltMarketOfferingsAsync(1500);

            _rfqt = {
                ...rfqt,
                intentOnFilling: rfqt && rfqt.intentOnFilling ? true : false,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
                integrator: integrator!,
                makerEndpointMaxResponseTimeMs: RFQT_REQUEST_MAX_RESPONSE_MS,
                // Note 0xAPI maps takerAddress query parameter to txOrigin as takerAddress is always Exchange Proxy or a VIP
                takerAddress: NULL_ADDRESS,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
                txOrigin: takerAddress!,
                firmQuoteValidator: this._firmQuoteValidator,
                altRfqAssetOfferings,
            };
        }

        // only generate quote reports for rfqt firm quotes
        const shouldGenerateQuoteReport = rfqt && rfqt.intentOnFilling;

        let swapQuoteRequestOpts: Partial<SwapQuoteRequestOpts>;
        if (
            // Is a MetaTransaction
            metaTransactionVersion !== undefined ||
            shouldSellEntireBalance ||
            // Note: We allow VIP to continue ahead when positive slippage fee is enabled
            affiliateFee.feeType === AffiliateFeeType.PercentageFee ||
            !CHAIN_HAS_VIPS(CHAIN_ID)
        ) {
            swapQuoteRequestOpts = ASSET_SWAPPER_MARKET_ORDERS_OPTS_NO_VIP;
        } else {
            swapQuoteRequestOpts = ASSET_SWAPPER_MARKET_ORDERS_OPTS;
        }

        const marketSide = sellAmount !== undefined ? MarketOperation.Sell : MarketOperation.Buy;
        let feeToken = buyToken; // Default fee token is buy token

        // Prepare Sell Token Fees
        let sellTokenFees: Fees | undefined = undefined; // fees object to return to the caller
        let sellTokenFeeAmount = ZERO; // total sell token fee to charge
        let sellTokenFeeAmounts: AffiliateFeeAmount[] = []; // sell token fee amounts used by affiliate fee transformer
        let sellTokenFeeOnChainTransferGas = ZERO; // the gas cost for transferring sell token fee on-chain
        if (metaTransactionVersion !== undefined && marketSide === MarketOperation.Sell) {
            // Narrow the type
            if (!sellAmount) {
                throw new Error('sellAmount is undefined when market direction is sell');
            }
            // Use sell token as fee
            feeToken = sellToken;
            providedGasPrice = providedGasPrice ?? (await this._swapQuoter.getGasPriceEstimationOrThrowAsync());
            // Need to calculate all fees in order to adjust `sellAmount` before passing it down to sampler & router
            ({
                sellTokenFees,
                sellTokenFeeAmount,
                sellTokenFeeOnChainTransfers: sellTokenFeeAmounts,
                sellTokenFeeOnChainTransferGas,
            } = await this._getSellTokenFees(
                marketSide,
                feeConfigs,
                sellToken,
                sellAmount,
                undefined, // sell token amount per wei is not known yet
                providedGasPrice,
                AVG_MULTIPLEX_TRANFORM_ERC_20_GAS, // use historic average gas cost for multiplex & transformERC20
                // meta-transaction v1 uses affiliate fee transformer which calls `transformerTransfer` for on-chain fee transfer.
                // meta-transaction v2 uses `FixinTokenSpender._transferERC20TokensFrom`.
                metaTransactionVersion === 'v1' ? TRANSFER_GAS : TRANSFER_FROM_GAS,
            ));
        }

        const assetSwapperOpts: Partial<SwapQuoteRequestOpts> = {
            ...swapQuoteRequestOpts,
            bridgeSlippage: slippagePercentage,
            gasPrice: providedGasPrice,
            excludedSources: excludedSources.concat(swapQuoteRequestOpts.excludedSources || []),
            includedSources,
            rfqt: _rfqt,
            shouldGenerateQuoteReport,
            fillAdjustor:
                enableSlippageProtection && this.slippageModelManager
                    ? new SlippageModelFillAdjustor(
                          this.slippageModelManager,
                          sellToken,
                          buyToken,
                          slippagePercentage || DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
                      )
                    : new IdentityFillAdjustor(),
            endpoint: endpoint,
        };

        const amount =
            marketSide === MarketOperation.Sell
                ? // substract the sell token fee amount from sell amount before passing it down to sampler & router
                  // since the actual ammount being traded is sellAmount - sellTokenFeeAmount
                  sellAmount?.minus(sellTokenFeeAmount)
                : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
                  buyAmount!.times(getBuyTokenPercentageFeeOrZero(affiliateFee) + 1).integerValue(BigNumber.ROUND_DOWN);

        // Fetch the Swap quote
        const swapQuote = await this._swapQuoter.getSwapQuoteAsync(
            buyToken,
            sellToken,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
            amount!, // was validated earlier
            marketSide,
            assetSwapperOpts,
            this._rfqClient,
        );

        const {
            makerAmount,
            totalTakerAmount,
            protocolFeeInWeiAmount: bestCaseProtocolFee,
        } = swapQuote.bestCaseQuoteInfo;
        const { protocolFeeInWeiAmount: protocolFee, gas: worstCaseGas } = swapQuote.worstCaseQuoteInfo;
        const { gasPrice, sourceBreakdown, quoteReport, extendedQuoteReportSources } = swapQuote;

        if (metaTransactionVersion !== undefined && marketSide === MarketOperation.Buy) {
            // Use sell token as fee
            feeToken = sellToken;

            ({
                sellTokenFees,
                sellTokenFeeAmount,
                sellTokenFeeOnChainTransfers: sellTokenFeeAmounts,
                sellTokenFeeOnChainTransferGas,
            } = await this._getSellTokenFees(
                marketSide,
                feeConfigs,
                sellToken,
                totalTakerAmount,
                swapQuote.takerAmountPerEth,
                gasPrice,
                new BigNumber(worstCaseGas), // use worst case faux gas estimate from quote
                // meta-transaction v1 uses affiliate fee transformer which calls `transformerTransfer` for on-chain fee transfer.
                // meta-transaction v2 uses `FixinTokenSpender._transferERC20TokensFrom`.
                metaTransactionVersion === 'v1' ? TRANSFER_GAS : TRANSFER_FROM_GAS,
            ));
        }

        // Prepare Buy Token Fees
        const { gasCost: affiliateFeeGasCost, buyTokenFeeAmount } = serviceUtils.getBuyTokenFeeAmounts(
            swapQuote,
            affiliateFee,
        );

        const buyTokenFeeAmounts: AffiliateFeeAmount[] = [
            {
                recipient: affiliateFee.recipient,
                feeType: affiliateFee.feeType,
                buyTokenFeeAmount,
                sellTokenFeeAmount: ZERO,
            },
        ];

        // By default, add a positive slippage fee for allowed pairs.
        // Integrators may turn this off by setting positiveSlippagePercent to 0
        // NOTE that we do not yet allow for a specified percent of the positive slippage to be taken, it's all or nothing.
        // TODO: customize the positive slippage by the percent
        const isPairAllowed =
            ZERO_EX_FEE_TOKENS.has(buyToken.toLowerCase()) && ZERO_EX_FEE_TOKENS.has(sellToken.toLowerCase());
        const isDefaultPositiveSlippageFee = integrator?.positiveSlippagePercent === undefined;
        const isPostiveSlippageEnabled =
            integrator?.positiveSlippagePercent !== undefined && integrator.positiveSlippagePercent > 0; // 0 is falsy, must check undefined explicitly
        const positiveSlippageFee =
            isPairAllowed && (isDefaultPositiveSlippageFee || isPostiveSlippageEnabled)
                ? {
                      recipient: integrator?.feeRecipient || ZERO_EX_FEE_RECIPIENT_ADDRESS,
                      feeType: AffiliateFeeType.PositiveSlippageFee,
                      buyTokenFeeAmount: ZERO, // we don't need this for positive slippage fee
                      sellTokenFeeAmount: ZERO, // we don't need this for positive slippage fee
                  }
                : undefined;

        logger.info(
            {
                isPairAllowed,
                isDefaultPositiveSlippageFee,
                isPostiveSlippageEnabled,
                positiveSlippageFee,
                integratorPositiveSlippagePercent: integrator?.positiveSlippagePercent,
            },
            'Positive slippage values',
        );

        // Grab the encoded version of the swap quote
        const { to, value, data, decodedUniqueId, gasOverhead } = this.getSwapQuotePartialTransaction(
            swapQuote,
            isETHSell,
            isETHBuy,
            shouldSellEntireBalance,
            affiliateAddress,
            buyTokenFeeAmounts,
            sellTokenFeeAmounts,
            positiveSlippageFee,
            metaTransactionVersion,
        );

        let conservativeBestCaseGasEstimate = new BigNumber(worstCaseGas)
            .plus(affiliateFeeGasCost)
            .plus(sellTokenFeeOnChainTransferGas);

        // Cannot eth_gasEstimate for /price when RFQ Native liquidity is included
        const isNativeIncluded = swapQuote.sourceBreakdown.singleSource.Native !== undefined;
        const isQuote = endpoint === 'quote';
        const canEstimateGas = isQuote || !isNativeIncluded;

        // If the taker address is provided we can provide a more accurate gas estimate
        // using eth_gasEstimate
        // If an error occurs we attempt to provide a better message then "Transaction Reverted"
        if (takerAddress && !skipValidation && canEstimateGas) {
            try {
                // Record the faux gas estimate
                const fauxGasEstimate = conservativeBestCaseGasEstimate;
                let estimateGasCallResult = await this._estimateGasOrThrowRevertErrorAsync({
                    to,
                    data,
                    from: takerAddress,
                    value,
                    gasPrice,
                });
                // Add any underterministic gas overhead the encoded transaction has detected
                estimateGasCallResult = estimateGasCallResult.plus(gasOverhead);
                // Add on-chain transfer gas if meta-transaction version is v2 since the fee transfer
                // happens at the meta-transaction level which is not captured when estimating the
                // gas to fill the orders
                if (metaTransactionVersion === 'v2') {
                    estimateGasCallResult = estimateGasCallResult.plus(sellTokenFeeOnChainTransferGas);
                }
                // Add a little buffer to eth_estimateGas as it is not always correct
                const realGasEstimate = estimateGasCallResult.times(GAS_LIMIT_BUFFER_MULTIPLIER).integerValue();
                // Take the max of the faux estimate or the real estimate
                conservativeBestCaseGasEstimate = BigNumber.max(fauxGasEstimate, realGasEstimate);
                logger.info(
                    {
                        fauxGasEstimate,
                        realGasEstimate,
                        delta: realGasEstimate.minus(fauxGasEstimate),
                        accuracy: realGasEstimate.minus(fauxGasEstimate).dividedBy(realGasEstimate).toFixed(4),
                        buyToken,
                        sellToken,
                        sources: _.uniq(swapQuote.path.getOrders().map((o) => o.source)),
                    },
                    'Improved gas estimate',
                );
            } catch (error) {
                if (isQuote) {
                    // On /quote, when skipValidation=false, we want to raise an error
                    throw error;
                }
                logger.warn(
                    { takerAddress, data, value, gasPrice, error: error?.message },
                    'Unable to use eth_estimateGas. Falling back to faux estimate',
                );
            }
        }
        const worstCaseGasEstimate = conservativeBestCaseGasEstimate;
        const { makerTokenDecimals, takerTokenDecimals } = swapQuote;
        const { price, guaranteedPrice } = SwapService._getSwapQuotePrice(
            buyAmount,
            makerTokenDecimals,
            takerTokenDecimals,
            swapQuote,
            affiliateFee,
            sellTokenFeeAmount,
        );

        let adjustedValue = value;

        adjustedValue = isETHSell ? protocolFee.plus(swapQuote.worstCaseQuoteInfo.takerAmount) : protocolFee;

        // No allowance target is needed if this is an ETH sell, so set to 0x000..
        const allowanceTarget = isETHSell ? NULL_ADDRESS : this._contractAddresses.exchangeProxy;

        const { takerAmountPerEth: takerTokenToEthRate, makerAmountPerEth: makerTokenToEthRate } = swapQuote;

        // Convert into unit amounts
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
        const wethToken = getTokenMetadataIfExists('WETH', CHAIN_ID)!;
        const sellTokenToEthRate = takerTokenToEthRate
            .times(new BigNumber(10).pow(wethToken.decimals - takerTokenDecimals))
            .decimalPlaces(takerTokenDecimals);
        const buyTokenToEthRate = makerTokenToEthRate
            .times(new BigNumber(10).pow(wethToken.decimals - makerTokenDecimals))
            .decimalPlaces(makerTokenDecimals);

        const estimatedPriceImpact = SwapService._calculateEstimatedPriceImpactPercent(
            price,
            sellTokenToEthRate,
            buyTokenToEthRate,
            marketSide,
        );

        const apiSwapQuote: GetSwapQuoteResponse = {
            chainId: CHAIN_ID,
            price,
            guaranteedPrice,
            estimatedPriceImpact,
            to,
            data,
            value: adjustedValue,
            gas: worstCaseGasEstimate,
            estimatedGas: conservativeBestCaseGasEstimate,
            from: takerAddress,
            gasPrice,
            protocolFee,
            minimumProtocolFee: BigNumber.min(protocolFee, bestCaseProtocolFee),
            // NOTE: Internally all ETH trades are for WETH, we just wrap/unwrap automatically
            buyTokenAddress: isETHBuy ? ETH_TOKEN_ADDRESS : buyToken,
            sellTokenAddress: isETHSell ? ETH_TOKEN_ADDRESS : sellToken,
            buyAmount: makerAmount.minus(buyTokenFeeAmount),
            sellAmount: totalTakerAmount.plus(sellTokenFeeAmount),
            sources: serviceUtils.convertToLiquiditySources(sourceBreakdown),
            orders: swapQuote.path.getOrders(),
            allowanceTarget,
            decodedUniqueId,
            extendedQuoteReportSources,
            sellTokenToEthRate,
            buyTokenToEthRate,
            quoteReport,
            blockNumber: swapQuote.blockNumber,
            debugData: params.isDebugEnabled
                ? { samplerGasUsage: swapQuote.samplerGasUsage, blockNumber: swapQuote.blockNumber }
                : undefined,
            fees: feeToken === sellToken ? sellTokenFees : undefined,
        };

        if (apiSwapQuote.buyAmount.lte(new BigNumber(0))) {
            throw new InsufficientFundsError();
        }

        if (
            isQuote &&
            apiSwapQuote.estimatedPriceImpact &&
            apiSwapQuote.estimatedPriceImpact.gt(priceImpactProtectionPercentage * 100)
        ) {
            PRICE_IMPACT_TOO_HIGH.labels('ValueOutOfRange').inc();
            throw new ValidationError([
                {
                    field: 'priceImpactProtectionPercentage',
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: ValidationErrorReasons.PriceImpactTooHigh,
                    description: `estimated price impact of ${
                        apiSwapQuote.estimatedPriceImpact
                    } is greater than priceImpactProtectionPercentage ${priceImpactProtectionPercentage * 100}`,
                },
            ]);
        }

        // If the slippage Model is forced on for the integrator, or if they have opted in to slippage protection
        if (integrator?.slippageModel === true || enableSlippageProtection) {
            if (this.slippageModelManager) {
                apiSwapQuote.expectedSlippage = this.slippageModelManager.calculateExpectedSlippage(
                    buyToken,
                    sellToken,
                    apiSwapQuote.buyAmount,
                    apiSwapQuote.sellAmount,
                    apiSwapQuote.sources,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
                    slippagePercentage!,
                );
            } else {
                apiSwapQuote.expectedSlippage = null;
            }
        }
        return apiSwapQuote;
    }

    public async getSwapQuoteForWrapAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        return this._getSwapQuoteForNativeWrappedAsync(params, false);
    }

    public async getSwapQuoteForUnwrapAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        return this._getSwapQuoteForNativeWrappedAsync(params, true);
    }

    private async _getSwapQuoteForNativeWrappedAsync(
        params: GetSwapQuoteParams,
        isUnwrap: boolean,
    ): Promise<GetSwapQuoteResponse> {
        const {
            takerAddress,
            buyToken,
            sellToken,
            buyAmount,
            sellAmount,
            affiliateAddress,
            gasPrice: providedGasPrice,
        } = params;
        const amount = buyAmount || sellAmount;
        if (amount === undefined) {
            throw new Error('sellAmount or buyAmount required');
        }
        const data = (
            isUnwrap ? this._wethContract.withdraw(amount) : this._wethContract.deposit()
        ).getABIEncodedTransactionData();
        const value = isUnwrap ? ZERO : amount;
        const attributedCalldata = serviceUtils.attributeCallData(data, affiliateAddress);
        // TODO: consider not using protocol fee utils due to lack of need for an aggresive gas price for wrapping/unwrapping
        const gasPrice = providedGasPrice || (await this._swapQuoter.getGasPriceEstimationOrThrowAsync());
        const gasEstimate = isUnwrap ? UNWRAP_QUOTE_GAS : WRAP_QUOTE_GAS;
        const apiSwapQuote: GetSwapQuoteResponse = {
            chainId: CHAIN_ID,
            estimatedPriceImpact: ZERO_AMOUNT,
            price: ONE,
            guaranteedPrice: ONE,
            to: NATIVE_FEE_TOKEN_BY_CHAIN_ID[CHAIN_ID],
            data: attributedCalldata.affiliatedData,
            decodedUniqueId: attributedCalldata.decodedUniqueId,
            value,
            gas: gasEstimate,
            estimatedGas: gasEstimate,
            from: takerAddress,
            gasPrice,
            protocolFee: ZERO,
            minimumProtocolFee: ZERO,
            buyTokenAddress: isUnwrap ? ETH_TOKEN_ADDRESS : buyToken,
            sellTokenAddress: isUnwrap ? sellToken : ETH_TOKEN_ADDRESS,
            buyAmount: amount,
            sellAmount: amount,
            sources: [],
            orders: [],
            sellTokenToEthRate: new BigNumber(1),
            buyTokenToEthRate: new BigNumber(1),
            allowanceTarget: NULL_ADDRESS,
            blockNumber: undefined,
        };
        return apiSwapQuote;
    }

    private async _estimateGasOrThrowRevertErrorAsync(txData: Partial<TxData>): Promise<BigNumber> {
        let revertError;
        let gasEstimate = ZERO;
        let callResult: {
            success: boolean;
            resultData: string;
            gasUsed: BigNumber;
        } = { success: false, resultData: NULL_BYTES, gasUsed: ZERO };
        let callResultGanacheRaw: string | undefined;
        try {
            // NOTE: Ganache does not support overrides
            if (CHAIN_ID === ChainId.Ganache) {
                // Default to true as ganache provides us less info and we cannot override
                callResult.success = true;
                const gas = await this._web3Wrapper.estimateGasAsync(txData).catch((_e) => {
                    // If an estimate error happens on ganache we say it failed
                    callResult.success = false;
                    return DEFAULT_VALIDATION_GAS_LIMIT;
                });
                callResultGanacheRaw = await this._web3Wrapper.callAsync({
                    ...txData,
                    gas,
                });
                callResult.resultData = callResultGanacheRaw;
                callResult.gasUsed = new BigNumber(gas);
                gasEstimate = new BigNumber(gas);
            } else {
                // Split out the `to` and `data` so it doesn't override
                const { data, to, ...rest } = txData;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
                callResult = await this._fakeTaker.execute(to!, data!).callAsync({
                    ...rest,
                    // Set the `to` to be the user address with a fake contract at that address
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
                    to: txData.from!,
                    // TODO jacob this has issues with protocol fees, but a gas amount is needed to use gasPrice
                    gasPrice: 0,
                    overrides: {
                        // Override the user address with the Fake Taker contract
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
                        [txData.from!]: {
                            code: _.get(artifacts.FakeTaker, 'compilerOutput.evm.deployedBytecode.object'),
                        },
                    },
                });
            }
        } catch (e) {
            if (e.message && /insufficient funds/.test(e.message)) {
                throw new InsufficientFundsError();
            }
            // RPCSubprovider can throw if .error exists on the response payload
            // This `error` response occurs from Parity nodes (incl Alchemy) and Geth nodes >= 1.9.14
            // Geth 1.9.15
            if (e.message && /execution reverted/.test(e.message) && e.data) {
                try {
                    revertError = RevertError.decode(e.data, false);
                } catch (e) {
                    logger.error(`Could not decode revert error: ${e}`);
                    throw new Error(e.message);
                }
            } else {
                try {
                    revertError = decodeThrownErrorAsRevertError(e);
                } catch (e) {
                    // Could not decode the revert error
                }
            }
            if (revertError) {
                throw revertError;
            }
        }
        try {
            if (callResultGanacheRaw) {
                revertError = RevertError.decode(callResultGanacheRaw, false);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
            } else if (callResult! && !callResult.success) {
                revertError = RevertError.decode(callResult.resultData, false);
            }
        } catch (e) {
            // No revert error
        }
        if (revertError) {
            throw revertError;
        }
        // Add in the overhead of call data
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
        gasEstimate = callResult.gasUsed.plus(utils.calculateCallDataGas(txData.data!));
        // If there's a revert and we still are unable to decode it, just throw it.
        // This can happen in VIPs where there are no real revert reasons
        if (!callResult.success) {
            throw new GasEstimationError();
        }
        return gasEstimate;
    }

    private getSwapQuotePartialTransaction(
        swapQuote: SwapQuote,
        isFromETH: boolean,
        isToETH: boolean,
        shouldSellEntireBalance: boolean,
        affiliateAddress: string | undefined,
        buyTokenAffiliateFees: AffiliateFeeAmount[],
        sellTokenAffiliateFees: AffiliateFeeAmount[],
        positiveSlippageFee?: AffiliateFeeAmount,
        metaTransactionVersion?: 'v1' | 'v2',
    ): SwapQuoteResponsePartialTransaction & { gasOverhead: BigNumber } {
        const opts: Partial<ExchangeProxyContractOpts> = {
            isFromETH,
            isToETH,
            metaTransactionVersion,
            shouldSellEntireBalance,
            buyTokenAffiliateFees,
            sellTokenAffiliateFees,
            positiveSlippageFee,
        };

        const {
            calldataHexString: data,
            ethAmount: value,
            toAddress: to,
            gasOverhead,
        } = this._swapQuoteConsumer.getCalldataOrThrow(swapQuote, opts);

        const { affiliatedData, decodedUniqueId } = serviceUtils.attributeCallData(data, affiliateAddress);
        return {
            to,
            value,
            data: affiliatedData,
            decodedUniqueId,
            gasOverhead,
        };
    }

    private async _getAltMarketOfferingsAsync(timeoutMs: number): Promise<AltRfqMakerAssetOfferings> {
        if (!this._altRfqMarketsCache) {
            this._altRfqMarketsCache = createResultCache<AltRfqMakerAssetOfferings>(async () => {
                if (ALT_RFQ_MM_ENDPOINT === undefined || ALT_RFQ_MM_API_KEY === undefined) {
                    return {};
                }
                try {
                    const response = await axios.get(`${ALT_RFQ_MM_ENDPOINT}/markets`, {
                        headers: { Authorization: `Bearer ${ALT_RFQ_MM_API_KEY}` },
                        timeout: timeoutMs,
                    });

                    return altMarketResponseToAltOfferings(response.data, ALT_RFQ_MM_ENDPOINT);
                } catch (err) {
                    logger.warn(`error fetching alt RFQ markets: ${err}`);
                    return {};
                }
                // refresh cache every 6 hours
            }, ONE_MINUTE_MS * 360);
        }

        return (await this._altRfqMarketsCache.getResultAsync()).result;
    }

    /**
     * Get sell token fee and corresponding on-chain transfers.
     *
     * @param marketSide Indicates if it's a sell or a buy operation.
     * @param feeConfigs Fee configs object. Undefined if `feeConfigs` is not provided in the request.
     * @param sellToken Sell token address.
     * @param sellAmount Sell amount.
     * @param sellTokenAmountPerWei Sell token token amount per 1 wei native token. Undefined if it's not availabe yet.
     * @param gasPrice Gas price.
     * @param quoteGasEstimate Gas estimate for swap quote.
     * @param gasPerOnChainTransfer The gas cost per on-chain transfer.
     * @returns Fees object, total sell token amount to charge, sell token on-chain transfer and the gas
     *          used for on-chain transfers.
     */
    private async _getSellTokenFees(
        marketSide: MarketOperation,
        feeConfigs: FeeConfigs | undefined,
        sellToken: string,
        sellAmount: BigNumber,
        sellTokenAmountPerWei: BigNumber | undefined,
        gasPrice: BigNumber,
        quoteGasEstimate: BigNumber,
        gasPerOnChainTransfer: BigNumber,
    ): Promise<{
        sellTokenFees: Fees | undefined; // fees object to return to the caller
        sellTokenFeeAmount: BigNumber; // total sell token fee to charge
        sellTokenFeeOnChainTransfers: AffiliateFeeAmount[]; // sell token fee amounts used by affiliate fee transformer
        sellTokenFeeOnChainTransferGas: BigNumber; // the gas cost for transferring sell token fee on-chain
    }> {
        /**
         * Only get `sellTokenAmountPerWei` when:
         * - it's not provided and
         * - it's a sell operation and
         * - gas fee config is present
         */
        if (sellTokenAmountPerWei === undefined && marketSide === MarketOperation.Sell && feeConfigs?.gasFee) {
            sellTokenAmountPerWei = await this._swapQuoter.getTokenAmountPerWei(sellToken, {});
        }
        const { fees, totalOnChainFeeAmount, onChainTransfers, onChainTransfersGas } = calculateFees({
            feeConfigs,
            sellToken,
            sellTokenAmount: sellAmount,
            sellTokenAmountPerWei,
            gasPrice,
            quoteGasEstimate,
            gasPerOnChainTransfer,
        });

        const sellTokenFees = fees;
        const sellTokenFeeAmount = totalOnChainFeeAmount;
        const sellTokenFeeOnChainTransfers: AffiliateFeeAmount[] = onChainTransfers
            .map((onChainTransfer) => {
                return {
                    // The affiliate fee type does not matter for `sellTokenFee`. It's only included for type compatibility.
                    feeType: AffiliateFeeType.GaslessFee,
                    recipient: onChainTransfer.feeRecipient,
                    buyTokenFeeAmount: ZERO,
                    sellTokenFeeAmount: onChainTransfer.feeAmount,
                };
            })
            .filter((onChainFeeTransfer) => onChainFeeTransfer.sellTokenFeeAmount.gt(ZERO));
        const sellTokenFeeOnChainTransferGas = onChainTransfersGas;

        // Throw if `sellAmount` is not able to cover fees charged in sell tokens for a sell operation. This is most likely to happen
        // if the trade size is too small.
        if (marketSide === MarketOperation.Sell && sellAmount.lte(sellTokenFeeAmount)) {
            logger.info(
                {
                    sellTokenFees,
                    sellTokenFeeAmount,
                    sellTokenFeeOnChainTransfers,
                    sellTokenFeeOnChainTransferGas,
                    sellAmount,
                },
                'sellAmount <= sell token fee amount',
            );
            throw new InsufficientFundsError('sellAmount insufficient to cover fees');
        }

        return {
            sellTokenFees,
            sellTokenFeeAmount,
            sellTokenFeeOnChainTransfers,
            sellTokenFeeOnChainTransferGas,
        };
    }
}
