// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2021 ZeroEx Intl.

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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

interface IUniswapV3Quoter {
    function factory()
        external
        view
        returns (IUniswapV3Factory factory_);
    function quoteExactInput(bytes memory path, uint256 amountIn)
        external
        returns (uint256 amountOut);
    function quoteExactOutput(bytes memory path, uint256 amountOut)
        external
        returns (uint256 amountIn);
}

interface IUniswapV3Factory {
    function getPool(IERC20TokenV06 a, IERC20TokenV06 b, uint24 fee)
        external
        view
        returns (IUniswapV3Pool pool);
}

interface IUniswapV3Pool {
    function token0() external view returns (IERC20TokenV06);
    function token1() external view returns (IERC20TokenV06);
    function fee() external view returns (uint24);
}

// HACK: Keep the compiler from complaining about filenames.
contract UniswapV3 {}
