
/*

  Copyright 2020 ZeroEx Intl.

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

pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IEtherToken.sol";
import "@0x/contracts-erc20/contracts/src/LibERC20Token.sol";
import "@0x/contracts-exchange-libs/contracts/src/IWallet.sol";
import "@0x/contracts-utils/contracts/src/DeploymentConstants.sol";
import "../interfaces/IERC20Bridge.sol";
import "../interfaces/IBancorNetwork.sol";


contract BancorBridge is
    IERC20Bridge,
    IWallet,
    DeploymentConstants
{
    struct TransferState {
        address bancorNetworkAddress;
        address[] path;
        IEtherToken weth;
    }

    /// @dev Bancor ETH pseudo-address.
    address constant public BANCOR_ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // solhint-disable no-empty-blocks
    /// @dev Payable fallback to receive ETH from Bancor/WETH.
    function ()
        external
        payable
    {
        // Poor man's receive in 0.5.9
        require(msg.data.length == 0);
    }

    /// @dev Callback for `IERC20Bridge`. Tries to buy `amount` of
    ///      `toTokenAddress` tokens by selling the entirety of the `fromTokenAddress`
    ///      token encoded in the bridge data, then transfers the bought
    ///      tokens to `to`.
    /// @param toTokenAddress The token to buy and transfer to `to`.
    /// @param from The maker (this contract).
    /// @param to The recipient of the bought tokens.
    /// @param amount Minimum amount of `toTokenAddress` tokens to buy.
    /// @param bridgeData The abi-encoded conversion path addresses and Bancor network address
    /// @return success The magic bytes if successful.
    function bridgeTransferFrom(
        address toTokenAddress,
        address from,
        address to,
        uint256 amount,
        bytes calldata bridgeData
    )
        external
        returns (bytes4 success)
    {
        // hold variables to get around stack depth limitations
        TransferState memory state;
        // Decode the bridge data.
        (
            state.path,
            state.bancorNetworkAddress
        // solhint-disable indent
        ) = abi.decode(bridgeData, (address[], address));
        // solhint-enable indent
        state.weth = IEtherToken(_getWethAddress());

        require(state.path.length >= 2, "BancorBridge/PATH_LENGTH_MUST_BE_GREATER_THAN_TWO");

        // Grant an allowance to the Bancor Network to spend `fromTokenAddress` token.
        uint256 fromTokenBalance;
        uint256 payableAmount = 0;
        // If it's ETH in the path then withdraw from WETH
        // The Bancor path will have ETH as the 0xeee address
        // Bancor expects to be paid in ETH not WETH
        if (state.path[0] == BANCOR_ETH_ADDRESS) {
            fromTokenBalance = state.weth.balanceOf(address(this));
            state.weth.withdraw(fromTokenBalance);
            payableAmount = fromTokenBalance;
        } else {
            fromTokenBalance = IERC20Token(state.path[0]).balanceOf(address(this));
            LibERC20Token.approveIfBelow(state.path[0], state.bancorNetworkAddress, fromTokenBalance);
        }

        // Convert the tokens
        uint256 boughtAmount = IBancorNetwork(state.bancorNetworkAddress).convertByPath.value(payableAmount)(
            state.path, // path originating with source token and terminating in destination token
            fromTokenBalance, // amount of source token to trade
            amount, // minimum amount of destination token expected to receive
            state.path[state.path.length-1] == BANCOR_ETH_ADDRESS ? address(this) : to, // beneficiary
            address(0), // affiliateAccount; no fee paid
            0 // affiliateFee; no fee paid
        );

        if (state.path[state.path.length-1] == BANCOR_ETH_ADDRESS) {
            state.weth.deposit.value(boughtAmount)();
            state.weth.transfer(to, boughtAmount);
        }

        emit ERC20BridgeTransfer(
            state.path[0] == BANCOR_ETH_ADDRESS ? address(state.weth) : state.path[0],
            toTokenAddress,
            fromTokenBalance,
            boughtAmount,
            from,
            to
        );
        return BRIDGE_SUCCESS;
    }

    /// @dev `SignatureType.Wallet` callback, so that this bridge can be the maker
    ///      and sign for itself in orders. Always succeeds.
    /// @return magicValue Magic success bytes, always.
    function isValidSignature(
        bytes32,
        bytes calldata
    )
        external
        view
        returns (bytes4 magicValue)
    {
        return LEGACY_WALLET_MAGIC_VALUE;
    }

}
