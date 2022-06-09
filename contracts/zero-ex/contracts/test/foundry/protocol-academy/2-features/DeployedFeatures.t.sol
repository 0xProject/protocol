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
import "src/features/interfaces/IFeature.sol";
import "src/features/TransformERC20Feature.sol";
import "../utils/TestUtils.sol";


// TODO: Try running this test on various networks
//       forge test --match-contract DeployedFeatures --fork-url <rpc_url> -vvv
contract DeployedFeatures is TestUtils {
    ZeroEx public ZERO_EX = ZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    IZeroEx public IZERO_EX = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);

    function testLookupFunction()
        public
    {
        uint256 chainId;
        assembly { chainId := chainid() }
        // Skip if not in forking mode
        if (chainId == 31337) {
            emit log_string("Not in forking mode; skipping test");
            return;
        }

        // TODO: try swapping out this selector
        bytes4 selector = TransformERC20Feature.transformERC20.selector;
        address impl = ZERO_EX.getFunctionImplementation(selector);
        if (impl == address(0)) {
            emit log_named_address("v0.0.0", impl);
        } else {
            uint256 version = IFeature(impl).FEATURE_VERSION();
            // NOTE: we used to have a bug where the version was 
            //       being incorrectly encoded as 0 lol
            emit log_named_address(_versionString(version), impl);
        }

        uint256 rollbackLength = IZERO_EX.getRollbackLength(selector);
        if (rollbackLength > 1) {
            for (uint256 i = rollbackLength - 1; i > 0; i--) {
                address prevImpl = IZERO_EX.getRollbackEntryAtIndex(selector, i);
                if (prevImpl == address(0)) {
                    emit log_named_address("v0.0.0", prevImpl);
                } else {
                    uint256 version = IFeature(prevImpl).FEATURE_VERSION();
                    emit log_named_address(_versionString(version), prevImpl);
                }
            }
        }
    }

    function _versionString(uint256 encodedVersion) 
        private 
        pure 
        returns (string memory versionString)
    {
        uint32 major = uint32(encodedVersion >> 64);
        uint32 minor = uint32(encodedVersion >> 32);
        uint32 revision = uint32(encodedVersion);

        return string(abi.encodePacked(
            "v",
            _toString(uint256(major)),
            ".",
            _toString(uint256(minor)),
            ".",
            _toString(uint256(revision))
        ));
    }
}
