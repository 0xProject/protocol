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

interface ICoFiX {}

interface ICoFiXPair {

    struct OraclePrice {
        uint256 ethAmount;
        uint256 erc20Amount;
        uint256 blockNum;
        uint256 K;
        uint256 theta;
    }

    function calcInNeededToken0(uint256 amountOut, OraclePrice calldata _op)
        external
        view
        returns (uint256 amountInNeeded, uint256 fee);

    function calcInNeededToken1(uint256 amountOut, OraclePrice calldata _op)
        external
        view
        returns (uint256 amountInNeeded, uint256 fee);

    function calcOutToken0(uint256 amountIn, OraclePrice calldata _op)
        external
        view
        returns (uint256 amountOut, uint256 fee);

    function calcOutToken1(uint256 amountIn, OraclePrice calldata _op)
        external
        view
        returns (uint256 amountOut, uint256 fee);
}

interface ICoFiXController {

    function getKInfo(address tokenAddress)
        external
        view
        returns (uint32 k, uint32 updatedAt, uint32 theta);
}

interface ICoFiXFactory {

    function getPair(address token)
        external
        view
        returns (address pair);
}

interface INestOracle {

    function checkPriceNow(address tokenAddress)
        external
        view
        returns (uint256 ethAmount, uint256 erc20Amount, uint256 blockNum);

    function checkPriceCost()
        external
        view
        returns (uint256);
}
