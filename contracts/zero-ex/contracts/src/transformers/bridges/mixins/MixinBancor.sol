// SPDX-License-Identifier: Apache-2.0

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

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "../IBridgeAdapter.sol";


interface IBancorNetwork {
    function convertByPath(
        IERC20TokenV06[] calldata _path,
        uint256 _amount,
        uint256 _minReturn,
        address _beneficiary,
        address _affiliateAccount,
        uint256 _affiliateFee
    )
        external
        payable
        returns (uint256);
    function conversionPath(address _sourceToken, address _targetToken) external view returns (address[] memory);
    function rateByPath(address[] memory _path, uint256 _amount) external view returns (uint256);
}

interface IBancorRegistry {
    function getAddress(bytes32 _contractName) external view returns (address);
    function BANCOR_NETWORK() external view returns (bytes32);
}


contract MixinBancor {

    /// @dev Bancor ETH pseudo-address.
    IERC20TokenV06 constant public BANCOR_ETH_ADDRESS =
        IERC20TokenV06(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IEtherTokenV06 private immutable WETH;

    constructor(IEtherTokenV06 weth)
        public
    {
        WETH = weth;
    }

    function _tradeBancor(
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        return _tradeBancorInternal(WETH, buyToken, sellAmount, bridgeData);
    }

    function _tradeBancorInternal(
        IEtherTokenV06 weth,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        // Decode the bridge data.
        IBancorNetwork bancorNetworkAddress;
        IERC20TokenV06[] memory path;
        {
            address[] memory _path;
            (
                bancorNetworkAddress,
                _path
            ) = abi.decode(bridgeData, (IBancorNetwork, address[]));
            // To get around `abi.decode()` not supporting interface array types.
            assembly { path := _path }
        }

        require(path.length >= 2, "MixinBancor/PATH_LENGTH_MUST_BE_AT_LEAST_TWO");
        require(
            path[path.length - 1] == buyToken ||
            (path[path.length - 1] == BANCOR_ETH_ADDRESS && buyToken == weth),
            "MixinBancor/LAST_ELEMENT_OF_PATH_MUST_MATCH_OUTPUT_TOKEN"
        );

        uint256 payableAmount = 0;
        // If it's ETH in the path then withdraw from WETH
        // The Bancor path will have ETH as the 0xeee address
        // Bancor expects to be paid in ETH not WETH
        if (path[0] == BANCOR_ETH_ADDRESS) {
            weth.withdraw(sellAmount);
            payableAmount = sellAmount;
        } else {
            // Grant an allowance to the Bancor Network.
            LibERC20TokenV06.approveIfBelow(
                path[0],
                address(bancorNetworkAddress),
                sellAmount
            );
        }

        // Convert the tokens
        boughtAmount = bancorNetworkAddress.convertByPath{value: payableAmount}(
            path, // path originating with source token and terminating in destination token
            sellAmount, // amount of source token to trade
            1, // minimum amount of destination token expected to receive
            address(this), // beneficiary
            address(0), // affiliateAccount; no fee paid
            0 // affiliateFee; no fee paid
        );
        if (path[path.length - 1] == BANCOR_ETH_ADDRESS) {
            weth.deposit{value: boughtAmount}();
        }

        return boughtAmount;
    }
}
