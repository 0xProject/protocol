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

    function get_coins() external view returns (address[2] memory);
}

interface ICurveMetaPoolFactory {
    function pool_count() external view returns (uint256);

    function pool_list(uint256) external view returns (address);

    function get_coins() external view returns (address[4] memory);
    function get_underlying_coins(address) external view returns (address[8] memory);
    function is_meta(address) external view returns (bool);
}

interface ICurvePoolRegistry {
    function pool_count() external view returns (uint256);

    function pool_list(uint256) external view returns (address);

    function get_coins(address) external view returns (address[8] memory);
    function get_underlying_coins(address) external view returns (address[8] memory);
    function is_meta(address) external view returns (bool);
    function get_pool_name(address) external view returns (string memory);
}

contract CurvePoolFactoryReader {

    struct CurveFactoryPoolInfo {
        address[] coins;
        string[] symbols;
        address pool;
        bool hasBalance;
        bytes32 codeHash;
    }

    struct CurveRegistryPoolInfo {
        address[] coins;
        address[] underlyingCoins;
        string[] symbols;
        string[] underlyingSymbols;
        address pool;
        bool hasBalance;
        bytes32 codeHash;
        bool isMeta;
    }

    function getFactoryPools(ICurvePoolFactory factory)
        external
        view
        returns (CurveFactoryPoolInfo[] memory poolInfos)
    {
        uint256 poolCount = factory.pool_count();
        poolInfos = new CurveFactoryPoolInfo[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            ICurveFactoryPool pool = ICurveFactoryPool(factory.pool_list(i));
            try
                CurvePoolFactoryReader(address(this)).getFactoryPoolInfo
                    (pool)
                    returns (CurveFactoryPoolInfo memory poolInfo)
            {
                poolInfos[i] = poolInfo;
            } catch { }
            // Set regardless, failed pools will have an address but no data
            poolInfos[i].pool = address(pool);
        }
    }

    function getRegistryPools(ICurvePoolRegistry registry)
        external
        view
        returns (CurveRegistryPoolInfo[] memory poolInfos)
    {
        uint256 poolCount = registry.pool_count();
        poolInfos = new CurveRegistryPoolInfo[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            ICurveFactoryPool pool = ICurveFactoryPool(registry.pool_list(i));
            try
                CurvePoolFactoryReader(address(this)).getRegistryPoolInfo
                    (registry, pool)
                    returns (CurveRegistryPoolInfo memory poolInfo)
            {
                poolInfos[i] = poolInfo;
            } catch { }
            // Set regardless, failed pools will have an address but no data
            poolInfos[i].pool = address(pool);
        }
    }

    function getRegistryPoolInfo(ICurvePoolRegistry registry, ICurveFactoryPool pool)
        external
        view
        returns (CurveRegistryPoolInfo memory poolInfo)
    {
        // CurveFactoryPoolInfo memory factoryPoolInfo = this.getFactoryPoolInfo(pool);
        poolInfo.pool = address(pool);
        poolInfo.codeHash = _codeHash(address(pool));
        // poolInfo.hasBalance = factoryPoolInfo.hasBalance;

        poolInfo.isMeta = registry.is_meta(address(pool));
        // Pulled iteratively in getCryptoFactoryPoolInfo
        // poolInfo.coins = factoryPoolInfo.coins;
        // Convert from address[8]
        poolInfo.coins = _trimCoins(registry.get_coins(address(pool)));
        poolInfo.symbols = _coinSymbols(poolInfo.coins);
        poolInfo.underlyingCoins = _trimCoins(registry.get_underlying_coins(address(pool)));
        poolInfo.underlyingSymbols = _coinSymbols(poolInfo.underlyingCoins);
    }

    function getFactoryPoolInfo(ICurveFactoryPool pool)
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
        poolInfo.symbols = _coinSymbols(poolInfo.coins);
        // Also fetch the accumulated balances, so we can reject anything that's
        // basically uninitialized (balance 0)
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < poolInfo.coins.length; i++) {
            // 0x0000 or 0xeeeee
            if (_codeHash(poolInfo.coins[i]) == bytes32(0)) {
                continue;
            }
            IERC20Reader coin = IERC20Reader(poolInfo.coins[i]);
            try
                coin.balanceOf(address(pool))
                    returns (uint256 balance)
            {
                totalBalance += balance;
            } catch { }
        }

        // If theres some tokens in there
        poolInfo.hasBalance = totalBalance > 0;

        poolInfo.codeHash = _codeHash(address(pool));
    }

    function _coinSymbols(address[] memory coins)
        internal
        view
        returns (string[] memory symbols)
    {
        symbols = new string[](coins.length);
        for (uint256 i = 0; i < coins.length; i++) {
            (bool didSucceed, bytes memory result) = coins[i].staticcall(
                abi.encodeWithSelector(
                    IERC20Reader(coins[i]).symbol.selector
                )
            );
            if (didSucceed && result.length > 0) {
                symbols[i] = abi.decode(result, (string));
            }
        }
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

    function _trimCoins(address[8] memory coins)
        internal
        view
        returns (address[] memory)
    {
        address[] memory trimmed;
        for (uint256 i = 0; i < coins.length; i++) {
            // Sometimes first item is address(0), ETH?
            if (coins[i] != address(0)) {
                trimmed = _append(trimmed, coins[i]);
            } 
        }
        return trimmed;
    }

    function _codeHash(address addr)
        internal
        view
        returns (bytes32)
    {
        bytes32 codeHash;    
        assembly { codeHash := extcodehash(addr) }
        return codeHash;
    }

}
