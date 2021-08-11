<!--
changelogUtils.file is auto-generated using the monorepo-scripts package. Don't edit directly.
Edit the package's CHANGELOG.json file only.
-->

CHANGELOG

## v2.0.44 - _August 11, 2021_

    * Dependencies updated

## v2.0.43 - _August 6, 2021_

    * Dependencies updated

## v2.0.42 - _June 22, 2021_

    * Dependencies updated

## v2.0.41 - _June 11, 2021_

    * Dependencies updated

## v2.0.40 - _June 2, 2021_

    * Dependencies updated

## v2.0.39 - _May 25, 2021_

    * Dependencies updated

## v2.0.38 - _May 21, 2021_

    * Dependencies updated

## v2.0.37 - _May 5, 2021_

    * Patch epoch finalization issue (#221)

## v2.0.36 - _April 28, 2021_

    * Dependencies updated

## v2.0.35 - _April 1, 2021_

    * Dependencies updated

## v2.0.34 - _March 17, 2021_

    * Dependencies updated

## v2.0.33 - _February 24, 2021_

    * Dependencies updated

## v2.0.32 - _February 10, 2021_

    * Dependencies updated

## v2.0.31 - _January 26, 2021_

    * Dependencies updated

## v2.0.30 - _January 13, 2021_

    * Dependencies updated

## v2.0.29 - _January 4, 2021_

    * Dependencies updated

## v2.0.28 - _December 23, 2020_

    * Dependencies updated

## v2.0.27 - _December 17, 2020_

    * Dependencies updated

## v2.0.26 - _December 16, 2020_

    * Dependencies updated

## v2.0.25 - _December 9, 2020_

    * Dependencies updated

## v2.0.24 - _December 7, 2020_

    * Dependencies updated

## v2.0.23 - _December 3, 2020_

    * Dependencies updated

## v2.0.22 - _November 19, 2020_

    * Dependencies updated

## v2.0.21 - _November 13, 2020_

    * Dependencies updated

## v2.0.20 - _November 3, 2020_

    * Dependencies updated

## v2.0.19 - _November 3, 2020_

    * Dependencies updated

## v2.0.18 - _November 2, 2020_

    * Dependencies updated

## v2.0.17 - _October 28, 2020_

    * Dependencies updated

## v2.0.16 - _October 27, 2020_

    * Dependencies updated

## v2.0.15 - _October 21, 2020_

    * Dependencies updated

## v2.0.14 - _July 15, 2020_

    * Dependencies updated

## v2.0.13 - _June 24, 2020_

    * Dependencies updated

## v2.0.12 - _March 3, 2020_

    * Dependencies updated

## v2.0.11 - _February 27, 2020_

    * Dependencies updated

## v2.0.10 - _February 26, 2020_

    * Dependencies updated

## v2.0.9 - _February 25, 2020_

    * Dependencies updated

## v2.0.8 - _February 15, 2020_

    * Dependencies updated

## v2.0.7 - _February 8, 2020_

    * Fix revert for `LibFixedMath.mul(x, 0)`. (#2462)
    * Fix broken tests. (#2462)

## v2.0.6 - _February 6, 2020_

    * Dependencies updated

## v2.0.5 - _February 4, 2020_

    * Dependencies updated

## v2.0.4 - _January 22, 2020_

    * Dependencies updated

## v2.0.3 - _January 6, 2020_

    * Dependencies updated

## v2.0.2 - _December 17, 2019_

    * Dependencies updated

## v2.0.1 - _December 9, 2019_

    * Dependencies updated

## v2.0.0 - _December 2, 2019_

    * Drastically reduced bundle size by adding .npmignore, only exporting specific artifacts/wrappers/utils (#2330)
    * Introduce new exports FixedMathRevertErrors and StakingRevertErrors (#2321)
    * Removed handshake when adding maker to pool. (#2250)
    * Removed upper limit on number of makers in a pool. (#2250)
    * Removed operator permissions from makers. (#2250)
    * Pool Id starts at 1 and increases by 1. (#2250)
    * Add more overflow safeguards to `LibFixedMath` (#2255)
    * Refactored finalization state. (#2276)
    * Removed protocol fee != 0 assertion. (#2278)
    * Call `StakingProxy.assertValidStorageParams()` in `MixinParams.setParams()` (#2279)
    * The fallback function in `StakingProxy` reverts if there is no staking contract attached (#2310)
    * Fix overflow w/ `LibFixedMath._mul(-1, -2*255) (#2311)
    * Unit tests for MixinScheduler (#2314)
    * Unit tests for MixinCumulativeRewards (#2316)
    * Created package (#1821)
    * First implementation (#1910)
    * Replace `LibFeeMath` with `LibFixedMath`. (#2109)
    * Use a more precise cobb-douglas implementation. (#2109)
    * Change the way operator stake is computed. (#2109)
    * Denominate pool operator shares in parts-per-million. (#2109)
    * New stake management mechanics. Delay before delegation. Nixed shadow rewards. (#2118)
    * Tests for new stake management mechanics. (#2126)
    * Add `init()` pattern to contracts. (#2131)
    * Replace `MixinDeploymentConstants` with `MixinParams`. (#2131)
    * Reference counting for cumulative rewards. (#2154)
    * Refactored Staking Reward Vault. Moved pool management logic into staking contract. (#2156)
    * Removed MixinStakingPoolRewardVault.sol (#2156)
    * Refactored out `_cobbDouglas()` into its own library (#2179)
    * Introduce multi-block finalization. (#2155)
    * Removed reference counting for cumulative rewards. (#2188)
    * Removed explicit dependency on epoch+1 when delegating. (#2188)

## v1.1.0-beta.4 - _December 2, 2019_

    * Dependencies updated

## v1.1.0-beta.3 - _November 20, 2019_

    * Dependencies updated

## v1.1.0-beta.2 - _November 17, 2019_

    * Drastically reduced bundle size by adding .npmignore, only exporting specific artifacts/wrappers/utils (#2330)
    * Introduce new exports FixedMathRevertErrors and StakingRevertErrors (#2321)

## v1.1.0-beta.1 - _November 7, 2019_

    * Removed handshake when adding maker to pool. (#2250)
    * Removed upper limit on number of makers in a pool. (#2250)
    * Removed operator permissions from makers. (#2250)
    * Pool Id starts at 1 and increases by 1. (#2250)
    * Add more overflow safeguards to `LibFixedMath` (#2255)
    * Refactored finalization state. (#2276)
    * Removed protocol fee != 0 assertion. (#2278)
    * Call `StakingProxy.assertValidStorageParams()` in `MixinParams.setParams()` (#2279)
    * The fallback function in `StakingProxy` reverts if there is no staking contract attached (#2310)
    * Fix overflow w/ `LibFixedMath._mul(-1, -2*255) (#2311)
    * Unit tests for MixinScheduler (#2314)
    * Unit tests for MixinCumulativeRewards (#2316)

## v1.1.0-beta.0 - _October 3, 2019_

    * Created package (#1821)
    * First implementation (#1910)
    * Replace `LibFeeMath` with `LibFixedMath`. (#2109)
    * Use a more precise cobb-douglas implementation. (#2109)
    * Change the way operator stake is computed. (#2109)
    * Denominate pool operator shares in parts-per-million. (#2109)
    * New stake management mechanics. Delay before delegation. Nixed shadow rewards. (#2118)
    * Tests for new stake management mechanics. (#2126)
    * Add `init()` pattern to contracts. (#2131)
    * Replace `MixinDeploymentConstants` with `MixinParams`. (#2131)
    * Reference counting for cumulative rewards. (#2154)
    * Refactored Staking Reward Vault. Moved pool management logic into staking contract. (#2156)
    * Removed MixinStakingPoolRewardVault.sol (#2156)
    * Refactored out `_cobbDouglas()` into its own library (#2179)
    * Introduce multi-block finalization. (#2155)
    * Removed reference counting for cumulative rewards. (#2188)
    * Removed explicit dependency on epoch+1 when delegating. (#2188)
