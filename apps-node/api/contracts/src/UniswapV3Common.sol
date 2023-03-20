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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

import "./interfaces/IUniswapV3.sol";
import "./interfaces/IMultiQuoter.sol";
import "./TickBasedAMMCommon.sol";

contract UniswapV3Common is TickBasedAMMCommon {
    /// @dev Gas limit for UniswapV3 calls
    uint256 private constant POOL_FILTERING_GAS_LIMIT = 450e3;

    function toUniswapPath(
        address[] memory tokenPath,
        address[] memory poolPath
    ) internal view returns (bytes memory uniswapPath) {
        require(
            tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1,
            "UniswapV3Common/invalid path lengths"
        );
        // Uniswap paths are tightly packed as:
        // [token0, token0token1PairFee, token1, token1Token2PairFee, token2, ...]
        uniswapPath = new bytes(tokenPath.length * 20 + poolPath.length * 3);
        uint256 o;
        assembly {
            o := add(uniswapPath, 32)
        }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            if (i > 0) {
                uint24 poolFee = IUniswapV3Pool(poolPath[i - 1]).fee();
                assembly {
                    mstore(o, shl(232, poolFee))
                    o := add(o, 3)
                }
            }
            address token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }

    /// @dev Returns `poolPaths` to sample against. The caller is responsible for not using path involinvg zero address(es).
    function getPoolPaths(
        address factory,
        IMultiQuoter multiQuoter,
        address[] memory path,
        uint256 inputAmount
    ) internal view returns (address[][] memory poolPaths) {
        if (path.length == 2) {
            return getPoolPathSingleHop(factory, multiQuoter, path, inputAmount);
        }
        if (path.length == 3) {
            return getPoolPathTwoHop(factory, multiQuoter, path, inputAmount);
        }
        revert("UniswapV3Sampler/unsupported token path length");
    }

    function getPoolPathSingleHop(
        address factory,
        IMultiQuoter multiQuoter,
        address[] memory path,
        uint256 inputAmount
    ) private view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](2);
        (address[2] memory topPools, ) = getTopTwoPools(
            GetTopTwoPoolsParams({
                factory: factory,
                multiQuoter: multiQuoter,
                inputToken: path[0],
                outputToken: path[1],
                inputAmount: inputAmount
            })
        );

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            address topPool = topPools[i];
            poolPaths[pathCount] = new address[](1);
            poolPaths[pathCount][0] = topPool;
            pathCount++;
        }
    }

    function getPoolPathTwoHop(
        address factory,
        IMultiQuoter multiQuoter,
        address[] memory path,
        uint256 inputAmount
    ) private view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](4);
        (address[2] memory firstHopTopPools, uint256[2] memory firstHopAmounts) = getTopTwoPools(
            GetTopTwoPoolsParams({
                factory: factory,
                multiQuoter: multiQuoter,
                inputToken: path[0],
                outputToken: path[1],
                inputAmount: inputAmount
            })
        );

        (address[2] memory secondHopTopPools, ) = getTopTwoPools(
            GetTopTwoPoolsParams({
                factory: factory,
                multiQuoter: multiQuoter,
                inputToken: path[1],
                outputToken: path[2],
                inputAmount: firstHopAmounts[0]
            })
        );

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            for (uint256 j = 0; j < 2; j++) {
                poolPaths[pathCount] = new address[](2);
                address[] memory currentPath = poolPaths[pathCount];
                currentPath[0] = firstHopTopPools[i];
                currentPath[1] = secondHopTopPools[j];
                pathCount++;
            }
        }
    }

    struct GetTopTwoPoolsParams {
        address factory;
        IMultiQuoter multiQuoter;
        address inputToken;
        address outputToken;
        uint256 inputAmount;
    }

    /// @dev Returns top 0-2 pools and corresponding output amounts based on swaping `inputAmount`.
    /// Addresses in `topPools` can be zero addresses when there are pool isn't available.
    function getTopTwoPools(
        GetTopTwoPoolsParams memory params
    ) private view returns (address[2] memory topPools, uint256[2] memory topOutputAmounts) {
        address[] memory path = new address[](2);
        path[0] = params.inputToken;
        path[1] = params.outputToken;

        uint256[] memory inputAmounts = new uint256[](1);
        inputAmounts[0] = params.inputAmount;

        uint24[4] memory validPoolFees = [uint24(0.0001e6), uint24(0.0005e6), uint24(0.003e6), uint24(0.01e6)];
        for (uint256 i = 0; i < validPoolFees.length; ++i) {
            address pool = IUniswapV3Factory(params.factory).getPool(
                params.inputToken,
                params.outputToken,
                validPoolFees[i]
            );
            if (!isValidPool(pool)) {
                continue;
            }

            address[] memory poolPath = new address[](1);
            poolPath[0] = pool;
            bytes memory uniswapPath = toUniswapPath(path, poolPath);

            try
                params.multiQuoter.quoteExactMultiInput{gas: POOL_FILTERING_GAS_LIMIT}(
                    params.factory,
                    uniswapPath,
                    inputAmounts
                )
            {} catch (bytes memory reason) {
                (bool success, uint256[] memory outputAmounts, ) = decodeMultiSwapRevert(reason);
                if (success) {
                    // Keeping track of the top 2 pools.
                    if (outputAmounts[0] > topOutputAmounts[0]) {
                        topOutputAmounts[1] = topOutputAmounts[0];
                        topPools[1] = topPools[0];
                        topOutputAmounts[0] = outputAmounts[0];
                        topPools[0] = pool;
                    } else if (outputAmounts[0] > topOutputAmounts[1]) {
                        topOutputAmounts[1] = outputAmounts[0];
                        topPools[1] = pool;
                    }
                }
            }
        }
    }

    function isValidPool(address pool) internal view returns (bool isValid) {
        // Check if it has been deployed.
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(pool)
        }
        if (codeSize == 0) {
            return false;
        }

        // Must have a balance of both tokens.
        IERC20TokenV06 token0 = IERC20TokenV06(IUniswapV3Pool(pool).token0());
        if (token0.balanceOf(pool) == 0) {
            return false;
        }
        IERC20TokenV06 token1 = IERC20TokenV06(IUniswapV3Pool(pool).token1());
        if (token1.balanceOf(pool) == 0) {
            return false;
        }

        return true;
    }

    function isValidPoolPath(address[] memory poolPath) internal pure returns (bool) {
        for (uint256 i = 0; i < poolPath.length; i++) {
            if (poolPath[i] == address(0)) {
                return false;
            }
        }
        return true;
    }
}