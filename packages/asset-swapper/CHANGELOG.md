<!--
changelogUtils.file is auto-generated using the monorepo-scripts package. Don't edit directly.
Edit the package's CHANGELOG.json file only.
-->

CHANGELOG

## v6.7.0 - _April 26, 2021_

    * Support PancakeSwap V2 (#211)

## v6.6.1 - _Invalid date_

    * Fixing Positive Slippage logic to not force the EP route (#209)

## v6.6.0 - _April 16, 2021_

    * Support `Ropsten` network (#203)

## v6.5.3 - _April 14, 2021_

    * Apply slippage to bridge orders in consumer (#198)

## v6.5.2 - _April 13, 2021_

    * Dependencies updated

## v6.5.1 - _April 12, 2021_

    * Dependencies updated

## v6.5.0 - _April 8, 2021_

    * Add Kyber DMM to Ethereum mainnet (#194)
    * Add default LiquidityProvider registry and allow LiquidityProvider gasCost to be a function of tokens (#196)

## v6.4.0 - _April 1, 2021_

    * Added Component, Smoothy, Saddle, Curve open pools, tweeks gas schedule, adding SushiSwap as a fee quote source (#182)
    * Use SOURCE_FLAGS.rfqOrder in comparisonPrice (#177)
    * Add a cancel token to ensure timeouts are respected (#176)
    * Rename {Rfqt=>Rfq} for many types in Asset Swapper (#179)
    * improve logging for alt RFQ requests (#158)
    * Use new bridge source ID encoding. (#162)
    * Refactor to provide chain id specific addresses (#163)
    * Added PancakeSwap and BakerySwap on Chain 56 (#163)
    * Added Nerve and Dodo (v1) to BSC (#181)

## v6.3.0 - _March 17, 2021_

    * Add MooniswapLiquidityProvider "direct" route to EP consumer. (#143)
    * Enable the ability to send RFQT requests thru a proxy (#159)
    * Add support for MultiplexFeature (#168)

## v6.2.0 - _March 2, 2021_

    * drop curve Y and BUSD pools (#161)

## v6.1.0 - _February 24, 2021_

    * Filter MultiHop where second source is not present (#138)
    * Add CurveLiquidityProvider "direct" route to EP consumer. (#127)
    * Fix compiler error on `ILiquidityProvider` call (#127)
    * Add deployed `CurveLiquidityProvider` addresses (#144)
    * Support `Mirror Protocol` with hops to `UST` (#142)
    * Fix protocol fee in fee schedule for `RfqOrder` (#146)
    * Special case BNB in uni v1 sampler (#147)
    * Create `FakeTaker` contract to get result data and gas used (#151)
    * Added support for `Dodo` v2 (#152)
    * Added support for `Linkswap` (#153)
    * Re-add WBTC in default intermediate hops (#154)
    * Add an alternative RFQ market making implementation (#139)
    * Added an opt-in `PositiveSlippageAffiliateFee` (#101)

## v6.0.0 - _February 10, 2021_

    * Pull top 250 Balancer pairs on initialization (#113)
    * Support v4 `RFQ` and `Limit` orders (#113)
    * Refactor to consume latest `FillQuoteTransformer` (#113)
    * Enable `fillData` for all sources, no longer optional (#113)
    * Support `tx.origin` in RFQT quote requestor (#113)

## v5.8.2 - _January 28, 2021_

    * Fix error when Multihop data is not present (#80)

## v5.8.1 - _January 26, 2021_

    * Dependencies updated

## v5.8.0 - _January 13, 2021_

    * Automatically Discover Kyber reserves for tokens using `getTradingReserves` (#111)
    * Return `CallResults` from the Sampler (#111)

## v5.7.0 - _Invalid date_

    * Add SPDX license identifiers to solidity files (#105)

## v5.6.2 - _January 4, 2021_

    * Dependencies updated

## v5.6.1 - _December 31, 2020_

    * Fix fillAmount `ExchangeProxySwapQuoteConsumer` encoding when quote is a BuyQuote

## v5.6.0 - _December 27, 2020_

    * Added Mooniswap V2 factory address (#100)

## v5.5.3 - _December 23, 2020_

    * Dependencies updated

## v5.5.2 - _December 17, 2020_

    * Dependencies updated

## v5.5.1 - _December 16, 2020_

    * Dependencies updated

## v5.5.0 - _December 16, 2020_

    * Bancor now supported in all pairs (#88)

## v5.4.2 - _December 9, 2020_

    * Dependencies updated

## v5.4.1 - _December 7, 2020_

    * Dependencies updated

## v5.4.0 - _December 7, 2020_

    * Add `takerAssetToEthRate` and `makerAssetToEthRate` to swap quote response (#49)

## v5.3.1 - _December 3, 2020_

    * Dependencies updated

## v5.3.0 - _December 3, 2020_

    * Added Crypto.com (#43)
    * Add `getQuoteInfoMinBuyAmount` to quote consumer utils (#62)
    * Add `unoptimizedQuoteInfo` and `unoptimizedOrders` to SwapQuoteBase (#62)
    * Add `unoptimizedPath` to OptimizerResult (#62)
    * Enable PLP VIP feature and add gasCost field to LiquidityProviderRegistry (#65)

## v5.2.0 - _November 19, 2020_

    * Update Gas schedules (#34)
    * Return the maker/taker token decimals from the sampler as part of the `SwapQuote` (#34)
    * Disable off-chain sampling for Balancer and CREAM (#41)

## v5.1.1 - _November 14, 2020_

    * Disable PLP VIP feature in EP swap quote consumer (#36)

## v5.1.0 - _November 13, 2020_

    * Add support for LiquidityProvider feature in the swap quote consumer (#16)
    * Remove support for MultiBridge 😞 (#16)

## v5.0.3 - _November 5, 2020_

    * Dependencies updated

## v5.0.2 - _November 3, 2020_

    * Dependencies updated
    * adding Curve pools: PAX, hBTC, metapools: gUSD, hUSD, USDn, mUSD, tBTC (#26)

## v5.0.1 - _November 3, 2020_

    * Dependencies updated

## v5.0.0 - _November 2, 2020_

    * Support multiple `Shells` by supplying the `pool` address (#17)
    * Make use of Token Adjacency in more places. Moved as a parameter for the quote (#24)

## v4.8.1 - _October 28, 2020_

    * Fix Gas schedule with `SnowSwap` and `Bancor` (#15)

## v4.8.0 - _October 27, 2020_

    * Moved Bridge addresses into Asset-swapper (#4)
    * Updated Sampler to Solidity 0.6 (#4)

## v4.7.1 - _October 23, 2020_

    * Dependencies updated

## v4.7.0 - _October 21, 2020_

    * Return quoteReport from SwapQuoter functions (#2627)
    * Allow an empty override for sampler overrides (#2637)
    * Potentially heavy CPU functions inside the optimizer now yield to the event loop. As such they are now async. (#2637)
    * Support more varied curves (#2633)
    * Make path optimization go faster (#2640)
    * Adds `getBidAskLiquidityForMakerTakerAssetPairAsync` to return more detailed sample information (#2641)
    * Fix regression where a split on the same source was collapsed into a single fill (#2654)
    * Add support for buy token affiliate fees (#2658)
    * Fix optimization of buy paths (#2655)
    * Fix depth buy scale (#2659)
    * Adjust fill by ethToInputRate when ethToOutputRate is 0 (#2660)
    * Add Bancor as liquidity source (#2650)
    * Added `mStable` (#2662)
    * Merge `erc20-bridge-sampler` into this package (#2664)
    * Added `Mooniswap` (#2675)
    * Stop requiring takerAddress for RFQ-T indicative quotes (#2684)
    * Added two-hop support (#2647)
    * Move ERC20BridgeSampler interfaces into `interfaces` directory (#2647)
    * Use on-chain sampling (sometimes) for Balancer (#2647)
    * Re-worked `Kyber` quotes supporting multiple reserves (#2683)
    * Enable Quote Report to be generated with an option `shouldGenerateQuoteReport`. Default is `false` (#2687)
    * Add `refundReceiver` to `ExchangeProxySwapQuoteConsumer` options. (#2657)
    * Use `IZeroExContract` in EP swap quote consumer. (#2657)
    * Set `rfqtTakerAddress` to null in EP consumer (#2692)
    * Return Mooniswap pool in sampler and encode it in bridge data (#2692)
    * Added `Swerve` (#2698)
    * Added `SushiSwap` (#2698)
    * Add uniswap VIP support (#2703)
    * Add `includedSources` support (#2703)
    * Added `Curve` Tripool (#2708)
    * Pass back fillData from quote reporter (#2702)
    * Fix Balancer sampling (#2711)
    * Respect max slippage in EP consumer (#2712)
    * Introduced Path class, exchangeProxyOverhead parameter (#2691)
    * Added `Shell` (#2722)
    * Fix exchange proxy overhead gas being scaled by gas price (#2723)
    * Remove 0x-API swap/v0-specifc code from asset-swapper (#2725)
    * Added `DODO` (#2701)
    * Fix for some edge cases with `includedSources` and `MultiHop` (#2730)
    * Introduced `excludedFeeSources` to disable sources when determining the price of an asset in ETH (#2731)
    * Support `DODO` Trade Allowed parameter to automatically disable the pool (#2732)
    * Added `SwerveBridge` and `SnowSwapBridge` deployed addresses (#7)

## v4.6.0 - _July 15, 2020_

    * Use internal Eth Gas Station proxy (#2614)
    * Renamed RFQT request parameters (#2582)
    * Fix worst case asset amount calculations. (#2615)
    * Specify EthGasStation url as an optional parameter (#2617)
    * Singleton Gas Price Oracle (#2619)
    * "Fix" forwarder buys of low decimal tokens. (#2618)
    * Add Balancer support (#2613)
    * Consolidate UniswapV2 sources, Curve sources in `ERC20BridgeSource` enum (#2613)
    * Change gas/fee schedule values from constants to functions returning numbers (#2613)
    * Specify overrides to the ERC20Sampler contract, by default the latest bytecode is the override (#2629)

## v4.5.0 - _June 24, 2020_

    * Add support for private liquidity providers (#2505)
    * Big refactor of market operation utils (#2513)
    * Remove `dustFractionThreshold`, `noConflicts` options. (#2513)
    * Revamp fill optimization algorithm (#2513)
    * Add fallback orders to quotes via `allowFallback` option. (#2513)
    * Add `maxFallbackSlippage` option. (#2513)
    * Fix fee schedule not being scaled by gas price. (#2522)
    * Fix quote optimizer bug not properly accounting for fees. (#2526)
    * Fix `getBatchMarketBuyOrdersAsync` throwing NO_OPTIMAL_PATH (#2533)
    * Add DFB support + refactor swap quote calculator utils (#2536)
    * Add support for RFQ-T, querying maker-hosted endpoints for quotes to be submitted by the taker (#2541)
    * Add support for indicative (non-committal) quotes via RFQ-T (#2555)
    * Collapse `LiquidityProvider` into `DexForwarderBridge` (#2560)
    * Added Curve `sUSD` (#2563)
    * Fix sporadically failing quote simulation tests (#2564)
    * Apply Native order penalty inline with the target amount (#2565)
    * Remove Kyber exclusion when Uniswap/Eth2Dai is present (#2575)
    * Expose fills object in asset-swapper quote orders (#2583)
    * Increase timeout for tests (#2587)
    * Add support for Uniswap V2 (#2599)
    * Add support for MultiBridge (#2593)
    * Fix Uniswap V2 path ordering (#2601)
    * Add exchange proxy support (#2591)

## v4.4.0 - _March 3, 2020_

    * Add support for ERC721 assets (#2491)
    * Add destroy for gas heartbeat (#2492)
    * Added `BUSD` Curve (#2506)
    * Updated `Compound` Curve address (#2506)

## v4.3.2 - _February 27, 2020_

    * Fix order native pruning by fill amount (#2500)

## v4.3.1 - _February 26, 2020_

    * Dependencies updated

## v4.3.0 - _February 25, 2020_

    * Add `fees` to `GetMarketOrdersOpts` (#2481)
    * Incorporate fees into fill optimization (#2481)

## v4.2.0 - _February 15, 2020_

    * Use `batchCall()` version of the `ERC20BridgeSampler` contract (#2477)
    * Support for sampling Curve contracts (#2483)

## v4.1.2 - _February 8, 2020_

    * Dependencies updated

## v4.1.1 - _February 6, 2020_

    * Fix bug with liquidity source breakdown (#2472)
    * Prune orders before creating a dummy order for the Sampler (#2470)
    * Bump sampler gas limit to 60e6 (#2471)

## v4.1.0 - _February 4, 2020_

    * Allow contract addresses to be passed as optional constructor ags instead of hardcoding (#2461)
    * Add swap quote liquidity source breakdown (#2465)

## v4.0.1 - _January 23, 2020_

    * Fix underestimated protocol fee in worst case quote. (#2452)

## v4.0.0 - _January 22, 2020_

    * Upgrade to new `Forwarder` contract with flat affiliate fees. (#2432)
    * Remove `getSmartContractParamsOrThrow()` from `SwapQuoteConsumer`s. (#2432)
    * Added `getBatchMarketBuySwapQuoteForAssetDataAsync` on `SwapQuoter` (#2427)
    * Add exponential sampling distribution and `sampleDistributionBase` option to `SwapQuoter` (#2427)
    * Compute more accurate best quote price (#2427)
    * Change Exchange sell function from `marketSellOrdersNoThrow` to `marketSellOrdersFillOrKill` (#2450)

## v3.0.3 - _January 6, 2020_

    * Ignore zero sample results from the sampler contract. (#2406)
    * Increase default `runLimit` from `1024` to `4096`. (#2406)
    * Increase default `numSamples` from `8` to `10` (#2406)
    * Fix ordering of optimized orders. (#2406)
    * Fix best and worst quotes being reversed sometimes. (#2406)
    * Fix rounding of quoted asset amounts. (#2406)
    * Undo bridge slippage in best case quote calculation. (#2406)
    * Compare equivalent asset data when validating quotes and checking fee asset data. (#2421)

## v3.0.2 - _December 17, 2019_

    * Fix gasPrice from `ethgasstation` to be in WEI instead of GWEI (#2393)
    * Add aggregator utils (#2353)

## v3.0.1 - _December 9, 2019_

    * Dependencies updated

## v3.0.0 - _December 2, 2019_

    * Refactor of logic for marketBuy/marketSell order pruning and selecting, introduced protocol fees, and refactored types used by the package (#2272)
    * Incorporate paying protocol fees. (#2350)
    * Update BigNumber version to ~9.0.0 (#2342)
    * All references to network ID have been removed, and references to chain ID have been introduced instead (#2313)

## v2.1.0-beta.4 - _December 2, 2019_

    * Dependencies updated

## v2.1.0-beta.3 - _November 20, 2019_

    * Refactor of logic for marketBuy/marketSell order pruning and selecting, introduced protocol fees, and refactored types used by the package (#2272)
    * Incorporate paying protocol fees. (#2350)

## v2.1.0-beta.2 - _November 7, 2019_

    * Update BigNumber version to ~9.0.0 (#2342)

## v2.1.0-beta.1 - _November 7, 2019_

    * All references to network ID have been removed, and references to chain ID have been introduced instead (#2313)

## v2.1.0-beta.0 - _October 3, 2019_

    * Dependencies updated

## v2.0.0 - _September 17, 2019_

    * AssetSwapper to use `@0x/orderbook` to fetch and subscribe to order updates (#2056)

## v1.0.3 - _September 3, 2019_

    * Dependencies updated

## v1.0.2 - _August 22, 2019_

    * Dependencies updated

## v1.0.1 - _August 8, 2019_

    * Dependencies updated

## v1.0.0 - _July 31, 2019_

    * Added optimization utils to consumer output (#1988)
    * Expanded test coverage (#1980)

## v0.0.5 - _July 24, 2019_

    * Dependencies updated

## v0.0.4 - _July 15, 2019_

    * Switched MarketOperation type to enum and expanded default constants configuration (#1959)
    * Added additional options to control asset-swapper behavior and optimized consumer output (#1966)

## v0.0.3 - _July 13, 2019_

    * Dependencies updated

## v0.0.2 - _July 13, 2019_

    * Dependencies updated

## v0.0.1 - _Invalid date_

    * Refactored asset-buyer into asset-swapper to support ERC<>ERC marketSell and marketBuy operations (#1845)
