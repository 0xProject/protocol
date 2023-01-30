// SPDX-License-Identifier: Apache-2.0
/*
  Copyright 2023 ZeroEx Intl.
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

import "utils/BaseTest.sol";
import "../contracts/src/ZeroEx.sol";
import "./mocks/TestZeroExFeature.sol";

contract ZeroExTest is BaseTest {
    address payable public owner = account1;
    ZeroEx public zeroEx;
    IOwnableFeature public ownable;
    ISimpleFunctionRegistryFeature public registry;
    TestZeroExFeature public testFeature;

    event PayableFnCalled(uint256 value);

    function setUp() public {
        zeroEx = getZeroExTestProxy(owner);
        ownable = IOwnableFeature(address(zeroEx));
        registry = ISimpleFunctionRegistryFeature(address(zeroEx));
        TestZeroExFeature testFeatureImplementation = new TestZeroExFeature();
        testFeature = TestZeroExFeature(address(zeroEx));

        // Register the test feature function on the zero ex proxy
        vm.startPrank(owner);
        registry.extend(testFeature.payableFn.selector, address(testFeatureImplementation));
        registry.extend(testFeature.notPayableFn.selector, address(testFeatureImplementation));
        registry.extend(testFeature.internalFn.selector, address(testFeatureImplementation));
        vm.stopPrank();
    }

    function test_canReceiveETH() public {
        address(zeroEx).call{value: 1}("");
        assertEq(address(zeroEx).balance, 1);
    }

    function test_canAttachETHtoACall() public {
        vm.expectEmit(false, false, false, true);
        emit PayableFnCalled(123);
        testFeature.payableFn{value: 123}();
    }

    function test_revertsWhenAttachingETHToANonPayableFunction() public {
        vm.expectRevert();
        address(testFeature).call{value: 123}("notPayableFn()");
    }

    function test_revertWhenCallingAnUnimplementedFunction() public {
        bytes memory error = LibProxyRichErrors.NotImplementedError(testFeature.unimplementedFn.selector);
        vm.expectRevert(error);
        testFeature.unimplementedFn();
    }

    function test_revertsWhenCallingInternalFunction() public {
        bytes memory error = LibCommonRichErrors.OnlyCallableBySelfError(owner);
        vm.expectRevert(error);
        vm.startPrank(owner);
        testFeature.internalFn();
    }

    function test_getFunctionImplementation_returnsTheCorrectFeaturesImplementations() public {
        bytes4 transferOwnershipSelector = ownable.transferOwnership.selector;
        address transferOwnershipImplementation = zeroEx.getFunctionImplementation(transferOwnershipSelector);
        assertEq(IFeature(transferOwnershipImplementation).FEATURE_NAME(), "Ownable");

        bytes4 rollbackSelector = registry.rollback.selector;
        address rollbackImplementation = zeroEx.getFunctionImplementation(rollbackSelector);
        assertEq(IFeature(rollbackImplementation).FEATURE_NAME(), "SimpleFunctionRegistry");

        bytes4 extendSelector = registry.extend.selector;
        address extendImplementation = zeroEx.getFunctionImplementation(extendSelector);
        assertEq(IFeature(extendImplementation).FEATURE_NAME(), "SimpleFunctionRegistry");
    }
}
