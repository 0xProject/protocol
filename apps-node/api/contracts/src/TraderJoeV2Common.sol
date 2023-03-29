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

pragma solidity >=0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/ITraderJoeV2.sol";
import "./TickBasedAMMCommon.sol";

contract TraderJoeV2Common is TickBasedAMMCommon {
    function toTraderJoeV2Path(
        address[] memory tokenPath,
        address[] memory poolPath
    ) internal view returns (bytes memory traderJoeV2Path) {
        require(
            tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1,
            "TraderJoeV2Common/invalid path lengths"
        );
        // TraderJoeV2 paths are tightly packed as:
        // [token0, token0Token1PairBinStep, token1, token1Token2PairBinStep, token2, ...]
        traderJoeV2Path = new bytes(tokenPath.length * 20 + poolPath.length * 2);
        uint256 o;
        assembly {
            o := add(traderJoeV2Path, 32)
        }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            if (i > 0) {
                uint16 binStep = ITraderJoeV2Pool(poolPath[i - 1]).feeParameters().binStep;
                assembly {
                    mstore(o, shl(240, binStep))
                    o := add(o, 2)
                }
            }
            address token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }

    function getBinStepsFromPoolPath(address[] memory poolPath) internal view returns (uint256[] memory binSteps) {
        binSteps = new uint256[](poolPath.length);
        for (uint256 i = 0; i < poolPath.length; ++i) {
            binSteps[i] = ITraderJoeV2Pool(poolPath[i]).feeParameters().binStep;
        }
    }

    /// @dev Returns a path of pools to sample against. The caller is responsible for not using path involving zero address(es)
    function getTraderJoeV2PoolPaths(
        address factory,
        address[] memory path
    ) internal view returns (address[][] memory poolPaths) {
        if (path.length == 2) {
            return getTraderJoeV2PoolPathSingleHop(factory, path);
        }
        if (path.length == 3) {
            return getTraderJoeV2PoolPathTwoHop(factory, path);
        }

        revert("TraderJoeV2Common/unsupported token path length");
    }

    function getTraderJoeV2PoolPathSingleHop(
        address factory,
        address[] memory path
    ) private view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](2);
        address[2] memory topPools = getTopTwoPools(factory, path[0], path[1]);

        for (uint256 i = 0; i < 2; i++) {
            poolPaths[i] = new address[](1);
            poolPaths[i][0] = topPools[i];
        }
    }

    function getTraderJoeV2PoolPathTwoHop(
        address factory,
        address[] memory path
    ) private view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](4);
        address[2] memory firstHopTopPools = getTopTwoPools(factory, path[0], path[1]);

        address[2] memory secondHopTopPools = getTopTwoPools(factory, path[1], path[2]);

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            for (uint256 j = 0; j < 2; j++) {
                poolPaths[i] = new address[](2);
                address[] memory currentPath = poolPaths[pathCount];
                currentPath[0] = firstHopTopPools[i];
                currentPath[1] = secondHopTopPools[j];
                pathCount++;
            }
        }
    }

    /// @dev Returns top 0-2 pools and corresponding output amounts based on swaping `inputAmount`.
    /// Addresses in `topPools` can be zero addresses when there are pool isn't available.
    function getTopTwoPools(
        address factory,
        address inputToken,
        address outputToken
    ) private view returns (address[2] memory topPools) {
        ITraderJoeV2Factory.PoolInformation[] memory availablePools = ITraderJoeV2Factory(factory).getAllLBPairs(
            inputToken,
            outputToken
        );
        uint256[2] memory topLiquidityAmounts;

        for (uint256 i = 0; i < availablePools.length; ++i) {
            if (availablePools[i].ignoredForRouting) {
                continue;
            }

            ITraderJoeV2Pool pool = ITraderJoeV2Pool(availablePools[i].pool);

            (uint256 pairReserveX, uint256 pairReserveY, ) = pool.getReservesAndId();
            uint256 currLiquidity = pairReserveX + pairReserveY;

            if (currLiquidity > topLiquidityAmounts[0]) {
                topLiquidityAmounts[1] = topLiquidityAmounts[0];
                topPools[1] = topPools[0];
                topLiquidityAmounts[0] = currLiquidity;
                topPools[0] = address(pool);
            } else if (currLiquidity > topLiquidityAmounts[1]) {
                topLiquidityAmounts[1] = currLiquidity;
                topPools[1] = address(pool);
            }
        }
    }
}
