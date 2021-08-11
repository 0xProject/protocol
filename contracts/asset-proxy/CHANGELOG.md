<!--
changelogUtils.file is auto-generated using the monorepo-scripts package. Don't edit directly.
Edit the package's CHANGELOG.json file only.
-->

CHANGELOG

## v3.7.18 - _August 11, 2021_

    * Dependencies updated

## v3.7.17 - _August 6, 2021_

    * Dependencies updated

## v3.7.16 - _June 22, 2021_

    * Dependencies updated

## v3.7.15 - _June 11, 2021_

    * Dependencies updated

## v3.7.14 - _June 2, 2021_

    * Dependencies updated

## v3.7.13 - _May 25, 2021_

    * Dependencies updated

## v3.7.12 - _May 21, 2021_

    * Dependencies updated

## v3.7.11 - _May 5, 2021_

    * Dependencies updated

## v3.7.10 - _April 28, 2021_

    * Dependencies updated

## v3.7.9 - _April 1, 2021_

    * Dependencies updated

## v3.7.8 - _March 17, 2021_

    * Dependencies updated

## v3.7.7 - _February 24, 2021_

    * Dependencies updated

## v3.7.6 - _February 10, 2021_

    * Dependencies updated

## v3.7.5 - _January 26, 2021_

    * Dependencies updated

## v3.7.4 - _January 13, 2021_

    * Dependencies updated

## v3.7.3 - _January 4, 2021_

    * Dependencies updated

## v3.7.2 - _December 23, 2020_

    * Dependencies updated

## v3.7.1 - _December 17, 2020_

    * Dependencies updated

