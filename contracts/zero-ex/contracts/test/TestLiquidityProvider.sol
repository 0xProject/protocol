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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "../src/vendor/ILiquidityProvider.sol";


contract TestLiquidityProvider is
    ILiquidityProvider
{
    event ERC20BridgeTransfer(
        address inputToken,
        address outputToken,
        uint256 inputTokenAmount,
        uint256 outputTokenAmount,
        address from,
        address to
    );

    event SellEthForToken(
        address taker,
        uint256 minMakerAssetAmount,
        uint256 ethBalance
    );

    event SellTokenForEth(
        address taker,
        uint256 minMakerAssetAmount,
        uint256 tokenBalance
    );

    IERC20TokenV06 public immutable xAsset;
    IERC20TokenV06 public immutable yAsset;

    constructor(IERC20TokenV06 xAsset_, IERC20TokenV06 yAsset_)
        public
    {
        xAsset = xAsset_;
        yAsset = yAsset_;
    }

    receive() external payable {}

    /// @dev Transfers `amount` of the ERC20 `tokenAddress` from `from` to `to`.
    /// @param tokenAddress The address of the ERC20 token to transfer.
    /// @param from Address to transfer asset from.
    /// @param to Address to transfer asset to.
    /// @param amount Amount of asset to transfer.
    /// @param bridgeData Arbitrary asset data needed by the bridge contract.
    /// @return success The magic bytes `0xdc1600f3` if successful.
    function bridgeTransferFrom(
        address tokenAddress,
        address from,
        address to,
        uint256 amount,
        bytes calldata bridgeData
    )
        external
        override
        returns (bytes4 success)
    {
        IERC20TokenV06 takerToken = tokenAddress == address(xAsset) ? yAsset : xAsset;
        uint256 takerTokenBalance = takerToken.balanceOf(address(this));
        emit ERC20BridgeTransfer(
            address(takerToken),
            tokenAddress,
            takerTokenBalance,
            amount,
            from,
            to
        );
        return 0xdecaf000;
    }

    /// @dev Trades ETH for token. ETH must be sent to the contract prior to
    ///      calling this function to trigger the trade.
    /// @param taker The recipient of the bought tokens.
    /// @param minMakerAssetAmount The minimum amount of maker asset to buy.
    /// @return makerAssetAmount The amount of tokens bought.
    function sellEthForToken(
        address taker,
        uint256 minMakerAssetAmount
    )
        external
        override
        returns (uint256 makerAssetAmount)
    {
        emit SellEthForToken(
            taker,
            minMakerAssetAmount,
            address(this).balance
        );
    }

    /// @dev Trades token for ETH. The token must be sent to the contract prior
    ///      to calling this function to trigger the trade.
    /// @param taker The recipient of the bought ETH.
    /// @param minMakerAssetAmount The minimum amount of ETH to buy.
    /// @return makerAssetAmount The amount of ETH bought.
    function sellTokenForEth(
        address payable taker,
        uint256 minMakerAssetAmount
    )
        external
        override
        returns (uint256 makerAssetAmount)
    {
        emit SellTokenForEth(
            taker,
            minMakerAssetAmount,
            xAsset.balanceOf(address(this))
        );
    }
}
