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


contract GetTypeHash {

    /// @dev Taker signed RFQ order typehash
    /// @return typehash
    function getTakerSignedRfqOrderTypehash()
        external
        pure
        returns (bytes32 typehash)
    {
        return keccak256(abi.encodePacked(
            "TakerSignedRfqOrder(",
              "address makerToken,",
              "address takerToken,",
              "uint128 makerAmount,",
              "uint128 takerAmount,",
              "address maker,",
              "address taker,",
              "address txOrigin,",
              "uint64 expiry,",
              "uint256 salt"
            ")"
        ));
    }

    /// @dev RFQ order typehash
    /// @return typehash
    function getRfqOrderTypehash()
        external
        pure
        returns (bytes32 typehash)
    {
        return keccak256(abi.encodePacked(
            "RfqOrder(",
              "address makerToken,",
              "address takerToken,",
              "uint128 makerAmount,",
              "uint128 takerAmount,",
              "address maker,",
              "address taker,",
              "address txOrigin,",
              "bytes32 pool,",
              "uint64 expiry,",
              "uint256 salt"
            ")"
        ));
    }
}
