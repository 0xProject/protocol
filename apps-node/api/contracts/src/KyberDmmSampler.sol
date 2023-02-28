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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

interface IKyberDmmPool {
    function totalSupply() external view returns (uint256);
}

interface IKyberDmmFactory {
    function getPools(address token0, address token1) external view returns (address[] memory _tokenPools);
}

interface IKyberDmmRouter {
    function factory() external view returns (address);

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata pools,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata pools,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

contract KyberDmmSampler {
    /// @dev Gas limit for KyberDmm calls.
    uint256 private constant KYBER_DMM_CALL_GAS = 150e3; // 150k

    /// @dev Sample sell quotes from KyberDmm.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return pools The pool addresses involved in the multi path trade
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromKyberDmm(
        address router,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    ) public view returns (address[] memory pools, uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        pools = _getKyberDmmPools(router, path);
        if (pools.length == 0) {
            return (pools, makerTokenAmounts);
        }
        for (uint256 i = 0; i < numSamples; i++) {
            try
                IKyberDmmRouter(router).getAmountsOut{gas: KYBER_DMM_CALL_GAS}(takerTokenAmounts[i], pools, path)
            returns (uint256[] memory amounts) {
                makerTokenAmounts[i] = amounts[path.length - 1];
                // Break early if there are 0 amounts
                if (makerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    /// @dev Sample buy quotes from KyberDmm.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return pools The pool addresses involved in the multi path trade
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromKyberDmm(
        address router,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    ) public view returns (address[] memory pools, uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        pools = _getKyberDmmPools(router, path);
        if (pools.length == 0) {
            return (pools, takerTokenAmounts);
        }
        for (uint256 i = 0; i < numSamples; i++) {
            try
                IKyberDmmRouter(router).getAmountsIn{gas: KYBER_DMM_CALL_GAS}(makerTokenAmounts[i], pools, path)
            returns (uint256[] memory amounts) {
                takerTokenAmounts[i] = amounts[0];
                // Break early if there are 0 amounts
                if (takerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    function _getKyberDmmPools(address router, address[] memory path) private view returns (address[] memory pools) {
        IKyberDmmFactory factory = IKyberDmmFactory(IKyberDmmRouter(router).factory());
        pools = new address[](path.length - 1);
        for (uint256 i = 0; i < pools.length; i++) {
            // find the best pool
            address[] memory allPools;
            try factory.getPools{gas: KYBER_DMM_CALL_GAS}(path[i], path[i + 1]) returns (address[] memory allPools) {
                if (allPools.length == 0) {
                    return new address[](0);
                }

                uint256 maxSupply = 0;
                for (uint256 j = 0; j < allPools.length; j++) {
                    uint256 totalSupply = IKyberDmmPool(allPools[j]).totalSupply();
                    if (totalSupply > maxSupply) {
                        maxSupply = totalSupply;
                        pools[i] = allPools[j];
                    }
                }
            } catch (bytes memory) {
                return new address[](0);
            }
        }
    }
}
