// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2023 ZeroEx Intl.

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

import "./IKyberElastic.sol";

interface IMultiQuoter {
    function quoteExactMultiInput(
        IFactory factory,
        bytes memory path,
        uint256[] memory amountsIn
    ) external view returns (uint256[] memory amountsOut, uint256[] memory gasEstimate);

    function quoteExactMultiOutput(
        IFactory factory,
        bytes memory path,
        uint256[] memory amountsOut
    ) external view returns (uint256[] memory amountsIn, uint256[] memory gasEstimate);
}
