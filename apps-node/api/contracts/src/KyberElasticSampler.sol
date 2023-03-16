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

pragma solidity >=0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IMultiQuoter.sol";
import "./interfaces/IKyberElastic.sol";
import "./KyberElasticCommon.sol";

contract KyberElasticSampler is KyberElasticCommon {
    /// @dev Sample sell quotes from KyberElastic.
    /// @param factory KyberElastic factory contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param inputAmounts Taker token sell amount for each sample.
    /// @return paths The encoded KyberElastic path for each sample.
    /// @return gasEstimates Estimated amount of gas used
    /// @return outputAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromKyberElastic(
        IMultiQuoter quoter,
        address factory,
        address[] memory path,
        uint256[] memory inputAmounts
    ) public view returns (bytes[] memory paths, uint256[] memory gasEstimates, uint256[] memory outputAmounts) {
        outputAmounts = new uint256[](inputAmounts.length);
        paths = new bytes[](inputAmounts.length);
        gasEstimates = new uint256[](inputAmounts.length);

        IKyberElasticPool[][] memory poolPaths = _getPoolPaths(
            quoter,
            factory,
            path,
            inputAmounts[inputAmounts.length - 1]
        );
        for (uint256 i = 0; i < poolPaths.length; ++i) {
            if (!_isValidPoolPath(poolPaths[i])) {
                continue;
            }

            bytes memory dexPath = _toPath(path, poolPaths[i]);

            uint256[] memory amountsOut;
            uint256[] memory gasEstimatesTemp;

            try quoter.quoteExactMultiInput(factory, dexPath, inputAmounts) {} catch (bytes memory reason) {
                bool success;
                (success, amountsOut, gasEstimatesTemp) = catchKyberElasticMultiSwapResult(reason);

                if (!success) {
                    continue;
                }

                for (uint256 j = 0; j < amountsOut.length; ++j) {
                    if (amountsOut[j] == 0) {
                        break;
                    }

                    if (outputAmounts[j] < amountsOut[j]) {
                        outputAmounts[j] = amountsOut[j];
                        paths[j] = dexPath;
                        gasEstimates[j] = gasEstimatesTemp[j];
                    } else if (outputAmounts[j] == amountsOut[j] && gasEstimates[j] > gasEstimatesTemp[j]) {
                        paths[j] = dexPath;
                        gasEstimates[j] = gasEstimatesTemp[j];
                    }
                }
            }
        }
    }

    /// @dev Sample buy quotes from KyberElastic.
    /// @param factory KyberElastic factory contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param inputAmounts Maker token buy amount for each sample.
    /// @return paths The encoded KyberElastic path for each sample.
    /// @return gasEstimates Estimated amount of gas used
    /// @return outputAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromKyberElastic(
        IMultiQuoter quoter,
        address factory,
        address[] memory path,
        uint256[] memory inputAmounts
    ) public view returns (bytes[] memory paths, uint256[] memory gasEstimates, uint256[] memory outputAmounts) {
        outputAmounts = new uint256[](inputAmounts.length);
        paths = new bytes[](inputAmounts.length);
        gasEstimates = new uint256[](inputAmounts.length);

        address[] memory reversedPath = _reverseTokenPath(path);
        IKyberElasticPool[][] memory poolPaths = _getPoolPaths(
            quoter,
            factory,
            reversedPath,
            inputAmounts[inputAmounts.length - 1]
        );

        for (uint256 i = 0; i < poolPaths.length; ++i) {
            if (!_isValidPoolPath(poolPaths[i])) {
                continue;
            }

            bytes memory poolPath = _toPath(reversedPath, poolPaths[i]);

            uint256[] memory amountsIn;
            uint256[] memory gasEstimatesTemp;

            try quoter.quoteExactMultiOutput(factory, poolPath, inputAmounts) {} catch (bytes memory reason) {
                bool success;
                (success, amountsIn, gasEstimatesTemp) = catchKyberElasticMultiSwapResult(reason);

                if (!success) {
                    continue;
                }

                for (uint256 j = 0; j < amountsIn.length; ++j) {
                    if (amountsIn[j] == 0) {
                        break;
                    }

                    if (outputAmounts[j] == 0 || outputAmounts[j] > amountsIn[j]) {
                        outputAmounts[j] = amountsIn[j];
                        paths[j] = _toPath(path, _reversePoolPath(poolPaths[i]));
                        gasEstimates[j] = gasEstimatesTemp[j];
                    } else if (outputAmounts[j] == amountsIn[j] && outputAmounts[j] > gasEstimatesTemp[j]) {
                        paths[j] = _toPath(path, _reversePoolPath(poolPaths[i]));
                        gasEstimates[j] = gasEstimatesTemp[j];
                    }
                }
            }
        }
    }
}
