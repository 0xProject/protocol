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

import "./interfaces/ITraderJoeV2.sol";
import "./TickBasedAMMCommon.sol";

contract TraderJoeV2Common is TickBasedAMMCommon {
    function toTraderJoeV2Path(
        address[] memory tokenPath,
        address[] memory poolPath
    ) internal view returns (bytes memory traderJoeV2Path) {
        require(
            tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1,
            "UniswapV3Common/invalid path lengths"
        );
        // TraderJoeV2 paths are tightly packed as:
        // [token0, token0Token1PairBinStep, token1, token1Token2PairBinStep, token2, ...]
        traderJoeV2Path = new bytes(tokenPath.length * 20 + poolPath.length * 2);
        uint256 o;
        assembly {
            o := add(traderJoeV2Path, 32)
        }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            if (i > 0) {
                uint16 binStep = ITraderJoeV2Pool(poolPath[i - 1]).feeParameters().binStep;
                assembly {
                    mstore(o, shl(240, binStep))
                    o := add(o, 2)
                }
            }
            address token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }
}
