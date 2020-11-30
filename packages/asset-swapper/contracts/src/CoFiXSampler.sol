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
        returns (uint256[] memory makerTokenAmounts, uint256 fee, address pool)
    {
        // make sure it's not WETH-WETH
        _assertValidPair(makerToken, takerToken);
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        address nonWethToken = takerToken != _getWethAddress() ? takerToken : makerToken;
        pool = _getCoFiXPair(nonWethToken);
        // No pools for this token pair
        if (pool == address(0)) {
            return (makerTokenAmounts, fee, pool);
        }

        fee = _getNestOracle().checkPriceCost();
        uint256 makerTokenPoolBalance = IERC20TokenV06(makerToken).balanceOf(address(pool));

        for (uint256 i = 0; i < numSamples; i++) {
            // Calculate the impact from the volume, adjusting the k value by the impact c
            // We override the Oracle Price K value so we fetch it every sample
            ICoFiXPair.OraclePrice memory oraclePrice = _getOraclePrice(nonWethToken);
            uint256 impactCost = _getCoFiXController().calcImpactCostFor_SWAP_WITH_EXACT(
                takerToken,
                abi.encode(
                    address(0), // unused
                    _getWethAddress(),
                    address(0), // unused
                    takerTokenAmounts[i]
                ),
                oraclePrice.ethAmount,
                oraclePrice.erc20Amount
            );
            // Update k + impactCost (c) for final K
            oraclePrice.K = oraclePrice.K + impactCost;

            if (makerToken == _getWethAddress()) {
                // Buying WETH (token0 is WETH)
                try
                    ICoFiXPair(pool).calcOutToken0{gas: COFIX_CALL_GAS}(takerTokenAmounts[i], oraclePrice)
                    returns (uint256 boughtAmount, uint256)
                {
                    // Ensure the Pool has sufficient amount to buy
                    if (makerTokenPoolBalance < boughtAmount) {
                        return (makerTokenAmounts, fee, pool);
                    }
                    makerTokenAmounts[i] = boughtAmount;
                } catch (bytes memory) {
                    // Swallow failures, leaving all results as zero.  return 0;
                    return (makerTokenAmounts, fee, pool);
                }
            } else {
                // Selling WETH (token0 is Weth)
                try
                    ICoFiXPair(pool).calcOutToken1{gas: COFIX_CALL_GAS}(takerTokenAmounts[i], oraclePrice)
                    returns (uint256 boughtAmount, uint256)
                {
                    // Ensure the Pool has sufficient amount to buy
                    if (makerTokenPoolBalance < boughtAmount) {
                        return (makerTokenAmounts, fee, pool);
                    }
                    makerTokenAmounts[i] = boughtAmount;
                } catch (bytes memory) {
                    // Swallow failures, leaving all results as zero.  return 0;
                    return (makerTokenAmounts, fee, pool);
                }
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
        returns (uint256[] memory takerTokenAmounts, uint256  fee, address pool)
    {
        // make sure it's not WETH-WETH
        _assertValidPair(makerToken, takerToken);
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);

        address nonWethToken = takerToken != _getWethAddress() ? takerToken : makerToken;
        pool = _getCoFiXPair(nonWethToken);
        // No pools for this token pair
        if (pool == address(0)) {
            return (takerTokenAmounts, fee, pool);
        }

        fee = _getNestOracle().checkPriceCost();
        uint256 makerTokenPoolBalance = IERC20TokenV06(makerToken).balanceOf(address(pool));

        for (uint256 i = 0; i < numSamples; i++) {
            // Ensure the Pool has sufficient amount to buy
            if (makerTokenPoolBalance < makerTokenAmounts[i]) {
                return (takerTokenAmounts, fee, pool);
            }

            // Calculate the impact from the volume, adjusting the k value by the impact c
            // We override the Oracle Price K value so we fetch it every sample
            ICoFiXPair.OraclePrice memory oraclePrice = _getOraclePrice(nonWethToken);
            uint256 impactCost = _getCoFiXController().calcImpactCostFor_SWAP_FOR_EXACT(
                takerToken,
                abi.encode(
                    address(0), // unused
                    _getWethAddress(),
                    address(0), // unused
                    makerTokenAmounts[i]
                ),
                oraclePrice.ethAmount,
                oraclePrice.erc20Amount
            );
            // Update k + impactCost (c) for final K
            oraclePrice.K = oraclePrice.K + impactCost;

            if (makerToken == _getWethAddress()) {
                // Buying WETH (token0 is WETH)
                try
                    ICoFiXPair(pool).calcInNeededToken1{gas: COFIX_CALL_GAS}(makerTokenAmounts[i], oraclePrice)
                    returns (uint256 soldAmount, uint256)
                {
                    takerTokenAmounts[i] = soldAmount;
                } catch (bytes memory) {
                    // Swallow failures, leaving all results as zero.  return 0;
                    return (takerTokenAmounts, fee, pool);
                }
            } else {
                try
                    ICoFiXPair(pool).calcInNeededToken0{gas: COFIX_CALL_GAS}(makerTokenAmounts[i], oraclePrice)
                    returns (uint256 soldAmount, uint256)
                {
                    takerTokenAmounts[i] = soldAmount;
                } catch (bytes memory) {
                    // Swallow failures, leaving all results as zero.  return 0;
                    return (takerTokenAmounts, fee, pool);
                }
            }
        }
    }

    /// @dev Returns the oracle information from NEST given a token
    /// @param tokenAddress Address of the token contract.
    /// @return oraclePrice NEST oracle data
    function _getOraclePrice(address tokenAddress)
        private
        view
        returns (ICoFiXPair.OraclePrice memory oraclePrice)
    {
        (oraclePrice.K, /* updated at */, oraclePrice.theta) = _getCoFiXController().getKInfo(tokenAddress);
        (oraclePrice.ethAmount, oraclePrice.erc20Amount, oraclePrice.blockNum) = _getNestOracle().checkPriceNow(tokenAddress);
        return oraclePrice;
    }


    /// @dev Returns the CoFiX controller.
    /// @return the CoFiX controller
    function _getCoFiXController()
        private
        view
        returns (ICoFiXController)
    {
        return ICoFiXController(_getCoFiXControllerAddress());
    }

    /// @dev Returns the CoFiX pool for a given token address.
    ///      The token is paired with WETH
    /// @param tokenAddress Address of the token contract.
    /// @return the pair for associated with that token
    function _getCoFiXPair(address tokenAddress)
        private
        view
        returns (address)
    {
        try
            ICoFiXFactory(_getCoFiXController().factory()).getPair(tokenAddress)
            returns (address tokenPair)
        {
            return tokenPair;
        } catch (bytes memory) {
            // Swallow failures, leaving all results as zero.  return 0;
        }
    }

    /// @dev Returns the NEST Oracle.
    ///      Using the Nest Vote Factory as a lookup
    /// @return the NEST price oracle
    function _getNestOracle()
        private
        view
        returns (INestOracle)
    {
        return INestOracle(
            INestVoteFactory(
                _getCoFiXController().voteFactory()
            ).checkAddress("nest.v3.offerPrice")
        );
    }
}
