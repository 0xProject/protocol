import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { FastABI } from '@0x/fast-abi';
import { LimitOrder } from '@0x/protocol-utils';
import { BigNumber, providerUtils } from '@0x/utils';
import { BlockParamLiteral, MethodAbi, SupportedProvider, ZeroExProvider } from 'ethereum-types';
import * as _ from 'lodash';

import { artifacts } from '../artifacts';
import { RfqClient } from '../utils/rfq_client';
import { ERC20BridgeSamplerContract } from '../wrappers';

import { constants } from './constants';
import {
    AssetSwapperContractAddresses,
    MarketOperation,
    OrderPrunerPermittedFeeTypes,
    RfqRequestOpts,
    SwapQuote,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
    SwapQuoterRfqOpts,
} from './types';
import { MarketOperationUtils, OptimizerResultWithReport } from './utils/market_operation_utils';
import { BancorService } from './utils/market_operation_utils/bancor_service';
import {
    BUY_SOURCE_FILTER_BY_CHAIN_ID,
    DEFAULT_GAS_SCHEDULE,
    SAMPLER_ADDRESS,
    UNISWAP_V3_MULTIQUOTER_ADDRESS,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
} from './utils/market_operation_utils/constants';
import { DexOrderSampler } from './utils/market_operation_utils/sampler';
import { SourceFilters } from './utils/market_operation_utils/source_filters';
import { ERC20BridgeSource, FillData, GasSchedule, GetMarketOrdersOpts, Orderbook } from './types';
import { GasPriceUtils } from './utils/gas_price_utils';
import { QuoteRequestor } from './utils/quote_requestor';
import { assert } from './utils/utils';
import { calculateQuoteInfo } from './utils/quote_info';
import { SignedLimitOrder } from '../asset-swapper';

export class SwapQuoter {
    public readonly provider: ZeroExProvider;
    public readonly orderbook: Orderbook;
    public readonly expiryBufferMs: number;
    public readonly chainId: ChainId;
    public readonly permittedOrderFeeTypes: Set<OrderPrunerPermittedFeeTypes>;
    private readonly _contractAddresses: AssetSwapperContractAddresses;
    private readonly _gasPriceUtils: GasPriceUtils;
    private readonly _marketOperationUtils: MarketOperationUtils;
    private readonly _rfqtOptions?: SwapQuoterRfqOpts;
    private readonly _integratorIdsSet: Set<string>;
    // TODO: source filters can be removed once orderbook is moved to `MarketOperationUtils`.
    private readonly _sellSources: SourceFilters;
    private readonly _buySources: SourceFilters;

