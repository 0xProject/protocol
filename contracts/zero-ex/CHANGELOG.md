<!--
changelogUtils.file is auto-generated using the monorepo-scripts package. Don't edit directly.
Edit the package's CHANGELOG.json file only.
-->

CHANGELOG

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
