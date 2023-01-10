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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "./BaseTest.sol";
import "../contracts/src/ZeroEx.sol";
import "./mocks/TestZeroExFeature.sol";

contract ZeroExTest is BaseTest {
    address payable public owner = account1;
    ZeroEx public zeroExProxy;
    IOwnableFeature public ownable;
    ISimpleFunctionRegistryFeature public registry;
    TestZeroExFeature public testFeature;

    function setUp() public {
        zeroExProxy = getZeroExTestProxy(owner);
        ownable = IOwnableFeature(address(zeroExProxy));
        registry = ISimpleFunctionRegistryFeature(address(zeroExProxy));
        testFeature = new TestZeroExFeature();

        // Register the test feature function on the zero ex proxy
        vm.startPrank(owner);
        registry.extend(testFeature.payableFn.selector, address(testFeature));
        registry.extend(testFeature.notPayableFn.selector, address(testFeature));
        registry.extend(testFeature.internalFn.selector, address(testFeature));
        vm.stopPrank();
    }
}
