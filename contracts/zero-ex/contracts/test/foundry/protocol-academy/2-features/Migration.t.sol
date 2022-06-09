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

import "src/fixins/FixinCommon.sol";
import "src/migrations/LibMigrate.sol";
import "../utils/DeployZeroEx.sol";

contract ZooFeature is FixinCommon {
    event Meow();
    event Woof();
    event SlothNoises();

    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.cat.selector);
        _registerFeatureFunction(this.dog.selector);
        _registerFeatureFunction(this.sloth.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    function cat() external {
        emit Meow();
    }
    function dog() external {
        emit Woof();
    }
    function sloth() external {
        emit SlothNoises();
    }
}

contract ZooFeatureV2 is FixinCommon {
    event Meow();
    event Purr();
    event Woof();
    event CapybaraNoises();

    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.cat.selector);
        _registerFeatureFunction(this.dog.selector);
        _registerFeatureFunction(this.capybara.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    // NOTE: the function signature for `cat` has changed, so the selectors are different!
    function cat(bool happy) external {
        if (happy) {
            emit Purr();
        } else {
            emit Meow();
        }
    }
    // dog is the same
    function dog() external {
        emit Woof();
    }
    // new!
    function capybara() external {
        emit CapybaraNoises();
    }
    // sloth is not in V2
}

contract Migration is DeployZeroEx {

    function setUp() public {
        deployZeroEx();
    }

    function testMigration()
        public
    {
        ZooFeature zooFeature = new ZooFeature();
        IZERO_EX.migrate(address(zooFeature), abi.encodePacked(zooFeature.migrate.selector), address(this));

        // The functions in ZooFeature are now registered in the exchange proxy!
        // Try them out.
        ZooFeature(address(ZERO_EX)).dog();
        ZooFeature(address(ZERO_EX)).cat();
        ZooFeature(address(ZERO_EX)).sloth();
    }

    function testUpgrade()
        public
    {
        // Original version
        ZooFeature zooFeature = new ZooFeature();
        IZERO_EX.migrate(address(zooFeature), abi.encodePacked(zooFeature.migrate.selector), address(this));
        // Upgrade
        ZooFeatureV2 zooFeatureV2 = new ZooFeatureV2();
        IZERO_EX.migrate(address(zooFeatureV2), abi.encodePacked(zooFeatureV2.migrate.selector), address(this));

        // The functions in ZooFeatureV2 are now registered in the exchange proxy!
        // Try them out.
        ZooFeatureV2(address(ZERO_EX)).dog();
        ZooFeatureV2(address(ZERO_EX)).cat(true);
        ZooFeatureV2(address(ZERO_EX)).cat(false);
        ZooFeatureV2(address(ZERO_EX)).capybara();

        // `sloth` is still registered
        ZooFeature(address(ZERO_EX)).sloth();
        // The old `cat` function is still registered, since it has a different selector
        emit log_named_bytes('cat()', abi.encodePacked(zooFeature.cat.selector));
        emit log_named_bytes('cat(bool)', abi.encodePacked(zooFeatureV2.cat.selector));
        ZooFeature(address(ZERO_EX)).cat();

        // Let's deregister the sloth and old cat functions
        IZERO_EX.rollback(zooFeature.cat.selector, address(0));
        IZERO_EX.rollback(zooFeature.sloth.selector, address(0));

        // Now trying to call the old cat or sloth reverts
        try ZooFeature(address(ZERO_EX)).cat() {} 
        catch (bytes memory e) {
            emit log_string("cat() reverted");
        }
        try ZooFeature(address(ZERO_EX)).sloth() {}
        catch (bytes memory e) {
            emit log_string("sloth() reverted");
        }

        // dog() was upgraded, so it's v1 address is in the `implHistory`
        emit log_named_uint(
            "dog() rollback length", 
            IZERO_EX.getRollbackLength(zooFeature.dog.selector)
        );
        emit log_named_address(
            "dog() v1 is in the history", 
            IZERO_EX.getRollbackEntryAtIndex(zooFeature.dog.selector, 1)
        );
    }
}
