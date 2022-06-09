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

import "src/features/OtcOrdersFeature.sol";
import "src/features/TransformERC20Feature.sol";
import "src/features/UniswapFeature.sol";
import "src/features/UniswapV3Feature.sol";
import "src/fixins/FixinCommon.sol";
import "src/migrations/LibMigrate.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "../utils/DeployZeroEx.sol";

contract FibonacciFeature is FixinCommon {
    uint256 private prevFib;
    uint256 private fib;

    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.stepFibonacci.selector);
        _registerFeatureFunction(this.currentFibonacci.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    function stepFibonacci() external {
        if (prevFib == 0 && fib == 0) {
            fib = 1;
            return;
        } else {
            uint256 nextFib = prevFib + fib;
            prevFib = fib;
            fib = nextFib;
        }
    }

    function currentFibonacci() external view returns (uint256) {
        return fib;
    }
}

contract VoteFeature is FixinCommon {
    uint256 private good;
    uint256 private bad;
    mapping (address => bool) hasVoted;

    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.pineappleOnPizzaIsGood.selector);
        _registerFeatureFunction(this.pineappleOnPizzaIsBad.selector);
        _registerFeatureFunction(this.currentVotes.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    function pineappleOnPizzaIsGood() external {
        require(!hasVoted[msg.sender]);
        hasVoted[msg.sender] = true;
        good++;
    }

    function pineappleOnPizzaIsBad() external {
        require(!hasVoted[msg.sender]);
        hasVoted[msg.sender] = true;
        bad++;
    }

    function currentVotes() external view returns (uint256, uint256) {
        return (good, bad);
    }
}

contract FeatureStorage is DeployZeroEx {

    function setUp() public {
        deployZeroEx();
        FibonacciFeature fibonacciFeature = new FibonacciFeature();
        emit log_named_address("FibonacciFeature deployed at", address(fibonacciFeature));
        IZERO_EX.migrate(address(fibonacciFeature), abi.encodePacked(fibonacciFeature.migrate.selector), address(this));
        emit log_named_address("stepFibonacci implementation", ZERO_EX.getFunctionImplementation(FibonacciFeature.stepFibonacci.selector));        
        
        VoteFeature voteFeature = new VoteFeature();
        emit log_named_address("VoteFeature deployed at", address(voteFeature));
        IZERO_EX.migrate(address(voteFeature), abi.encodePacked(voteFeature.migrate.selector), address(this));
    }

    function testFeatureStorage()
        public
    {   
        for (uint256 i = 0; i < 10; i++) {
            emit log_named_uint("fib", FibonacciFeature(address(ZERO_EX)).currentFibonacci());
            FibonacciFeature(address(ZERO_EX)).stepFibonacci();
        }

        for (uint256 i = 0; i < 10; i++) {
            address voter = _pseudoRandomAddress(i);
            bool likesPineappleOnPizza = (uint160(voter) % 2) == 1;
            hoax(voter);
            likesPineappleOnPizza 
                ? VoteFeature(address(ZERO_EX)).pineappleOnPizzaIsGood() 
                : VoteFeature(address(ZERO_EX)).pineappleOnPizzaIsBad();
        }
        (uint256 good, uint256 bad) = VoteFeature(address(ZERO_EX)).currentVotes();
        
        emit log_named_uint("good votes", good);
        emit log_named_uint("bad votes", bad);
        emit log_named_uint("fib", FibonacciFeature(address(ZERO_EX)).currentFibonacci());

        // TODO: Fix the Fibonacci and Vote features so that their respective storage 
        //       variables do not collide. Create LibFibonacciStorage and LibVoteStorage
        //       to do so. 
    }

    function _pseudoRandomAddress(uint256 seed) private pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(seed)))));
    }
}
