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

import "./DeploymentConstants.sol";
import "./SamplerUtils.sol";
import "./interfaces/ICoFiX.sol";


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
        returns (uint256[] memory makerTokenAmounts, uint256 fee)
    {
        // make sure it's not WETH-WETH
        _assertValidPair(makerToken, takerToken);
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        if (takerToken != _getWethAddress() && makerToken != _getWethAddress()) {
            return (makerTokenAmounts, 0);
        }

        ICoFiXPair takerTokenPair = takerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(takerToken);
        ICoFiXPair makerTokenPair = makerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(makerToken);

        if (address(takerTokenPair) == address(0) && address(makerTokenPair) == address(0)) {
            return (makerTokenAmounts, 0);
        }

        bool didSucceed;
        bytes memory resultData;
        fee = INestOracle(_getNestOracleAddress()).checkPriceCost();
        for (uint256 i = 0; i < numSamples; i++) {
            if (makerToken == _getWethAddress()) {
                // if converting to WETH, sell all of the token in the taker token pair
                (didSucceed, resultData) =
                    address(takerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcOutToken0.selector,
                            takerTokenAmounts[i],
                            _getOraclePrice(takerToken)
                    ));
            } else if (takerToken == _getWethAddress()) {
                // if starting with WETH, sell all of the WETH in the maker token pair
                (didSucceed, resultData) =
                    address(makerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcOutToken1.selector,
                            takerTokenAmounts[i],
                            _getOraclePrice(makerToken)
                    ));
            }
            if (didSucceed) {
                (makerTokenAmounts[i], ) = abi.decode(resultData, (uint256, uint256));
            } else {
                return (makerTokenAmounts, fee);
            }
        }
    }

    /// @dev Sample buy quotes from CoFiX.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return takerTokenAmounts taker amounts bought at each maker token
    ///         amount.
    function sampleBuysFromCoFiX(
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts, uint256  fee)
    {
        // make sure it's not WETH-WETH
        _assertValidPair(makerToken, takerToken);
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        if (takerToken != _getWethAddress() && makerToken != _getWethAddress()) {
            return (takerTokenAmounts, 0);
        }
        ICoFiXPair takerTokenPair = takerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(takerToken);
        ICoFiXPair makerTokenPair = makerToken == _getWethAddress() ?
            ICoFiXPair(0) : _getCoFiXPair(makerToken);

        if (address(takerTokenPair) == address(0) && address(makerTokenPair) == address(0)) {
            return (takerTokenAmounts, 0);
        }

        bool didSucceed;
        bytes memory resultData;
        fee = INestOracle(_getNestOracleAddress()).checkPriceCost();
        for (uint256 i = 0; i < numSamples; i++) {
            if (makerToken == _getWethAddress()) {
                // if converting to WETH, find out how much of the taker token to send in
                (didSucceed, resultData) =
                    address(takerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcInNeededToken1.selector,
                            makerTokenAmounts[i],
                            _getOraclePrice(takerToken)
                    ));
            } else if (takerToken == _getWethAddress()) {
                // if starting to a non-WETH token, find out how much WETH to send in
                (didSucceed, resultData) =
                    address(makerTokenPair).staticcall.gas(COFIX_CALL_GAS)(
                        abi.encodeWithSelector(
                            ICoFiXPair(0).calcInNeededToken0.selector,
                            makerTokenAmounts[i],
                            _getOraclePrice(makerToken)
                    ));
            }
            if (didSucceed) {
                (takerTokenAmounts[i], ) = abi.decode(resultData, (uint256, uint256));
            } else {
                return (takerTokenAmounts, fee);
            }
        }
    }

    /// @dev Returns the oracle information from NEST given a token
    /// @param tokenAddress Address of the token contract.
    /// @return oraclePrice NEST oracle data
    function _getOraclePrice(address tokenAddress)
        private
        view
        returns (OraclePrice memory oraclePrice)
    {
        (oraclePrice.K, /* updated at */, oraclePrice.theta) = ICoFiXController(_getCoFiXControllerAddress()).getKInfo(tokenAddress);
        (oraclePrice.ethAmount, oraclePrice.erc20Amount, oraclePrice.blockNum) = INestOracle(_getNestOracleAddress()).checkPriceNow(tokenAddress);
        return oraclePrice;
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