## v3.7.0 - _December 16, 2020_

    * Fix Bancor support of ETH (#88)

## v3.6.9 - _December 9, 2020_

    * Dependencies updated

## v3.6.8 - _December 7, 2020_

    * Dependencies updated

## v3.6.7 - _December 3, 2020_

    * Dependencies updated

## v3.6.6 - _November 19, 2020_

    * Dependencies updated

## v3.6.5 - _November 13, 2020_

    * Dependencies updated

## v3.6.4 - _November 3, 2020_

    * Dependencies updated

## v3.6.3 - _November 3, 2020_

    * Dependencies updated

## v3.6.2 - _November 2, 2020_

    * Dependencies updated

## v3.6.1 - _October 28, 2020_

    * Dependencies updated

## v3.6.0 - _October 27, 2020_

    * Add `SwerveBridge` and `SnowSwapBridge` (duplicate of `CurveBridge`) (#2707)

## v3.5.0 - _October 21, 2020_

    * Update `CurveBridge` to support more varied curves (#2633)
    * Export DexForwarderBridgeContract (#2656)
    * Add BancorBridge and IBancorNetwork,  (#2650)
    * Added `MStableBridge` (#2662)
    * Added `MooniswapBridge` (#2675)
    * Reworked `KyberBridge` (#2683)
    * Added `CreamBridge` (#2715)
    * Added `ShellBridge` (#2722)
    * Added `DODOBridge` (#2701)

## v3.4.0 - _July 15, 2020_

    * Fix instability with DFB. (#2616)
    * Add `BalancerBridge` (#2613)

## v3.3.0 - _June 24, 2020_

    * Use `LibERC20Token.approveIfBelow()` in DEX bridges for for approvals. (#2512)
    * Emit `ERC20BridgeTransfer` events in bridges. (#2512)
    * Change names of `ERC20BridgeTransfer` args to be less ambiguous. (#2524)
    * Added `MixinGasToken` allowing Gas Tokens to be freed (#2523)
    * Add `DexForwaderBridge` bridge contract. (#2525)
    * Add `UniswapV2Bridge` bridge contract. (#2590)
    * Add Gas Token freeing to `DexForwarderBridge` contract. (#2536)

## v3.2.5 - _March 3, 2020_

    * Dependencies updated

## v3.2.4 - _February 27, 2020_

    * Dependencies updated

## v3.2.3 - _February 26, 2020_

    * Dependencies updated

## v3.2.2 - _February 25, 2020_

    * Dependencies updated

## v3.2.1 - _February 15, 2020_

    * Dependencies updated

## v3.2.0 - _February 8, 2020_

    * Add more types and functions to `IDydx` (#2466)
    * Rename `DydxBrigeAction.accountId` to `DydxBridgeAction.accountIdx` (#2466)
    * Fix broken tests. (#2462)
    * Remove dependency on `@0x/contracts-dev-utils` (#2462)
    * Add asset data decoding functions (#2462)
    * Add `setOperators()` to `IDydx` (#2462)

## v3.1.3 - _February 6, 2020_

    * Dependencies updated

## v3.1.2 - _February 4, 2020_

    * Dependencies updated

## v3.1.1 - _January 22, 2020_

    * Dependencies updated

## v3.1.0 - _January 6, 2020_

    * Integration tests for DydxBridge with ERC20BridgeProxy. (#2401)
    * Fix `UniswapBridge` token -> token transfer call. (#2412)
    * Fix `KyberBridge` incorrect `minConversionRate` calculation. (#2412)

## v3.0.2 - _December 17, 2019_

    * Dependencies updated

## v3.0.1 - _December 9, 2019_

    * Dependencies updated

## v3.0.0 - _December 2, 2019_

    * Implement `KyberBridge`. (#2352)
    * Drastically reduced bundle size by adding .npmignore, only exporting specific artifacts/wrappers/utils (#2330)
    * ERC20Wrapper and ERC1155ProxyWrapper constructors now require an instance of DevUtilsContract (#2034)
    * Disallow the zero address from being made an authorized address in MixinAuthorizable, and created an archive directory that includes an old version of Ownable (#2019)
    * Remove `LibAssetProxyIds` contract (#2055)
    * Compile and export all contracts, artifacts, and wrappers by default (#2055)
    * Remove unused dependency on IAuthorizable in IAssetProxy (#1910)
    * Add `ERC20BridgeProxy` (#2220)
    * Add `Eth2DaiBridge` (#2221)
    * Add `UniswapBridge` (#2233)
    * Replaced `SafeMath` with `LibSafeMath` (#2254)

## v2.3.0-beta.4 - _December 2, 2019_

    * Implement `KyberBridge`. (#2352)
    * Implement `DydxBridge`. (#2365)

## v2.3.0-beta.3 - _November 20, 2019_

    * Dependencies updated

## v2.3.0-beta.2 - _November 17, 2019_

    * Drastically reduced bundle size by adding .npmignore, only exporting specific artifacts/wrappers/utils (#2330)

## v2.3.0-beta.1 - _November 7, 2019_

    * ERC20Wrapper and ERC1155ProxyWrapper constructors now require an instance of DevUtilsContract (#2034)

## v2.3.0-beta.0 - _October 3, 2019_

    * Disallow the zero address from being made an authorized address in MixinAuthorizable, and created an archive directory that includes an old version of Ownable (#2019)
    * Remove `LibAssetProxyIds` contract (#2055)
    * Compile and export all contracts, artifacts, and wrappers by default (#2055)
    * Remove unused dependency on IAuthorizable in IAssetProxy (#1910)
    * Add `ERC20BridgeProxy` (#2220)
    * Add `Eth2DaiBridge` (#2221)
    * Add `UniswapBridge` (#2233)
    * Replaced `SafeMath` with `LibSafeMath` (#2254)

## v2.2.8 - _September 17, 2019_

    * Dependencies updated

## v2.2.7 - _September 3, 2019_

    * Dependencies updated

## v2.2.6 - _August 22, 2019_

    * Dependencies updated

## v2.2.5 - _August 8, 2019_

    * Dependencies updated

## v2.2.4 - _July 31, 2019_

    * Updated calls to <contract wrapper>.deployFrom0xArtifactAsync to include artifact dependencies. (#1995)

## v2.2.3 - _July 24, 2019_

    * Dependencies updated

## v2.2.2 - _July 15, 2019_

    * Dependencies updated

## v2.2.1 - _July 13, 2019_

    * Dependencies updated

## v2.2.0 - _July 13, 2019_

    * Add `LibAssetProxyIds` contract (#1835)
    * Updated ERC1155 Asset Proxy. Less optimization. More explicit handling of edge cases. (#1852)
    * Implement StaticCallProxy (#1863)

## v2.1.5 - _May 24, 2019_

    * Dependencies updated

## v2.1.4 - _May 15, 2019_

    * Dependencies updated

## v2.1.3 - _May 14, 2019_

    * Dependencies updated

## v2.1.2 - _May 10, 2019_

    * Update tests to use contract-built-in `awaitTransactionSuccessAsync` (#1797)
    * Make `ERC721Wrapper.setApprovalForAll()` take an owner address instead of a token ID (#1819)
    * Automatically set unlimited proxy allowances in `ERC721.setBalancesAndAllowancesAsync()` (#1819)
    * Add `setProxyAllowanceForAllAsync()` to `ERC1155ProxyWrapper`. (#1819)

## v2.1.1 - _April 11, 2019_

    * Dependencies updated

## v2.1.0 - _March 21, 2019_

    * Run Web3ProviderEngine without excess block polling (#1695)

## v2.0.0 - _March 20, 2019_

    * Do not reexport external dependencies (#1682)
    * Add ERC1155Proxy (#1661)
    * Bumped solidity version to ^0.5.5 (#1701)
    * Integration testing for ERC1155Proxy (#1673)

## v1.0.9 - _March 1, 2019_

    * Dependencies updated

## v1.0.8 - _February 27, 2019_

    * Dependencies updated

## v1.0.7 - _February 26, 2019_

    * Dependencies updated

## v1.0.6 - _February 25, 2019_

    * Dependencies updated

## v1.0.5 - _February 9, 2019_

    * Dependencies updated

## v1.0.4 - _February 7, 2019_

    * Dependencies updated

## v1.0.3 - _February 7, 2019_

    * Fake publish to enable pinning

## v1.0.2 - _February 6, 2019_

    * Dependencies updated

## v1.0.1 - _February 5, 2019_

    * Dependencies updated

## v1.0.0 - _Invalid date_

    * Move all AssetProxy contracts out of contracts-protocol to new package (#1539)
