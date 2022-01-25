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
import "./SamplerBase.sol";

interface IUniswapV3Quoter {
    function factory()
        external
        view
        returns (IUniswapV3Factory factory);
    function quoteExactInput(bytes memory path, uint256 amountIn)
        external
        returns (uint256 amountOut);
    function quoteExactOutput(bytes memory path, uint256 amountOut)
        external
        returns (uint256 amountIn);
}

interface IUniswapV3Factory {
    function getPool(IERC20TokenV06 a, IERC20TokenV06 b, uint24 fee)
        external
        view
        returns (IUniswapV3Pool pool);
}

interface IUniswapV3Pool {
    function token0() external view returns (IERC20TokenV06);
    function token1() external view returns (IERC20TokenV06);
    function fee() external view returns (uint24);
}

contract UniswapV3Sampler is
    SamplerBase
{
    /// @dev Gas limit for UniswapV3 calls. This is 100% a guess.
    uint256 constant private QUOTE_GAS = 600e3;

    /// @dev Sample sell quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromUniswapV3Global(
        IUniswapV3Quoter quoter,
        IERC20TokenV06[] memory path
    )
        public
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory makerTokenAmounts
        )
    {
        (uniswapPaths, makerTokenAmounts) = _sampleSellsFromUniswapV3(
            quoter,
            path,
            SAMPLE_VALUES
        );
    }
    /// @dev Sample sell quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function _sampleSellsFromUniswapV3(
        IUniswapV3Quoter quoter,
        IERC20TokenV06[] memory path,
        uint256[] memory takerTokenAmounts
    )
        internal
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory makerTokenAmounts
        )
    {
        IUniswapV3Pool[][] memory poolPaths =
            _getValidPoolPaths(quoter.factory(), path, 0);

        makerTokenAmounts = new uint256[](takerTokenAmounts.length);
        uniswapPaths = new bytes[](takerTokenAmounts.length);

        for (uint256 i = 0; i < takerTokenAmounts.length; ++i) {
            // Pick the best result from all the paths.
            bytes memory topUniswapPath;
            uint256 topBuyAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                bytes memory uniswapPath = _toUniswapPath(path, poolPaths[j]);
                try
                    quoter.quoteExactInput
                        { gas: QUOTE_GAS }
                        (uniswapPath, takerTokenAmounts[i])
                        returns (uint256 buyAmount)
                {
                    if (topBuyAmount <= buyAmount) {
                        topBuyAmount = buyAmount;
                        topUniswapPath = uniswapPath;
                    }
                } catch { }
            }
            // Break early if we can't complete the buys.
            if (topBuyAmount == 0) {
                break;
            }
            makerTokenAmounts[i] = topBuyAmount;
            uniswapPaths[i] = topUniswapPath;
        }
    }

    /// @dev Sample buy quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromUniswapV3Global(
        IUniswapV3Quoter quoter,
        IERC20TokenV06[] memory path
    )
        public
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory takerTokenAmounts
        )
    {
        (uniswapPaths, takerTokenAmounts) = _sampleBuysFromUniswapV3(
            quoter,
            path,
            SAMPLE_VALUES
        );
    }

    /// @dev Sample buy quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function _sampleBuysFromUniswapV3(
        IUniswapV3Quoter quoter,
        IERC20TokenV06[] memory path,
        uint256[] memory makerTokenAmounts
    )
        internal
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory takerTokenAmounts
        )
    {
        IUniswapV3Pool[][] memory poolPaths =
            _getValidPoolPaths(quoter.factory(), path, 0);
        IERC20TokenV06[] memory reversedPath = _reverseTokenPath(path);

        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        uniswapPaths = new bytes[](makerTokenAmounts.length);

        for (uint256 i = 0; i < makerTokenAmounts.length; ++i) {
            // Pick the best result from all the paths.
            bytes memory topUniswapPath;
            uint256 topSellAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                // quoter requires path to be reversed for buys.
                bytes memory uniswapPath = _toUniswapPath(
                    reversedPath,
                    _reversePoolPath(poolPaths[j])
                );
                try
                    quoter.quoteExactOutput
                        { gas: QUOTE_GAS }
                        (uniswapPath, makerTokenAmounts[i])
                        returns (uint256 sellAmount)
                {
                    if (topSellAmount == 0 || topSellAmount >= sellAmount) {
                        topSellAmount = sellAmount;
                        // But the output path should still be encoded for sells.
                        topUniswapPath = _toUniswapPath(path, poolPaths[j]);
                    }
                } catch {}
            }
            // Break early if we can't complete the buys.
            if (topSellAmount == 0) {
                break;
            }
            takerTokenAmounts[i] = topSellAmount;
            uniswapPaths[i] = topUniswapPath;
        }
    }

    function _getValidPoolPaths(
        IUniswapV3Factory factory,
        IERC20TokenV06[] memory tokenPath,
        uint256 startIndex
    )
        private
        view
        returns (IUniswapV3Pool[][] memory poolPaths)
    {
        require(
            tokenPath.length - startIndex >= 2,
            "UniswapV3Sampler/tokenPath too short"
        );
        uint24[4] memory validPoolFees = [
            // The launch pool fees. Could get hairier if they add more.
            uint24(0.0001e6),
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
        private
        returns (IERC20TokenV06[] memory reversed)
    {
        reversed = new IERC20TokenV06[](tokenPath.length);
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            reversed[i] = tokenPath[tokenPath.length - i - 1];
        }
    }

    function _reversePoolPath(IUniswapV3Pool[] memory poolPath)
        private
        returns (IUniswapV3Pool[] memory reversed)
    {
        reversed = new IUniswapV3Pool[](poolPath.length);
        for (uint256 i = 0; i < poolPath.length; ++i) {
            reversed[i] = poolPath[poolPath.length - i - 1];
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

    function _toUniswapPath(
        IERC20TokenV06[] memory tokenPath,
        IUniswapV3Pool[] memory poolPath
    )
        private
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
}
