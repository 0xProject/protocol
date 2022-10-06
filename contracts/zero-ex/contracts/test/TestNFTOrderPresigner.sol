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
import "../src/IZeroEx.sol";
import "../src/vendor/IERC1155Token.sol";
import "../src/vendor/IERC721Token.sol";
import "../src/features/libs/LibNFTOrder.sol";

contract TestNFTOrderPresigner {
    IZeroEx private immutable zeroEx;

    constructor(IZeroEx _zeroEx) public {
        zeroEx = _zeroEx;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4 success) {
        return 0xf23a6e61;
    }

    function approveERC721(IERC721Token token) external {
        token.setApprovalForAll(address(zeroEx), true);
    }

    function approveERC1155(IERC1155Token token) external {
        token.setApprovalForAll(address(zeroEx), true);
    }

    function approveERC20(IERC20TokenV06 token) external {
        token.approve(address(zeroEx), uint256(-1));
    }

    function preSignERC721Order(LibNFTOrder.ERC721Order calldata order) external {
        zeroEx.preSignERC721Order(order);
    }

    function preSignERC1155Order(LibNFTOrder.ERC1155Order calldata order) external {
        zeroEx.preSignERC1155Order(order);
    }

    function cancelERC721Order(uint256 orderNonce) external {
        zeroEx.cancelERC721Order(orderNonce);
    }

    function cancelERC1155Order(uint256 orderNonce) external {
        zeroEx.cancelERC1155Order(orderNonce);
    }
}
