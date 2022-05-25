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

import "./IBridgeAdapter.sol";

abstract contract AbstractBridgeAdapter is IBridgeAdapter {

    constructor(
        uint256 expectedChainId, 
        string memory expectedChainName
    )
        public
    {
        uint256 chainId;
        assembly { chainId := chainid() }
        // Allow testing on Ganache
        if (chainId != expectedChainId && chainId != 1337) {
            revert(string(abi.encodePacked(expectedChainName, "BridgeAdapter.constructor: wrong chain ID")));
        }
    }

    function isSupportedSource(bytes32 source)
        external
        override
        returns (bool isSupported)
    {
        BridgeOrder memory placeholderOrder;
        placeholderOrder.source = source;
        IERC20TokenV06 placeholderToken = IERC20TokenV06(address(0));
        
        (, isSupported) = _trade(
            placeholderOrder,
            placeholderToken,
            placeholderToken,
            0,
            true
        );
    }

    function trade(
        BridgeOrder memory order,
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount
    )
        public
        override
        returns (uint256 boughtAmount)
    {
        (boughtAmount, ) = _trade(
            order,
            sellToken,
            buyToken,
            sellAmount,
            false
        );
    }

    function _trade(
        BridgeOrder memory order,
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bool dryRun
    )
        internal
        virtual
        returns (uint256 boughtAmount, bool supportedSource);
}
