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

interface ICurveFactoryPool {
    function coins(uint256) external view returns (address);
}

interface ICurvePoolFactory {
    function pool_count() external view returns (uint256);

    function pool_list(uint256) external view returns (address);

    function pool_implementation() external view returns (address);
}

contract CurvePoolFactoryReader {
    struct CurveFactoryPool {
        address[] coins;
        address pool;
    }

    function getFactoryPools(ICurvePoolFactory factory) external view returns (CurveFactoryPool[] memory pools) {
        uint256 poolCount = factory.pool_count();
        pools = new CurveFactoryPool[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            ICurveFactoryPool pool = ICurveFactoryPool(factory.pool_list(i));
            pools[i].pool = address(pool);
            pools[i].coins = new address[](2);
            pools[i].coins[0] = pool.coins(0);
            pools[i].coins[1] = pool.coins(1);
        }
    }
}
