<!--
changelogUtils.file is auto-generated using the monorepo-scripts package. Don't edit directly.
Edit the package's CHANGELOG.json file only.
-->

CHANGELOG

## v16.66.4 - _August 22, 2022_

    * Offboard Cream (#546)
    * Change WooFi gas estimates (#551)

## v16.66.3 - _August 10, 2022_

    * Dependencies updated

## v16.66.2 - _August 9, 2022_

    * Upgrade dependency (#543)

## v16.66.1 - _August 8, 2022_

    * Upgrade dependency (#538)

## v16.66.0 - _August 6, 2022_

    * Add WOOFi support (#513)

## v16.65.0 - _August 1, 2022_

    * Use 0x gas api instead of eth gas station api (#532)

## v16.64.0 - _July 27, 2022_

    * Refactor `TokenAdjacency` and `TokenAdjacencyBuilder` (#517)
    * Add Synthetix support` (#518)
    * Replace Beethoven X subgraph URL (#519)
    * Remove Mooniswap on Ethereum mainnet (#529)

## v16.63.1 - _July 12, 2022_

    * Better error handling for balancer cache (#515)

## v16.63.0 - _June 29, 2022_

    * Remove JS router (#480)
    * Removed Median price in favour of best gas adjusted price (#480)

## v16.62.2 - _Invalid date_

    * Offboard Smoothy and ComethSwap (#509)

## v16.62.1 - _June 15, 2022_

    * Remove nUSD from intermediate liquidity to save on sampler gas (#505)

## v16.62.0 - _June 14, 2022_

    * Add MDEX on BSC (#496)
    * Add KnightSwap on BSC (#498)
    * Add Velodrome support on Optimism (#494)
    * Do not send empty entries on Quote Report (#501)
    * KnightSwap/Mdex cosmetic change (#502)
    * Offboard JetSwap, CafeSwap, JulSwap, and PolyDex (#503)

## v16.61.0 - _June 3, 2022_

    * Add stETH wrap/unwrap support (#476)
    * Offboard/clean up Oasis, CoFix, and legacy Kyber (#482)
    * Add MeshSwap on Polygon (#491)

## v16.60.1 - _May 19, 2022_

    * Alias Balancer sor to the old version (#481)

## v16.60.0 - _May 19, 2022_

    * Add BiSwap on BSC (#467)
    * Add GMX and Platypus on Avalanche and Enable KyberDMM on bsc (#478)
    * Add Yoshi Exchange support in Fantom (#473)
    * Fix KyberDMM gas underestimation (#479)

## v16.59.0 - _May 13, 2022_

    * Remove SnowSwap on mainnet (#468)
    * Offboard Swerve Finance and LinkSwap (#469)
    * Offboard Eth2Dai (#470)
    * Add an optional IRfqClient for SwapQuoter#getSwapQuoteAsync (#467)

## v16.58.0 - _Invalid date_

    * Update Saddle pools on Mainnet (#450)

## v16.57.3 - _May 10, 2022_

    * Fix a runtime error related to BalancerV2SwapInfoCache (#472)

## v16.57.2 - _May 2, 2022_

    * Fix missing AMM quotes on indicative Quote Reports (#466)

## v16.57.1 - _Invalid date_

    * Added QUICK/ANY pair on Polygon (#464)
    * Added cvxFXS/FXS curve pool on mainnet (#465)

## v16.57.0 - _April 22, 2022_

    * Add BalancerV2 batch swap support (#462)

## v16.56.0 - _April 21, 2022_

    * Add estimatedGas to ExtendedQuoteReport (#463)

## v16.55.0 - _April 7, 2022_

    * Fix fillRfqOrder VIP being used for swaps that need transformERC20 (#461)

## v16.54.0 - _April 6, 2022_

    * Add true VIP support for eligible RFQt swaps (#458)

## v16.53.0 - _March 31, 2022_

    * Adds support for STG/USDC pool on Curve Mainnet (#451)
    * Use neon-router in asset-swapper tests (#453)
    * Add sampler blocknumber to quote report data (#448)

## v16.52.0 - _Invalid date_

    * Adds support for mobius money on celo (#423)

## v16.51.0 - _March 10, 2022_

    * Added `Curve` `YFI-ETH` pool (#444)

## v16.50.3 - _March 9, 2022_

    * Routing glue optimization (#439)
    * Move VIP source routing into neon-router & disable fallback orders for native/plp (#440)

## v16.50.2 - _March 7, 2022_

    * Update `Uniswap_V3` address on `Ropsten` (#441)

## v16.50.1 - _March 3, 2022_

    * Add BTRFLY/WETH Curve pool on mainnet (#437)
    * Lower Uniswap V3 Sampler gas allowance (#438)

## v16.50.0 - _March 2, 2022_

    * Adding support for Geist on `Fantom` (#398)
    * Improve Uniswap V3 gas schedule (#424)

## v16.49.9 - _February 24, 2022_

    * Fix native order scaling & filter out 1 wei quotes (#430)

## v16.49.8 - _February 22, 2022_

    * Dependencies updated

## v16.49.7 - _February 22, 2022_

    * Fix native order handling for very small quotes and bump `neon-router` dependency (#425)

## v16.49.6 - _February 17, 2022_

    * Fixed btrfly routing to include the ohmV2/dai, ohmV2/btfly, and ohmV2/weth pools (#427)

## v16.49.5 - _February 14, 2022_

    * Fix scaling 1 base unit to 0, round output to base units (#422)

## v16.49.4 - _February 10, 2022_

    * Reverts 'Improve Uniswap V3 gas schedule' due to issue with buys (#419)

## v16.49.3 - _February 10, 2022_

    * Fix `slippage` inconsistency when recalculated in exchange proxy quote consumer (#412)
    * Fix incorrect output scaling when input is less than desired amount, update fast-abi (#401)
    * Improve Uniswap V3 gas schedule (#397)
    * Fix add Native as VIP and use Path to compare all sources vs vip only (#413)

## v16.49.2 - _January 31, 2022_

    * Fix ABI encoding error with two hop buys due to applying slippage to uint(-1) values (#410)

## v16.49.1 - _January 31, 2022_

    * Fix WorstCaseQuoteInfo encoding bug (#402)

## v16.49.0 - _January 28, 2022_

    * Add more curve pools (#409)

## v16.48.0 - _January 25, 2022_

    * Use `MIM` as an intermediate asset on `Fantom` (#405)

## v16.47.0 - _January 25, 2022_

    * Adding support for Synapse on all networks (#400)

## v16.46.0 - _January 11, 2022_

    * Enable `Curve` ETH/CVX pool (#394)

## v16.45.2 - _January 10, 2022_

    * Handle 0 output samples and negative adjusted rate native orders in routing (#387)

## v16.45.1 - _January 5, 2022_

    * Update `Celo` intermediate tokens (#390)

## v16.45.0 - _January 4, 2022_

    * Capture router timings (#388)

## v16.44.0 - _December 29, 2021_

    * Update neon-router and use router estimated output amount (#354)

## v16.43.0 - _December 24, 2021_

    * `UniswapV3` support for `Optimism` (#385)

## v16.42.0 - _December 21, 2021_

    * `UniswapV3` support for `Polygon` (#382)
    * Update `Beethoven` Graphql url (#383)

## v16.41.0 - _December 6, 2021_

    * Update mcusd contract address, and made celo native asset (#376)

## v16.40.0 - _December 1, 2021_

    * Add `AaveV2` and `Compound` deposit/withdrawal liquidity source (#321)

## v16.39.0 - _Invalid date_

    * Curve ETH/CRV pool (#378)

## v16.38.0 - _November 29, 2021_

    * Capture sampler metrics (#374)

## v16.37.0 - _November 19, 2021_

    * Changed Sushiswap router address (#373)

## v16.36.0 - _November 19, 2021_

    * Specify liquid routes for FEI/TRIBE FXS/FRAX and OHM/FRAX (#371)

## v16.35.0 - _November 18, 2021_

    * Add Beethoven X, MorpheusSwap and JetSwap to Fantom (#370)

## v16.34.0 - _November 16, 2021_

    * Add support Celo (#367)

## v16.33.0 - _November 16, 2021_

    * Add support for Uniswap V3 1 bps pools (#366)

## v16.32.0 - _November 9, 2021_

    * Extended Quote Report (#361)

## v16.31.0 - _November 3, 2021_

    * Added `Curve`, `Curve_V2` and `KyberDmm` to Avalanche (#363)

## v16.30.1 - _November 3, 2021_

    * Dependencies updated

## v16.30.0 - _October 19, 2021_

    * Fantom deployment (#347)

## v16.29.3 - _October 18, 2021_

    * Update neon-router version and address breaking changes (#344)

## v16.29.2 - _October 13, 2021_

    * Check MAX_IN_RATIO in sampleBuysFromBalancer (#338)
    * Go back to using transformERC20 (instead of transformERC20Staging) (#343)

## v16.29.1 - _October 4, 2021_

    * Remove `Clipper` as a custom liquidity source (#335)

## v16.29.0 - _October 4, 2021_

    * Initial integration of neon-router (behind feature flag) (#295)

## v16.28.0 - _September 29, 2021_

    * Update ExchangeProxySwapQuoteConsumer for Multiplex V2 and friends (#282)

## v16.27.5 - _Invalid date_

    * Remove protocol fees by setting `PROTOCOL_FEE_MULTIPLIER` to 0 (#333)

## v16.27.4 - _September 15, 2021_

    * Dependencies updated

## v16.27.3 - _September 14, 2021_

    * Dependencies updated

## v16.27.2 - _September 14, 2021_

    * Dependencies updated

## v16.27.1 - _September 8, 2021_

    * Fix ApproximateBuys sampler to terminate if the buy amount is not met (#319)

## v16.27.0 - _September 1, 2021_

    * Avalanche deployment (#312)

## v16.26.2 - _August 31, 2021_

    * chore: Curve new pools (CVX-CRX, MIM, atricrypto3)

## v16.26.1 - _August 19, 2021_

    * Dependencies updated

## v16.26.0 - _August 19, 2021_

    * feat: Enable partial Native fills to be consumed, previously for v3 they were dropped (#309)
    * feat: Modify Intermediate tokens to be a union (#309)
    * feat: Retire Eth2Dai/Oasis (#309)

## v16.25.0 - _August 16, 2021_

    * Fix: fallback fills which have not been used, unique id by source-index

## v16.24.1 - _August 11, 2021_

    * Dependencies updated

## v16.24.0 - _August 6, 2021_

    * Add `Clipper` as a custom liquidity source (#299)
    * Added `Curve` `Tricrypto2` and `ESD` v2 (#302)

## v16.23.1 - _July 29, 2021_

    * Fix fill amount rounding error when covnerting fills to orders. (#296)

## v16.23.0 - _July 16, 2021_

    * ACryptoS (#284)

## v16.22.0 - _July 13, 2021_

    * IronSwap (#281)

## v16.21.0 - _July 10, 2021_

    * JetSwap (#280)

## v16.20.0 - _July 6, 2021_

    * ShibaSwap (#276)

## v16.19.1 - _July 6, 2021_

    * Fix LiquidityProvider fallback (#272)

## v16.19.0 - _July 2, 2021_

    * Add LiquidityProvider to Polygon sources (#270)

## v6.18.3 - _June 29, 2021_

    * Polygon Balance V2

## v6.18.2 - _June 24, 2021_

    * Dependencies updated

## v6.18.1 - _June 22, 2021_

    * FirebirdOneSwap, ApeSwap. New hop tokens: DFYN, BANANA, WEXPOLY (#265)

## v6.18.0 - _June 22, 2021_

    * Add Lido stETH deposit integration (#260)

## v6.17.3 - _June 16, 2021_

    * QUICK, TITAN, IRON as intermediate tokens, integrating WaultSwap and Polydex for Polygon, Curve renBTC pool

## v6.17.2 - _June 11, 2021_

    * Dependencies updated

## v6.17.1 - _June 2, 2021_

    * Dependencies updated

## v6.17.0 - _May 27, 2021_

    * Re-enable liquidity provider and update KNC address (#253)

## v6.16.0 - _May 25, 2021_

    * Add support for the Polygon chain (#240)

## v6.15.0 - _May 21, 2021_

    * Fix KyberDmm (#236)
    * Re-enable KyberDmm (#247)
    * Add Huobi Token to liquidity provider tokens (#246)
    * Temporarily disable specific LiquidityProvider

## v6.14.0 - _May 12, 2021_

    * Add support for additional sources and intermediate tokens on Ropsten (#231)
    * Add UniswapV3 VIP support (#237)

## v6.13.0 - _May 11, 2021_

    * Add LiquidityProvider to BSC sources (#234)

## v6.12.0 - _May 10, 2021_

    * `TwoHopSampler` to use `call` over `staticcall` in order to support sources like `Uniswap_V3` and `Balancer_V2` (#233)

## v6.11.0 - _May 7, 2021_

    * Add price comparisons data separate from the quote report (#219)
    * Add caching for top Balancer V2 pools on startup and during regular intervals (#228)
    * Tweak compiler settings for smaller sampler bytecode (#229)
    * Fix Multiplex multihop encoding for ETH buys/sells (#230)
    * Fix Sampler address override for Ganache (#232)

## v6.10.0 - _May 5, 2021_

    * Reactivate PancakeSwapV2 and BakerySwap VIP on BSC (#222)
    * Add LUSD Curve pool (#218)
    * Fix exchangeProxyGasOverhead for fallback path (#215)
    * Enable ETH based Curve pools (#220)
    * Reactivate PancakeSwapV2 and BakerySwap VIP on BSC (#222)
    * Disable WETH based SnowSwap pools (#220)
    * PLP now includes a fallback due to observed collisions (#223)
    * Add Balancer V2 integration (#206)
    * Re-work the PoolCache for Balancer et al (#226)

## v6.9.1 - _May 1, 2021_

    * Temporarily remove PancakeV2 and BakerySwap from VIP

## v6.9.0 - _April 30, 2021_

    * Remove conflicting Kyber reserve (#216)

## v6.8.0 - _April 28, 2021_

    * Prune paths which cannot improve the best path (#183)
    * Use FastABI for Sampler ABI encoding and decoding (#183)

## v6.7.0 - _April 26, 2021_

    * Support PancakeSwap V2 (#211)

## v6.6.1 - _Invalid date_

    * Fixing Positive Slippage logic to not force the EP route (#209)

## v6.6.0 - _April 16, 2021_

    * Support `Ropsten` network (#203)
    * BSC Uniswap clones (ApeSwap, CafeSwap, CheeseSwap, JulSwap), Saddle BTC pool, Curve gas schedule (#208)

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
