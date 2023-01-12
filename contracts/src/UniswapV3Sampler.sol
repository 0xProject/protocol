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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

interface IUniswapV3QuoterV2 {
    function factory() external view returns (IUniswapV3Factory factory);

    // @notice Returns the amount out received for a given exact input swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee
    // @param amountIn The amount of the first token to swap
    // @return amountOut The amount of the last token that would be received
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    // @notice Returns the amount in required for a given exact output swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
    // @param amountOut The amount of the last token to receive
    // @return amountIn The amount of first token required to be paid
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    )
        external
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}

interface IUniswapV3Factory {
    function getPool(IERC20TokenV06 a, IERC20TokenV06 b, uint24 fee) external view returns (IUniswapV3Pool pool);
}

interface IUniswapV3Pool {
    function token0() external view returns (IERC20TokenV06);

    function token1() external view returns (IERC20TokenV06);

    function fee() external view returns (uint24);
}

contract UniswapV3Sampler {
    /// @dev Gas limit for UniswapV3 calls. This is 100% a guess.
    uint256 private constant QUOTE_GAS = 700e3;

    /// @dev Sample sell quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return uniswapGasUsed Estimated amount of gas used
    /// @return makerTokenAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromUniswapV3(
        IUniswapV3QuoterV2 quoter,
        IERC20TokenV06[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (bytes[] memory uniswapPaths, uint256[] memory uniswapGasUsed, uint256[] memory makerTokenAmounts)
    {
        IUniswapV3Pool[][] memory poolPaths = _getPoolPaths(
            quoter,
            path,
            takerTokenAmounts[takerTokenAmounts.length - 1]
        );

        makerTokenAmounts = new uint256[](takerTokenAmounts.length);
        uniswapPaths = new bytes[](takerTokenAmounts.length);
        uniswapGasUsed = new uint256[](takerTokenAmounts.length);

        for (uint256 i = 0; i < takerTokenAmounts.length; ++i) {
            // Pick the best result from the pool paths.
            uint256 topBuyAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                if (!isValidPoolPath(poolPaths[j])) {
                    continue;
                }

                bytes memory uniswapPath = _toUniswapPath(path, poolPaths[j]);
                try quoter.quoteExactInput{gas: QUOTE_GAS}(uniswapPath, takerTokenAmounts[i]) returns (
                    uint256 buyAmount,
                    uint160[] memory /* sqrtPriceX96AfterList */,
                    uint32[] memory /* initializedTicksCrossedList */,
                    uint256 gasUsed
                ) {
                    if (topBuyAmount <= buyAmount) {
                        topBuyAmount = buyAmount;
                        uniswapPaths[i] = uniswapPath;
                        uniswapGasUsed[i] = gasUsed;
                    }
                } catch {}
            }
            // Break early if we can't complete the sells.
            if (topBuyAmount == 0) {
                // HACK(kimpers): To avoid too many local variables, paths and gas used is set directly in the loop
                // then reset if no valid valid quote was found
                uniswapPaths[i] = "";
                uniswapGasUsed[i] = 0;
                break;
            }
            makerTokenAmounts[i] = topBuyAmount;
        }
    }

    /// @dev Sample buy quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return uniswapGasUsed Estimated amount of gas used
    /// @return takerTokenAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromUniswapV3(
        IUniswapV3QuoterV2 quoter,
        IERC20TokenV06[] memory path,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (bytes[] memory uniswapPaths, uint256[] memory uniswapGasUsed, uint256[] memory takerTokenAmounts)
    {
        IERC20TokenV06[] memory reversedPath = _reverseTokenPath(path);
        IUniswapV3Pool[][] memory poolPaths = _getPoolPaths(
            quoter,
            reversedPath,
            makerTokenAmounts[makerTokenAmounts.length - 1]
        );

        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        uniswapPaths = new bytes[](makerTokenAmounts.length);
        uniswapGasUsed = new uint256[](makerTokenAmounts.length);

        for (uint256 i = 0; i < makerTokenAmounts.length; ++i) {
            // Pick the best result from the pool paths.
            uint256 topSellAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                if (!isValidPoolPath(poolPaths[j])) {
                    continue;
                }

                // quoter requires path to be reversed for buys.
                bytes memory uniswapPath = _toUniswapPath(reversedPath, poolPaths[j]);
                try quoter.quoteExactOutput{gas: QUOTE_GAS}(uniswapPath, makerTokenAmounts[i]) returns (
                    uint256 sellAmount,
                    uint160[] memory /* sqrtPriceX96AfterList */,
                    uint32[] memory /* initializedTicksCrossedList */,
                    uint256 gasUsed
                ) {
                    if (topSellAmount == 0 || topSellAmount >= sellAmount) {
                        topSellAmount = sellAmount;
                        // But the output path should still be encoded for sells.
                        uniswapPaths[i] = _toUniswapPath(path, _reversePoolPath(poolPaths[j]));
                        uniswapGasUsed[i] = gasUsed;
                    }
                } catch {}
            }
            // Break early if we can't complete the buys.
            if (topSellAmount == 0) {
                // HACK(kimpers): To avoid too many local variables, paths and gas used is set directly in the loop
                // then reset if no valid valid quote was found
                uniswapPaths[i] = "";
                uniswapGasUsed[i] = 0;
                break;
            }
            takerTokenAmounts[i] = topSellAmount;
        }
    }

    /// @dev Returns `poolPaths` to sample against. The caller is responsible for not using path involinvg zero address(es).
    function _getPoolPaths(
        IUniswapV3QuoterV2 quoter,
        IERC20TokenV06[] memory path,
        uint256 inputAmount
    ) private returns (IUniswapV3Pool[][] memory poolPaths) {
        if (path.length == 2) {
            return _getPoolPathSingleHop(quoter, path, inputAmount);
        }
        if (path.length == 3) {
            return _getPoolPathTwoHop(quoter, path, inputAmount);
        }
        revert("UniswapV3Sampler/unsupported token path length");
    }

    function _getPoolPathSingleHop(
        IUniswapV3QuoterV2 quoter,
        IERC20TokenV06[] memory path,
        uint256 inputAmount
    ) public returns (IUniswapV3Pool[][] memory poolPaths) {
        poolPaths = new IUniswapV3Pool[][](2);
        (IUniswapV3Pool[2] memory topPools, ) = _getTopTwoPools(
            quoter,
            quoter.factory(),
            path[0],
            path[1],
            inputAmount
        );

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            IUniswapV3Pool topPool = topPools[i];
            poolPaths[pathCount] = new IUniswapV3Pool[](1);
            poolPaths[pathCount][0] = topPool;
            pathCount++;
        }
    }

    function _getPoolPathTwoHop(
        IUniswapV3QuoterV2 quoter,
        IERC20TokenV06[] memory path,
        uint256 inputAmount
    ) private returns (IUniswapV3Pool[][] memory poolPaths) {
        IUniswapV3Factory factory = quoter.factory();
        poolPaths = new IUniswapV3Pool[][](4);
        (IUniswapV3Pool[2] memory firstHopTopPools, uint256[2] memory firstHopAmounts) = _getTopTwoPools(
            quoter,
            factory,
            path[0],
            path[1],
            inputAmount
        );
        (IUniswapV3Pool[2] memory secondHopTopPools, ) = _getTopTwoPools(
            quoter,
            factory,
            path[1],
            path[2],
            firstHopAmounts[0]
        );

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            for (uint256 j = 0; j < 2; j++) {
                poolPaths[pathCount] = new IUniswapV3Pool[](2);
                IUniswapV3Pool[] memory currentPath = poolPaths[pathCount];
                currentPath[0] = firstHopTopPools[i];
                currentPath[1] = secondHopTopPools[j];
                pathCount++;
            }
        }
    }

    /// @dev Returns top 0-2 pools and corresponding output amounts based on swaping `inputAmount`.
    /// Addresses in `topPools` can be zero addresses when there are pool isn't available.
    function _getTopTwoPools(
        IUniswapV3QuoterV2 quoter,
        IUniswapV3Factory factory,
        IERC20TokenV06 inputToken,
        IERC20TokenV06 outputToken,
        uint256 inputAmount
    ) private returns (IUniswapV3Pool[2] memory topPools, uint256[2] memory outputAmounts) {
        IERC20TokenV06[] memory path = new IERC20TokenV06[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint24[4] memory validPoolFees = [uint24(0.0001e6), uint24(0.0005e6), uint24(0.003e6), uint24(0.01e6)];
        for (uint256 i = 0; i < validPoolFees.length; ++i) {
            IUniswapV3Pool pool = factory.getPool(inputToken, outputToken, validPoolFees[i]);
            if (!_isValidPool(pool)) {
                continue;
            }

            IUniswapV3Pool[] memory poolPath = new IUniswapV3Pool[](1);
            poolPath[0] = pool;
            bytes memory uniswapPath = _toUniswapPath(path, poolPath);
            try quoter.quoteExactInput{gas: QUOTE_GAS}(uniswapPath, inputAmount) returns (
                uint256 outputAmount,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 /* gasUsed */
            ) {
                // Keeping track of the top 2 pools.
                if (outputAmount > outputAmounts[0]) {
                    outputAmounts[1] = outputAmounts[0];
                    topPools[1] = topPools[0];
                    outputAmounts[0] = outputAmount;
                    topPools[0] = pool;
                } else if (outputAmount > outputAmounts[1]) {
                    outputAmounts[1] = outputAmount;
                    topPools[1] = pool;
                }
            } catch {}
        }
    }

    function _reverseTokenPath(
        IERC20TokenV06[] memory tokenPath
    ) private pure returns (IERC20TokenV06[] memory reversed) {
        reversed = new IERC20TokenV06[](tokenPath.length);
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            reversed[i] = tokenPath[tokenPath.length - i - 1];
        }
    }

    function _reversePoolPath(
        IUniswapV3Pool[] memory poolPath
    ) private pure returns (IUniswapV3Pool[] memory reversed) {
        reversed = new IUniswapV3Pool[](poolPath.length);
        for (uint256 i = 0; i < poolPath.length; ++i) {
            reversed[i] = poolPath[poolPath.length - i - 1];
        }
    }

    function _isValidPool(IUniswapV3Pool pool) private view returns (bool isValid) {
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

    function isValidPoolPath(IUniswapV3Pool[] memory poolPaths) private pure returns (bool) {
        for (uint256 i = 0; i < poolPaths.length; i++) {
            if (address(poolPaths[i]) == address(0)) {
                return false;
            }
        }
        return true;
    }

    function _toUniswapPath(
        IERC20TokenV06[] memory tokenPath,
        IUniswapV3Pool[] memory poolPath
    ) private view returns (bytes memory uniswapPath) {
        require(
            tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1,
            "UniswapV3Sampler/invalid path lengths"
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
