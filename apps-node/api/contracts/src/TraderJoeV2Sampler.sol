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

import "./interfaces/IMultiQuoter.sol";
import "./TraderJoeV2Common.sol";

contract TraderJoeV2Sampler is TraderJoeV2Common {
    uint256 private constant SAMPLING_GAS_LIMIT = 1500e3;

    /// @dev Sample sell quotes from Trader Joe V2
    /// @param quoter Trader Joe V2 MultiQuoter contract
    /// @param factory Trader Joe V2 factory contract
    /// @param path Token route. Should be takerToken --> makerToken (at most two hops)
    /// @param inputAmounts Taker token sell amounts for each sample
    /// @return binSteps The bin steps of the path to use
    /// @return gasEstimates Estimated amount of gas used
    /// @return outputAmounts Maker amounts bought at each taker token amount
    function sampleSellsFromTraderJoeV2(
        IMultiQuoter quoter,
        address factory,
        address[] memory path,
        uint256[] memory inputAmounts
    ) public view returns (uint256[][] memory binSteps, uint256[] memory gasEstimates, uint256[] memory outputAmounts) {
        binSteps = new uint256[][](inputAmounts.length);
        gasEstimates = new uint256[](inputAmounts.length);
        outputAmounts = new uint256[](inputAmounts.length);

        address[][] memory poolPaths = getTraderJoeV2PoolPaths(factory, path);
        for (uint256 i = 0; i < poolPaths.length; ++i) {
            if (!isValidPoolPath(poolPaths[i])) {
                continue;
            }

            bytes memory dexPath = toTraderJoeV2Path(path, poolPaths[i]);

            uint256[] memory amountsOut;
            uint256[] memory gasEstimatesTemp;

            try quoter.quoteExactMultiInput{gas: SAMPLING_GAS_LIMIT}(factory, dexPath, inputAmounts) {} catch (
                bytes memory reason
            ) {
                bool success;
                (success, amountsOut, gasEstimatesTemp) = decodeMultiSwapRevert(reason);

                if (!success) {
                    continue;
                }

                for (uint256 j = 0; j < amountsOut.length; ++j) {
                    if (amountsOut[j] == 0) {
                        break;
                    }

                    if (outputAmounts[j] < amountsOut[j]) {
                        binSteps[j] = getBinStepsFromPoolPath(poolPaths[i]);
                        gasEstimates[j] = gasEstimatesTemp[j];
                        outputAmounts[j] = amountsOut[j];
                    } else if (outputAmounts[j] == amountsOut[j] && gasEstimates[j] > gasEstimatesTemp[j]) {
                        binSteps[j] = getBinStepsFromPoolPath(poolPaths[i]);
                        gasEstimates[j] = gasEstimatesTemp[j];
                    }
                }
            }
        }
    }

    /// @dev Sample buy quotes from Trader Joe V2
    /// @param quoter Trader Joe V2 MultiQuoter contract
    /// @param factory Trader Joe V2 factory contract
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param outputAmounts Maker token buy amount for each sample.
    /// @return binSteps The bin steps of the path to use
    /// @return gasEstimates Estimated amount of gas used
    /// @return inputAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromTraderJoeV2(
        IMultiQuoter quoter,
        address factory,
        address[] memory path,
        uint256[] memory outputAmounts
    ) public view returns (uint256[][] memory binSteps, uint256[] memory gasEstimates, uint256[] memory inputAmounts) {
        binSteps = new uint256[][](inputAmounts.length);
        gasEstimates = new uint256[](inputAmounts.length);
        outputAmounts = new uint256[](inputAmounts.length);

        address[] memory reversedPath = reverseAddressPath(path);
        address[][] memory poolPaths = getTraderJoeV2PoolPaths(factory, reversedPath);

        for (uint256 i = 0; i < poolPaths.length; ++i) {
            if (!isValidPoolPath(poolPaths[i])) {
                continue;
            }

            bytes memory poolPath = toTraderJoeV2Path(reversedPath, poolPaths[i]);

            uint256[] memory amountsIn;
            uint256[] memory gasEstimatesTemp;

            try quoter.quoteExactMultiOutput{gas: SAMPLING_GAS_LIMIT}(factory, poolPath, outputAmounts) {} catch (
                bytes memory reason
            ) {
                bool success;
                (success, amountsIn, gasEstimatesTemp) = decodeMultiSwapRevert(reason);

                if (!success) {
                    continue;
                }

                for (uint256 j = 0; j < amountsIn.length; ++j) {
                    if (amountsIn[j] == 0) {
                        break;
                    }

                    if (inputAmounts[j] == 0 || inputAmounts[j] > amountsIn[j]) {
                        binSteps[j] = getBinStepsFromPoolPath(reverseAddressPath(poolPaths[i]));
                        gasEstimates[j] = gasEstimatesTemp[j];
                        inputAmounts[j] = amountsIn[j];
                    } else if (inputAmounts[j] == amountsIn[j] && inputAmounts[j] > gasEstimatesTemp[j]) {
                        binSteps[j] = getBinStepsFromPoolPath(reverseAddressPath(poolPaths[i]));
                        gasEstimates[j] = gasEstimatesTemp[j];
                    }
                }
            }
        }
    }
}
