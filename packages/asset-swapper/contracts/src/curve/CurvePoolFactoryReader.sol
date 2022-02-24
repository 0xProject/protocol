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

interface IERC20Reader {
    function symbol() external view returns (string memory);
    function balanceOf(address owner)
        external
        view
        returns (uint256);
}

interface ICurveFactoryPool {
    function coins(uint256) external view returns (address);
}

interface ICurvePoolFactory {
    function pool_count() external view returns (uint256);

    function pool_list(uint256) external view returns (address);

    function pool_implementation() external view returns (address);
}

contract CurvePoolFactoryReader {

    struct CurveFactoryPoolInfo {
        address[] coins;
        string[] symbols;
        address pool;
        bool hasBalance;
        bytes32 codeHash;
    }

    function getCryptoFactoryPools(ICurvePoolFactory factory)
        external
        view
        returns (CurveFactoryPoolInfo[] memory poolInfos)
    {
        uint256 poolCount = factory.pool_count();
        poolInfos = new CurveFactoryPoolInfo[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            ICurveFactoryPool pool = ICurveFactoryPool(factory.pool_list(i));
            try
                CurvePoolFactoryReader(address(this)).getCryptoFactoryPoolInfo
                    (pool)
                    returns (CurveFactoryPoolInfo memory poolInfo)
            {
                poolInfos[i] = poolInfo;
            } catch { }
            // Set regardless, failed pools will have an address but no data
            poolInfos[i].pool = address(pool);
            bytes32 codeHash;    
            assembly { codeHash := extcodehash(pool) }
            poolInfos[i].codeHash = codeHash;
        }
    }

    function getCryptoFactoryPoolInfo(ICurveFactoryPool pool)
        external
        view
        returns (CurveFactoryPoolInfo memory poolInfo)
    {
        poolInfo.pool = address(pool);

        // Fetch all of the coins in the pool, no consistent way
        // to determine how many there are, so we'll just try
        uint256 count = 0;
        address lastAddress = pool.coins(count);
        do {
            poolInfo.coins = _append(poolInfo.coins, lastAddress);
            count++;
            try
                pool.coins(count)
                    returns (address nextAddress)
            {
                lastAddress = nextAddress;
            } catch {
                break;
            }
        } while (lastAddress != address(0));

        // Fetch all of the symbols in the pool, some may fail
        poolInfo.symbols = new string[](poolInfo.coins.length);
        // Also fetch the accumulated balances, so we can reject anything that's
        // basically uninitialized (balance 0)
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < poolInfo.coins.length; i++) {
            IERC20Reader coin = IERC20Reader(poolInfo.coins[i]);
            try
                coin.symbol()
                    returns (string memory symbol)
            {
                poolInfo.symbols[i] = symbol;
            } catch { }

            try
                coin.balanceOf(address(pool))
                    returns (uint256 balance)
            {
                totalBalance += balance;
            } catch { }
        }

        // If theres some tokens in there
        poolInfo.hasBalance = totalBalance > 0;
    }

    function _append(address[] memory addressArray, address addr)
        internal
        view
        returns (address[] memory newArray)
    {
        newArray = new address[](addressArray.length + 1);
        for (uint256 i = 0; i < addressArray.length; i++) {
            newArray[i] = addressArray[i];
        }
        newArray[newArray.length-1] = addr;
    }
}
