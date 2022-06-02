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

import "forge-std/Test.sol";

import "src/IZeroEx.sol";
import "src/ZeroEx.sol";
import "src/migrations/InitialMigration.sol";
import "src/features/OtcOrdersFeature.sol";
import "src/features/OwnableFeature.sol";
import "src/features/SimpleFunctionRegistryFeature.sol";
import "src/features/TransformERC20Feature.sol";
import "src/features/UniswapFeature.sol";
import "src/features/UniswapV3Feature.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";

contract StorageContract {
    uint256 public storedValue = 0;

    function increase()
        public
        returns (uint256)
    {
        storedValue++;
        return storedValue;
    }
}

contract OpcodeCosts is Test {

    uint256 public storedValue = 0;
    StorageContract store;

    function setUp()
      public
    {
        store = new StorageContract();
    }


    function testLoadFromStorage()
        public
        returns (uint256 val)
    {
        // [2306] StorageContract::storedValue() [staticcall]
        val = store.storedValue();
    }

    function testLoadAndStore()
        public
        returns (uint256 val)
    {
        // [22346] StorageContract::increase()
        val = store.increase();
    }
}
