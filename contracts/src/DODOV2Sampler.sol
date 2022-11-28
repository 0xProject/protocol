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

import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";

interface IDODOV2Registry {
    function getDODOPool(address baseToken, address quoteToken) external view returns (address[] memory machines);
}

interface IDODOV2Pool {
    function querySellBase(
        address trader,
        uint256 payBaseAmount
    ) external view returns (uint256 receiveQuoteAmount, uint256 mtFee);

    function querySellQuote(
        address trader,
        uint256 payQuoteAmount
    ) external view returns (uint256 receiveBaseAmount, uint256 mtFee);
}

contract DODOV2Sampler is SamplerUtils, ApproximateBuys {
    /// @dev Gas limit for DODO V2 calls.
    uint256 private constant DODO_V2_CALL_GAS = 300e3; // 300k

    /// @dev Sample sell quotes from DODO V2.
    /// @param registry Address of the registry to look up.
    /// @param offset offset index for the pool in the registry.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return sellBase whether the bridge needs to sell the base token
    /// @return pool the DODO pool address
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromDODOV2(
        address registry,
        uint256 offset,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public view returns (bool sellBase, address pool, uint256[] memory makerTokenAmounts) {
        _assertValidPair(makerToken, takerToken);

        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        (pool, sellBase) = _getNextDODOV2Pool(registry, offset, takerToken, makerToken);
        if (pool == address(0)) {
            return (sellBase, pool, makerTokenAmounts);
        }

        for (uint256 i = 0; i < numSamples; i++) {
            uint256 buyAmount = _sampleSellForApproximateBuyFromDODOV2(
                abi.encode(takerToken, pool, sellBase), // taker token data
                abi.encode(makerToken, pool, sellBase), // maker token data
                takerTokenAmounts[i]
            );
            makerTokenAmounts[i] = buyAmount;
            // Break early if there are 0 amounts
            if (makerTokenAmounts[i] == 0) {
                break;
            }
        }
    }

    /// @dev Sample buy quotes from DODO.
    /// @param registry Address of the registry to look up.
    /// @param offset offset index for the pool in the registry.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token sell amount for each sample.
    /// @return sellBase whether the bridge needs to sell the base token
    /// @return pool the DODO pool address
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromDODOV2(
        address registry,
        uint256 offset,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public view returns (bool sellBase, address pool, uint256[] memory takerTokenAmounts) {
        _assertValidPair(makerToken, takerToken);

        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        (pool, sellBase) = _getNextDODOV2Pool(registry, offset, takerToken, makerToken);
        if (pool == address(0)) {
            return (sellBase, pool, takerTokenAmounts);
        }

        takerTokenAmounts = _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                makerTokenData: abi.encode(makerToken, pool, !sellBase),
                takerTokenData: abi.encode(takerToken, pool, sellBase),
                getSellQuoteCallback: _sampleSellForApproximateBuyFromDODOV2
            }),
            makerTokenAmounts
        );
    }

    function _sampleSellForApproximateBuyFromDODOV2(
        bytes memory takerTokenData,
        bytes memory /* makerTokenData */,
        uint256 sellAmount
    ) private view returns (uint256) {
        (address takerToken, address pool, bool sellBase) = abi.decode(takerTokenData, (address, address, bool));

        // We will get called to sell both the taker token and also to sell the maker token
        // since we use approximate buy for sell and buy functions
        if (sellBase) {
            try IDODOV2Pool(pool).querySellBase{gas: DODO_V2_CALL_GAS}(address(0), sellAmount) returns (
                uint256 amount,
                uint256
            ) {
                return amount;
            } catch {
                return 0;
            }
        } else {
            try IDODOV2Pool(pool).querySellQuote{gas: DODO_V2_CALL_GAS}(address(0), sellAmount) returns (
                uint256 amount,
                uint256
            ) {
                return amount;
            } catch {
                return 0;
            }
        }
    }

    function _getNextDODOV2Pool(
        address registry,
        uint256 offset,
        address takerToken,
        address makerToken
    ) internal view returns (address machine, bool sellBase) {
        // Query in base -> quote direction, if a pool is found then we are selling the base
        address[] memory machines = IDODOV2Registry(registry).getDODOPool(takerToken, makerToken);
        sellBase = true;
        if (machines.length == 0) {
            // Query in quote -> base direction, if a pool is found then we are selling the quote
            machines = IDODOV2Registry(registry).getDODOPool(makerToken, takerToken);
            sellBase = false;
        }

        if (offset >= machines.length) {
            return (address(0), false);
        }

        machine = machines[offset];
    }
}
