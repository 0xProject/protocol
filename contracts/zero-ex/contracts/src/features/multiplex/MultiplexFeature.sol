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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../../external/ILiquidityProviderSandbox.sol";
import "../../fixins/FixinCommon.sol";
import "../../migrations/LibMigrate.sol";
import "../interfaces/IFeature.sol";
import "../interfaces/IMultiplexFeature.sol";
import "../interfaces/IUniswapV3Feature.sol";
import "./MultiplexLiquidityProvider.sol";
import "./MultiplexRfq.sol";
import "./MultiplexTransformERC20.sol";
import "./MultiplexUniswapV2.sol";


/// @dev This feature enables efficient batch and multi-hop trades
///      using different liquidity sources.
contract MultiplexFeature is
    IFeature,
    IMultiplexFeature,
    FixinCommon,
    MultiplexLiquidityProvider,
    MultiplexRfq,
    MultiplexTransformERC20,
    MultiplexUniswapV2
{
    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "MultiplexFeature";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(2, 0, 0);

    /// @dev The WETH token contract.
    IEtherTokenV06 private immutable weth;

    constructor(
        address zeroExAddress,
        IEtherTokenV06 weth_,
        ILiquidityProviderSandbox sandbox_
    )
        public
        MultiplexRfq(zeroExAddress)
        MultiplexLiquidityProvider(sandbox_)
    {
        weth = weth_;
    }

    /// @dev Initialize and register this feature.
    ///      Should be delegatecalled by `Migrate.migrate()`.
    /// @return success `LibMigrate.SUCCESS` on success.
    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.multiplexBatchSellEthForToken.selector);
        _registerFeatureFunction(this.multiplexBatchSellTokenForEth.selector);
        _registerFeatureFunction(this.multiplexBatchSellTokenForToken.selector);
        _registerFeatureFunction(this.multiplexMultiHopSellEthForToken.selector);
        _registerFeatureFunction(this.multiplexMultiHopSellTokenForEth.selector);
        _registerFeatureFunction(this.multiplexMultiHopSellTokenForToken.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    function multiplexBatchSellEthForToken(
        IERC20TokenV06 outputToken,
        BatchSellSubcall[] memory calls,
        uint256 minBuyAmount
    )
        public
        override
        payable
        returns (uint256 boughtAmount)
    {
        // Wrap ETH.
        weth.deposit{value: msg.value}();
        return _multiplexBatchSell(
            BatchSellParams(
                weth,
                outputToken,
                msg.value,
                calls,
                true,
                msg.sender
            ),
            minBuyAmount
        );
    }

    function multiplexBatchSellTokenForEth(
        IERC20TokenV06 inputToken,
        BatchSellSubcall[] memory calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        public
        override
        returns (uint256 boughtAmount)
    {
        boughtAmount = _multiplexBatchSell(
            BatchSellParams(
                inputToken,
                weth,
                sellAmount,
                calls,
                false,
                address(this)
            ),
            minBuyAmount
        );
        // Unwrap WETH.
        weth.withdraw(boughtAmount);
        _transferEth(msg.sender, boughtAmount);
    }

    function multiplexBatchSellTokenForToken(
        IERC20TokenV06 inputToken,
        IERC20TokenV06 outputToken,
        BatchSellSubcall[] memory calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        public
        override
        returns (uint256 boughtAmount)
    {
        return _multiplexBatchSell(
            BatchSellParams(
                inputToken,
                outputToken,
                sellAmount,
                calls,
                false,
                msg.sender
            ),
            minBuyAmount
        );
    }

    function _multiplexBatchSell(
        BatchSellParams memory params,
        uint256 minBuyAmount
    )
        private
        returns (uint256 boughtAmount)
    {
        // Cache the recipient's balance of the output token.
        boughtAmount = params.outputToken.compatBalanceOf(params.recipient);

        _executeBatchSell(params);

        boughtAmount = params.outputToken.compatBalanceOf(params.recipient)
            .safeSub(boughtAmount);

        require(
            boughtAmount > minBuyAmount,
            "MultiplexFeature::_multiplexBatchSell/UNDERBOUGHT"
        );
    }

    function multiplexMultiHopSellEthForToken(
        address[] memory tokens,
        MultiHopSellSubcall[] memory calls,
        uint256 minBuyAmount
    )
        public
        override
        payable
        returns (uint256 boughtAmount)
    {
        require(tokens[0] == address(weth));
        // Wrap ETH.
        weth.deposit{value: msg.value}();
        return _multiplexMultiHopSell(
            MultiHopSellParams(
                tokens,
                msg.value,
                calls,
                true,
                msg.sender
            ),
            minBuyAmount
        );
    }

    function multiplexMultiHopSellTokenForEth(
        address[] memory tokens,
        MultiHopSellSubcall[] memory calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        public
        override
        returns (uint256 boughtAmount)
    {
        require(tokens[tokens.length - 1] == address(weth));

        boughtAmount = _multiplexMultiHopSell(
            MultiHopSellParams(
                tokens,
                sellAmount,
                calls,
                false,
                address(this)
            ),
            minBuyAmount
        );
        // Unwrap WETH.
        weth.withdraw(boughtAmount);
        _transferEth(msg.sender, boughtAmount);
    }

    function multiplexMultiHopSellTokenForToken(
        address[] memory tokens,
        MultiHopSellSubcall[] memory calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        public
        override
        returns (uint256 boughtAmount)
    {
        return _multiplexMultiHopSell(
            MultiHopSellParams(
                tokens,
                sellAmount,
                calls,
                false,
                msg.sender
            ),
            minBuyAmount
        );
    }

    function _multiplexMultiHopSell(
        MultiHopSellParams memory params,
        uint256 minBuyAmount
    )
        private
        returns (uint256 boughtAmount)
    {
        // There should be one call/hop between every two tokens
        // in the path.
        // tokens[0]––calls[0]––>tokens[1]––...––calls[n-1]––>tokens[n]
        require(
            params.tokens.length == params.calls.length + 1,
            "MultiplexFeature::_multiplexMultiHopSell/MISMATCHED_ARRAY_LENGTHS"
        );

        // Cache the recipient's balance of the output token.
        IERC20TokenV06 outputToken = IERC20TokenV06(
            params.tokens[params.tokens.length - 1]
        );
        boughtAmount = outputToken.compatBalanceOf(params.recipient);

        _executeMultiHopSell(params);

        boughtAmount = outputToken.compatBalanceOf(params.recipient)
            .safeSub(boughtAmount);

        require(
            boughtAmount > minBuyAmount,
            "MultiplexFeature::_multiplexMultiHopSell/UNDERBOUGHT"
        );
    }

    function _executeBatchSell(BatchSellParams memory params)
        private
        returns (BatchSellState memory state)
    {
        for (uint256 i = 0; i != params.calls.length; i++) {
            // Check if we've hit our target.
            if (state.soldAmount >= params.sellAmount) { break; }
            BatchSellSubcall memory wrappedCall = params.calls[i];
            // Compute the fill amount.
            uint256 inputTokenAmount = LibSafeMathV06.min256(
                wrappedCall.sellAmount,
                params.sellAmount.safeSub(state.soldAmount)
            );
            if (wrappedCall.id == MultiplexSubcall.RFQ) {
                _fillRfqOrder(
                    state,
                    params,
                    wrappedCall.data,
                    inputTokenAmount
                );
            } else if (wrappedCall.id == MultiplexSubcall.UniswapV2) {
                _batchSellUniswapV2(
                    state,
                    params,
                    wrappedCall.data,
                    inputTokenAmount
                );
            } else if (wrappedCall.id == MultiplexSubcall.UniswapV3) {
                (bool success, bytes memory resultData) = address(this).delegatecall(
                    abi.encodeWithSelector(
                        IUniswapV3Feature.sellTokenForTokenToUniswapV3.selector,
                        wrappedCall.data,
                        inputTokenAmount,
                        0,
                        msg.sender
                    )
                );
                if (success) {
                    uint256 outputTokenAmount = abi.decode(resultData, (uint256));
                    // Increment the sold and bought amounts.
                    state.soldAmount = state.soldAmount.safeAdd(inputTokenAmount);
                    state.boughtAmount = state.boughtAmount.safeAdd(outputTokenAmount);
                }
            } else if (wrappedCall.id == MultiplexSubcall.LiquidityProvider) {
                _batchSellLiquidityProvider(
                    state,
                    params,
                    wrappedCall.data,
                    inputTokenAmount
                );
            } else if (wrappedCall.id == MultiplexSubcall.TransformERC20) {
                _batchSellTransformERC20(
                    state,
                    params,
                    wrappedCall.data,
                    inputTokenAmount
                );
            } else if (wrappedCall.id == MultiplexSubcall.MultiHopSell) {
                MultiHopSellParams memory multiHopParams;
                (
                    multiHopParams.tokens,
                    multiHopParams.calls
                ) = abi.decode(
                    wrappedCall.data,
                    (address[], MultiHopSellSubcall[])
                );
                multiHopParams.sellAmount = inputTokenAmount;
                multiHopParams.useSelfBalance = params.useSelfBalance;
                multiHopParams.recipient = params.recipient;

                uint256 outputTokenAmount =
                    _executeMultiHopSell(multiHopParams).outputTokenAmount;
                // Increment the sold and bought amounts.
                state.soldAmount = state.soldAmount.safeAdd(inputTokenAmount);
                state.boughtAmount = state.boughtAmount.safeAdd(outputTokenAmount);
            } else {
                revert("MultiplexFeature::_executeBatchSell/INVALID_SUBCALL");
            }
        }
    }

    // Internal variant of `multiHopFill`. This function can be nested within
    // a `_batchFill`.
    // This function executes a sequence of fills "hopping" through the
    // path of tokens given by `params.tokens`. The nested operations that
    // can be used as "hops" are:
    // - _sellToUniswap (executes a Uniswap/Sushiswap swap)
    // - _sellToLiquidityProvider (executes a PLP swap)
    // - _transformERC20 (executes arbitrary ERC20 Transformations)
    // This function optimizes the number of ERC20 transfers performed
    // by having each hop transfer its output tokens directly to the
    // target address of the next hop. Note that the `outputTokenAmount` returned
    // by this function could theoretically be inaccurate if `msg.sender` has
    // set a token allowance on an external contract that gets called during
    // the execution of this function.
    function _executeMultiHopSell(MultiHopSellParams memory params)
        private
        returns (MultiHopSellState memory state)
    {
        // This variable is used as the input and output amounts of
        // each hop. After the final hop, this will contain the output
        // amount of the multi-hop fill.
        state.outputTokenAmount = params.sellAmount;

        state.hopIndex = 0;
        state.nextTarget = _computeHopTarget(params, 0);
        if (!params.useSelfBalance) {
            _transferERC20TokensFrom(
                IERC20TokenV06(params.tokens[0]),
                msg.sender,
                state.nextTarget,
                params.sellAmount
            );
        } else if (state.nextTarget != address(this)) {
            _transferERC20Tokens(
                IERC20TokenV06(params.tokens[0]),
                state.nextTarget,
                params.sellAmount
            );
        }

        for (; state.hopIndex != params.calls.length; state.hopIndex++) {
            MultiHopSellSubcall memory wrappedCall = params.calls[state.hopIndex];
            state.currentTarget = state.nextTarget;
            state.nextTarget = _computeHopTarget(params, state.hopIndex + 1);

            if (wrappedCall.id == MultiplexSubcall.UniswapV2) {
                _multiHopSellUniswapV2(
                    state,
                    params,
                    wrappedCall.data
                );
            } else if (wrappedCall.id == MultiplexSubcall.LiquidityProvider) {
                _multiHopSellLiquidityProvider(
                    state,
                    params,
                    wrappedCall.data
                );
            } else {
                revert("MultiplexFeature::_executeMultiHopSell/INVALID_SUBCALL");
            }
        }
    }

    function _transferEth(address payable recipient, uint256 amount)
        private
    {
        (bool success,) = recipient.call{value: amount}("");
        require(success, "MultiplexFeature::_transferEth/TRANSFER_FAILED");
    }

    // Some liquidity sources (e.g. Uniswap, Sushiswap, and PLP) can be passed
    // a `recipient` parameter so the boguht tokens are transferred to the
    // `recipient` address rather than `msg.sender`.
    // Some liquidity sources (also Uniswap, Sushiswap, and PLP incidentally)
    // support a "transfer then execute" pattern, where the token being sold
    // can be transferred into the contract before calling a swap function to
    // execute the trade.
    // If the current hop in a multi-hop fill satisfies the first condition,
    // and the next hop satisfies the second condition, the tokens bought
    // in the current hop can be directly sent to the target contract of
    // the next hop to save a transfer.
    function _computeHopTarget(
        MultiHopSellParams memory params,
        uint256 i
    )
        private
        view
        returns (address recipient)
    {
        if (i == params.calls.length) {
            recipient = params.recipient;
        } else {
            MultiHopSellSubcall memory wrappedCall = params.calls[i];
            if (wrappedCall.id == MultiplexSubcall.UniswapV2) {
                (address[] memory tokens, bool isSushi) = abi.decode(
                    wrappedCall.data,
                    (address[], bool)
                );
                recipient = _computeUniswapPairAddress(
                    tokens[0],
                    tokens[1],
                    isSushi
                );
            } else if (wrappedCall.id == MultiplexSubcall.LiquidityProvider) {
                (recipient,) = abi.decode(
                    wrappedCall.data,
                    (address, bytes)
                );
            } else {
                revert("MultiplexFeature::_computeHopTarget/INVALID_SUBCALL");
            }
        }
        require(
            recipient != address(0),
            "MultiplexFeature::_computeHopTarget/RECIPIENT_IS_NULL"
        );
    }
}
