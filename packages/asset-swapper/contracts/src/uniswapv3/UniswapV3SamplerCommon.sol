// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2021 ZeroEx Intl.

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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "./UniswapV3.sol";

contract UniswapV3SamplerCommon {
    /// @dev Gas limit for UniswapV3 calls. This is 100% a guess.
    uint256 constant internal QUOTE_GAS = 300e3;

    function _getValidPoolPaths(
        IUniswapV3Factory factory,
        IERC20TokenV06[] memory tokenPath,
        uint256 startIndex
    )
        internal
        view
        returns (IUniswapV3Pool[][] memory poolPaths)
    {
        require(
            tokenPath.length - startIndex >= 2,
            "UniswapV3Sampler/tokenPath too short"
        );
        uint24[3] memory validPoolFees = [
            // The launch pool fees. Could get hairier if they add more.
            uint24(0.0005e6),
            uint24(0.003e6),
            uint24(0.01e6)
        ];
        IUniswapV3Pool[] memory validPools =
            new IUniswapV3Pool[](validPoolFees.length);
        uint256 numValidPools = 0;
        {
            IERC20TokenV06 inputToken = tokenPath[startIndex];
            IERC20TokenV06 outputToken = tokenPath[startIndex + 1];
            for (uint256 i = 0; i < validPoolFees.length; ++i) {
                IUniswapV3Pool pool =
                factory.getPool(inputToken, outputToken, validPoolFees[i]);
                if (_isValidPool(pool)) {
                    validPools[numValidPools++] = pool;
                }
            }
        }
        if (numValidPools == 0) {
            // No valid pools for this hop.
            return poolPaths;
        }
        if (startIndex + 2 == tokenPath.length) {
            // End of path.
            poolPaths = new IUniswapV3Pool[][](numValidPools);
            for (uint256 i = 0; i < numValidPools; ++i) {
                poolPaths[i] = new IUniswapV3Pool[](1);
                poolPaths[i][0] = validPools[i];
            }
            return poolPaths;
        }
        // Get paths for subsequent hops.
        IUniswapV3Pool[][] memory subsequentPoolPaths =
            _getValidPoolPaths(factory, tokenPath, startIndex + 1);
        if (subsequentPoolPaths.length == 0) {
            // Could not complete the path.
            return poolPaths;
        }
        // Combine our pools with the next hop paths.
        poolPaths = new IUniswapV3Pool[][](
            numValidPools * subsequentPoolPaths.length
        );
        for (uint256 i = 0; i < numValidPools; ++i) {
            for (uint256 j = 0; j < subsequentPoolPaths.length; ++j) {
                uint256 o = i * subsequentPoolPaths.length + j;
                // Prepend pool to the subsequent path.
                poolPaths[o] =
                    new IUniswapV3Pool[](1 + subsequentPoolPaths[j].length);
                poolPaths[o][0] = validPools[i];
                for (uint256 k = 0; k < subsequentPoolPaths[j].length; ++k) {
                    poolPaths[o][1 + k] = subsequentPoolPaths[j][k];
                }
            }
        }
        return poolPaths;
    }

    function _reverseTokenPath(IERC20TokenV06[] memory tokenPath)
        internal
        pure
        returns (IERC20TokenV06[] memory reversed)
    {
        reversed = new IERC20TokenV06[](tokenPath.length);
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            reversed[i] = tokenPath[tokenPath.length - i - 1];
        }
    }

    function _reversePoolPath(IUniswapV3Pool[] memory poolPath)
        internal
        pure
        returns (IUniswapV3Pool[] memory reversed)
    {
        reversed = new IUniswapV3Pool[](poolPath.length);
        for (uint256 i = 0; i < poolPath.length; ++i) {
            reversed[i] = poolPath[poolPath.length - i - 1];
        }
    }

    function _toUniswapPath(
        IERC20TokenV06[] memory tokenPath,
        IUniswapV3Pool[] memory poolPath
    )
        internal
        view
        returns (bytes memory uniswapPath)
    {
        require(
            tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1,
            "UniswapV3Sampler/invalid path lengths"
        );
        // Uniswap paths are tightly packed as:
        // [token0, token0token1PairFee, token1, token1Token2PairFee, token2, ...]
        uniswapPath = new bytes(tokenPath.length * 20 + poolPath.length * 3);
        uint256 o;
        assembly { o := add(uniswapPath, 32) }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            if (i > 0) {
                uint24 poolFee = poolPath[i - 1].fee();
                assembly {
                    mstore(o, shl(232, poolFee))
                    o := add(o, 3)
                }
            }
            IERC20TokenV06 token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }

    function _isValidPool(IUniswapV3Pool pool)
        private
        view
        returns (bool isValid)
    {
        // Check if it has been deployed.
        {
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(pool)
            }
            if (codeSize == 0) {
                return false;
            }
        }
        // Must have a balance of both tokens.
        if (pool.token0().balanceOf(address(pool)) == 0) {
            return false;
        }
        if (pool.token1().balanceOf(address(pool)) == 0) {
            return false;
        }
        return true;
    }
}
