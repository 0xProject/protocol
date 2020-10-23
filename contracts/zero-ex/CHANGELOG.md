<!--
changelogUtils.file is auto-generated using the monorepo-scripts package. Don't edit directly.
Edit the package's CHANGELOG.json file only.
-->

CHANGELOG

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