    /**
     * Instantiates a new SwapQuoter instance
     * @param   supportedProvider   The Provider instance you would like to use for interacting with the Ethereum network.
     * @param   orderbook           An object that conforms to Orderbook, see type for definition.
     * @param   options             Initialization options for the SwapQuoter. See type definition for details.
     *
     * @return  An instance of SwapQuoter
     */
    constructor(supportedProvider: SupportedProvider, orderbook: Orderbook, options: Partial<SwapQuoterOpts> = {}) {
        const { chainId, expiryBufferMs, permittedOrderFeeTypes, samplerGasLimit, rfqt, tokenAdjacencyGraph } = {
            ...constants.DEFAULT_SWAP_QUOTER_OPTS,
            ...options,
        };
        const provider = providerUtils.standardizeOrThrow(supportedProvider);
        assert.isValidOrderbook('orderbook', orderbook);
        assert.isNumber('chainId', chainId);
        assert.isNumber('expiryBufferMs', expiryBufferMs);
        this.chainId = chainId;
        this.provider = provider;
        this.orderbook = orderbook;
        this.expiryBufferMs = expiryBufferMs;
        this.permittedOrderFeeTypes = permittedOrderFeeTypes;

        this._rfqtOptions = rfqt;
        this._contractAddresses = options.contractAddresses || {
            ...getContractAddressesForChainOrThrow(chainId),
        };
        this._gasPriceUtils = GasPriceUtils.getInstance(
            constants.PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
            options.zeroExGasApiUrl,
        );
        // Allow the sampler bytecode to be overwritten using geths override functionality
        const samplerBytecode = _.get(artifacts.ERC20BridgeSampler, 'compilerOutput.evm.deployedBytecode.object');
        // Allow address of the Sampler to be overridden, i.e in Ganache where overrides do not work
        const samplerAddress = (options.samplerOverrides && options.samplerOverrides.to) || SAMPLER_ADDRESS;

        const defaultCodeOverrides = samplerBytecode
            ? {
                  [samplerAddress]: { code: samplerBytecode },
              }
            : {};

        if (
            SELL_SOURCE_FILTER_BY_CHAIN_ID[this.chainId].isAllowed(ERC20BridgeSource.UniswapV3) ||
            BUY_SOURCE_FILTER_BY_CHAIN_ID[this.chainId].isAllowed(ERC20BridgeSource.UniswapV3)
        ) {
            // Allow the UniV3 MultiQuoter bytecode to be written to a specic address
            const uniV3MultiQuoterBytecode = _.get(
                artifacts.UniswapV3MultiQuoter,
                'compilerOutput.evm.deployedBytecode.object',
            );
            defaultCodeOverrides[UNISWAP_V3_MULTIQUOTER_ADDRESS] = { code: uniV3MultiQuoterBytecode };
        }

        const samplerOverrides = _.assign(
            { block: BlockParamLiteral.Latest, overrides: defaultCodeOverrides },
            options.samplerOverrides,
        );
        const fastAbi = new FastABI(ERC20BridgeSamplerContract.ABI() as MethodAbi[], { BigNumber });
        const samplerContract = new ERC20BridgeSamplerContract(
            samplerAddress,
            this.provider,
            {
                gas: samplerGasLimit,
            },
            {},
            undefined,
            {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                encodeInput: (fnName: string, values: any) => fastAbi.encodeInput(fnName, values),
                decodeOutput: (fnName: string, data: string) => fastAbi.decodeOutput(fnName, data),
            },
        );

        this._marketOperationUtils = new MarketOperationUtils(
            new DexOrderSampler(
                this.chainId,
                samplerContract,
                samplerOverrides,
                undefined, // pools caches for balancer
                tokenAdjacencyGraph,
                this.chainId === ChainId.Mainnet // Enable Bancor only on Mainnet
                    ? async () => BancorService.createAsync(provider)
                    : async () => undefined,
            ),
            this._contractAddresses,
        );

        const integratorIds =
            this._rfqtOptions?.integratorsWhitelist.map((integrator) => integrator.integratorId) || [];
        this._integratorIdsSet = new Set(integratorIds);
        this._buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[chainId];
        this._sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[chainId];
    }

    /**
     * Returns the recommended gas price for a fast transaction
     */
    public async getGasPriceEstimationOrThrowAsync(): Promise<BigNumber> {
        const gasPrices = await this._gasPriceUtils.getGasPriceEstimationOrThrowAsync();

        return new BigNumber(gasPrices.fast);
    }

