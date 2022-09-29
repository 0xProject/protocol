<!--
changelogUtils.file is auto-generated using the monorepo-scripts package. Don't edit directly.
Edit the package's CHANGELOG.json file only.
-->

CHANGELOG

## v0.37.4 - _September 21, 2022_

    * Dependencies updated

## v0.37.3 - _September 12, 2022_

    * Dependencies updated

## v0.37.2 - _September 7, 2022_

    * Dependencies updated

## v0.37.1 - _September 2, 2022_

    * Dependencies updated

## v0.37.0 - _September 1, 2022_

    * Add support for OTC orders in the FillQuoteTransformer (#565)
    * fix CI (#569)

## v0.36.6 - _August 25, 2022_

    * Dependencies updated

## v0.36.5 - _August 25, 2022_

    * Dependencies updated

## v0.36.4 - _August 22, 2022_

    * Dependencies updated

## v0.36.3 - _August 10, 2022_

    * Dependencies updated

## v0.36.2 - _August 8, 2022_

    * Add Foundry support (#534)

## v0.36.1 - _August 6, 2022_

    * Dependencies updated

## v0.36.0 - _July 27, 2022_

    * Add Synthetix support in Ethereum and Optimism bridge adapters (#518)

## v0.35.0 - _June 14, 2022_

    * Adds support for Velodrome OptimismBridgeAdapter (#494)

## v0.34.0 - _June 3, 2022_

    * Splits BridgeAdapter up by chain (#487)
    * Add stETH wrap/unwrap support (#476)
    * Adds support for BancorV3 to EthereumBridgeAdapter (#492)

## v0.33.0 - _May 19, 2022_

    * Add support for GMX and Platypus to bridge adapter (#478)

## v0.32.0 - _April 22, 2022_

    * Add support for `BalancerV2Batch` fills in FQT (#462)

## v0.31.2 - _March 31, 2022_

    * Dependencies updated

## v0.31.1 - _March 2, 2022_

    * Dependencies updated

## v0.31.0 - _February 22, 2022_

    * Add ERC721OrdersFeature, ERC1155OrdersFeature, and ERC165Feature (#429)

## v0.30.1 - _December 24, 2021_

    * Dependencies updated

## v0.30.0 - _December 1, 2021_

    * Add `AaveV2` and `Compound` deposit/withdrawal liquidity source (#321)

## v0.29.5 - _November 16, 2021_

    * Dependencies updated

## v0.29.4 - _November 16, 2021_

    * Prevent EP ETH balance from reducing when executin mtxs (#365)

## v0.29.3 - _November 3, 2021_

    * Register transformERC20() and remove transformERC20Staging() (#355)
    * Add OtcOrders to FullMigration (#350)

## v0.29.2 - _October 19, 2021_

    * Dependencies updated

## v0.29.1 - _October 4, 2021_

    * Dependencies updated

## v0.29.0 - _September 29, 2021_

    * Export TransformERC20FeatureContract (#282)

## v0.28.5 - _September 15, 2021_

    * Dependencies updated

## v0.28.4 - _September 8, 2021_

    * Dependencies updated

## v0.28.3 - _September 1, 2021_

    * Dependencies updated

## v0.28.2 - _August 19, 2021_

    * Add ethers as an explicit dependency (#310)

## v0.28.1 - _August 19, 2021_

    * Dependencies updated

## v0.28.0 - _August 16, 2021_

    * Transfer output tokens in TransformERC20Feature (#279)
    * Add support for takerToken=0xeee... in OtcOrdersFeature (#287)
    * Add support for OTC orders in MultiplexFeature (#287)
    * Multiplex v2: Refactor into multiple files, add ETH support, and other miscellanea (#263)

## v0.27.1 - _August 11, 2021_

    * Dependencies updated

## v0.27.0 - _August 6, 2021_

    * Add `Clipper` as a custom liquidity source

## v0.26.0 - _June 22, 2021_

    * Add Lido stETH deposit integration (#260)

## v0.25.1 - _June 11, 2021_

    * Dependencies updated

## v0.25.0 - _June 2, 2021_

    * Add OtcOrdersFeature (#244)
    * Add UniswapV3 VIP feature (#237)

## v0.24.1 - _May 25, 2021_

    * Dependencies updated

## v0.24.0 - _May 21, 2021_

    * Add special selectors to selector collision test (#243)

## v0.23.0 - _May 5, 2021_

    * Added ETH support to `MixinCurve` (#220)
    * Add Balancer V2 integration (#206)

## v0.22.3 - _May 1, 2021_

    * Dependencies updated

## v0.22.2 - _April 30, 2021_

    * Dependencies updated

## v0.22.1 - _April 28, 2021_

    * bump feature version to 1.2 (#213)

## v0.22.0 - _April 26, 2021_

    * Add order signer registry to NativeOrdersFeature (#195)

## v0.21.1 - _April 12, 2021_

    * Dependencies updated
    * BSC Uniswap clones (ApeSwap, CafeSwap, CheeseSwap, JulSwap) (#208)

## v0.21.0 - _April 1, 2021_

    * Encoding protocol ID and source name in bridge source ID (#162)
    * Add PancakeSwapFeature (#164)
    * Remove TokenSpender/AllowanceTarget/greedy tokens stuff (#164)
    * Added Nerve in BridgeAdapter (#181)
    * Delete TokenSpenderFeature (#189)
    * Fix PancakeSwapFeature BakerySwap swap selector (#190)

## v0.20.0 - _March 17, 2021_

    * Add `MooniswapLiquidityProvider` (#143)
    * Emit `LiquidityProviderFill` event in `CurveLiquidityProvider` (#143)
    * Add BatchFillNativeOrdersFeature and MultiplexFeature (#140)
    * Export MultiplexFeatureContract (#168)

## v0.19.0 - _February 24, 2021_

    * Add `CurveLiquidityProvider` and misc refactors (#127)
    * Export `CurveLiquidityProviderContract` (#144)
    * Add `DodoV2` (#152)
    * Add `Linkswap` (#153)
    * refund ETH with no gas limit in FQT (#155)
    * Added an opt-in `PositiveSlippageAffiliateFee` (#101)

## v0.18.2 - _February 10, 2021_

    * Update FQT for v4 native orders (#104)

## v0.18.1 - _January 26, 2021_

    * Swallow reverts in `batchGetLimitOrderRelevantStates()` and `batchGetRfqOrderRelevantStates()` (#117)

## v0.18.0 - _January 13, 2021_

    * Use consistent returndatasize checks in UniswapFeature (#96)
    * Remove `MetaTransactionsFeature._executeMetaTransaction()` and `SignatureValidatorFeature` (#109)

## v0.17.0 - _January 4, 2021_

    * Add DevUtils-like functions to `NativeOrdersFeature` (#97)
    * Add SPDX license identifiers to solidity files (#105)

## v0.16.0 - _December 23, 2020_

    * Fix CryptoCom rollup

## v0.15.0 - _December 17, 2020_

    * Add MixinBancor to BridgeAdapter (#91)
    * Add MixinCoFiX to BridgeAdapter (#92)

## v0.14.0 - _December 16, 2020_

    * Use the `MetaTransaction` class from `@0x/protocol-utils` in tests. (#90)

## v0.13.0 - _December 16, 2020_

    * Address audit feedback in UniswapFeature (#82)
    * Always transfer `msg.value` to the liquidity provider contract in LiquidityProviderFeature to (#82)
    * Remove backwards compatibility with old PLP/bridge interface in `LiquidityProviderFeature` and `MixinZeroExBridge` (#85)

## v0.12.0 - _December 9, 2020_

    * Add test for selector collisions on the proxy (#74)
    * Move tooling out into `@0x/protocol-utils`. (#76)

## v0.11.1 - _December 7, 2020_

    * Dependencies updated

## v0.11.0 - _December 3, 2020_

    * Turn `LibTokenSpender` into `FixinTokenSpender` (#38)
    * Use bloom filters to check if a token is greedy and do not optimistically fall through transferFrom() if so (#38)
    * Revert to original proxy implementation (#38)
    * Fix incorrect cancel order event param (#38)
    * Add a gas limit to first `LibTokenSpender` and `UniswapFeature` transfer (#38)
    * Convert metatransactions to use `LibSignature` (#31)
    * Add metatransaction support for limit orders (#44)
    * Require RFQ orders to specify a transaction origin, and allow approved alternative addresses (#47)
    * Do not try to pull all tokens if selling all ETH in `TransformERC20Feature` (#46)
    * Remove protocol fees from all RFQ orders and add `taker` field to RFQ orders (#45)
    * Fix getRfqOrderInfo() to return status INVALID when missing txOrigin (#50)
    * Remove calldata signing functionality (#51)
    * Add a permissionless transformer deployer (#55)
    * Add Crypto.com to `BridgeAdapter` (#43)
    * Use `FeeCollectorController` contract for deploying `FeeCollector`s (#59)

## v0.10.0 - _November 19, 2020_

    * Add `checkAllowance` flag to LibTokenSpender.spendERC20Tokens (#39)
    * Use new `checkAllowance` flag in LiquidityProviderFeature, TransformERC20Feature, and MetaTransactionsFeature (#39)
    * Add native orders features (#27)

## v0.9.0 - _November 13, 2020_

    * Rewrite the ZeroEx contract in Yul (#23)
    * Update LiquidityProviderFeature to use off-chain registry and sandbox (#16)
    * Update ILiquidityProvider interface (#16)
    * Update ProtocolFeeUnfunded event to emit order hash (#16)

## v0.8.0 - _November 3, 2020_

    * Trust LP boughtAmount return value (#29)

## v0.7.0 - _November 3, 2020_

    * Change `ProtocolFeeUnfunded` event in FQT (#28)
    * Use new PLP interface in FQT. (#28)

## v0.6.0 - _November 2, 2020_

    * Add support for collecting protocol fees in ETH or WETH (#2)
    * Add `LibSignature` library (#21)
    * Add `LimitOrdersFeature` (#27)

## v0.5.1 - _October 28, 2020_

    * Dependencies updated

## v0.5.0 - _October 27, 2020_

    * Add `Swerve`, `SnowSwap`, `DODO` and `SushiSwap` into FQT (#7)

## v0.4.0 - _October 23, 2020_

    * Use the exchange proxy as the primary allowance target (#3)

## v0.3.0 - _October 21, 2020_

    * Internal audit fixes (#2657)
    * Add refund mechanism to meta-transactions (#2657)
    * Pass sender address to transformers (#2657)
    * Refund unused protocol fees to `refundReceiver` in FQT (#2657)
    * Fix `TransformerDeployer.kill()` calling the wrong `die()` interface. (#2624)
    * Address CD post-audit feedback (#2657)
    * Add `LogMetadataTransformer` (#2657)
    * Rename all feature contracts to have `Feature` suffix (#2657)
    * Return `IZeroExContract` in `fullMigrateAsync()` (#2657)
    * Add taker address enforcement to RFQT orders in FQT (#2692)
    * All calldata is valid if quote signer is unset in `TransformERC20` (#2692)
    * Add updated Kyber and Mooniswap rollup to FQT (#2692)
    * Add `UniswapFeature` (#2703)
    * Fix versioning (`_encodeVersion()`) bug (#2703)
    * Added LiquidityProviderFeature (#2691)
    * Added `Shell` into FQT (#2722)
    * Added `CREAM` into FQT (#2715)

## v0.2.0 - _July 15, 2020_

    * Export migration tools (#2612)
    * Export `AffiliateFeeTransformerContract` (#2622)
    * Add `MetaTransactions` and `SignatureValidator` features (#2610)
    * Update `TransformERC20` and `MetaTransactions` to handle signed calldata. (#2626)

## v0.1.1 - _June 24, 2020_

    * Dependencies updated

## v0.1.0 - _Invalid date_

    * Create this package (#2540)
    * Introduce fill `TransformERC20` feature. (#2545)
    * Fill Bridges directly in `FillQuoteTransformer`. (#2608)
