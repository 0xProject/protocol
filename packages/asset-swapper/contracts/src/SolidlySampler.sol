// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import './ApproximateBuys.sol';
import './SamplerUtils.sol';

struct SolidlyRoute {
    address from;
    address to;
    bool stable;
}

interface ISolidlyRouter {
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256 amount, bool stable);

    function getAmountsOut(uint256 amountIn, SolidlyRoute[] calldata routes)
        external
        view
        returns (uint256[] memory amounts);
}

contract SolidlySampler is SamplerUtils, ApproximateBuys {
    /// @dev Sample sell quotes from Solidly
    /// @param router Address of Solidly router.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample (sorted in ascending order).
    /// @return stable Whether the pool is a stable pool (vs volatile).
    /// @return makerTokenAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromSolidly(
        ISolidlyRouter router,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public view returns (bool stable, uint256[] memory makerTokenAmounts) {
        _assertValidPair(makerToken, takerToken);
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        // Sampling should not mix stable and volatile pools.
        // Find the most liquid pool based on max(takerTokenAmounts) and stick with it.
        stable = _isMostLiquidPoolStablePool(router, takerToken, makerToken, takerTokenAmounts);
        SolidlyRoute[] memory routes = new SolidlyRoute[](1);
        routes[0] = SolidlyRoute({ from: takerToken, to: makerToken, stable: stable });

        for (uint256 i = 0; i < numSamples; i++) {
            makerTokenAmounts[i] = router.getAmountsOut(takerTokenAmounts[i], routes)[1];
            // Break early if there are 0 amounts
            if (makerTokenAmounts[i] == 0) {
                break;
            }
        }
    }

    /// @dev Sample buy quotes from Solidly.
    /// @param router Address of Solidly router.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return stable Whether the pool is a stable pool (vs volatile).
    /// @return takerTokenAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromSolidly(
        ISolidlyRouter router,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public view returns (bool stable, uint256[] memory takerTokenAmounts) {
        _assertValidPair(makerToken, takerToken);

        // Sampling should not mix stable and volatile pools.
        // Find the most liquid pool based on the reverse swap (maker -> taker) and stick with it.
        stable = _isMostLiquidPoolStablePool(router, makerToken, takerToken, makerTokenAmounts);

        takerTokenAmounts = _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                takerTokenData: abi.encode(router, SolidlyRoute({ from: takerToken, to: makerToken, stable: stable })),
                makerTokenData: abi.encode(router, SolidlyRoute({ from: makerToken, to: takerToken, stable: stable })),
                getSellQuoteCallback: _sampleSellForApproximateBuyFromSolidly
            }),
            makerTokenAmounts
        );
    }

    function _sampleSellForApproximateBuyFromSolidly(
        bytes memory takerTokenData,
        bytes memory, /* makerTokenData */
        uint256 sellAmount
    ) internal view returns (uint256) {
        (ISolidlyRouter router, SolidlyRoute memory route) = abi.decode(takerTokenData, (ISolidlydromeRouter, VSolidlyRoute));

        SolidlyRoute[] memory routes = new SolidlyRoute[](1);
        routes[0] = route;
        return router.getAmountsOut(sellAmount, routes)[1];
    }

    /// @dev Returns whether the most liquid pool is a stable pool.
    /// @param router Address of Solidly router.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token buy amount for each sample (sorted in ascending order)
    /// @return stable Whether the pool is a stable pool (vs volatile).
    function _isMostLiquidPoolStablePool(
        ISolidlyRouter router,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) internal view returns (bool stable) {
        uint256 numSamples = takerTokenAmounts.length;
        (, stable) = router.getAmountOut(takerTokenAmounts[numSamples - 1], takerToken, makerToken);
    }
}