    /**
     * Get a `SwapQuote` containing all information relevant to fulfilling a swap between a desired ERC20 token address and ERC20 owned by a provided address.
     * You can then pass the `SwapQuote` to a `SwapQuoteConsumer` to execute a buy, or process SwapQuote for on-chain consumption.
     * @param   makerToken       The address of the maker asset
     * @param   takerToken       The address of the taker asset
     * @param   assetFillAmount  If a buy, the amount of maker asset to buy. If a sell, the amount of taker asset to sell.
     * @param   marketOperation  Either a Buy or a Sell quote
     * @param   options          Options for the request. See type definition for more information.
     *
     * @return  An object that conforms to SwapQuote that satisfies the request. See type definition for more information.
     */
    public async getSwapQuoteAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        options: Partial<SwapQuoteRequestOpts>,
        rfqClient?: RfqClient | undefined,
    ): Promise<SwapQuote> {
        assert.isETHAddressHex('makerToken', makerToken);
        assert.isETHAddressHex('takerToken', takerToken);
        assert.isBigNumber('assetFillAmount', assetFillAmount);
        const opts = _.merge({}, constants.DEFAULT_SWAP_QUOTE_REQUEST_OPTS, options);
        let gasPrice: BigNumber;
        if (opts.gasPrice) {
            gasPrice = opts.gasPrice;
            assert.isBigNumber('gasPrice', gasPrice);
        } else {
            gasPrice = await this.getGasPriceEstimationOrThrowAsync();
        }

        const sourceFilters = new SourceFilters([], opts.excludedSources, opts.includedSources);

        opts.rfqt = this._validateRfqtOpts(sourceFilters, opts.rfqt);

        //  ** Prepare options for fetching market side liquidity **
        // Scale fees by gas price.
        const cloneOpts = _.omit(opts, 'gasPrice') as GetMarketOrdersOpts;
        const calcOpts: GetMarketOrdersOpts = {
            ...cloneOpts,
            gasPrice,
            feeSchedule: _.mapValues(DEFAULT_GAS_SCHEDULE, (gasCost) => (fillData: FillData) => {
                const gas = gasCost ? gasCost(fillData) : 0;
                const fee = gasPrice.times(gas);
                return { gas, fee };
            }),
            exchangeProxyOverhead: (flags) => gasPrice.times(opts.exchangeProxyOverhead(flags)),
        };

        // pass the rfqClient on if rfqt enabled
        if (calcOpts.rfqt !== undefined) {
            calcOpts.rfqt.quoteRequestor = new QuoteRequestor();
            calcOpts.rfqt.rfqClient = rfqClient;
        }
        const limitOrders = await this.getLimitOrders(marketOperation, makerToken, takerToken, calcOpts);
        const result = await this._marketOperationUtils.getOptimizerResultAsync(
            makerToken,
            takerToken,
            limitOrders,
            assetFillAmount,
            marketOperation,
            calcOpts,
        );

        const swapQuote = createSwapQuote(
            result,
            makerToken,
            takerToken,
            marketOperation,
            assetFillAmount,
            gasPrice,
            DEFAULT_GAS_SCHEDULE,
            opts.bridgeSlippage,
        );

        // Use the raw gas, not scaled by gas price
        const exchangeProxyOverhead = opts.exchangeProxyOverhead(result.path.sourceFlags).toNumber();
        swapQuote.bestCaseQuoteInfo.gas += exchangeProxyOverhead;
        swapQuote.worstCaseQuoteInfo.gas += exchangeProxyOverhead;

        return swapQuote;
    }

    private async getLimitOrders(
        side: MarketOperation,
        makerToken: string,
        takerToken: string,
        opts: GetMarketOrdersOpts,
    ): Promise<SignedLimitOrder[]> {
        const requestFilters = new SourceFilters([], opts.excludedSources, opts.includedSources);
        const sourceFilter = side === MarketOperation.Sell ? this._sellSources : this._buySources;
        const quoteFilter = sourceFilter.merge(requestFilters);

        if (!quoteFilter.isAllowed(ERC20BridgeSource.Native) || opts.rfqt?.nativeExclusivelyRFQ === true) {
            return [];
        }

        return await this.orderbook.getOrdersAsync(makerToken, takerToken, this._limitOrderPruningFn);
    }

    private readonly _limitOrderPruningFn = (limitOrder: SignedLimitOrder) => {
        const order = new LimitOrder(limitOrder.order);
        const isOpenOrder = order.taker === constants.NULL_ADDRESS;
        const willOrderExpire = order.willExpire(this.expiryBufferMs / constants.ONE_SECOND_MS);
        const isFeeTypeAllowed =
            this.permittedOrderFeeTypes.has(OrderPrunerPermittedFeeTypes.NoFees) &&
            order.takerTokenFeeAmount.eq(constants.ZERO_AMOUNT);
        return isOpenOrder && !willOrderExpire && isFeeTypeAllowed;
    };

    private _isIntegratorIdWhitelisted(integratorId: string | undefined): boolean {
        if (!integratorId) {
            return false;
        }
        return this._integratorIdsSet.has(integratorId);
    }

    private _isTxOriginBlacklisted(txOrigin: string | undefined): boolean {
        if (!txOrigin) {
            return false;
        }
        const blacklistedTxOrigins = this._rfqtOptions ? this._rfqtOptions.txOriginBlacklist : new Set();
        return blacklistedTxOrigins.has(txOrigin.toLowerCase());
    }

    private _validateRfqtOpts(
        sourceFilters: SourceFilters,
        rfqt: RfqRequestOpts | undefined,
    ): RfqRequestOpts | undefined {
        if (!rfqt) {
            return rfqt;
        }
        const { integrator, nativeExclusivelyRFQ, intentOnFilling, txOrigin } = rfqt;
        // If RFQ-T is enabled and `nativeExclusivelyRFQ` is set, then `ERC20BridgeSource.Native` should
        // never be excluded.
        if (nativeExclusivelyRFQ === true && !sourceFilters.isAllowed(ERC20BridgeSource.Native)) {
            throw new Error('Native liquidity cannot be excluded if "rfqt.nativeExclusivelyRFQ" is set');
        }

        // If an integrator ID was provided, but the ID is not whitelisted, raise a warning and disable RFQ
        if (!this._isIntegratorIdWhitelisted(integrator.integratorId)) {
            if (this._rfqtOptions && this._rfqtOptions.warningLogger) {
                this._rfqtOptions.warningLogger(
                    {
                        ...integrator,
                    },
                    'Attempt at using an RFQ API key that is not whitelisted. Disabling RFQ for the request lifetime.',
                );
            }
            return undefined;
        }

        // If the requested tx origin is blacklisted, raise a warning and disable RFQ
        if (this._isTxOriginBlacklisted(txOrigin)) {
            if (this._rfqtOptions && this._rfqtOptions.warningLogger) {
                this._rfqtOptions.warningLogger(
                    {
                        txOrigin,
                    },
                    'Attempt at using a tx Origin that is blacklisted. Disabling RFQ for the request lifetime.',
                );
            }
            return undefined;
        }

        // Otherwise check other RFQ options
        if (
            intentOnFilling && // The requestor is asking for a firm quote
            this._isIntegratorIdWhitelisted(integrator.integratorId) && // A valid API key was provided
            sourceFilters.isAllowed(ERC20BridgeSource.Native) // Native liquidity is not excluded
        ) {
            if (!txOrigin || txOrigin === constants.NULL_ADDRESS) {
                throw new Error('RFQ-T firm quote requests must specify a tx origin');
            }
        }

        return rfqt;
    }
}

