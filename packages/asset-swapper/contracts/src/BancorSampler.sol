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

import "./interfaces/IBancor.sol";

contract CompilerHack {
    uint256 private constant HACK = 0;
}

contract BancorSampler is CompilerHack {

    /// @dev Base gas limit for Bancor calls.
    uint256 constant private BANCOR_CALL_GAS = 300e3; // 300k

    struct BancorSamplerOpts {
        IBancorRegistry registry;
        address[][] paths;
    }

    /// @dev Sample sell quotes from Bancor.
    /// @param opts BancorSamplerOpts The Bancor registry contract address and paths
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return bancorNetwork the Bancor Network address
    /// @return path the selected conversion path from bancor
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromBancor(
        BancorSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (address bancorNetwork, address[] memory path, uint256[] memory makerTokenAmounts)
    {
        if (opts.paths.length == 0) {
            return (bancorNetwork, path, makerTokenAmounts);
        }
        (bancorNetwork, path) = _findBestPath(opts, takerToken, makerToken, takerTokenAmounts);
        makerTokenAmounts = new uint256[](takerTokenAmounts.length);

        for (uint256 i = 0; i < makerTokenAmounts.length; i++) {
            try
                IBancorNetwork(bancorNetwork)
                    .rateByPath
                        {gas: BANCOR_CALL_GAS}
                        (path, takerTokenAmounts[i])
                returns (uint256 amount)
            {
                makerTokenAmounts[i] = amount;
                // Break early if there are 0 amounts
                if (makerTokenAmounts[i] == 0) {
                    break;
                }
            } catch {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
        return (bancorNetwork, path, makerTokenAmounts);
    }

    /// @dev Sample buy quotes from Bancor. Unimplemented
    /// @param opts BancorSamplerOpts The Bancor registry contract address and paths
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return bancorNetwork the Bancor Network address
    /// @return path the selected conversion path from bancor
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromBancor(
        BancorSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (address bancorNetwork, address[] memory path, uint256[] memory takerTokenAmounts)
    {
    }

    function _findBestPath(
        BancorSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        internal
        view
        returns (address bancorNetwork, address[] memory path)
    {
        bancorNetwork = opts.registry.getAddress(opts.registry.BANCOR_NETWORK());
        if (opts.paths.length == 0) {
            return (bancorNetwork, path);
        }
        uint256 maxBoughtAmount = 0;
        // Find the best path by selling the largest taker amount
        for (uint256 i = 0; i < opts.paths.length; i++) {
            if (opts.paths[i].length < 2) {
                continue;
            }

            try
                IBancorNetwork(bancorNetwork)
                    .rateByPath
                        {gas: BANCOR_CALL_GAS}
                        (opts.paths[i], takerTokenAmounts[takerTokenAmounts.length-1])
                returns (uint256 amount)
            {
                if (amount > maxBoughtAmount) {
                    maxBoughtAmount = amount;
                    path = opts.paths[i];
                }
            } catch {
                // Swallow failures, leaving all results as zero.
                continue;
            }
        }
    }
}
