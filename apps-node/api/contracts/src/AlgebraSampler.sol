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

import "./AlgebraCommon.sol";
import "./interfaces/IMultiQuoter.sol";

contract AlgebraSampler is AlgebraCommon {
    /// @dev Sample sell quotes from Algebra.
    /// @param quoter Algebra MultiQuoter contract.
    /// @param factory Algebra Factory contract.
    /// @param tokenPath Token route. Should be takerToken --> makerToken.
    /// @param inputAmounts Taker token sell amount for each sample.
    /// @return path The encoded path for each sample.
    /// @return gasEstimates Estimated amount of gas used
    /// @return outputAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromAlgebra(
        IMultiQuoter quoter,
        address factory,
        address[] memory tokenPath,
        uint256[] memory inputAmounts
    ) public view returns (bytes memory path, uint256[] memory gasEstimates, uint256[] memory outputAmounts) {
        outputAmounts = new uint256[](inputAmounts.length);
        gasEstimates = new uint256[](inputAmounts.length);

        if (!isValidTokenPath(factory, tokenPath)) {
            return (path, gasEstimates, outputAmounts);
        }
        path = toAlgebraPath(tokenPath);

        try quoter.quoteExactMultiInput(factory, path, inputAmounts) {} catch (bytes memory reason) {
            (, outputAmounts, gasEstimates) = decodeMultiSwapRevert(reason);
        }
    }

    /// @dev Sample buy quotes from Algebra.
    /// @param quoter Algebra MultiQuoter contract.
    /// @param factory UniswapV3 Factory contract.
    /// @param tokenPath Token route. Should be takerToken -> makerToken.
    /// @param outputAmounts Maker token buy amount for each sample.
    /// @return path The encoded path for each sample.
    /// @return gasEstimates Estimated amount of gas used
    /// @return inputAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromAlgebra(
        IMultiQuoter quoter,
        address factory,
        address[] memory tokenPath,
        uint256[] memory outputAmounts
    ) public view returns (bytes memory path, uint256[] memory gasEstimates, uint256[] memory inputAmounts) {
        inputAmounts = new uint256[](outputAmounts.length);
        gasEstimates = new uint256[](outputAmounts.length);

        address[] memory reverseTokenPath = reverseAddressPath(tokenPath);
        if (!isValidTokenPath(factory, reverseTokenPath)) {
            return (path, gasEstimates, inputAmounts);
        }

        path = toAlgebraPath(tokenPath);
        bytes memory reversePath = toAlgebraPath(reverseTokenPath);

        try quoter.quoteExactMultiOutput(factory, reversePath, outputAmounts) {} catch (bytes memory reason) {
            (, inputAmounts, gasEstimates) = decodeMultiSwapRevert(reason);
        }
    }
}
