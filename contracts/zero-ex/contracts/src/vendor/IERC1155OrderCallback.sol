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


interface IERC1155OrderCallback {

    /// @dev A taker callback function invoked in the ERC1155Feature between
    ///      the maker -> taker transfer and the taker -> maker transfer.
    /// @param callbackData Arbitrary data used by this callback.
    /// @return success The selector of this function (0x0ea5ba79),
    ///         indicating that the callback succeeded.
    function zeroExERC1155OrderCallback(bytes calldata callbackData)
        external
        returns (bytes4 success);
}
