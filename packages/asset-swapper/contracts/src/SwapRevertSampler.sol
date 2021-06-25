

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

import "./GasOverhead.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";

interface IHackedERC20 {
    function _setBalance(address owner, uint256 amount) external;
    function _setEnabled(bool enabled) external;
}

contract SwapRevertSampler {
    using LibRichErrorsV06 for bytes;

    /// @dev Fixed address to register and read Gas overhead introduced by Swap revert sampling
    GasOverhead private constant GAS_OVERHEAD = GasOverhead(0xDeF1000000000000000000000000000000001337);
    /// @dev Maximum approximate (positive) error rate when approximating a buy quote.
    uint256 private constant APPROXIMATE_BUY_TARGET_EPSILON_BPS = 0.0005e4;
    /// @dev Maximum iterations to perform when approximating a buy quote.
    uint256 private constant APPROXIMATE_BUY_MAX_ITERATIONS = 3;
    uint256 private constant ONE_HUNDED_PERCENT_BPS = 1e4;
    /// @dev Upper limit of gas to give to a single Swap call
    uint256 private constant CALL_STIPEND = 2e6;


    // solhint-disable no-empty-blocks
    /// @dev Payable fallback to receive ETH from Kyber/WETH.
    receive ()
        external
        payable
    { }

    struct SwapRevertSamplerQuoteOpts {
        // Address of the token which is being sold
        address sellToken;
        // Address of the token which is wanted
        address buyToken;
        // Data required for the bridge to execute the swap
        bytes bridgeData;
        // Callback to retrieve a swap quote.
        function (address sellToken, address buyToken, bytes memory bridgeData, uint256 sellAmount)
            external
            returns (uint256)
            getSwapQuoteCallback;
    }

    struct SwapRevertSamplerBuyQuoteOpts {
        // Address of the token which is being sold
        address sellToken;
        // Address of the token which is wanted
        address buyToken;
        // Data required for the bridge to execute the SELL_TOKEN->BUY_TOKEN swap
        bytes sellTokenData;
        // Data required for the bridge to execute the BUY_TOKEN->SELL_TOKEN swap
        bytes buyTokenData;
        // Callback to retrieve a swap quote.
        function (address sellToken, address buyToken, bytes memory bridgeData, uint256 sellAmount)
            external
            returns (uint256)
            getSwapQuoteCallback;
    }

    function _callRevert(
        bytes4 selector,
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 amountIn
    )
        external
    {
        // Clear any registered overhead
        try
            GAS_OVERHEAD.clearOverhead()
        { } catch { }
        // Measure the gas
        uint256 gasUsed = gasleft();
        // Perform the sell
        (bool success, bytes memory data) = address(this).call(
            abi.encodeWithSelector(selector, sellToken, buyToken, bridgeData, amountIn)
        );
        gasUsed = gasUsed - gasleft();
        // Remove any registered gas overhead
        try
            GAS_OVERHEAD.overhead()
            returns (uint256 gasOverhead)
        {
            gasUsed = gasUsed - gasOverhead;
        } catch { }

        if (!success) {
            data.rrevert();
        }
        // Revert with the amount bought
        _revertSingleSwapSample(abi.decode(data, (uint256)), gasUsed);
    }

    /// @dev  Mints the sell token, then performs the swap, then reverts with the amount out.
    /// The SwapRevertSamplerQuoteOpts has been unrolled here as our ABI encoder cannot support
    /// encoding the function
    function _mintCallRevert(
        bytes4 selector,
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256[] memory amountsIn
    )
        external
    {
        // We assume the amounts are ascending and that
        // the underlying call can handle selling a specific amount
        uint256 amountIn = amountsIn[amountsIn.length - 1];

        if (sellToken == address(_getNativeWrappedToken())) {
            try
                IEtherTokenV06(payable(sellToken)).deposit{ value: amountIn }()
            { } catch { }
        } else {
            IHackedERC20 hackedSellToken = IHackedERC20(payable(sellToken));
            // Enable sell token to be tracked and shadowed
            try
                hackedSellToken._setEnabled(true)
            { } catch { }

            // Mint enough to sell
            try
                hackedSellToken._setBalance(address(this), amountIn)
            { } catch { }
        }

        // Burn any excess ETH to avoid balance issues for sources which use ETH directly
        address(0).transfer(address(this).balance);

        uint256[] memory amountsOut = new uint256[](amountsIn.length);
        uint256[] memory gasUsed = new uint256[](amountsIn.length);

        for (uint256 i = 0; i < amountsIn.length; i++) {
            try
                this._callRevert{gas: CALL_STIPEND}(
                    selector,
                    sellToken,
                    buyToken,
                    bridgeData,
                    amountsIn[i]
                )
            {
                require(false, "Swap Sample should have reverted");
            } catch (bytes memory reason) {
                // Parse the reverted sample data
                (amountsOut[i], gasUsed[i]) = _parseRevertedSingleSwapSample(reason);
                // If we detect the amount out is 0 then we return early
                // rather than continue performing excess work

                // Some sources (Balancer) display issues, especially with small amounts
                // Where the amountsOut can range, e.g 448,0,0,0,2476,3048,0,4279,4941,0,0,7133,

                if (amountsOut[i] == 0) {
                    break;
                }
            }
        }
        // Revert the entire sampling
        _revertSwapSample(amountsOut, gasUsed);
    }

    function _sampleSwapQuotesRevert(
        SwapRevertSamplerQuoteOpts memory opts,
        uint256[] memory amountsIn
    )
        internal
        returns (uint256[] memory gasUsed, uint256[] memory amountsOut)
    {
        try
            this._mintCallRevert(
                opts.getSwapQuoteCallback.selector,
                opts.sellToken,
                opts.buyToken,
                opts.bridgeData,
                amountsIn
            )
        {
            require(false, "Swap Sample should have reverted");
        } catch (bytes memory reason) {
            // Parse the reverted sample datas
            (amountsOut, gasUsed) = abi.decode(reason, (uint256[], uint256[]));
        }
    }

    function _getNativeWrappedToken()
        internal
        view
        returns (IEtherTokenV06)
    {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        address token;
        if (chainId == 1) {
            // Ethereum Mainnet
            token = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        } else if (chainId == 3) {
            // Ropsten
            token = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
        } else if (chainId == 4) {
            // Rinkeby
            token = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
        } else if (chainId == 42) {
            // Kovan
            token = 0xd0A1E359811322d97991E03f863a0C30C2cF029C;
        } else if (chainId == 56) {
            // BSC 
            token = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
        } else if (chainId == 137) {
            // Polygon
            token = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
        } else if (chainId == 1337) {
            // 0x Ganache
            token = 0x0B1ba0af832d7C05fD64161E0Db78E85978E8082;
        }
        if (token == address(0)) {
            revert("No native wrapped token");
        }
        return IEtherTokenV06(token);
    }

    function _revertSingleSwapSample(
        uint256 amount,
        uint256 gasUsed
    )
        internal
    {
        // Revert it so there is no state change
        assembly {
            mstore(0, amount)
            mstore(32, gasUsed)
            revert(0, 64)
        }
    }

    function _revertSwapSample(
        uint256[] memory amounts,
        uint256[] memory gasUsed
    )
        internal
    {
        bytes memory data = abi.encode(amounts, gasUsed);
        // Revert it so there is no state change
        assembly {
            revert(add(data, 32), mload(data))
        }
    }

    /// @dev Parses the reverted swap sample data. If no amount
    ///      is decoded, 0 is returned.
    /// @param reason the string which contains the possible
    ///               sample amount
    /// @return the decoded sample amount or 0
    /// @return the gas used in the sample
    function _parseRevertedSingleSwapSample(
        bytes memory reason
    )
        internal
        pure
        returns (uint256, uint256)
    {
        if (reason.length != 64) {
            return (0,0);
        }
        return abi.decode(reason, (uint256, uint256));
    }

    function _sampleSwapApproximateBuys(
        SwapRevertSamplerBuyQuoteOpts memory opts,
        uint256[] memory makerTokenAmounts
    )
        internal
        returns (uint256[] memory gasUsed, uint256[] memory takerTokenAmounts)
    {
        if (makerTokenAmounts.length == 0) {
            return (gasUsed, takerTokenAmounts);
        }

        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        gasUsed = new uint256[](makerTokenAmounts.length);

        uint256[] memory sellAmounts = new uint256[](1);
        sellAmounts[0] = makerTokenAmounts[0];

        SwapRevertSamplerQuoteOpts memory sellOpts = SwapRevertSamplerQuoteOpts({
            sellToken: opts.sellToken,
            buyToken: opts.buyToken,
            bridgeData: opts.sellTokenData,
            getSwapQuoteCallback: opts.getSwapQuoteCallback
        });

        SwapRevertSamplerQuoteOpts memory buyOpts = SwapRevertSamplerQuoteOpts({
            sellToken: opts.buyToken,
            buyToken: opts.sellToken,
            bridgeData: opts.buyTokenData,
            getSwapQuoteCallback: opts.getSwapQuoteCallback
        });
        // Inverted, perform a sell of the token the user wants to buy
        (, sellAmounts) = _sampleSwapQuotesRevert(buyOpts, sellAmounts);
        if (sellAmounts.length == 0 || sellAmounts[0] == 0) {
            return (gasUsed, takerTokenAmounts);
        }

        uint256[] memory buyAmounts;
        // Sell of the token the user wishes to dispose, see how much we buy
        (, buyAmounts) = _sampleSwapQuotesRevert(sellOpts, sellAmounts);

        if (buyAmounts.length == 0 || buyAmounts[0] == 0) {
            return (gasUsed, takerTokenAmounts);
        }

        for (uint256 i = 0; i < makerTokenAmounts.length; i++) {
            uint256[] memory _gasUsed;
            for (uint256 iter = 0; iter < APPROXIMATE_BUY_MAX_ITERATIONS; iter++) {
                // adjustedSellAmount = previousSellAmount * (target/actual) * JUMP_MULTIPLIER
                sellAmounts[0] = _safeGetPartialAmountCeil(
                    makerTokenAmounts[i],
                    buyAmounts[0],
                    sellAmounts[0]
                );
                if (sellAmounts.length == 0 || sellAmounts[0] == 0) {
                    break;
                }
                sellAmounts[0] = _safeGetPartialAmountCeil(
                    (ONE_HUNDED_PERCENT_BPS + APPROXIMATE_BUY_TARGET_EPSILON_BPS),
                    ONE_HUNDED_PERCENT_BPS,
                    sellAmounts[0]
                );
                if (sellAmounts.length == 0 || sellAmounts[0] == 0) {
                    break;
                }
                uint256[] memory _buyAmounts;
                (_gasUsed, _buyAmounts) = _sampleSwapQuotesRevert(sellOpts, sellAmounts);
                if (_buyAmounts.length == 0 || _buyAmounts[0] == 0) {
                    break;
                }
                // We re-use buyAmount next iteration, only assign if it is
                // non zero
                buyAmounts = _buyAmounts;
                // If we've reached our goal, exit early
                if (buyAmounts[0] >= makerTokenAmounts[i]) {
                    uint256 eps =
                        (buyAmounts[0] - makerTokenAmounts[i]) * ONE_HUNDED_PERCENT_BPS /
                        makerTokenAmounts[i];
                    if (eps <= APPROXIMATE_BUY_TARGET_EPSILON_BPS) {
                        break;
                    }
                }
            }
            // We've encountered reverts, so bail
            if (_gasUsed.length == 0 || _gasUsed[0] == 0) {
                return (gasUsed, takerTokenAmounts);
            }

            if (buyAmounts.length > 0) {
                gasUsed[i] = _gasUsed[0];
                // We do our best to close in on the requested amount, but we can either over buy or under buy and exit
                // if we hit a max iteration limit
                // We scale the sell amount to get the approximate target
                takerTokenAmounts[i] = _safeGetPartialAmountCeil(
                    makerTokenAmounts[i],
                    buyAmounts[0],
                    sellAmounts[0]
                );
            }
        }
    }

    function _safeGetPartialAmountCeil(
        uint256 numerator,
        uint256 denominator,
        uint256 target
    )
        internal
        view
        returns (uint256 partialAmount)
    {
        if (numerator == 0 || target == 0 || denominator == 0) return 0;
        uint256 c = numerator * target;
        if (c / numerator != target) return 0;
        return (c + (denominator - 1)) / denominator;
    }


}