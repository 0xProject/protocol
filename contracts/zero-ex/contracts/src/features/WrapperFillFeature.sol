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
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../external/IAllowanceTarget.sol";
import "../external/ILiquidityProviderSandbox.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinTokenSpender.sol";
import "../migrations/LibMigrate.sol";
import "../vendor/IUniswapV2Pair.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/INativeOrdersFeature.sol";
import "./interfaces/ITransformERC20Feature.sol";
import "./libs/LibNativeOrder.sol";


// RFC: Should we just roll this into TransformERC20Feature?
contract WrapperFillFeature is
    IFeature,
    FixinCommon,
    FixinTokenSpender
{
    using LibSafeMathV06 for uint128;
    using LibSafeMathV06 for uint256;

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "WrapperFillFeature";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);

    /// @dev The WETH token contract.
    IEtherTokenV06 private immutable weth;
    /// @dev The sandbox contract address.
    ILiquidityProviderSandbox public immutable sandbox;
    /// @dev ETH pseudo-token address.
    address private constant ETH_TOKEN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // address of the UniswapV2Factory contract.
    address private constant UNISWAP_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    // address of the (Sushiswap) UniswapV2Factory contract.
    address private constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    // Init code hash of the UniswapV2Pair contract.
    uint256 private constant UNISWAP_PAIR_INIT_CODE_HASH = 0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f;
    // Init code hash of the (Sushiswap) UniswapV2Pair contract.
    uint256 private constant SUSHISWAP_PAIR_INIT_CODE_HASH = 0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303;
    /// @dev The highest bit of a uint256 value.
    uint256 private constant HIGH_BIT = 2 ** 255;
    /// @dev Mask of the lower 255 bits of a uint256 value.
    uint256 private constant LOWER_255_BITS = HIGH_BIT - 1;

    struct WrappedBatchCall {
        // The selector of the function to call.
        bytes4 selector;
        // Amount of `inputToken` to sell.
        // Setting the high-bit indicates that `sellAmount & LOW_BITS`
        // should be treated as a `1e18` fraction of the current balance
        // of `sellToken`, where `1e18+ == 100%` and `0.5e18 == 50%`, etc.
        uint256 sellAmount;
        // ABI-encoded parameters needed to perform the call.
        bytes data;
    }

    struct BatchFillData {
        // The token being sold.
        IERC20TokenV06 inputToken;
        // The token being bought.
        IERC20TokenV06 outputToken;
        // The amount of `inputToken` to sell.
        uint256 sellAmount;
        // The nested calls to perform.
        WrappedBatchCall[] calls;
    }

    struct WrappedMultiHopCall {
        // The selector of the function to call.
        bytes4 selector;
        // ABI-encoded parameters needed to perform the call.
        bytes data;
    }

    struct MultiHopFillData {
        // The sell path.
        address[] tokens;
        // The amount of `tokens[0]` to sell.
        uint256 sellAmount;
        // The nested calls to perform.
        WrappedMultiHopCall[] calls;
    }

    constructor(
        IEtherTokenV06 weth_,
        ILiquidityProviderSandbox sandbox_,
        bytes32 greedyTokensBloomFilter
    )
        public
        FixinTokenSpender(greedyTokensBloomFilter)
    {
        weth = weth_;
        sandbox = sandbox_;
    }

    /// @dev Initialize and register this feature.
    ///      Should be delegatecalled by `Migrate.migrate()`.
    /// @return success `LibMigrate.SUCCESS` on success.
    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.batchFill.selector);
        _registerFeatureFunction(this.multiHopFill.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    function batchFill(
        BatchFillData memory fillData,
        uint256 minBuyAmount
    )
        public
        payable
        returns (uint256 outputTokenAmount)
    {
        // Cache the sender's balance of the output token.
        uint256 senderBalanceBefore = _senderBalance(fillData.outputToken);
        // Cache the contract's ETH balance prior to this call.
        uint256 ethBalanceBefore = address(this).balance.safeSub(msg.value);

        // Perform the batch fill. Pass in `msg.value` as the maximum
        // allowable amount of ETH for the wrapped calls to consume.
        _batchFill(fillData, msg.value);

        // RFC: I think these balance checks are arguably unnecessary,
        // and that we can instead trust the `outputTokenAmount` and
        // `remainingEth` values returned by `_batchFill`. AFAICT the
        // `remainingEth` value should always be accurate, and the
        // `outputTokenAmount` is only inaccurate if the sender has
        // an allowance set on a malicious token contract or liquidity
        // provider.

        // The `outputTokenAmount` returned by `_batchFill` may not
        // be fully accurate (e.g. due to some janky token and/or
        // reentrancy situation).
        outputTokenAmount = _senderBalance(fillData.outputToken)
            .safeSub(senderBalanceBefore);
        require(
            outputTokenAmount >= minBuyAmount,
            "batchFill/UNDERBOUGHT"
        );

        uint256 ethBalanceAfter = address(this).balance;
        require(
            ethBalanceAfter >= ethBalanceBefore,
            "batchFill/OVERSPENT_ETH"
        );
        // Refund ETH
        if (ethBalanceAfter > ethBalanceBefore) {
            payable(msg.sender).transfer(ethBalanceAfter - ethBalanceBefore);
        }
    }

    function multiHopFill(
        MultiHopFillData memory fillData,
        uint256 minBuyAmount
    )
        public
        payable
        returns (uint256 outputTokenAmount)
    {
        require(
            fillData.tokens.length == fillData.calls.length + 1,
            "multiHopFill/MISMATCHED_ARRAY_LENGTHS"
        );
        IERC20TokenV06 outputToken = IERC20TokenV06(fillData.tokens[fillData.tokens.length - 1]);
        uint256 senderBalanceBefore = _senderBalance(outputToken);
        uint256 ethBalanceBefore = address(this).balance.safeSub(msg.value);

        _multiHopFill(fillData, msg.value);


        // RFC: I think these balance checks are arguably unnecessary,
        // see reasoning above.

        // The `outputTokenAmount` returned by `_multiHopFill` may not
        // be fully accurate (e.g. due to some janky token and/or
        // reentrancy situation).
        outputTokenAmount = _senderBalance(outputToken)
            .safeSub(senderBalanceBefore);
        require(
            outputTokenAmount >= minBuyAmount,
            "multiHopFill/UNDERBOUGHT"
        );

        uint256 ethBalanceAfter = address(this).balance;
        require(
            ethBalanceAfter >= ethBalanceBefore,
            "batchFill/OVERSPENT_ETH"
        );
        // Refund ETH
        if (ethBalanceAfter > ethBalanceBefore) {
            payable(msg.sender).transfer(ethBalanceAfter - ethBalanceBefore);
        }
    }

    // Similar to FQT. If `fillData.sellAmount` is set to `type(uint256).max`,
    // this is effectively a batch fill. Otherwise it can be set to perform a
    // market sell of some amount. In the case of a market sell, the `sellAmount`
    // values of the constituent wrapped calls can encode percentages of the
    // full `fillData.sellAmount`. This is useful if e,g, the `_batchFill` call
    // the second leg of a multi-hop fill, where the sell amount is not known
    // ahead of time.
    function _batchFill(BatchFillData memory fillData, uint256 totalEth)
        public
        returns (uint256 outputTokenAmount, uint256 remainingEth)
    {
        // Track the remaining ETH allocated to this call.
        remainingEth = totalEth;
        // Track the amount of input token sold.
        uint256 soldAmount;
        for (uint256 i = 0; i != fillData.calls.length; i++) {
            // Check if we've hit our target.
            if (soldAmount >= fillData.sellAmount) { break; }
            WrappedBatchCall memory wrappedCall = fillData.calls[i];
            // Compute the fill amount.
            uint256 inputTokenAmount = _normalizeAmount(
                wrappedCall.sellAmount,
                fillData.sellAmount,
                fillData.sellAmount.safeSub(soldAmount)
            );
            if (wrappedCall.selector == INativeOrdersFeature._fillRfqOrder.selector) {
                // Decode the RFQ order and signature.
                (
                    LibNativeOrder.RfqOrder memory order,
                    LibSignature.Signature memory signature
                ) = abi.decode(
                    wrappedCall.data,
                    (LibNativeOrder.RfqOrder, LibSignature.Signature)
                );
                if (order.expiry <= uint64(block.timestamp)) {
                    continue;
                }
                // Try filling the RFQ order. Swallows reverts.
                try
                    INativeOrdersFeature(address(this))._fillRfqOrder
                        (
                            order,
                            signature,
                            inputTokenAmount.safeDowncastToUint128(),
                            msg.sender
                        )
                    returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
                {
                    // Increment the sold and bought amounts.
                    soldAmount = soldAmount.safeAdd(takerTokenFilledAmount);
                    outputTokenAmount = outputTokenAmount.safeAdd(makerTokenFilledAmount);
                } catch {}
            } else if (wrappedCall.selector == this._sellToUniswap.selector) {
                (address[] memory tokens, bool isSushi) = abi.decode(
                    wrappedCall.data,
                    (address[], bool)
                );
                // Perform the Uniswap/Sushiswap trade.
                uint256 outputTokenAmount_  = _sellToUniswap(
                    tokens,
                    inputTokenAmount,
                    isSushi,
                    address(0),
                    msg.sender
                );
                // Increment the sold and bought amounts.
                soldAmount = soldAmount.safeAdd(inputTokenAmount);
                outputTokenAmount = outputTokenAmount.safeAdd(outputTokenAmount_);
            } else if (wrappedCall.selector == this._sellToLiquidityProvider.selector) {
                (address provider, bytes memory auxiliaryData) = abi.decode(
                    wrappedCall.data,
                    (address, bytes)
                );
                if (address(fillData.inputToken) == ETH_TOKEN_ADDRESS) {
                    inputTokenAmount = LibSafeMathV06.min256(
                        inputTokenAmount,
                        remainingEth
                    );
                    // Transfer the input ETH to the provider.
                    payable(provider).transfer(inputTokenAmount);
                    // Count that ETH as spent.
                    remainingEth = remainingEth -= inputTokenAmount;
                } else {
                    // Transfer input ERC20 tokens to the provider.
                    _transferERC20Tokens(
                        fillData.inputToken,
                        msg.sender,
                        provider,
                        inputTokenAmount
                    );
                }
                // Perform the PLP trade.
                uint256 outputTokenAmount_ = _sellToLiquidityProvider(
                    address(fillData.inputToken),
                    address(fillData.outputToken),
                    provider,
                    msg.sender,
                    auxiliaryData
                );
                // Increment the sold and bought amounts.
                soldAmount = soldAmount.safeAdd(inputTokenAmount);
                outputTokenAmount = outputTokenAmount.safeAdd(outputTokenAmount_);
            } else if (wrappedCall.selector == ITransformERC20Feature._transformERC20.selector) {
                ITransformERC20Feature.TransformERC20Args memory args;
                args.taker = msg.sender;
                args.inputToken = fillData.inputToken;
                args.outputToken = fillData.outputToken;
                args.minOutputTokenAmount = 0;
                uint256 ethValue;
                (args.transformations, ethValue) = abi.decode(
                    wrappedCall.data,
                    (ITransformERC20Feature.Transformation[], uint256)
                );
                // Normalize the ETH and input token amounts.
                ethValue = _normalizeAmount(
                    ethValue,
                    totalEth,
                    remainingEth
                );
                // RFC: I don't think we need to try-catch here; pretty sure we'd only be
                // using `_transformERC20` for external sources that are not VIP-compatible,
                // so the batch fill would be brittle to failures anyway.
                try ITransformERC20Feature(address(this))._transformERC20
                    {value: ethValue}
                    (args)
                    returns (uint256 outputTokenAmount_)
                {
                    remainingEth -= ethValue;
                    soldAmount = soldAmount.safeAdd(inputTokenAmount);
                    outputTokenAmount = outputTokenAmount.safeAdd(outputTokenAmount_);
                } catch {}
            } else if (wrappedCall.selector == this._multiHopFill.selector) {
                MultiHopFillData memory multiHopFillData;
                uint256 ethValue;
                (
                    multiHopFillData.tokens,
                    multiHopFillData.calls,
                    ethValue
                ) = abi.decode(
                    wrappedCall.data,
                    (address[], WrappedMultiHopCall[], uint256)
                );
                // Normalize the ETH and input token amounts.
                ethValue = _normalizeAmount(
                    ethValue,
                    totalEth,
                    remainingEth
                );
                // Subtract the ethValue allocated to the nested multi-hop fill.
                remainingEth -= ethValue;
                (uint256 outputTokenAmount_, uint256 leftoverEth) =
                    _multiHopFill(multiHopFillData, ethValue);
                // Increment the sold and bought amounts.
                soldAmount = soldAmount.safeAdd(inputTokenAmount);
                outputTokenAmount = outputTokenAmount.safeAdd(outputTokenAmount_);
                // Add back any ETH that wasn't used by the nested multi-hop fill.
                remainingEth += leftoverEth;
            } else {
                revert("batchFill/UNRECOGNIZED_SELECTOR");
            }
        }
    }

    function _multiHopFill(MultiHopFillData memory fillData, uint256 totalEth)
        public
        returns (uint256 outputTokenAmount, uint256 remainingEth)
    {
        // Track the remaining ETH allocated to this call.
        remainingEth = totalEth;
        // This variable is used as the input and output amounts of
        // each hop. After the final hop, this will contain the output
        // amount of the multi-hop fill.
         outputTokenAmount = fillData.sellAmount;
        // This variable is used to cache the address to target in the
        // next hop. See `_computeHopRecipient` for details.
        address nextTarget;
        for (uint256 i = 0; i != fillData.calls.length; i++) {
            WrappedMultiHopCall memory wrappedCall = fillData.calls[i];
            if (wrappedCall.selector == this._sellToUniswap.selector) {
                // If the next hop supports a "transfer then execute" pattern,
                // the recipient will not be `msg.sender`. See `_computeHopRecipient`
                // for details.
                address recipient = _computeHopRecipient(fillData.calls, i);
                (address[] memory tokens, bool isSushi) = abi.decode(
                    wrappedCall.data,
                    (address[], bool)
                );
                // Perform the Uniswap/Sushiswap trade.
                outputTokenAmount = _sellToUniswap(
                    tokens,
                    outputTokenAmount,
                    isSushi,
                    nextTarget,
                    recipient
                );
                // If the recipient was not `msg.sender`, it must be the target
                // contract for the next hop.
                nextTarget = recipient == msg.sender ? address(0) : recipient;
            } else if (wrappedCall.selector == this._sellToLiquidityProvider.selector) {
                // If the next hop supports a "transfer then execute" pattern,
                // the recipient will not be `msg.sender`. See `_computeHopRecipient`
                // for details.
                address recipient = _computeHopRecipient(fillData.calls, i);
                // If `nextTarget` was not set in the previous hop, then we
                // need to send in the input ETH/tokens to the liquidity provider
                // contract before executing the trade.
                if (nextTarget == address(0)) {
                    (address provider, bytes memory auxiliaryData) = abi.decode(
                        wrappedCall.data,
                        (address, bytes)
                    );
                    // Transfer input ETH or ERC20 tokens to the liquidity
                    // provider contract.
                    if (fillData.tokens[i] == ETH_TOKEN_ADDRESS) {
                        outputTokenAmount = LibSafeMathV06.min256(
                            outputTokenAmount,
                            remainingEth
                        );
                        payable(provider).transfer(outputTokenAmount);
                        remainingEth -= outputTokenAmount;
                    } else {
                        _transferERC20Tokens(
                            IERC20TokenV06(fillData.tokens[i]),
                            msg.sender,
                            provider,
                            outputTokenAmount
                        );
                    }
                    outputTokenAmount = _sellToLiquidityProvider(
                        fillData.tokens[i],
                        fillData.tokens[i + 1],
                        provider,
                        recipient,
                        auxiliaryData
                    );
                } else {
                    (, bytes memory auxiliaryData) = abi.decode(
                        wrappedCall.data,
                        (address, bytes)
                    );
                    // Tokens and ETH have already been transferred to
                    // the liquidity provider contract in the previous hop.
                    outputTokenAmount = _sellToLiquidityProvider(
                        fillData.tokens[i],
                        fillData.tokens[i + 1],
                        nextTarget,
                        recipient,
                        auxiliaryData
                    );
                }
                // If the recipient was not `msg.sender`, it must be the target
                // contract for the next hop.
                nextTarget = recipient == msg.sender ? address(0) : recipient;
            } else if (wrappedCall.selector == ITransformERC20Feature._transformERC20.selector) {
                ITransformERC20Feature.TransformERC20Args memory args;
                args.inputToken = IERC20TokenV06(fillData.tokens[i]);
                args.outputToken = IERC20TokenV06(fillData.tokens[i + 1]);
                args.minOutputTokenAmount = 0;
                args.taker = payable(_computeHopRecipient(fillData.calls, i));
                if (nextTarget != address(0)) {
                    // If `nextTarget` was set in the previous hop, then the input
                    // token was already sent to the FlashWallet. Setting
                    // `inputTokenAmount` to 0 indicates that no tokens need to
                    // be pulled into the FlashWallet before executing the
                    // transformations.
                    args.inputTokenAmount = 0;
                } else if (
                    args.taker != msg.sender &&
                    address(args.inputToken) != ETH_TOKEN_ADDRESS
                ) {
                    address flashWallet = address(
                        ITransformERC20Feature(address(this)).getTransformWallet()
                    );
                    // The input token has _not_ already been sent to the
                    // FlashWallet. We also want PayTakerTransformer to
                    // send the output token to some address other than
                    // msg.sender, so we must transfer the input token
                    // to the FlashWallet here.
                    _transferERC20Tokens(
                        args.inputToken,
                        msg.sender,
                        flashWallet,
                        outputTokenAmount
                    );
                    args.inputTokenAmount = 0;
                } else {
                    // Otherwise, either:
                    // (1) args.taker == msg.sender, in which case
                    //     `_transformERC20` will pull the input token
                    //     into the FlashWallet, or
                    // (2) args.inputToken == ETH_TOKEN_ADDRESS, in which
                    //     case ETH is attached to the call and no token
                    //     transfer occurs.
                    args.inputTokenAmount = outputTokenAmount;
                }
                uint256 ethValue;
                (args.transformations, ethValue) = abi.decode(
                    wrappedCall.data,
                    (ITransformERC20Feature.Transformation[], uint256)
                );
                // Do not spend more than the remaining ETH.
                ethValue = LibSafeMathV06.min256(ethValue, remainingEth);
                // Call `_transformERC20`.
                outputTokenAmount = ITransformERC20Feature(address(this))
                    ._transformERC20{value: ethValue}(args);
                // Decrement the remaining ETH.
                remainingEth -= ethValue;
                // If the recipient was not `msg.sender`, it must be the target
                // contract for the next hop.
                nextTarget = args.taker == msg.sender ? address(0) : args.taker;
            } else if (wrappedCall.selector == this._batchFill.selector) {
                BatchFillData memory batchFillData;
                batchFillData.inputToken = IERC20TokenV06(fillData.tokens[i]);
                batchFillData.outputToken = IERC20TokenV06(fillData.tokens[i + 1]);
                uint256 ethValue;
                (ethValue, batchFillData.calls) = abi.decode(
                    wrappedCall.data,
                    (uint256, WrappedBatchCall[])
                );
                // Do not spend more than the remaining ETH.
                ethValue = LibSafeMathV06.min256(ethValue, remainingEth);
                if (fillData.tokens[i] == ETH_TOKEN_ADDRESS) {
                    batchFillData.sellAmount = LibSafeMathV06.min256(
                        outputTokenAmount,
                        ethValue
                    );
                } else {
                    batchFillData.sellAmount = outputTokenAmount;
                }
                // Decrement the remaining ETH.
                remainingEth -= ethValue;
                uint256 leftoverEth;
                (outputTokenAmount, leftoverEth) = _batchFill(batchFillData, ethValue);
                // Add back any ETH that was unused by the `_batchFill`.
                remainingEth += leftoverEth;
                nextTarget = address(0);
            } else if (wrappedCall.selector == IEtherTokenV06.deposit.selector) {
                uint256 ethValue = LibSafeMathV06.min256(outputTokenAmount, remainingEth);
                // Wrap ETH.
                weth.deposit{value: ethValue}();
                nextTarget = _computeHopRecipient(fillData.calls, i);
                weth.transfer(nextTarget, ethValue);
                remainingEth -= ethValue;
            } else if (wrappedCall.selector == IEtherTokenV06.withdraw.selector) {
                // Unwrap WETH and send to `msg.sender`.
                // There may be some cases where we want to keep the WETH
                // here, but that's a conundrum for future me.
                weth.withdraw(outputTokenAmount);
                msg.sender.transfer(outputTokenAmount);
                nextTarget = address(0);
            } else {
                revert("multiHopFill/UNRECOGNIZED_SELECTOR");
            }
        }
    }

    // Same as the LiquidityProviderFeature, but without the transfer in
    // (which is potentially done in the previous hop of a multi-hop fill)
    // and without the minBuyAmount check (which is performed at the top, i.e.
    // in either `batchFill` or `multiHopFill`). Also takes a `recipient`
    // address parameter, so the output of the final `swap` call can be
    // sent to an address other than `msg.sender`.
    function _sellToUniswap(
        address[] memory tokens,
        uint256 sellAmount,
        bool isSushi,
        address pairAddress,
        address recipient
    )
        public
        returns (uint256 outputTokenAmount)
    {
        require(tokens.length > 1, "_sellToUniswap/InvalidTokensLength");
        // Check tokens != ETH_TOKEN_ADDRESS ?

        if (pairAddress == address(0)) {
            pairAddress = _computeUniswapPairAddress(tokens[0], tokens[1], isSushi);
            _transferERC20Tokens(
                IERC20TokenV06(tokens[0]),
                msg.sender,
                pairAddress,
                sellAmount
            );
        }

        for (uint256 i = 0; i < tokens.length - 1; i++) {
            (address inputToken, address outputToken) = (tokens[i], tokens[i + 1]);
            outputTokenAmount = _computeUniswapOutputAmount(
                pairAddress,
                inputToken,
                outputToken,
                sellAmount
            );
            (uint256 amount0Out, uint256 amount1Out) = inputToken < outputToken
                ? (uint256(0), outputTokenAmount)
                : (outputTokenAmount, uint256(0));
            address to = i < tokens.length - 2
                ? _computeUniswapPairAddress(outputToken, tokens[i + 2], isSushi)
                : recipient;
            IUniswapV2Pair(pairAddress).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
            pairAddress = to;
            sellAmount = outputTokenAmount;
        }
    }

    // Same as the LiquidityProviderFeature, but without the transfer in
    // (which is potentially done in the previous hop of a multi-hop fill)
    // and without the minBuyAmount check (which is performed at the top, i.e.
    // in either `batchFill` or `multiHopFill`).
    function _sellToLiquidityProvider(
        address inputToken,
        address outputToken,
        address provider,
        address recipient,
        bytes memory auxiliaryData
    )
        public
        returns (uint256 outputTokenAmount)
    {
        if (inputToken == ETH_TOKEN_ADDRESS) {
            uint256 balanceBefore = IERC20TokenV06(outputToken).balanceOf(recipient);
            sandbox.executeSellEthForToken(
                provider,
                outputToken,
                recipient,
                0,
                auxiliaryData
            );
            outputTokenAmount = IERC20TokenV06(outputToken).balanceOf(recipient).safeSub(balanceBefore);
        } else if (outputToken == ETH_TOKEN_ADDRESS) {
            uint256 balanceBefore = recipient.balance;
            sandbox.executeSellTokenForEth(
                provider,
                inputToken,
                recipient,
                0,
                auxiliaryData
            );
            outputTokenAmount = recipient.balance.safeSub(balanceBefore);
        } else {
            uint256 balanceBefore = IERC20TokenV06(outputToken).balanceOf(recipient);
            sandbox.executeSellTokenForToken(
                provider,
                inputToken,
                outputToken,
                recipient,
                0,
                auxiliaryData
            );
            outputTokenAmount = IERC20TokenV06(outputToken).balanceOf(recipient).safeSub(balanceBefore);
        }
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
    function _computeHopRecipient(
        WrappedMultiHopCall[] memory calls,
        uint256 i
    )
        private
        view
        returns (address recipient)
    {
        recipient = msg.sender;
        if (i != calls.length - 1) {
            WrappedMultiHopCall memory nextCall = calls[i + 1];
            if (nextCall.selector == this._sellToUniswap.selector) {
                (address[] memory tokens, bool isSushi) = abi.decode(
                    nextCall.data,
                    (address[], bool)
                );
                recipient = _computeUniswapPairAddress(tokens[0], tokens[1], isSushi);
            } else if (nextCall.selector == this._sellToLiquidityProvider.selector) {
                (recipient, ,) = abi.decode(
                    nextCall.data,
                    (address, bytes, uint256)
                );
            } else if (nextCall.selector == IEtherTokenV06.withdraw.selector) {
                recipient = address(this);
            } else if (nextCall.selector == ITransformERC20Feature._transformERC20.selector) {
                recipient = address(
                    ITransformERC20Feature(address(this)).getTransformWallet()
                );
            }
        }
    }

    function _senderBalance(IERC20TokenV06 token)
        private
        view
        returns (uint256 senderBalance)
    {
        senderBalance = address(token) == ETH_TOKEN_ADDRESS
            ? msg.sender.balance
            : token.balanceOf(msg.sender);
    }

    function _computeUniswapOutputAmount(
        address pairAddress,
        address inputToken,
        address outputToken,
        uint256 inputAmount
    )
        private
        view
        returns (uint256 outputAmount)
    {
        require(
            inputAmount > 0,
            "_computeUniswapOutputAmount/INSUFFICIENT_INPUT_AMOUNT"
        );
        (uint256 reserve0, uint256 reserve1,) = IUniswapV2Pair(pairAddress).getReserves();
        require(
            reserve0 > 0 && reserve1 > 0,
            '_computeUniswapOutputAmount/INSUFFICIENT_LIQUIDITY'
        );
        (uint256 inputReserve, uint256 outputReserve) = inputToken < outputToken
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
        uint256 inputAmountWithFee = inputAmount.safeMul(997);
        uint256 numerator = inputAmountWithFee.safeMul(outputReserve);
        uint256 denominator = inputReserve.safeMul(1000).safeAdd(inputAmountWithFee);
        return numerator / denominator;
    }

    function _computeUniswapPairAddress(
        address tokenA,
        address tokenB,
        bool isSushi
    )
        private
        pure
        returns (address pairAddress)
    {
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (isSushi) {
            return address(uint256(keccak256(abi.encodePacked(
                hex'ff',
                SUSHISWAP_FACTORY,
                keccak256(abi.encodePacked(token0, token1)),
                SUSHISWAP_PAIR_INIT_CODE_HASH
            ))));
        } else {
            return address(uint256(keccak256(abi.encodePacked(
                hex'ff',
                UNISWAP_FACTORY,
                keccak256(abi.encodePacked(token0, token1)),
                UNISWAP_PAIR_INIT_CODE_HASH
            ))));
        }
    }

    // Convert possible proportional values to absolute quantities.
    function _normalizeAmount(
        uint256 rawAmount,
        uint256 totalBalance,
        uint256 remainingBalance
    )
        private
        pure
        returns (uint256 normalized)
    {
        if ((rawAmount & HIGH_BIT) == HIGH_BIT) {
            // If the high bit of `rawAmount` is set then the lower 255 bits
            // specify a fraction of `totalBalance`.
            return LibSafeMathV06.min256(
                totalBalance
                    * LibSafeMathV06.min256(rawAmount & LOWER_255_BITS, 1e18)
                    / 1e18,
                remainingBalance
            );
        }
        return LibSafeMathV06.min256(rawAmount, remainingBalance);
    }
}
