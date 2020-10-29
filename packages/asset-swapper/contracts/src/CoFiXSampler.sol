/*

  Copyright 2019 ZeroEx Intl.

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

pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

import "@0x/contracts-utils/contracts/src/DeploymentConstants.sol";
import "./interfaces/ICoFiXController.sol";
import "./interfaces/ICoFiXFactory.sol";
import "./interfaces/ICoFiXPair.sol";
import "./interfaces/INestOracle.sol";


contract CoFiXSampler is
    DeploymentConstants,
    SamplerUtils
{
    /// @dev Gas limit for CoFiX calls.
    uint256 constant private COFIX_CALL_GAS = 450e3; // 450k

    struct OraclePrice {
        uint256 ethAmount;
        uint256 erc20Amount;
        uint256 blockNum;
        uint256 K;
        uint256 theta;
    }

    /// @dev Sample sell quotes from CoFiX.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromCoFiX(
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        // make sure it's not WETH-WETH
        _assertValidPair(makerToken, takerToken);
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        ICoFiXPair takerTokenPair = takerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(takerToken);
        ICoFiXPair makerTokenPair = makerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(makerToken);
        for (uint256 i = 0; i < numSamples; i++) {
            bool didSucceed = true;
            if (makerToken == _getWethAddress()) {
                // if converting to WETH, sell all of the token in the taker token pair
                (didSucceed, bytes memory resultData) =
                    address(takerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcOutToken0.selector,
                            takerTokenAmounts[i],
                            _getOraclePrice(takerToken)
                    ));
                makerTokenAmounts[i] = abi.decode(resultData, (uint256[]))[0];
            } else if (takerToken == _getWethAddress()) {
                // if starting with WETH, sell all of the WETH in the maker token pair
                (didSucceed, bytes memory resultData) =
                    address(makerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcOutToken1.selector,
                            takerTokenAmounts[i],
                            _getOraclePrice(makerToken)
                    ));
                makerTokenAmounts[i] = abi.decode(resultData, (uint256[]))[0];
            } else {
                // if it's converting a non-WETH token to another non-WETH token
                // convert the taker token to WETH, then convert the WETH to the maker token
                (didSucceed, bytes memory resultData) =
                    address(takerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcOutToken0.selector,
                            takerTokenAmounts[i],
                            _getOraclePrice(takerToken)
                    ));
                uint256 ethBought = abi.decode(resultData, (uint256[]))[0];
                if (ethBought != 0) {
                    (bool didSucceed, bytes memory resultData) =
                        address(makerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                            abi.encodeWithSelector(
                                ICoFiXPair(0).calcOutToken1.selector,
                                ethBought,
                                _getOraclePrice(makerToken)
                        ));
                    makerTokenAmounts[i] = abi.decode(resultData, (uint256[]))[0];
                } else {
                    makerTokenAmounts[i] = 0;
                }
            }
            if (!didSucceed) {
                break;
            }
        }
    }

    /// @dev Sample buy quotes from CoFiX.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleBuysFromCoFiX(
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        // make sure it's not WETH-WETH
        _assertValidPair(makerToken, takerToken);
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        ICoFiXPair takerTokenPair = takerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(takerToken);
        ICoFiXPair makerTokenPair = makerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(makerToken);
        for (uint256 i = 0; i < numSamples; i++) {
            bool didSucceed = true;
            if (makerToken == _getWethAddress()) {
                // if converting to WETH, find out how much of the taker token to send in
                (didSucceed, bytes memory resultData) =
                    address(takerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcInNeededToken1.selector,
                            makerTokenAmounts[i],
                            _getOraclePrice(takerToken)
                    ));
                takerTokenAmounts[i] = abi.decode(resultData, (uint256[]))[0];
            } else if (takerToken == _getWethAddress()) {
                // if starting to a non-WETH token, find out how much WETH to send in
                (didSucceed, bytes memory resultData) =
                    address(makerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcInNeededToken0.selector,
                            makerTokenAmounts[i],
                            _getOraclePrice(makerToken)
                    ));
                takerTokenAmounts[i] = abi.decode(resultData, (uint256[]))[0];
            } else {
                // if it's converting a non-WETH token to another non-WETH token
                // find out how much WETH you need to convert to get to the maker token
                // then find out how much of the taker token you need to get that WETH
                (didSucceed, bytes memory resultData) =
                    address(makerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcInNeededToken0.selector,
                            makerTokenAmounts[i],
                            _getOraclePrice(makerToken)
                    ));
                uint256 ethNeeded = abi.decode(resultData, (uint256[]))[0];
                if (ethNeeded != 0) {
                    (didSucceed, bytes memory resultData) =
                        address(takerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                            abi.encodeWithSelector(
                                ICoFiXPair(0).calcInNeededToken1.selector,
                                ethNeeded,
                                _getOraclePrice(takerToken)
                        ));
                    takerTokenAmounts[i] = abi.decode(resultData, (uint256[]))[0];
                } else {
                    takerTokenAmounts[i] = 0;
                }
            }
            if (!didSucceed) {
                break;
            }
        }
    }

    /// @dev Returns the oracle information from NEST given a token
    /// @param tokenAddress Address of the token contract.
    /// @return OraclePrice NEST oracle data
    function _getOraclePrice(address tokenAddress)
        private
        view
        returns (OraclePrice oraclePrice)
    {
        (uint32 k, uint32 updatedAt, uint32 theta) = ICoFiXController(_getCoFiXControllerAddress()).getKInfo(tokenAddress);
        (uint256 ethAmount, uint256 erc20Amount, uint256 blockNum); = INestOracle(_getNestOracleAddress()).checkPriceNow(tokenAddress);

        uint k2 = uint(k);
        uint theta2 = uint(theta);

        return [ethAmount, erc20Amount, blockNum, k2, theta];
    }

    /// @dev Returns the CoFiX pool for a given token address.
    ///      The token is paired with WETH
    /// @param tokenAddress Address of the token contract.
    /// @return pair the pair for associated with that token
    function _getCoFiXPair(address tokenAddress)
        private
        view
        returns (ICoFiXPair pair)
    {
        pair = ICoFiXPair(
            ICoFiXFactory(_getCoFiXFactoryAddress())
            .getPair(tokenAddress)
        );
    }
}
