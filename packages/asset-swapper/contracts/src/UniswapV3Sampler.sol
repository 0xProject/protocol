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
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinUniswapV3.sol";
import "./SwapRevertSampler.sol";

interface IUniswapV3Quoter {
    function factory()
        external
        view
        returns (IUniswapV3Factory factory);
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
    MixinUniswapV3,
    SwapRevertSampler
{
    using LibRichErrorsV06 for bytes;

    function sampleSwapFromUniswapV3(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeUniswapV3(
            IERC20TokenV06(sellToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param router UniswapV3 Router contract.
    /// @param path Token route. Should be takerToken -> makerToken
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return gasUsed gas consumed in each sample sell
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromUniswapV3(
        IUniswapV3Quoter quoter,
        address router,
        IERC20TokenV06[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory gasUsed,
            uint256[] memory makerTokenAmounts
        )
    {
        IUniswapV3Pool[][] memory poolPaths =
            _getValidPoolPaths(quoter.factory(), path, 0);

        makerTokenAmounts = new uint256[](takerTokenAmounts.length);
        gasUsed = new uint256[](takerTokenAmounts.length);
        uniswapPaths = new bytes[](takerTokenAmounts.length);

        for (uint256 i = 0; i < poolPaths.length; ++i) {
            bytes memory _uniswapPath = _toUniswapPath(path, poolPaths[i]);
            (
                uint256[] memory _gasUsed,
                uint256[] memory _makerTokenAmounts
            ) = _sampleSwapQuotesRevert(
                SwapRevertSamplerQuoteOpts({
                    sellToken: address(path[0]),
                    buyToken: address(path[path.length - 1]),
                    bridgeData: abi.encode(router, _uniswapPath),
                    getSwapQuoteCallback: this.sampleSwapFromUniswapV3
                }),
                takerTokenAmounts
            );
            for (uint256 j = 0; j < _makerTokenAmounts.length; ++j) {
                // Break early if we can't complete the sells.
                if (_makerTokenAmounts[j] == 0) {
                    break;
                }
                // If this is better than what we have found, prefer it
                if (makerTokenAmounts[j] <= _makerTokenAmounts[j]) {
                    makerTokenAmounts[j] = _makerTokenAmounts[j];
                    gasUsed[j] = _gasUsed[j];
                    uniswapPaths[j] = _uniswapPath;
                }
            }
        }
    }

    /// @dev Sample buy quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param router UniswapV3 Router contract.
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return gasUsed gas consumed in each sample sell
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromUniswapV3(
        IUniswapV3Quoter quoter,
        address router,
        IERC20TokenV06[] memory path,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory gasUsed,
            uint256[] memory takerTokenAmounts
        )
    {
        IUniswapV3Pool[][] memory poolPaths =
            _getValidPoolPaths(quoter.factory(), path, 0);
        IERC20TokenV06[] memory reversedPath = _reverseTokenPath(path);

        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        gasUsed = new uint256[](makerTokenAmounts.length);
        uniswapPaths = new bytes[](makerTokenAmounts.length);

        for (uint256 i = 0; i < poolPaths.length; ++i) {
            (
                uint256[] memory _gasUsed,
                uint256[] memory _takerTokenAmounts
            ) = _sampleSwapApproximateBuys(
                SwapRevertSamplerBuyQuoteOpts({
                    sellToken: address(path[0]),
                    buyToken: address(path[path.length - 1]),
                    sellTokenData: abi.encode(router, _toUniswapPath(path, poolPaths[i])),
                    buyTokenData: abi.encode(
                        router,
                        _toUniswapPath(
                            reversedPath,
                            _reversePoolPath(poolPaths[i])
                        )
                    ),
                    getSwapQuoteCallback: this.sampleSwapFromUniswapV3
                }),
                makerTokenAmounts
            );

            for (uint256 j = 0; j < _takerTokenAmounts.length; ++j) {
                // Break early if we can't complete the buys.
                if (_takerTokenAmounts[j] == 0) {
                    break;
                }
                // We can go from high to low here
                if (takerTokenAmounts[j] == 0 || takerTokenAmounts[j] >= _takerTokenAmounts[j]) {
                    takerTokenAmounts[j] = _takerTokenAmounts[j];
                    gasUsed[j] = _gasUsed[j];
                    // But the output path should still be encoded for sells.
                    uniswapPaths[j] = _toUniswapPath(path, poolPaths[i]);
                }
            }
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
        // // Must have a balance of both tokens.
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
