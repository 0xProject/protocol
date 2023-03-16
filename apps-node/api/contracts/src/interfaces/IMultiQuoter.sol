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

pragma solidity >=0.6;

interface IMultiQuoter {
    /// @notice Quotes amounts out for a set of exact input swaps and provides results encoded into a revert reason
    /// @param factory The factory contract managing the tick based AMM pools
    /// @param path The path of the swap, i.e. each token pair and the pool fee
    /// @param amountsIn The amounts in of the first token to swap
    /// @dev This function reverts at the end of the quoting logic and encodes (uint256[] amountsOut, uint256[] gasEstimates)
    /// into the revert reason. See additional documentation below.
    function quoteExactMultiInput(address factory, bytes memory path, uint256[] memory amountsIn) external view;

    /// @notice Quotes amounts in a set of exact output swaps and provides results encoded into a revert reason
    /// @param factory The factory contract managing the tick based AMM pools
    /// @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
    /// @param amountsOut The amounts out of the last token to receive
    /// @dev This function reverts at the end of the quoting logic and encodes (uint256[] amountsIn, uint256[] gasEstimates)
    /// into the revert reason. See additional documentation below.
    function quoteExactMultiOutput(address factory, bytes memory path, uint256[] memory amountsOut) external view;
}