// begin formatting and report generation functions
function createSwapQuote(
    optimizerResult: OptimizerResultWithReport,
    makerToken: string,
    takerToken: string,
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: GasSchedule,
    slippage: number,
): SwapQuote {
    const { path, quoteReport, extendedQuoteReportSources, takerAmountPerEth, makerAmountPerEth } = optimizerResult;
    const { bestCaseQuoteInfo, worstCaseQuoteInfo, sourceBreakdown } = calculateQuoteInfo({
        path,
        operation,
        assetFillAmount,
        gasPrice,
        gasSchedule,
        slippage,
    });

    // Put together the swap quote
    const { makerTokenDecimals, takerTokenDecimals, blockNumber } = optimizerResult.marketSideLiquidity;
    const swapQuote = {
        makerToken,
        takerToken,
        gasPrice,
        path,
        bestCaseQuoteInfo,
        worstCaseQuoteInfo,
        sourceBreakdown,
        makerTokenDecimals,
        takerTokenDecimals,
        takerAmountPerEth,
        makerAmountPerEth,
        quoteReport,
        extendedQuoteReportSources,
        blockNumber,
    };

    if (operation === MarketOperation.Buy) {
        return {
            ...swapQuote,
            type: MarketOperation.Buy,
            makerTokenFillAmount: assetFillAmount,
        };
    } else {
        return {
            ...swapQuote,
            type: MarketOperation.Sell,
            takerTokenFillAmount: assetFillAmount,
        };
    }
}
