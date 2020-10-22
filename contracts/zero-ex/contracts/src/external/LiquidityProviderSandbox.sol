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

import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-utils/contracts/src/v06/errors/LibOwnableRichErrorsV06.sol";
import "../vendor/ILiquidityProvider.sol";
import "./ILiquidityProviderSandbox.sol";


/// @dev A permissionless contract through which the ZeroEx contract can
///      safely trigger a trade on an external `ILiquidityProvider` contract.
contract LiquidityProviderSandbox is
    ILiquidityProviderSandbox
{
    using LibRichErrorsV06 for bytes;

    /// @dev Store the owner as an immutable.
    address public immutable owner;

    constructor(address owner_)
        public
    {
        owner = owner_;
    }

    /// @dev Allows only the (immutable) owner to call a function.
    modifier onlyOwner() virtual {
        if (msg.sender != owner) {
            LibOwnableRichErrorsV06.OnlyOwnerError(
                msg.sender,
                owner
            ).rrevert();
        }
        _;
    }

    function executeBridgeTransferFrom(
        address target,
        address makerAssetAddress,
        address taker,
        uint256 minMakerAssetAmount
    )
        external
        onlyOwner
        override
    {
        ILiquidityProvider(target).bridgeTransferFrom(
            makerAssetAddress,
            address(0),
            taker,
            minMakerAssetAmount,
            ""
        );
    }

    function executeSellEthForToken(
        address target,
        address taker,
        uint256 minMakerAssetAmount
    )
        external
        onlyOwner
        override
    {
        ILiquidityProvider(target).sellEthForToken(
            taker,
            minMakerAssetAmount
        );
    }

    function executeSellTokenForEth(
        address target,
        address taker,
        uint256 minMakerAssetAmount
    )
        external
        onlyOwner
        override
    {
        ILiquidityProvider(target).sellTokenForEth(
            payable(taker),
            minMakerAssetAmount
        );
    }
}
